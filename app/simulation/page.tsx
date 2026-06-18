"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Play, Activity } from 'lucide-react';

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
    }, 1500);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 w-full max-w-[1600px] mx-auto">
      {/* LEFT: Controls (30%) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[30%] glass-card rounded-3xl p-6 flex flex-col gap-6"
      >
        <h2 className="text-2xl font-semibold">Simulation Controls</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Scenario Strategy</label>
            <select 
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="act_now">Act Now (Immediate Intervention)</option>
              <option value="delay">Delay Intervention</option>
              <option value="do_nothing">Wait and See (Status Quo)</option>
            </select>
          </div>

          {scenario === 'delay' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Intervention Delay (Years): {delayYears}</label>
              <input 
                type="range" 
                min="1" max="10" 
                value={delayYears} 
                onChange={(e) => setDelayYears(Number(e.target.value))}
                className="w-full accent-blue-500" 
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Invisible Population Estimate</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((opt) => (
                <button
                  key={opt}
                  className="flex-1 capitalize py-2 rounded-lg text-sm font-medium border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={runSimulation}
          disabled={isRunning}
          className="mt-auto w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {isRunning ? "Running Monte Carlo..." : <><Play size={18} /> Execute Simulation</>}
        </button>
      </motion.div>

      {/* RIGHT: Results (70%) */}
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
                   <YAxis stroke="#64748b" tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
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
    </div>
  );
}