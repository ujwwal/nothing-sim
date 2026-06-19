import sys, os, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print('=== Test 1: simulation.py - build_matrix_from_calibration ===')
from simulation import MarkovSimulation, build_matrix_from_calibration
import numpy as np

la_params = dict(
    p_exit_to_ph=0.296,
    p_return_12m=0.108,
    p_ph_retention=0.87,
    p_sheltered_given_homeless=0.55,
)

P = build_matrix_from_calibration(**la_params)
print('Transition matrix row sums:')
all_ok = True
for i, name in enumerate(['Housing','Shelter','Street','Jail','Healthcare','Deceased']):
    s = P[i].sum()
    ok = 'OK' if abs(s - 1.0) < 1e-9 else 'FAIL'
    if ok == 'FAIL':
        all_ok = False
    print(f'  {name:12s}: {s:.10f}  [{ok}]')

print()
print('Deceased row:', P[5].tolist())
assert P[5][5] == 1.0 and all(P[5][:5] == 0), 'FAIL: Deceased not absorbing!'
print('Deceased absorbing: OK')

shelter_to_housing = round(P[1,0], 4)
street_to_housing = round(P[2,0], 4)
print(f'P(Shelter->Housing): {shelter_to_housing}  P(Street->Housing): {street_to_housing}')
assert shelter_to_housing > street_to_housing, 'FAIL: Direction inverted!'
print('Direction correct (Shelter > Street): OK')

assert all_ok, 'FAIL: Some row does not sum to 1.0'
print('All rows sum to 1.0: OK')

print()
print('=== Test 2: Monte Carlo runs with LA calibrated params ===')
sim = MarkovSimulation(n_simulations=500, horizon_years=10)
r_base  = sim.run_scenario(initial_population=5000, delay_years=0, **la_params)
r_delay = sim.run_scenario(initial_population=5000, delay_years=5, **la_params)
np_cod  = sim.compute_np_cod(r_delay, r_base)

base_cost = r_base['total_10yr_cost_median']
delay_cost = r_delay['total_10yr_cost_median']
npcod_val = np_cod['np_cod']
ci_low = np_cod['confidence_interval']['lower_80']
ci_high = np_cod['confidence_interval']['upper_80']

print(f'act_now  10yr cost (median): ${base_cost:>15,.0f}')
print(f'delay_5  10yr cost (median): ${delay_cost:>15,.0f}')
print(f'NP-COD:                      ${npcod_val:>15,.0f}')
print(f'CI lower_80:                 ${ci_low:>15,.0f}')
print(f'CI upper_80:                 ${ci_high:>15,.0f}')

assert npcod_val > 0, f'FAIL: NP-COD is not positive! ({npcod_val})'
print('NP-COD > 0 (delay costs MORE than act_now): OK')

assert ci_low <= ci_high, f'FAIL: CI inverted! {ci_low} > {ci_high}'
print('CI ordering (lower <= upper): OK')

# Verify percentile ordering for every year
bad_years = []
for t, p in enumerate(r_base['projections']):
    if not (p['cost_p05'] <= p['cost'] <= p['cost_p95']):
        bad_years.append(f"year {t}: cost {p['cost_p05']:.0f} <= {p['cost']:.0f} <= {p['cost_p95']:.0f}?")
    if not (p['population_p05'] <= p['population'] <= p['population_p95']):
        bad_years.append(f"year {t}: pop {p['population_p05']} <= {p['population']} <= {p['population_p95']}?")
if bad_years:
    print('FAIL: Percentile ordering issues:', bad_years)
else:
    print('Percentile ordering p05<=p50<=p95 for all 10 years: OK')

# Check bands are NOT identical (real variance)
year0 = r_base['projections'][0]
band_width = year0['cost_p95'] - year0['cost_p05']
print(f'Year 1 cost band width: ${band_width:,.0f}  (should be non-zero for real MC)')
assert band_width > 0, 'FAIL: p05==p95, no variance in MC output!'
print('MC bands have real variance: OK')

print()
print('=== Test 3: act_now scenario NP-COD should be 0 ===')
np_cod_now = sim.compute_np_cod(r_base, r_base)
print(f'NP-COD(act_now vs act_now): {np_cod_now["np_cod"]:.0f}')
assert np_cod_now['np_cod'] == 0.0, 'FAIL: NP-COD of act_now vs itself is not 0!'
print('NP-COD(self vs self) = 0: OK')

print()
print('=== Test 4: Prior-only mode (no calibration params) ===')
r_prior = sim.run_scenario(initial_population=1000, delay_years=3)
assert len(r_prior['projections']) == 10, 'FAIL: Not 10 years of projections'
assert r_prior['projections'][0]['cost'] > 0, 'FAIL: Zero cost in year 1'
print(f'Prior-only 10yr median cost: ${r_prior["total_10yr_cost_median"]:,.0f}')
print('Prior-only mode: OK')

print()
print('=== ALL SIMULATION TESTS PASSED ===')
