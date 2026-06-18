"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, AlertTriangle, CheckCircle, Activity, FileSpreadsheet } from 'lucide-react';

export default function DataHealthPage() {
  const [activeTab, setActiveTab] = useState('sources');

  const tabs = [
    { id: 'sources', label: 'Sources' },
    { id: 'drift', label: 'Drift Monitoring' },
    { id: 'schema', label: 'Schema' },
    { id: 'changelog', label: 'Changelog' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-semibold mb-2">Data Health & Quality</h1>
        <p className="text-slate-400">Monitoring missingness, drift, and pipeline ingestion.</p>
      </header>

      <div className="flex gap-2 p-1 glass-card rounded-xl w-fit mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id ? 'bg-blue-600 shadow-md text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-3xl p-6 min-h-[400px]"
      >
        {activeTab === 'sources' && <SourcesTab />}
        {activeTab === 'drift' && <DriftTab />}
        {activeTab === 'schema' && <div className="text-slate-400">Schema validation and completeness bars implementation here.</div>}
        {activeTab === 'changelog' && <div className="text-slate-400">Pipeline execution logs and failure tracking here.</div>}
      </motion.div>
    </div>
  );
}

function SourcesTab() {
  const datasets = [
    { name: "HUD PIT Count", status: "Healthy", updated: "2 Months Ago" },
    { name: "System Performance Measures", status: "Healthy", updated: "5 Months Ago" },
    { name: "ED Visits Age Group", status: "Warning", updated: "13 Months Ago", issue: "Data approaching 18-month staleness threshold." },
    { name: "Vera Incarceration Trends", status: "Healthy", updated: "1 Month Ago" }
  ];

  return (
    <div className="space-y-4">
      {datasets.map((ds, idx) => (
        <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <div className="flex items-center gap-4">
            <FileSpreadsheet className="text-blue-400" />
            <div>
               <h4 className="font-medium text-white">{ds.name}</h4>
               <p className="text-sm text-slate-400">Last updated: {ds.updated}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className={`flex items-center gap-1 text-sm font-medium ${ds.status === 'Healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>
               {ds.status === 'Healthy' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
               {ds.status}
             </span>
             {ds.issue && <span className="text-xs text-slate-500 mt-1">{ds.issue}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DriftTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
       <Activity size={48} className="opacity-50" />
       <p className="max-w-md text-center">Population Stability Index (PSI) analysis requires the complete backend pipeline up and running. Cloud storage connection pending.</p>
    </div>
  );
}