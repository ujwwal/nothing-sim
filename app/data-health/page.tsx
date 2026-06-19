"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, Activity, FileSpreadsheet,
  ChevronDown, ChevronUp, FolderOpen, Clock
} from 'lucide-react';

// ── Dataset registry — maps the 11 logical datasets to file path patterns ────
const DATASET_REGISTRY = [
  {
    id: 'pit',
    name: 'HUD PIT Count',
    source: 'U.S. Department of Housing & Urban Development',
    purpose: 'Baseline chronic homeless population estimates',
    frequency: 'Annual',
    mapsTo: ['homeless_population', 'sheltered_count', 'unsheltered_count'],
    patterns: ['hud pit count', 'pit-counts', 'pit_count'],
  },
  {
    id: 'spm',
    name: 'HUD System Performance Measures',
    source: 'HUD',
    purpose: 'Calibrate Markov transition probabilities',
    frequency: 'Annual',
    mapsTo: ['Markov transition matrix', 'Housing transition rates', 'Recidivism estimates'],
    patterns: ['system-performance', 'system_performance', 'spm'],
  },
  {
    id: 'coc_award',
    name: 'CoC Award Summary 2024',
    source: 'HUD Continuum of Care',
    purpose: 'Estimate PSH funding and per-unit intervention cost',
    frequency: 'Annual',
    mapsTo: ['psh_cost_per_unit', 'intervention_cost'],
    patterns: ['coC_awardcomp', 'awardcomp', 'coc_award'],
  },
  {
    id: 'coc_hic',
    name: 'CoC Housing Inventory Count 2025',
    source: 'HUD Housing Inventory Count',
    purpose: 'Estimate shelter capacity and housing inventory',
    frequency: 'Annual',
    mapsTo: ['shelter_capacity', 'housing_inventory'],
    patterns: ['CoC_HIC', 'coc_hic', 'hic_natl'],
  },
  {
    id: 'ed_visits',
    name: 'ED Visits by Age Group',
    source: 'Healthcare Utilization Dataset',
    purpose: 'Estimate ER utilisation and emergency healthcare burden',
    frequency: 'Static / Periodic',
    mapsTo: ['er_cost_per_person', 'Healthcare Burden Metrics'],
    patterns: ['ED_Visits', 'ed_visits', 'ed visits'],
  },
  {
    id: 'vera',
    name: 'Vera Institute Incarceration Trends',
    source: 'Vera Institute of Justice',
    purpose: 'Estimate incarceration costs and justice-system burden',
    frequency: 'Annual',
    mapsTo: ['incarceration_cost'],
    patterns: ['vera', 'incarceration_trends', 'price-of-jails', 'price_of_jails', 'year-end-prison'],
  },
  {
    id: 'cdc',
    name: 'CDC WONDER Cause of Death',
    source: 'Centers for Disease Control & Prevention',
    purpose: 'Estimate mortality rates for Deceased state calibration',
    frequency: 'Annual',
    mapsTo: ['deceased_transition_probability'],
    patterns: ['cdc wonder', 'cause of death', 'underlying cause'],
  },
  {
    id: 'fmr',
    name: 'HUD Fair Market Rents',
    source: 'HUD Office of Policy Development & Research',
    purpose: 'Provide housing cost baseline for PSH estimates',
    frequency: 'Annual',
    mapsTo: ['psh_cost_per_unit', 'housing_cost_baseline'],
    patterns: ['fmr', 'safmrs', 'erap_fmrs'],
  },
  {
    id: 'usps',
    name: 'USPS ZIP Code Crosswalk',
    source: 'United States Postal Service / HUD',
    purpose: 'Map ZIP codes to counties and FIPS identifiers',
    frequency: 'Quarterly',
    mapsTo: ['fips_county'],
    patterns: ['usps', 'zip crosswalk', 'crosswalk'],
  },
  {
    id: 'nhgis',
    name: 'NHGIS County Census Data',
    source: 'National Historical Geographic Information System',
    purpose: 'Geographic harmonisation across census boundaries',
    frequency: 'Periodic',
    mapsTo: ['geographic_standardization'],
    patterns: ['nhgis'],
  },
  {
    id: 'nsduh',
    name: 'NSDUH Detailed Tables 2024',
    source: 'SAMHSA National Survey on Drug Use and Health',
    purpose: 'Disability prevalence and behavioural health assumptions',
    frequency: 'Annual',
    mapsTo: ['population_characteristics'],
    patterns: ['nsduh', 'detailed-tables'],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function matchDataset(filePath: string) {
  const lower = filePath.toLowerCase().replace(/\\/g, '/');
  return DATASET_REGISTRY.find(ds =>
    ds.patterns.some(p => lower.includes(p.toLowerCase()))
  );
}

function groupFilesByDataset(files: any[]) {
  const grouped: Record<string, { dataset: typeof DATASET_REGISTRY[0]; files: any[] }> = {};
  const unmatched: any[] = [];

  // Pre-populate with all known datasets
  DATASET_REGISTRY.forEach(ds => {
    grouped[ds.id] = { dataset: ds, files: [] };
  });

  files.forEach(file => {
    const ds = matchDataset(file.path);
    if (ds) {
      grouped[ds.id].files.push(file);
    } else {
      unmatched.push(file);
    }
  });

  return { grouped, unmatched };
}

const EXT_COLORS: Record<string, string> = {
  '.csv':  'text-emerald-400',
  '.xlsx': 'text-green-400',
  '.xls':  'text-green-400',
  '.xlsb': 'text-green-500',
  '.pdf':  'text-red-400',
  '.htm':  'text-yellow-400',
  '.txt':  'text-slate-400',
  '.json': 'text-orange-400',
};

function fileExt(name: string) {
  return name.substring(name.lastIndexOf('.')) || '';
}

// ── Dataset card ──────────────────────────────────────────────────────────────
function DatasetCard({ dataset, files, status }: {
  dataset: typeof DATASET_REGISTRY[0];
  files: any[];
  status: 'Healthy' | 'Missing' | 'Warning';
}) {
  const [open, setOpen] = useState(false);

  const statusColor = {
    Healthy: 'text-emerald-400',
    Warning: 'text-amber-400',
    Missing: 'text-slate-500',
  }[status];

  const StatusIcon = status === 'Healthy' ? CheckCircle : AlertTriangle;

  return (
    <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => files.length > 0 && setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <FolderOpen size={16} className="text-blue-400 shrink-0" />
        <div className="flex-1 overflow-hidden">
          <h4 className="font-medium text-white text-sm">{dataset.name}</h4>
          <p className="text-xs text-slate-500 truncate mt-0.5">{dataset.purpose}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs text-slate-600 bg-slate-800/60 px-2 py-0.5 rounded-full">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
          <span className={`flex items-center gap-1 text-xs font-medium ${statusColor}`}>
            <StatusIcon size={13} />
            {status}
          </span>
          {files.length > 0 && (
            open
              ? <ChevronUp size={13} className="text-slate-500" />
              : <ChevronDown size={13} className="text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded file list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-800/60 px-4 py-3 space-y-2">
              {/* Metadata row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 mb-3">
                <span><strong className="text-slate-400">Source:</strong> {dataset.source}</span>
                <span><strong className="text-slate-400">Update:</strong> {dataset.frequency}</span>
                <span><strong className="text-slate-400">Maps to:</strong> {dataset.mapsTo.slice(0, 2).join(', ')}{dataset.mapsTo.length > 2 ? ` +${dataset.mapsTo.length - 2}` : ''}</span>
              </div>

              {files.map((file, i) => {
                const ext = fileExt(file.name);
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <FileSpreadsheet size={12} className={EXT_COLORS[ext] ?? 'text-slate-400'} />
                    <span className="text-xs text-slate-300 truncate flex-1" title={file.path}>{file.name}</span>
                    <span className={`text-[10px] font-mono ${EXT_COLORS[ext] ?? 'text-slate-500'}`}>{ext}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SourcesTab ────────────────────────────────────────────────────────────────
function SourcesTab() {
  const [rawFiles, setRawFiles]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [offline, setOffline]     = useState(false);

  React.useEffect(() => {
    fetch('/api/data-health')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'offline') { setOffline(true); setLoading(false); return; }
        setRawFiles(data.registry || []);
        setLoading(false);
      })
      .catch(() => { setOffline(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 p-4">
        <span className="inline-block animate-spin">⟳</span> Scanning datasets directory…
      </div>
    );
  }

  if (offline) {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-700/30 rounded-xl">
        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
        <div>
          <p className="text-amber-300 font-medium text-sm">Backend Offline</p>
          <p className="text-amber-400/60 text-xs mt-0.5">Start the backend via launch.bat to see dataset health</p>
        </div>
      </div>
    );
  }

  const { grouped, unmatched } = groupFilesByDataset(rawFiles);

  const totalFiles = rawFiles.length;
  const datasetsWithFiles = Object.values(grouped).filter(g => g.files.length > 0).length;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex gap-4 text-xs text-slate-500 pb-3 border-b border-slate-800/60">
        <span><strong className="text-white">{DATASET_REGISTRY.length}</strong> registered datasets</span>
        <span><strong className="text-emerald-400">{datasetsWithFiles}</strong> with files present</span>
        <span><strong className="text-slate-300">{totalFiles}</strong> total files discovered</span>
      </div>

      {/* Dataset cards */}
      {Object.values(grouped).map(({ dataset, files }) => (
        <DatasetCard
          key={dataset.id}
          dataset={dataset}
          files={files}
          status={files.length > 0 ? 'Healthy' : 'Missing'}
        />
      ))}

      {/* Unmatched files */}
      {unmatched.length > 0 && (
        <div className="bg-slate-900/30 rounded-xl border border-dashed border-slate-700/50 p-4">
          <p className="text-xs text-slate-500 font-medium mb-2">Unclassified files ({unmatched.length})</p>
          {unmatched.map((f, i) => (
            <p key={i} className="text-xs text-slate-600 truncate">{f.path}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DataHealthPage() {
  const [activeTab, setActiveTab] = useState('sources');

  const tabs = [
    { id: 'sources',   label: 'Sources' },
    { id: 'drift',     label: 'Drift Monitoring' },
    { id: 'schema',    label: 'Schema' },
    { id: 'changelog', label: 'Changelog' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <header>
        <h1 className="text-3xl font-semibold mb-1">Data Health & Quality</h1>
        <p className="text-slate-400 text-sm">Monitoring missingness, drift, and pipeline ingestion across {DATASET_REGISTRY.length} registered datasets.</p>
      </header>

      <div className="flex gap-2 p-1 glass-card rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.id ? 'bg-blue-600 shadow-md text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass-card rounded-3xl p-6"
      >
        {activeTab === 'sources'   && <SourcesTab />}
        {activeTab === 'drift'     && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <Activity size={40} className="opacity-30" />
            <p className="font-medium">Drift monitoring not yet active</p>
            <p className="text-sm text-slate-600 text-center max-w-sm">
              Population Stability Index (PSI) analysis requires a full backend pipeline run with at least two dataset snapshots.
            </p>
          </div>
        )}
        {activeTab === 'schema'    && (
          <div className="text-slate-400 text-sm">Schema validation and completeness bars — coming soon.</div>
        )}
        {activeTab === 'changelog' && (
          <div className="text-slate-400 text-sm">Pipeline execution logs and failure tracking — coming soon.</div>
        )}
      </motion.div>
    </div>
  );
}