"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const dummyData = [
  { year: '2024', base: 450, delayed: 450 },
  { year: '2025', base: 430, delayed: 480 },
  { year: '2026', base: 410, delayed: 510 },
  { year: '2027', base: 390, delayed: 550 },
  { year: '2028', base: 370, delayed: 590 },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-semibold mb-2">Executive Overview</h1>
        <p className="text-slate-400">Baseline indicators and high-level fiscal impact estimates.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <KPICard title="Estimated Sheltered" value="1,240" trend="+2.4%" />
        <KPICard title="Estimated Unsheltered" value="450" trend="+5.1%" />
        <KPICard title="Annual System Cost (Status Quo)" value="$14.2M" />
        <KPICard title="Net Present Cost of Delay" value="$8.5M" highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full h-[400px]">
        <motion.div className="glass-card rounded-3xl p-6 h-full flex flex-col">
          <h3 className="text-lg font-medium mb-4">Estimated Population Trends</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dummyData}>
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="base" stroke="#10b981" strokeWidth={3} name="Act Now" />
                <Line type="monotone" dataKey="delayed" stroke="#ef4444" strokeWidth={3} name="Delay 3 Years" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-2xl font-semibold mb-4">Ready to test scenarios?</h3>
          <p className="text-slate-400 mb-6 max-w-sm">Use the simulation engine to generate specific Monte Carlo projections based on local data.</p>
          <a href="/simulation" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-lg text-sm">
            Launch Simulator
          </a>
        </motion.div>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, highlight }: { title: string, value: string, trend?: string, highlight?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`glass-card p-6 rounded-3xl flex flex-col justify-between ${highlight ? 'ring-1 ring-blue-500/50 bg-blue-500/10' : ''}`}
    >
      <h3 className="text-sm text-slate-400 font-medium mb-2">{title}</h3>
      <div className="flex items-end justify-between">
        <span className={`text-3xl font-bold tracking-tight ${highlight ? 'text-blue-400' : ''}`}>{value}</span>
        {trend && <span className="text-sm font-medium text-emerald-400">{trend}</span>}
      </div>
    </motion.div>
  );
}