""""
backtesting.py — Held-out validation for the Markov model.

PURPOSE:
  Validates model predictions against a held-out year of real PIT data.
  Uses prior years for calibration, runs a 1-year forward prediction,
  and compares predicted vs actual for observable states.

OBSERVABLE STATES (from PIT data):
  - total_homeless  (states 1 + 2: Emergency Shelter + Unsheltered)
  - sheltered       (state 1: Emergency Shelter)
  - unsheltered     (state 2: Unsheltered)

UNOBSERVABLE STATES (no direct ground truth):
  - stable_housing  (state 0)
  - incarcerated    (state 3)
  - healthcare      (state 4)
  - deceased        (state 5)
""""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd

from calibration.transition_calibrator import TransitionCalibrator
from simulation import MarkovSimulation

logger = logging.getLogger(__name__)


class HoldOutValidator:
    """
    Hold-out validator for the Markov simulation model.

    Usage::

        validator = HoldOutValidator(df_pipeline)
        results = validator.run_validation()
    """

    def __init__(self, df_pipeline: pd.DataFrame, held_out_year: Optional[int] = None) -> None:
        self.df = df_pipeline.copy()
        if held_out_year is None:
            self.held_out_year = int(self.df["year"].max())
        else:
            self.held_out_year = held_out_year
        self.calibration_years = sorted([int(y) for y in self.df["year"].unique() if y < self.held_out_year])

    def run_validation(self) -> Dict[str, Any]:
        """Run hold-out validation and return metrics."""
        if not self.calibration_years:
            return {
                "error": "No prior years available for calibration. Cannot validate.",
                "held_out_year": self.held_out_year,
            }

        # Calibration: use prior years only
        df_prior = self.df[self.df["year"].isin(self.calibration_years)].copy()

        # Get actuals for the held-out year (national totals from PIT)
        df_held = self.df[self.df["year"] == self.held_out_year].copy()
        if df_held.empty:
            return {
                "error": f"No data found for held-out year {self.held_out_year}.",
                "held_out_year": self.held_out_year,
            }

        # Aggregate PIT counts nationally
        actual_total_homeless = pd.to_numeric(df_held["overall_homeless"], errors="coerce").sum()
        actual_sheltered = pd.to_numeric(df_held["sheltered_total"], errors="coerce").sum()
        actual_unsheltered = pd.to_numeric(df_held["unsheltered_total"], errors="coerce").sum()

        # Remove NaNs if any
        actual_total_homeless = actual_total_homeless if not pd.isna(actual_total_homeless) else 0.0
        actual_sheltered = actual_sheltered if not pd.isna(actual_sheltered) else 0.0
        actual_unsheltered = actual_unsheltered if not pd.isna(actual_unsheltered) else 0.0

        # Calibrate transition probabilities on prior years
        calibrator = TransitionCalibrator(df_prior)
        cal_params = {
            "p_exit_to_ph": float(df_prior["exits_to_ph"].sum() / df_prior["exits_to_ph_universe"].sum())
            if df_prior["exits_to_ph_universe"].sum() > 0 else 0.30,
            "p_return_12m": float(df_prior["returns_12m"].sum() / df_prior["exits_total"].sum())
            if df_prior["exits_total"].sum() > 0 else 0.11,
            "p_ph_retention": float(df_prior["ph_retained"].sum() / df_prior["ph_retention_universe"].sum())
            if df_prior["ph_retention_universe"].sum() > 0 else 0.85,
            "p_sheltered_given_homeless": float(df_prior["sheltered_total"].sum() / df_prior["overall_homeless"].sum())
            if df_prior["overall_homeless"].sum() > 0 else 0.55,
        }

        # Initial population: use the year *before* the held-out year
        year_before = max(self.calibration_years)
        df_init = self.df[self.df["year"] == year_before].copy()
        initial_pop = int(pd.to_numeric(df_init["overall_homeless"], errors="coerce").sum())
        initial_pop = initial_pop if not pd.isna(initial_pop) else 653104

        # Run a 1-year forecast
        model = MarkovSimulation(n_simulations=1000, horizon_years=1)
        result = model.run_scenario(
            initial_population=initial_pop,
            delay_years=0,
            **cal_params,
        )

        # Extract predicted state counts from the first (and only) projection year
        # The model returns a single-state cost per year, not per-state counts.
        # We need to reconstruct state counts from the internal simulation.
        predicted_counts = self._extract_state_counts(
            initial_pop=initial_pop, **cal_params
        )

        # Predicted totals
        predicted_total = predicted_counts["sheltered"] + predicted_counts["unsheltered"]
        predicted_sheltered = predicted_counts["sheltered"]
        predicted_unsheltered = predicted_counts["unsheltered"]

        # Compute MAE and RMSE (single data point per metric, but formula is correct)
        mae_total = abs(predicted_total - actual_total_homeless)
        rmse_total = np.sqrt((predicted_total - actual_total_homeless) ** 2)

        mae_sheltered = abs(predicted_sheltered - actual_sheltered)
        rmse_sheltered = np.sqrt((predicted_sheltered - actual_sheltered) ** 2)

        mae_unsheltered = abs(predicted_unsheltered - actual_unsheltered)
        rmse_unsheltered = np.sqrt((predicted_unsheltered - actual_unsheltered) ** 2)

        # State proportions (predicted)
        total_all = sum(predicted_counts.values())
        predicted_proportions = {
            "stable_housing": predicted_counts["stable_housing"] / total_all if total_all > 0 else 0,
            "sheltered": predicted_counts["sheltered"] / total_all if total_all > 0 else 0,
            "unsheltered": predicted_counts["unsheltered"] / total_all if total_all > 0 else 0,
            "incarcerated": predicted_counts["incarcerated"] / total_all if total_all > 0 else 0,
            "healthcare": predicted_counts["healthcare"] / total_all if total_all > 0 else 0,
            "deceased": 0,  # negligible in 1 year
        }

        # Actual proportions (only for observable states)
        total_actual = actual_total_homeless
        actual_proportions = {
            "stable_housing": None,
            "sheltered": actual_sheltered / total_actual if total_actual > 0 else None,
            "unsheltered": actual_unsheltered / total_actual if total_actual > 0 else None,
            "incarcerated": None,
            "healthcare": None,
            "deceased": None,
        }

        logger.info(
            "Hold-out validation: year=%d, predicted_total=%.0f, actual_total=%.0f, "
            "predicted_sheltered=%.0f, actual_sheltered=%.0f",
            self.held_out_year, predicted_total, actual_total_homeless,
            predicted_sheltered, actual_sheltered,
        )

        return {
            "held_out_year": self.held_out_year,
            "calibration_years": self.calibration_years,
            "initial_year": year_before,
            "initial_population": initial_pop,
            "state_predictions": {
                "total_homeless": {
                    "predicted": predicted_total,
                    "actual": actual_total_homeless,
                },
                "sheltered": {
                    "predicted": predicted_sheltered,
                    "actual": actual_sheltered,
                },
                "unsheltered": {
                    "predicted": predicted_unsheltered,
                    "actual": actual_unsheltered,
                },
            },
            "state_proportions": {
                "predicted": predicted_proportions,
                "actual": actual_proportions,
            },
            "mae_total_homeless": float(mae_total),
            "rmse_total_homeless": float(rmse_total),
            "mae_sheltered": float(mae_sheltered),
            "rmse_sheltered": float(rmse_sheltered),
            "mae_unsheltered": float(mae_unsheltered),
            "rmse_unsheltered": float(rmse_unsheltered),
        }

    def _extract_state_counts(
        self,
        initial_pop: int,
        p_exit_to_ph: float,
        p_return_12m: float,
        p_ph_retention: float,
        p_sheltered_given_homeless: float,
    ) -> Dict[str, float]:
        """
        Run one stochastic year to get expected state counts.
        Simplified: directly apply the transition matrix to the population.
        """
        from simulation import build_matrix_from_calibration

        P = build_matrix_from_calibration(
            p_exit_to_ph=p_exit_to_ph,
            p_return_12m=p_return_12m,
            p_ph_retention=p_ph_retention,
            p_sheltered_given_homeless=p_sheltered_given_homeless,
        )

        shelter_frac = float(np.clip(p_sheltered_given_homeless, 0.1, 0.9))
        n_sheltered = int(initial_pop * shelter_frac)
        n_unsheltered = initial_pop - n_sheltered

        counts = np.array([0, n_sheltered, n_unsheltered, 0, 0, 0], dtype=float)
        next_counts = P.T @ counts

        return {
            "stable_housing": float(next_counts[0]),
            "sheltered": float(next_counts[1]),
            "unsheltered": float(next_counts[2]),
            "incarcerated": float(next_counts[3]),
            "healthcare": float(next_counts[4]),
            "deceased": float(next_counts[5]),
        }
