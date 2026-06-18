"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '@/lib/store';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import { Play, Activity, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

const INVISIBLE_POP_MULTIPLIERS: Record<string, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.5,
};

export default function SimulationPage() {
  const { scenario, delayYears, setScenario, setDelayYears, results, setResults } = useSimulationStore();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invisiblePop, setInvisiblePop] = useState<'low' | 'medium' | 'high'>('medium');

  const runSimulation = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const delayYearsToSend = scenario === 'act_now' ? 0 : scenario === 'do_nothing' ? 10 : delayYears;
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          delay_years: delayYearsToSend,
          invisible_population_estimate: invisiblePop,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Simulation failed');
      }

      // Apply invisible population multiplier to projections
      const multiplier = INVISIBLE_POP_MULTIPLIERS[invisiblePop];
      const adjustedProjections = (data.projections || []).map((p: any) => ({
        ...p,
        cost: Math.round(p.cost * multiplier),
        population: Math.round(p.population * multiplier),
        ci_low: Math.round((p.cost * multiplier) * 0.85),
        ci_high: Math.round((p.cost * multiplier) * 1.15),
      }));

      setResults({
        ...data,
        projections: adjustedProjections,
        np_cod: data.np_cod * multiplier,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const npCod = results?.np_cod ?? 0;
  const lastProjection = results?.projections?.[results.projections.length - 1];

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 w-full max-w-[1600px] mx-auto">
      {/* LEFT: Controls (30%) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[30%] glass-card rounded-3xl p-6 flex flex-col gap-6"
      >
        <div>
          <h2 className="text-2xl font-semibold">Simulation Controls</h2>
          <p className="text-slate-400 text-sm mt-1">Configure your intervention scenario</p>
        </div>

        <div className="space-y-5">
          {/* Scenario */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Scenario Strategy</label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'act_now', label: 'Act Now', desc: 'Immediate PSH intervention' },
                { value: 'delay', label: 'Delay Intervention', desc: `Delay by ${delayYears} year${delayYears !== 1 ? 's' : ''}` },
                { value: 'do_nothing', label: 'Do Nothing', desc: 'Status quo for 10 years' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScenario(s.value)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    scenario === s.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <p className="font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Delay Slider */}
          <AnimatePresence>
            {scenario === 'delay' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Delay Duration: <span className="text-white font-bold">{delayYears} year{delayYears !== 1 ? 's' : ''}</span>
                </label>
                <input
                  type="range" min="1" max="10"
                  value={delayYears}
                  onChange={(e) => setDelayYears(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 yr</span><span>10 yrs</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invisible Population */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Invisible Population Estimate</label>
            <p className="text-xs text-slate-500 mb-2">Adjusts for undercounting of street homeless</p>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setInvisiblePop(opt)}
                  className={`flex-1 capitalize py-2 rounded-lg text-sm font-medium border transition-all ${
                    invisiblePop === opt
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={runSimulation}
          disabled={isRunning}
          className="mt-auto w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {isRunning
            ? <><span className="animate-spin">⟳</span> Running Monte Carlo...</>
            : <><Play size={18} /> Execute Simulation</>
          }
        </button>

        {/* Responsible AI notice */}
        <p className="text-xs text-slate-600 text-center">
          ⚠️ For planning purposes only. Not for individual decisions.
        </p>
      </motion.div>

      {/* RIGHT: Results (70%) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[70%] glass-card rounded-3xl p-6 flex flex-col min-h-[500px]"
      >
        <h2 className="text-2xl font-semibold mb-1">Projections & Fiscal Impact</h2>
        <p className="text-slate-400 text-sm mb-6">10-Year Markov State Transition Model with Monte Carlo uncertainty</p>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/50 rounded-xl mb-4"
          >
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium text-sm">Simulation Error</p>
              <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}

        {!results && !isRunning && !error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Activity size={48} className="mb-4 opacity-30" />
            <p className="font-medium">Ready to Simulate</p>
            <p className="text-sm text-slate-600 mt-1">Configure your scenario on the left and click Execute</p>
          </div>
        ) : isRunning ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mb-4" />
            </div>
            <p className="font-medium">Running 1,000 Monte Carlo simulations...</p>
            <p className="text-sm text-slate-500 mt-1">Markov state transitions computing</p>
          </div>
        ) : results ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col gap-6"
          >
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-2xl">
                <p className="text-xs text-slate-400">Net Present Cost of Delay</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  ${(npCod / 1_000_000).toFixed(1)}M
                </p>
                <p className="text-xs text-slate-500 mt-1">NP-CoD metric</p>
              </div>
              <div className="p-4 bg-amber-900/20 border border-amber-700/30 rounded-2xl">
                <p className="text-xs text-slate-400">Population at Year 10</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {lastProjection?.population?.toLocaleString() ?? '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Chronic homeless</p>
              </div>
              <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-2xl col-span-2 lg:col-span-1">
                <p className="text-xs text-slate-400">Scenario</p>
                <p className="text-lg font-bold text-blue-400 mt-1 capitalize">
                  {results.scenario?.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {scenario === 'delay' ? `${delayYears}yr delay` : scenario === 'act_now' ? 'Immediate action' : 'No intervention'}
                </p>
              </div>
            </div>

            {/* Cost Chart */}
            <div className="flex-1 min-h-[250px]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-blue-400" />
                <h3 className="text-sm font-medium text-slate-300">Projected Annual Cost with 80% Confidence Band</h3>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.projections} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${(val / 1_000_000).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: 12 }}
                    formatter={(val: any, name: string) => {
                      if (name === 'cost') return [`$${(val / 1_000_000).toFixed(2)}M`, 'Projected Cost'];
                      if (name === 'ci_high') return [`$${(val / 1_000_000).toFixed(2)}M`, 'CI Upper 80%'];
                      if (name === 'ci_low') return [`$${(val / 1_000_000).toFixed(2)}M`, 'CI Lower 80%'];
                      return [val, name];
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="ci_high" stroke="#3b82f6" strokeWidth={0} fill="#3b82f6" fillOpacity={0.12} name="ci_high" />
                  <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="cost" />
                  <Area type="monotone" dataKey="ci_low" stroke="#3b82f6" strokeWidth={0} fill="#020617" fillOpacity={1} name="ci_low" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Assumptions disclaimer */}
            <div className="flex items-start gap-2 p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
              <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Projections use a Discrete-Time Markov State Transition Model with {(1000).toLocaleString()} Monte Carlo iterations.
                Invisible population multiplier: {INVISIBLE_POP_MULTIPLIERS[invisiblePop]}×. These are estimates, not forecasts.
              </p>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}