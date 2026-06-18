from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import json
import sys
import os

# Ensure the api directory is in path for relative imports when running via uvicorn from inside api/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_pipeline import MockDataPipeline
from simulation import MarkovSimulation

app = FastAPI(title="Aegis-Sim API", description="Simulation & Data API for Aegis-Sim")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Aegis-Sim API is running"}

@app.get("/api/data-health")
def get_data_health():
    pipeline = MockDataPipeline()
    info = pipeline.inspect_directory()

    return {
        "status": info.get("status", "operational"),
        "datasets_monitored": info.get("discovered_count", 0),
        "registry": info.get("registry", []),
        "drift_detected": False,
        "missing_data_pct": 5.2
    }

class SimulationRequest(BaseModel):
    scenario: str
    delay_years: int = 0
    invisible_population_estimate: str = "medium"

@app.post("/api/simulation/run")
def run_simulation(req: SimulationRequest):
    """
    Run the Discrete-Time Markov State Transition Model with Monte Carlo simulation.
    Returns 10-year projections with cost and population estimates.
    """
    model = MarkovSimulation(n_simulations=1000, horizon_years=10)

    # For 'do_nothing' scenario, use maximum delay (10 years)
    delay = 0
    if req.scenario == 'delay':
        delay = req.delay_years
    elif req.scenario == 'do_nothing':
        delay = 10

    results = model.run_scenario(initial_population=1000, delay_years=delay)
    results["scenario"] = req.scenario
    results["delay_years"] = req.delay_years
    results["invisible_population_estimate"] = req.invisible_population_estimate
    return results