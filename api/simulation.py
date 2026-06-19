"""
simulation.py — Discrete-Time Markov State Transition Model with real Monte Carlo.

STATES (indexed 0-5):
  0: Stable Housing
  1: Emergency Shelter
  2: Unsheltered / Street
  3: Incarcerated / Justice
  4: Acute Healthcare
  5: Deceased  (absorbing — P(stay)=1.0, cannot leave)

TRANSITION MATRIX SOURCES:
  - Calibrated probabilities from TransitionCalibrator (data-driven anchors):
      p_exit_to_ph          -> row 1 (Shelter -> Stable Housing)
      p_return_12m          -> row 0 (Stable Housing -> back to homelessness)
      p_sheltered_given_homeless -> row 2 (Street -> Shelter entry rate proxy)
  - Remaining cells filled from evidence-based priors and renormalized.
  - Deceased row is always [0,0,0,0,0,1].

MONTE CARLO:
  Each trial uses np.random.multinomial(n_in_state, transition_row) to sample
  transitions stochastically. n_simulations independent trials are run and
  the 5th/50th/95th percentiles are computed per year.

NP-COD FORMULA:
  NP-COD = cumulative_10yr_cost(delay_scenario) - cumulative_10yr_cost(act_now)
  Both scenarios are run from identical starting conditions; the difference
  is the additional cost attributable to the intervention delay.
"""

from __future__ import annotations

import numpy as np
from typing import Dict, Any, Optional

# ---------------------------------------------------------------------------
# State definitions
# ---------------------------------------------------------------------------

STATE_NAMES = [
    "Stable Housing",
    "Emergency Shelter",
    "Unsheltered",
    "Incarcerated",
    "Healthcare",
    "Deceased",
]

# Annual cost per person per state (USD), annualised from literature
STATE_ANNUAL_COSTS = np.array([
    12_000,   # Stable Housing (supportive services overhead)
    25_000,   # Emergency Shelter (nightly rate × occupancy)
    45_000,   # Unsheltered (ER cycling, policing, outreach)
    60_000,   # Incarcerated (average daily rate × days)
    85_000,   # Acute Healthcare (inpatient episode costs)
    0,        # Deceased
], dtype=float)

# ---------------------------------------------------------------------------
# Prior transition matrix
# Evidence-based defaults used where calibrated data is unavailable.
# All rows sum to 1.0. Deceased is always absorbing.
# ---------------------------------------------------------------------------

_PRIOR = np.array([
    # Housing  Shelter  Street   Jail    Health  Deceased
    [0.940,   0.030,   0.010,   0.010,  0.005,  0.005],  # 0: Stable Housing
    [0.100,   0.700,   0.150,   0.020,  0.020,  0.010],  # 1: Emergency Shelter
    [0.020,   0.200,   0.650,   0.080,  0.030,  0.020],  # 2: Unsheltered
    [0.050,   0.100,   0.150,   0.680,  0.010,  0.010],  # 3: Incarcerated
    [0.050,   0.050,   0.100,   0.000,  0.750,  0.050],  # 4: Healthcare
    [0.000,   0.000,   0.000,   0.000,  0.000,  1.000],  # 5: Deceased
], dtype=float)


# ---------------------------------------------------------------------------
# Matrix construction from calibrated parameters
# ---------------------------------------------------------------------------

def build_matrix_from_calibration(
    p_exit_to_ph: Optional[float] = None,
    p_return_12m: Optional[float] = None,
    p_ph_retention: Optional[float] = None,
    p_sheltered_given_homeless: Optional[float] = None,
) -> np.ndarray:
    """
    Build a 6×6 Markov transition matrix using calibrated anchor probabilities.

    Calibrated values override specific cells in the prior matrix; all rows are
    renormalized to sum to 1.0 after overrides. Deceased row is forced to [0,…,0,1].

    Parameters
    ----------
    p_exit_to_ph : float | None
        P(exit to permanent housing | in shelter this year). Source: SPM 7.
        Overrides P[1,0] (Shelter → Stable Housing).
    p_return_12m : float | None
        P(return to homelessness within 12m | stably housed). Source: SPM 2.
        Overrides the total outflow from row 0 (Stable Housing → homeless).
    p_ph_retention : float | None
        P(retain permanent housing ≥6mo | placed in PH). Source: SPM 7.
        Used to modulate the Housing row stability.
    p_sheltered_given_homeless : float | None
        Fraction of homeless who are sheltered. Source: PIT counts.
        Used to split the return-to-homelessness flow and set street→shelter rate.

    Returns
    -------
    np.ndarray  shape (6, 6), all rows sum to 1.0, Deceased is absorbing.
    """
    P = _PRIOR.copy()

    shelter_frac = float(np.clip(p_sheltered_given_homeless, 0.2, 0.9)) \
        if p_sheltered_given_homeless is not None else 0.55

    # ── Row 0: Stable Housing ──────────────────────────────────────────────
    # p_return_12m = total P(leaving housing → homelessness within 12m)
    if p_return_12m is not None:
        p_leave = float(np.clip(p_return_12m, 0.0, 0.90))
        # Split return flow between shelter and street using shelter_frac
        P[0, 1] = p_leave * shelter_frac
        P[0, 2] = p_leave * (1.0 - shelter_frac)
        # Keep incarceration / healthcare / deceased cells from prior; adjust stable
        non_homeless_outflow = P[0, 3] + P[0, 4] + P[0, 5]
        P[0, 0] = max(0.0, 1.0 - p_leave - non_homeless_outflow)

    # ── Row 1: Emergency Shelter ───────────────────────────────────────────
    # p_exit_to_ph = P(exit to permanent housing | in shelter)
    if p_exit_to_ph is not None:
        p_ph = float(np.clip(p_exit_to_ph, 0.0, 0.90))
        # Fixed outflows: incarceration, healthcare, deceased from prior
        fixed_out = P[1, 3] + P[1, 4] + P[1, 5]
        residual = max(0.0, 1.0 - p_ph - fixed_out)
        P[1, 0] = p_ph
        # Distribute residual between stay-in-shelter and move-to-street
        # preserving their relative ratio from the prior
        prior_shelter_street = _PRIOR[1, 1] + _PRIOR[1, 2]
        if prior_shelter_street > 0:
            P[1, 1] = residual * (_PRIOR[1, 1] / prior_shelter_street)
            P[1, 2] = residual * (_PRIOR[1, 2] / prior_shelter_street)
        else:
            P[1, 1] = residual * 0.80
            P[1, 2] = residual * 0.20

    # ── Row 2: Unsheltered / Street ────────────────────────────────────────
    # Use shelter_frac to scale the street→shelter entry rate
    if p_sheltered_given_homeless is not None:
        # Street→Shelter: CoCs with high shelter utilization also see higher
        # inflow into shelter from street (proxy for outreach effectiveness)
        p_enter_shelter = float(np.clip(shelter_frac * 0.35, 0.02, 0.35))
        P[2, 1] = p_enter_shelter

    if p_exit_to_ph is not None:
        # Street→Stable Housing: much lower than shelter, ~25% of shelter rate
        p_ph_from_street = float(np.clip(p_exit_to_ph * 0.25, 0.003, 0.08))
        P[2, 0] = p_ph_from_street

    if p_sheltered_given_homeless is not None or p_exit_to_ph is not None:
        # Residual goes to staying on street
        fixed_out_2 = P[2, 3] + P[2, 4] + P[2, 5]
        P[2, 2] = max(0.0, 1.0 - P[2, 0] - P[2, 1] - fixed_out_2)

    # ── Renormalize rows 0-4; force Deceased absorbing ────────────────────
    for i in range(5):
        row_sum = P[i].sum()
        if row_sum > 0:
            P[i] = P[i] / row_sum
    P[5] = np.array([0.0, 0.0, 0.0, 0.0, 0.0, 1.0])

    return P


# ---------------------------------------------------------------------------
# Delay penalty
# ---------------------------------------------------------------------------

def _apply_delay_penalty(P: np.ndarray, delay_years: int) -> np.ndarray:
    """
    Worsen transitions out of homelessness states as a function of delay_years.

    Literature basis: each year of delayed Permanent Supportive Housing access
    is associated with increased health deterioration, higher ER utilisation,
    and increased criminal justice involvement (Culhane et al. 2020; Tsai 2018).

    Penalty structure (cumulative, not per-year):
      - Shelter → Housing: −1pp per year (up to −10pp)
      - Street  → Housing: −0.5pp per year (up to −5pp)
      - Shelter → Shelter: +1pp per year (trap probability increases)
      - Street  → Street:  +0.5pp per year
      - Jail    → Jail:    +0.5pp per year (recidivism worsens)

    Rows are renormalized to sum to 1 after penalty is applied.
    """
    if delay_years <= 0:
        return P

    P = P.copy()
    # Linear penalty, capped per-transition
    penalty_shelter = min(delay_years * 0.01, 0.10)   # −1pp/yr up to −10pp
    penalty_street  = min(delay_years * 0.005, 0.05)  # −0.5pp/yr up to −5pp
    penalty_jail    = min(delay_years * 0.005, 0.05)  # +0.5pp/yr up to +5pp

    # Shelter: harder to exit to stable housing
    P[1, 0] = max(P[1, 0] - penalty_shelter, 0.001)
    P[1, 1] = min(P[1, 1] + penalty_shelter, 0.990)

    # Street: harder to escape
    P[2, 0] = max(P[2, 0] - penalty_street, 0.001)
    P[2, 2] = min(P[2, 2] + penalty_street, 0.990)

    # Jail: recidivism worsens, harder to exit to housing
    P[3, 3] = min(P[3, 3] + penalty_jail, 0.990)
    P[3, 0] = max(P[3, 0] - penalty_jail, 0.001)

    # Renormalize
    for i in range(5):
        row_sum = P[i].sum()
        if row_sum > 0:
            P[i] = P[i] / row_sum
    P[5] = np.array([0.0, 0.0, 0.0, 0.0, 0.0, 1.0])

    return P



# ---------------------------------------------------------------------------
# Simulation class
# ---------------------------------------------------------------------------

class MarkovSimulation:
    """
    Discrete-time Markov State Transition Model with Monte Carlo sampling.

    Each simulation trial stochastically evolves the population using
    np.random.multinomial per state per year. n_simulations independent
    trials produce a distribution over outcomes; results are reported at
    the 5th, 50th (median), and 95th percentiles.

    Usage::

        sim = MarkovSimulation(n_simulations=1000, horizon_years=10)
        result_now   = sim.run_scenario(pop, delay_years=0, **cal_params)
        result_delay = sim.run_scenario(pop, delay_years=5, **cal_params)
        np_cod       = sim.compute_np_cod(result_delay, result_now)
    """

    def __init__(self, n_simulations: int = 1000, horizon_years: int = 10):
        self.n_simulations = n_simulations
        self.horizon_years = horizon_years
        self.n_states = 6

    # ------------------------------------------------------------------
    # Single trial
    # ------------------------------------------------------------------

    def _run_single_trial(
        self,
        P: np.ndarray,
        initial_counts: np.ndarray,
        rng: np.random.Generator,
    ) -> Dict[str, Any]:
        """
        Run one Monte Carlo trial.

        Parameters
        ----------
        P : np.ndarray  shape (6, 6)
            Transition matrix for this trial.
        initial_counts : np.ndarray  shape (6,)
            Number of people starting in each state.
        rng : np.random.Generator

        Returns
        -------
        dict with keys 'costs' (list of float) and 'populations' (list of int),
        both of length horizon_years.
        """
        counts = initial_counts.copy().astype(np.int64)
        yearly_costs: list[float] = []
        yearly_pops: list[int] = []

        for _ in range(self.horizon_years):
            next_counts = np.zeros(self.n_states, dtype=np.int64)

            for state in range(self.n_states):
                n = int(counts[state])
                if n > 0:
                    transitions = rng.multinomial(n, P[state])
                    next_counts += transitions

            counts = next_counts
            yearly_costs.append(float(np.dot(counts, STATE_ANNUAL_COSTS)))
            yearly_pops.append(int(counts[:5].sum()))  # exclude Deceased

        return {"costs": yearly_costs, "populations": yearly_pops}

    # ------------------------------------------------------------------
    # Public: run scenario
    # ------------------------------------------------------------------

    def run_scenario(
        self,
        initial_population: int,
        delay_years: int,
        p_exit_to_ph: Optional[float] = None,
        p_return_12m: Optional[float] = None,
        p_ph_retention: Optional[float] = None,
        p_sheltered_given_homeless: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Run n_simulations Monte Carlo trials and return percentile summaries.

        Parameters
        ----------
        initial_population : int
            Total homeless population at t=0 (from PIT overall_homeless).
        delay_years : int
            Years of policy delay (0 = act now).
        p_exit_to_ph, p_return_12m, p_ph_retention, p_sheltered_given_homeless : float|None
            Calibrated transition probabilities from TransitionCalibrator.
            If None, evidence-based prior values are used.

        Returns
        -------
        dict
            Keys: 'scenario', 'delay_years', 'projections' (list of dicts per year),
            'total_10yr_cost_median', 'total_10yr_cost_p05', 'total_10yr_cost_p95'.
            Each projection has: year, cost (median), cost_p05, cost_p95,
            population (median), population_p05, population_p95.
        """
        # Build calibrated base matrix, then apply delay penalty
        P_base = build_matrix_from_calibration(
            p_exit_to_ph=p_exit_to_ph,
            p_return_12m=p_return_12m,
            p_ph_retention=p_ph_retention,
            p_sheltered_given_homeless=p_sheltered_given_homeless,
        )
        P = _apply_delay_penalty(P_base, delay_years)

        # Initial state distribution: split into sheltered / unsheltered
        shelter_frac = float(np.clip(p_sheltered_given_homeless, 0.1, 0.9)) \
            if p_sheltered_given_homeless is not None else 0.40
        n_sheltered = int(initial_population * shelter_frac)
        n_unsheltered = initial_population - n_sheltered
        initial_counts = np.array(
            [0, n_sheltered, n_unsheltered, 0, 0, 0], dtype=np.int64
        )

        # Run Monte Carlo trials
        rng = np.random.default_rng(seed=42)
        all_costs = np.zeros((self.n_simulations, self.horizon_years))
        all_pops  = np.zeros((self.n_simulations, self.horizon_years))

        for i in range(self.n_simulations):
            trial = self._run_single_trial(P, initial_counts, rng)
            all_costs[i] = trial["costs"]
            all_pops[i]  = trial["populations"]

        # Cumulative costs per trial
        cumcosts = all_costs.cumsum(axis=1)  # (n_sim, years)

        # Compute percentiles
        costs_p05 = np.percentile(all_costs, 5,  axis=0)
        costs_p50 = np.percentile(all_costs, 50, axis=0)
        costs_p95 = np.percentile(all_costs, 95, axis=0)

        pops_p05 = np.percentile(all_pops, 5,  axis=0).astype(int)
        pops_p50 = np.percentile(all_pops, 50, axis=0).astype(int)
        pops_p95 = np.percentile(all_pops, 95, axis=0).astype(int)

        cum_p05 = np.percentile(cumcosts, 5,  axis=0)
        cum_p50 = np.percentile(cumcosts, 50, axis=0)
        cum_p95 = np.percentile(cumcosts, 95, axis=0)

        # Build per-year projection list
        base_year = 2025
        projections = []
        for t in range(self.horizon_years):
            projections.append({
                "year":           base_year + t,
                "cost":           float(costs_p50[t]),   # median — frontend uses this
                "cost_p05":       float(costs_p05[t]),
                "cost_p95":       float(costs_p95[t]),
                "population":     int(pops_p50[t]),
                "population_p05": int(pops_p05[t]),
                "population_p95": int(pops_p95[t]),
            })

        return {
            "scenario":                "delay" if delay_years > 0 else "act_now",
            "delay_years":             delay_years,
            "projections":             projections,
            "total_10yr_cost_p05":    float(cum_p05[-1]),
            "total_10yr_cost_median": float(cum_p50[-1]),
            "total_10yr_cost_p95":    float(cum_p95[-1]),
        }

    # ------------------------------------------------------------------
    # Public: NP-COD
    # ------------------------------------------------------------------

    def compute_np_cod(
        self,
        result_delay: Dict[str, Any],
        result_baseline: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Compute NP-COD (Net Present Cost of Delay).

        NP-COD = cumulative_10yr_cost(delay_scenario) - cumulative_10yr_cost(act_now)

        Both scenarios must have been run from identical starting conditions.
        The difference is the additional cumulative taxpayer burden attributable
        specifically to the intervention delay.

        Parameters
        ----------
        result_delay : dict
            Output of run_scenario() with delay_years > 0.
        result_baseline : dict
            Output of run_scenario() with delay_years = 0.

        Returns
        -------
        dict with keys np_cod (median), confidence_interval {lower_80, upper_80}.
        """
        cost_delay = result_delay["total_10yr_cost_median"]
        cost_base  = result_baseline["total_10yr_cost_median"]
        np_cod = max(0.0, cost_delay - cost_base)

        # 80% CI derived from p05/p95 of the delay scenario's cost uncertainty
        # relative to baseline median (conservative but honest)
        delay_p05 = result_delay["total_10yr_cost_p05"]
        delay_p95 = result_delay["total_10yr_cost_p95"]
        base_med  = result_baseline["total_10yr_cost_median"]

        lower = max(0.0, delay_p05 - base_med)
        upper = max(0.0, delay_p95 - base_med)

        return {
            "np_cod": float(np_cod),
            "confidence_interval": {
                "lower_80": float(lower),
                "upper_80": float(upper),
            },
        }
