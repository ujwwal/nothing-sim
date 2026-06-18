from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import json

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
    from api.data_pipeline import MockDataPipeline
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
    from api.simulation import MarkovSimulation
    
    # Initialize the model with a standard 10-year horizon
    model = MarkovSimulation(n_simulations=1000, horizon_years=10)
    
    # Run the scenario using the delay_years from the request
    # Assuming a baseline population of 1000 for demonstration
    results = model.run_scenario(initial_population=1000, delay_years=req.delay_years)
    
    # Ensure scenario name matches the request
    results["scenario"] = req.scenario
    
    return results