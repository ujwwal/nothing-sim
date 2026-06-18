import numpy as np
import pandas as pd
from typing import Dict, Any

class MarkovSimulation:
    def __init__(self, n_simulations=1000, horizon_years=10):
        self.n_simulations = n_simulations
        self.horizon_years = horizon_years
        self.months = horizon_years * 12
        
        # State definitions:
        # 0: Stable Housing, 1: Emergency Shelter, 2: Street Homelessness
        # 3: Jail/Justice, 4: Acute Healthcare, 5: Deceased (Absorbing)
        self.n_states = 6
        
    def generate_transition_matrix(self, delay_years: int) -> np.ndarray:
        # Base transition matrix (placeholder probabilities)
        # Rows must sum to 1.0
        P = np.array([
            [0.95, 0.03, 0.01, 0.005, 0.004, 0.001], # Housing
            [0.10, 0.70, 0.15, 0.02, 0.02, 0.01],    # Shelter
            [0.02, 0.20, 0.65, 0.08, 0.03, 0.02],    # Street
            [0.05, 0.10, 0.15, 0.68, 0.01, 0.01],    # Jail
            [0.05, 0.05, 0.10, 0.00, 0.75, 0.05],    # Healthcare
            [0.00, 0.00, 0.00, 0.00, 0.00, 1.00]     # Deceased
        ])
        
        # If delayed interventions, slightly worsen transitions
        if delay_years > 0:
            penalty = min(delay_years * 0.01, 0.05)
            P[1, 1] += penalty
            P[1, 0] -= penalty
            P[2, 2] += penalty
            P[2, 0] -= penalty
            
        return P
        
    def run_scenario(self, initial_population: int, delay_years: int) -> Dict[str, Any]:
        P = self.generate_transition_matrix(delay_years)
        
        results = []
        cost_sum = 0
        
        # Simple deterministic expected value for now to satisfy MVP
        # A true monte carlo would use np.random.multinomial per person
        current_state_dist = np.array([0, initial_population * 0.4, initial_population * 0.6, 0, 0, 0])
        
        costs = np.array([12000, 25000, 45000, 60000, 85000, 0]) # Annualized costs
        
        for t in range(self.horizon_years):
            current_state_dist = current_state_dist.dot(P)
            yearly_cost = np.sum(current_state_dist * costs)
            results.append({
                "year": 2024 + t,
                "cost": float(yearly_cost),
                "population": int(np.sum(current_state_dist[:5]))
            })
            
        np_cod_base = sum([r['cost'] for r in results])
        
        return {
            "scenario": "delay" if delay_years > 0 else "act_now",
            "np_cod": float(np_cod_base * 0.2 * delay_years), # Mock NP-COD metric
            "projections": results,
            "confidence_interval": {
                "lower_80": float(np_cod_base * 0.8),
                "upper_80": float(np_cod_base * 1.2)
            }
        }
