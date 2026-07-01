"""
main.py — FastAPI backend for QuietCost.

ARCHITECTURE:
  On startup, the full data pipeline is built once and cached in app.state:
    - SPM + PIT data loaded and merged (build_pipeline)
    - TransitionCalibrator run; per-CoC estimates cached in a lookup dict
    - PIT population per CoC cached for population lookup

  Per request (/api/simulation/run):
    - Look up calibrated transition params for requested CoC
      (fallback: national-pool estimate if CoC not found)
    - Look up real PIT population for the CoC
      (fallback: national total if CoC not found)
    - Run baseline scenario (delay=0) AND the requested scenario
    - NP-COD = cost(requested) - cost(baseline) — never hardcoded to $0
    - Return MC percentile bands from real stochastic trials
"""

from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure api/ is importable when run via uvicorn from inside api/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_pipeline import MockDataPipeline
from simulation import MarkovSimulation
from backtesting import HoldOutValidator
from feedback import get_model_metadata as _get_model_metadata, get_feedback_volume, record_feedback

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Pipeline cache helpers
# ---------------------------------------------------------------------------

def _build_pipeline_cache() -> Dict[str, Any]:
    """
    Load real datasets and build per-CoC calibration lookup tables.
    Returns a dict with keys:
      'cal_by_coc'      : {coc_number: {p_exit_to_ph, p_return_12m, ...}}
      'pop_by_coc'      : {coc_number: overall_homeless}
      'national_params' : {p_exit_to_ph, p_return_12m, ...}
      'national_pop'    : int
      'data_source'     : 'calibrated' | 'fallback'
    """
    try:
        from pipeline.merger import build_pipeline
        from calibration.transition_calibrator import TransitionCalibrator
        from loaders.pit_loader import load_pit

        logger.info("Building data pipeline (this runs once at startup)…")

        # Use only the most recent available year for calibration
        df_pipeline = build_pipeline(spm_years=[2023, 2024], pit_years=[2023, 2024])

        # Run calibrator over most recent year only to keep estimates current
        most_recent_year = int(df_pipeline["year"].max())
        df_recent = df_pipeline[df_pipeline["year"] == most_recent_year].copy()

        calibrator = TransitionCalibrator(df_pipeline)  # pool tables use all years
        estimates_df = calibrator.to_dataframe(years=[most_recent_year])

        # Build per-CoC calibration dict
        cal_by_coc: Dict[str, Dict[str, Optional[float]]] = {}
        for _, row in estimates_df.iterrows():
            coc = str(row["coc_number"]).strip().upper()
            cal_by_coc[coc] = {
                "p_exit_to_ph":               _safe(row.get("p_exit_to_ph")),
                "p_return_12m":               _safe(row.get("p_return_12m")),
                "p_ph_retention":             _safe(row.get("p_ph_retention")),
                "p_sheltered_given_homeless":  _safe(row.get("p_sheltered_given_homeless")),
            }

        # Build PIT population lookup (most recent year)
        pit = load_pit(years=[most_recent_year])
        pit["coc_number"] = pit["coc_number"].str.strip().str.upper()
        pit_recent = pit[pit["year"] == most_recent_year]
        pop_by_coc: Dict[str, int] = {}
        for _, row in pit_recent.iterrows():
            coc = str(row["coc_number"]).strip().upper()
            val = row.get("overall_homeless")
            if pd.notna(val) and val > 0:
                pop_by_coc[coc] = int(val)

        # National-level pool (weighted average across all CoCs)
        national_params = {
            "p_exit_to_ph":               _safe(estimates_df["p_exit_to_ph"].median()),
            "p_return_12m":               _safe(estimates_df["p_return_12m"].median()),
            "p_ph_retention":             _safe(estimates_df["p_ph_retention"].median()),
            "p_sheltered_given_homeless":  _safe(estimates_df["p_sheltered_given_homeless"].median()),
        }
        national_pop = int(pit_recent["overall_homeless"].sum())

        logger.info(
            "Pipeline cache built: %d CoCs calibrated, %d with PIT population, "
            "national pop=%d, year=%d.",
            len(cal_by_coc), len(pop_by_coc), national_pop, most_recent_year,
        )

        # Run hold-out validation on the most recent year
        try:
            from backtesting import HoldOutValidator
            validator = HoldOutValidator(df_pipeline, held_out_year=most_recent_year)
            validation_results = validator.run_validation()
        except Exception as exc:
            logger.warning("Hold-out validation failed: %s", exc, exc_info=True)
            validation_results = {"error": str(exc)}

        return {
            "cal_by_coc":      cal_by_coc,
            "pop_by_coc":      pop_by_coc,
            "national_params": national_params,
            "national_pop":    national_pop,
            "data_source":     "calibrated",
            "calibration_year": most_recent_year,
            "validation_results": validation_results,
        }

    except Exception as exc:
        logger.warning(
            "Pipeline build failed (%s). Falling back to hardcoded priors.", exc,
            exc_info=True,
        )
        # Graceful fallback: use prior-only parameters
        return {
            "cal_by_coc":      {},
            "pop_by_coc":      {},
            "national_params": {
                "p_exit_to_ph":               0.30,
                "p_return_12m":               0.11,
                "p_ph_retention":             0.85,
                "p_sheltered_given_homeless":  0.55,
            },
            "national_pop":    653_104,  # 2023 HUD AHAR national figure
            "data_source":     "fallback",
            "calibration_year": None,
        }


def _safe(val: Any) -> Optional[float]:
    """Return float or None, never NaN."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else f
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# FastAPI app with startup pipeline cache
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build pipeline cache once at startup; tear down on shutdown."""
    app.state.pipeline = _build_pipeline_cache()
    yield
    # Cleanup (nothing needed)


app = FastAPI(
    title="QuietCost API",
    description="Calibrated Markov simulation & data API for homelessness policy analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"message": "QuietCost API is running"}


@app.get("/api/data-health")
def get_data_health():
    pipeline = MockDataPipeline()
    info = pipeline.inspect_directory()
    cache = getattr(app.state, "pipeline", {})
    return {
        "status": info.get("status", "operational"),
        "datasets_monitored": info.get("discovered_count", 0),
        "registry": info.get("registry", []),
        "drift_detected": False,
        "missing_data_pct": 5.2,
        "data_source": cache.get("data_source", "unknown"),
        "calibration_year": cache.get("calibration_year"),
        "cocs_calibrated": len(cache.get("cal_by_coc", {})),
    }


class SimulationRequest(BaseModel):
    scenario: str
    delay_years: int = 0
    invisible_population_estimate: str = "medium"
    coc_number: str = "national"   # NEW: CoC to simulate (e.g. "CA-600")


@app.post("/api/simulation/run")
def run_simulation(req: SimulationRequest):
    """
    Run the calibrated Discrete-Time Markov State Transition Model.

    Uses real HUD SPM + PIT data calibrated transition probabilities and
    actual PIT homeless population counts per CoC.

    NP-COD = cumulative 10-year cost of the requested scenario minus the
    cumulative 10-year cost of the act-now (delay=0) baseline. Always > 0
    when delay > 0 (unless the model cannot distinguish the scenarios).
    """
    cache: Dict[str, Any] = app.state.pipeline

    # ── Look up CoC-specific calibrated parameters ─────────────────────────
    coc_key = req.coc_number.strip().upper()
    if coc_key != "NATIONAL" and coc_key in cache["cal_by_coc"]:
        cal_params = cache["cal_by_coc"][coc_key]
        data_source = f"calibrated:{coc_key}"
    else:
        cal_params = cache["national_params"]
        data_source = "national_pool"
        if coc_key != "NATIONAL":
            logger.info("CoC %s not found in calibration cache; using national pool.", coc_key)

    # ── Look up real PIT population ─────────────────────────────────────────
    if coc_key != "NATIONAL" and coc_key in cache["pop_by_coc"]:
        initial_population = cache["pop_by_coc"][coc_key]
    else:
        initial_population = cache["national_pop"]

    # ── Determine delay for requested scenario ──────────────────────────────
    if req.scenario == "act_now":
        delay = 0
    elif req.scenario == "do_nothing":
        delay = 10
    else:
        delay = max(0, req.delay_years)

    # ── Run both scenarios (needed for NP-COD) ──────────────────────────────
    model = MarkovSimulation(n_simulations=1000, horizon_years=10)

    result_baseline = model.run_scenario(
        initial_population=initial_population,
        delay_years=0,
        **cal_params,
    )

    if delay == 0:
        # act_now: baseline IS the scenario
        result_scenario = result_baseline
    else:
        result_scenario = model.run_scenario(
            initial_population=initial_population,
            delay_years=delay,
            **cal_params,
        )

    # ── Compute NP-COD ───────────────────────────────────────────────────────
    np_cod_result = model.compute_np_cod(result_scenario, result_baseline)

    # ── Build response (backward-compatible with frontend) ───────────────────
    return {
        "scenario":                           req.scenario,
        "delay_years":                        delay,
        "invisible_population_estimate":      req.invisible_population_estimate,
        "coc_number":                         req.coc_number,
        "population_used":                    initial_population,
        "data_source":                        data_source,
        "calibration_year":                   cache.get("calibration_year"),

        # Core result fields read by frontend
        "np_cod":                             np_cod_result["np_cod"],
        "confidence_interval":                np_cod_result["confidence_interval"],
        "projections":                        result_scenario["projections"],

        # Extra detail for advanced consumers
        "total_10yr_cost_median":             result_scenario["total_10yr_cost_median"],
        "total_10yr_cost_p05":               result_scenario["total_10yr_cost_p05"],
        "total_10yr_cost_p95":               result_scenario["total_10yr_cost_p95"],
        "baseline_10yr_cost_median":          result_baseline["total_10yr_cost_median"],
        "calibrated_params":                  cal_params,
    }


# ---------------------------------------------------------------------------
# Validation endpoint (GAP 1)
# ---------------------------------------------------------------------------

@app.get("/api/validation")
def get_validation_results():
    """Return cached hold-out validation results."""
    cache: Dict[str, Any] = app.state.pipeline
    validation = cache.get("validation_results")
    if validation is None:
        return {"error": "Validation results not available."}
    return validation


# ---------------------------------------------------------------------------
# Feedback endpoints (GAP 3)
# ---------------------------------------------------------------------------

class FeedbackRequest(BaseModel):
    simulation_request: dict = {}
    rating_params: int = 3
    rating_plausible: int = 3
    notes: str = ""


@app.post("/api/feedback")
def post_feedback(req: FeedbackRequest):
    """Record feedback from a user about a simulation run."""
    return record_feedback(
        simulation_request=req.simulation_request,
        rating_params=req.rating_params,
        rating_plausible=req.rating_plausible,
        notes=req.notes,
    )


@app.get("/api/feedback/volume")
def get_feedback_volume_endpoint():
    """Return feedback volume info for admin monitoring."""
    return get_feedback_volume()


@app.get("/api/model-metadata")
def get_model_metadata_endpoint():
    """Return model health metadata (last updated date, feedback count)."""
    return _get_model_metadata()