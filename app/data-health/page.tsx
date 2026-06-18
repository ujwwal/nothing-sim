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
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch('/api/data-health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'offline') {
          setDatasets([{ name: 'Backend Offline', path: 'Start the backend via launch.bat', status: 'Warning' }]);
          setLoading(false);
          return;
        }
        const formattedDatasets = (data.registry || []).map((item: any) => ({
          name: item.name,
          path: item.path,
          status: "Healthy",
        }));
        setDatasets(formattedDatasets);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch datasets", err);
        setDatasets([{ name: 'Error', path: err.message, status: 'Warning' }]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-slate-400 p-4">Scanning datasets directory...</div>;
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
      {datasets.map((ds, idx) => (
        <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <div className="flex items-center gap-4 overflow-hidden">
            <FileSpreadsheet className="text-blue-400 shrink-0" />
            <div className="overflow-hidden">
               <h4 className="font-medium text-white truncate" title={ds.name}>{ds.name}</h4>
               <p className="text-sm text-slate-400 truncate" title={ds.path}>{ds.path}</p>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-4">
             <span className={`flex items-center gap-1 text-sm font-medium ${ds.status === 'Healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>
               {ds.status === 'Healthy' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
               {ds.status}
             </span>
             <span className="text-xs text-slate-500 mt-1">Discovered by Pipeline</span>
          </div>
        </div>
      ))}
      {datasets.length === 0 && <div className="text-slate-400 text-center">No datasets found.</div>}
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