import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_pipeline import MockDataPipeline
from simulation import MarkovSimulation

p = MockDataPipeline()
info = p.inspect_directory()
print("Datasets found:", info['discovered_count'])

model = MarkovSimulation()
result = model.run_scenario(initial_population=500, delay_years=3)
print("Simulation OK. NP-CoD:", result['np_cod'])
print("First projection:", result['projections'][0])
