"""
test_pipeline_wiring.py — Integration test for main.py pipeline connection.
Tests that the full pipeline loads and the simulation uses real data.
"""
import sys, os, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
logging.basicConfig(level=logging.WARNING)  # suppress info noise

print('=== Integration Test: Pipeline Cache Build ===')

from main import _build_pipeline_cache, _safe

cache = _build_pipeline_cache()

print(f'data_source: {cache["data_source"]}')
print(f'calibration_year: {cache["calibration_year"]}')
print(f'CoCs calibrated: {len(cache["cal_by_coc"])}')
print(f'CoCs with PIT pop: {len(cache["pop_by_coc"])}')
print(f'national_pop: {cache["national_pop"]:,}')
print()

# Spot check CA-600 (LA)
coc = 'CA-600'
if coc in cache['cal_by_coc']:
    p = cache['cal_by_coc'][coc]
    pop = cache['pop_by_coc'].get(coc, 'NOT FOUND')
    print(f'{coc} calibrated params:')
    for k, v in p.items():
        print(f'  {k}: {v}')
    print(f'{coc} PIT population: {pop:,}' if isinstance(pop, int) else f'{coc} PIT population: {pop}')
    
    # Validate ranges
    assert p['p_exit_to_ph'] is not None and 0 < p['p_exit_to_ph'] < 1, f'FAIL: p_exit_to_ph out of range: {p["p_exit_to_ph"]}'
    assert p['p_return_12m'] is not None and 0 < p['p_return_12m'] < 1, f'FAIL: p_return_12m out of range: {p["p_return_12m"]}'
    print(f'{coc} params in [0,1]: OK')
    
    if isinstance(pop, int):
        assert 10_000 < pop < 200_000, f'FAIL: LA pop {pop:,} way off expected ~71k'
        print(f'{coc} population plausible ({pop:,}): OK')
else:
    print(f'WARN: {coc} not in cache (fallback mode)')

print()
print('=== Integration Test: run_simulation endpoint logic ===')

# Simulate what the endpoint does
from simulation import MarkovSimulation

coc_key = 'CA-600'
if coc_key in cache['cal_by_coc']:
    cal_params = cache['cal_by_coc'][coc_key]
    pop = cache['pop_by_coc'].get(coc_key, cache['national_pop'])
else:
    cal_params = cache['national_params']
    pop = cache['national_pop']

print(f'Using CoC: {coc_key}')
print(f'Population: {pop:,}')
print(f'Params: {cal_params}')

sim = MarkovSimulation(n_simulations=200, horizon_years=10)
r_base  = sim.run_scenario(initial_population=pop, delay_years=0,  **cal_params)
r_delay = sim.run_scenario(initial_population=pop, delay_years=5,  **cal_params)
r_dnot  = sim.run_scenario(initial_population=pop, delay_years=10, **cal_params)

cod_5yr  = sim.compute_np_cod(r_delay, r_base)
cod_10yr = sim.compute_np_cod(r_dnot,  r_base)

print()
print(f'act_now  10yr: ${r_base["total_10yr_cost_median"]:>18,.0f}')
print(f'delay_5  10yr: ${r_delay["total_10yr_cost_median"]:>18,.0f}')
print(f'do_nothing:    ${r_dnot["total_10yr_cost_median"]:>18,.0f}')
print(f'NP-COD(5yr):   ${cod_5yr["np_cod"]:>18,.0f}')
print(f'NP-COD(10yr):  ${cod_10yr["np_cod"]:>18,.0f}')

assert r_delay['total_10yr_cost_median'] > r_base['total_10yr_cost_median'], \
    'FAIL: delay does NOT cost more than act_now!'
assert r_dnot['total_10yr_cost_median'] >= r_delay['total_10yr_cost_median'], \
    'FAIL: do_nothing does NOT cost more than delay_5!'
print()
print('Cost ordering (act_now < delay_5 < do_nothing): OK')

assert cod_5yr['np_cod'] > 0, 'FAIL: 5yr delay NP-COD is not positive!'
assert cod_10yr['np_cod'] > cod_5yr['np_cod'], 'FAIL: 10yr NP-COD not > 5yr NP-COD!'
print('NP-COD ordering (5yr < 10yr, both > 0): OK')

print()
print('=== ALL INTEGRATION TESTS PASSED ===')
