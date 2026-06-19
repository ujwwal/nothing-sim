"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Play } from 'lucide-react';

export default function SimulationPage() {
  const { scenario, delayYears, setScenario, setDelayYears, results } = useSimulationStore();
  const [isRunning, setIsRunning] = useState(false);

  const runSimulation = async () => {
    setIsRunning(true);
    // Mimic API delay
    setTimeout(() => {
      useSimulationStore.getState().setResults({
        projections: [
          { year: 2024, cost: 15_000_000, population: 1500, ci_low: 13.5, ci_high: 16.5 },
          { year: 2025, cost: 15_800_000, population: 1550, ci_low: 14.1, ci_high: 17.5 },
          { year: 2026, cost: 16_900_000, population: 1620, ci_low: 15.0, ci_high: 18.8 },
          { year: 2027, cost: 18_100_000, population: 1700, ci_low: 16.0, ci_high: 20.2 },
          { year: 2028, cost: 19_500_000, population: 1800, ci_low: 17.2, ci_high: 21.8 },
        ]
      });
      setIsRunning(false);
    }
  };

  const npCodLow = results ? (results.confidence_interval?.lower_80 ?? results.np_cod * 0.8) : 0;
  const npCodHigh = results ? (results.confidence_interval?.upper_80 ?? results.np_cod * 1.2) : 0;
  const lastP = results?.projections?.[results.projections.length - 1];
  const firstP = results?.projections?.[0];

  const fmtM = (v: number) => `$${(v / 1e6).toFixed(1)}M`;

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 pb-10">

      {/* ── LEFT: Controls (30%) ─────────────────────────────────────────── */}
      <div className="w-full lg:w-[30%] flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-3xl p-6 flex flex-col gap-5"
        >
          <div>
            <h2 className="text-xl font-semibold">Simulation Controls</h2>
            <p className="text-slate-400 text-xs mt-1">Configure your intervention scenario</p>
          </div>

          {/* Scenario */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Scenario</label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'act_now', label: 'Act Now', desc: 'Immediate PSH rollout' },
                { value: 'delay', label: 'Delay Intervention', desc: `Wait ${delayYears} yr${delayYears !== 1 ? 's' : ''} before acting` },
                { value: 'do_nothing', label: 'Do Nothing', desc: 'Status quo for 10 years' },
              ].map(s => (
                <button key={s.value} onClick={() => setScenario(s.value)}
                  className={`text-left p-3 rounded-xl border transition-all text-sm ${scenario === s.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-700/60 text-slate-400 hover:bg-slate-800/50'
                    }`}
                >
                  <span className="font-medium block">{s.label}</span>
                  <span className="text-xs text-slate-500">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {scenario === 'delay' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                  Delay Duration: <span className="text-white font-bold">{delayYears} yr{delayYears !== 1 ? 's' : ''}</span>
                </label>
                <input type="range" min="1" max="10" value={delayYears}
                  onChange={e => setDelayYears(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1"><span>1 yr</span><span>10 yrs</span></div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invisible population */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Invisible Population Estimate</label>
            <p className="text-xs text-slate-600 mb-2">Accounts for PIT count underreporting of unsheltered individuals</p>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map(opt => (
                <button key={opt} onClick={() => setInvisiblePop(opt)}
                  className={`py-2 rounded-lg text-xs font-semibold border capitalize transition-all ${invisiblePop === opt
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                      : 'border-slate-700/60 text-slate-500 hover:bg-slate-800'
                    }`}
                >
                  {opt}
                  <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                    {INV_MULTIPLIERS[opt].mid}×
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={runSimulation} disabled={isRunning}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-40 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            {isRunning ? <><span className="inline-block animate-spin">⟳</span> Running 1,000 simulations…</> : <><Play size={15} /> Execute Simulation</>}
          </button>

          <p className="text-center text-[10px] text-slate-600">
            For policy planning only · Not for individual decisions
          </p>
        </motion.div>
      </div>

      <button
        onClick={runSimulation}
        disabled={isRunning}
        className="mt-auto w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2"
      >
        {isRunning ? "Running Monte Carlo..." : <><Play size={18} /> Execute Simulation</>}
      </button>
    </motion.div>

      {/* RIGHT: Results (70%) */ }
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="w-full lg:w-[70%] glass-card rounded-3xl p-6 flex flex-col min-h-[500px]"
  >
    <h2 className="text-2xl font-semibold mb-6">Projections & Fiscal Impact</h2>

    {!results && !isRunning ? (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <Activity size={48} className="mb-4 opacity-50" />
        <p>Configure your scenario and run the simulation to see results.</p>
      </div>
    ) : (
      <div className="flex-1 h-full flex flex-col gap-6">
        <div className="h-1/2 w-full">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Projected Annual Cost (Confidence Intervals)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={results?.projections || []}>
              <XAxis dataKey="year" stroke="#64748b" />
              <YAxis stroke="#64748b" tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="ci_high" stackId="2" stroke="none" fill="#3b82f6" fillOpacity={0.1} />
              <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={3} />
              <Area type="monotone" dataKey="ci_low" stackId="1" stroke="none" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <p className="text-sm text-slate-400">Net Present Cost of Delay</p>
            <p className="text-3xl font-bold text-red-400 mt-1">$4.2M</p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <p className="text-sm text-slate-400">Projected Population at Year 5</p>
            <p className="text-3xl font-bold text-amber-400 mt-1">1,800</p>
          </div>
        </div>
      </div>
    )}
  </motion.div>
    </div >
  );
}