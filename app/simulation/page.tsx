"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '@/lib/store';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend
} from 'recharts';
import {
  Play, Activity, AlertTriangle, CheckCircle, TrendingUp,
  Brain, Database, ChevronDown, ChevronUp, Info, Layers, GitBranch, BarChart2, Sparkles, Loader2
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const INV_MULTIPLIERS: Record<string, { low: number; mid: number; high: number }> = {
  low:    { low: 0.70, mid: 0.80, high: 0.90 },
  medium: { low: 0.90, mid: 1.00, high: 1.15 },
  high:   { low: 1.15, mid: 1.35, high: 1.60 },
};

const MODEL_STATES = [
  { name: 'Stable Housing',      cost: '$12,000/yr',  risk: 'Low' },
  { name: 'Emergency Shelter',   cost: '$25,000/yr',  risk: 'Moderate' },
  { name: 'Street Homelessness', cost: '$45,000/yr',  risk: 'High' },
  { name: 'Jail / Justice',      cost: '$60,000/yr',  risk: 'Very High' },
  { name: 'Acute Healthcare',    cost: '$85,000/yr',  risk: 'Critical' },
  { name: 'Deceased',            cost: 'Absorbing',   risk: 'Terminal' },
];

const ASSUMPTIONS = [
  { assumption: 'Initial population split', value: '40% Shelter / 60% Street', why: 'Based on national HUD PIT count averages for chronically homeless individuals.' },
  { assumption: 'Delay penalty', value: '+1% chance of worsening per year delayed', why: 'Literature shows delayed PSH access is correlated with health deterioration.' },
  { assumption: 'Cost-per-state', value: 'Annualised; inflation not modelled', why: 'Simplified to isolate structural cost of inaction, not macro-economic drift.' },
  { assumption: 'Invisible population', value: 'Low 0.80× / Mid 1.0× / High 1.5×', why: 'PIT counts consistently undercount unsheltered homeless by 30–50% (Culhane et al., 2020).' },
  { assumption: 'Monte Carlo runs', value: '1,000 simulations', why: 'Sufficient for stable CI estimates at this population scale; runtime balanced.' },
  { assumption: 'Discount rate', value: 'Not applied (nominal costs)', why: 'Avoided to maintain transparency for non-economist policymakers.' },
];

const PREPROCESSING_STEPS = [
  { step: 'HUD PIT Count', operation: 'Load XLSB → filter chronic homelessness rows → aggregate to national totals', assumed: 'Years 2020–2021 linearly interpolated due to COVID data gaps.' },
  { step: 'System Performance Measures', operation: 'Parse XLSX → extract "exits to permanent housing" and "returns to homelessness" rates', assumed: 'Missing CoC-level data imputed with national average transition rates.' },
  { step: 'ED Visits', operation: 'CSV → annualise per-capita ER cost from age-grouped utilisation rates', assumed: 'Homelessness ER utilisation assumed 4× general population (literature baseline).' },
  { step: 'Vera Incarceration', operation: 'County CSV → average daily jail cost × recidivism co-occurrence rate', assumed: '35% of chronically homeless have recent justice-system contact (Vera, 2023).' },
  { step: 'HUD Fair Market Rents', operation: 'XLSX → extract median 1-BR FMR as PSH cost proxy', assumed: 'PSH operating cost estimated at 1.5× FMR to include services overhead.' },
  { step: 'CoC Award/HIC', operation: 'PDF → CSV extraction → national PSH unit totals', assumed: 'Extracted table data validated against published HUD summary figures.' },
];

// ── AI Brief Generator (template-based, works offline) ──────────────────────
function generateBrief(
  scenario: string, delayYears: number, npCodLow: number, npCodHigh: number,
  projections: any[], invisiblePop: string
) {
  const finalPop = projections[projections.length - 1]?.population ?? 0;
  const initPop  = projections[0]?.population ?? 0;
  const growthPct = initPop > 0 ? (((finalPop - initPop) / initPop) * 100).toFixed(0) : '0';
  const totalCostLowM  = ((projections.reduce((s, p) => s + (p.cost_low  ?? p.cost), 0)) / 1e6).toFixed(1);
  const totalCostHighM = ((projections.reduce((s, p) => s + (p.cost_high ?? p.cost), 0)) / 1e6).toFixed(1);

  const scenarioLabel =
    scenario === 'act_now'    ? 'immediate Permanent Supportive Housing (PSH) intervention' :
    scenario === 'do_nothing' ? 'no intervention — status quo maintained' :
    `a ${delayYears}-year delay before initiating PSH intervention`;

  return {
    executive_summary: `Under a ${scenarioLabel} scenario, the Aegis-Sim model projects cumulative 10-year system costs ranging from approximately $${totalCostLowM}M to $${totalCostHighM}M. The modelled chronic homeless population ${Number(growthPct) > 0 ? `grows by approximately ${growthPct}%` : `stabilises`} over the decade. These are probability ranges — not forecasts — derived from 1,000 Monte Carlo simulation runs of a six-state Markov transition model.`,

    fiscal_impact: `The Net Present Cost of Delay (NP-CoD) — the additional cumulative taxpayer burden attributable specifically to the intervention delay — is estimated in the range of $${(npCodLow / 1e6).toFixed(1)}M to $${(npCodHigh / 1e6).toFixed(1)}M. This cost is driven primarily by increased ER utilisation and jail cycling as individuals remain in high-cost states longer. Permanent Supportive Housing, while representing an upfront investment, consistently reduces downstream costs across all modelled scenarios in the literature.`,

    major_risks: [
      `Invisible population undercounting: The "${invisiblePop}" estimate assumes a ${INV_MULTIPLIERS[invisiblePop].mid}× multiplier on PIT counts. If the true undercounting is higher, actual costs may be significantly greater.`,
      `Data staleness: Key inputs (PIT Count, System Performance Measures) are updated annually. If the intervention delay extends past 18 months from last data collection, model confidence degrades.`,
      `External shocks: Pandemics, natural disasters, or economic downturns can rapidly shift population distributions in ways this model cannot anticipate.`,
      `Local variation: This model uses national-level cost and transition data. County-specific conditions may diverge substantially from modelled assumptions.`,
    ],

    key_assumptions: [
      'Transition probabilities are calibrated from national HUD System Performance Measures data, not local CES/HMIS data.',
      'Costs per state are annualised averages — they do not reflect marginal or programme-specific costs.',
      'The model does not account for housing supply constraints, which could limit PSH effectiveness.',
      'Deceased state is absorbing — re-entry is not modelled.',
    ],

    questions_for_policymakers: [
      'What local data (HMIS, CES) could improve the calibration of transition probabilities for your jurisdiction?',
      'Are there existing PSH programmes or pipeline projects that should be incorporated into the "Act Now" scenario?',
      'What is your jurisdiction\'s current capacity to absorb the upfront PSH investment implied by the "Act Now" scenario?',
      'What is the tolerance for the upper-bound cost estimate if the invisible population multiplier is higher than assumed?',
    ],
  };
}

// ── Gemini API helper ────────────────────────────────────────────────────────
async function callGeminiAPI(
  scenario: string, delayYears: number, invisiblePop: string,
  npCodLow: number, npCodHigh: number,
  projections: any[]
): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;

  const finalPop   = projections[projections.length - 1]?.population ?? 0;
  const initPop    = projections[0]?.population ?? 0;
  const growthPct  = initPop > 0 ? (((finalPop - initPop) / initPop) * 100).toFixed(1) : '0';
  const totalLowM  = (projections.reduce((s: number, p: any) => s + (p.cost_low  ?? p.cost), 0) / 1e6).toFixed(1);
  const totalHighM = (projections.reduce((s: number, p: any) => s + (p.cost_high ?? p.cost), 0) / 1e6).toFixed(1);
  const npCodLowM  = (npCodLow  / 1e6).toFixed(1);
  const npCodHighM = (npCodHigh / 1e6).toFixed(1);

  const scenarioLabel =
    scenario === 'act_now'    ? 'immediate Permanent Supportive Housing (PSH) deployment (Act Now)' :
    scenario === 'do_nothing' ? 'no intervention for 10 years (Do Nothing)' :
    `a ${delayYears}-year delay before deploying PSH`;

  const prompt = `You are a senior policy analyst writing a plain-language briefing note for a city council member or county supervisor who is NOT a data scientist. They need to understand the fiscal and human consequences of homelessness intervention choices.

Here are the results from an Aegis-Sim Markov simulation:
- Scenario: ${scenarioLabel}
- Invisible population estimate: ${invisiblePop} (accounts for PIT count undercounting)
- Starting chronic homeless population: ${initPop.toLocaleString()}
- Projected population at year 10: ${finalPop.toLocaleString()} (${Number(growthPct) > 0 ? '+' : ''}${growthPct}% change)
- Projected 10-year cumulative system cost range: $${totalLowM}M – $${totalHighM}M
- Net Present Cost of Delay (NP-CoD): $${npCodLowM}M – $${npCodHighM}M (the extra cost taxpayers pay specifically because of the delay)
- Model: 6-state Discrete-Time Markov Chain, 1,000 Monte Carlo runs, 10-year horizon
- Cost states: Stable Housing ($12K/yr), Emergency Shelter ($25K/yr), Street Homelessness ($45K/yr), Jail/Justice ($60K/yr), Acute Healthcare ($85K/yr), Deceased (absorbing)

Write a structured policy brief with these exact sections. Use clear, jargon-free language with concrete dollar amounts and population figures from the data above:

## What the Numbers Mean
In 2-3 sentences, explain what these results tell a policymaker — what the cost range means, why there's a range, and what the key driver is.

## Real-World Examples
Give 2 concrete, relatable examples that translate these abstract numbers into terms policymakers understand. For instance, compare the NP-CoD to the cost of a specific public project (school, bridge, park), or explain how many people the money could house.

## The Bottom Line
One or two sentences — the single most important takeaway a policymaker should remember from these results.

## Recommended Next Steps
3 short bullet points — specific, actionable steps this policymaker should consider given these results. Ground them in the scenario data.

Important: Be factual, grounded in the numbers above. Do not make up statistics not provided. Do not recommend specific legislation. Keep the total response under 400 words.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// ── Markdown-to-JSX renderer (minimal, handles ## headers and ** bold) ────────
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <p key={i} className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mt-4 mb-1 first:mt-0">
              {line.slice(3)}
            </p>
          );
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.slice(2);
          return (
            <div key={i} className="flex gap-2 text-slate-300 leading-relaxed">
              <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
              <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>') }}
          />
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SimulationPage() {
  const { scenario, delayYears, setScenario, setDelayYears, results, setResults } = useSimulationStore();
  const [isRunning, setIsRunning]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [invisiblePop, setInvisiblePop] = useState<'low' | 'medium' | 'high'>('medium');
  const [brief, setBrief]               = useState<any | null>(null);
  const [geminiText, setGeminiText]     = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError]   = useState<string | null>(null);
  const [showModel, setShowModel]       = useState(false);
  const [showPreproc, setShowPreproc]   = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const hasGeminiKey = !!process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const runSimulation = async () => {
    setIsRunning(true);
    setError(null);
    setBrief(null);
    setGeminiText(null);
    setGeminiError(null);
    try {
      const delayYearsToSend = scenario === 'act_now' ? 0 : scenario === 'do_nothing' ? 10 : delayYears;
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, delay_years: delayYearsToSend, invisible_population_estimate: invisiblePop }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Simulation failed');

      const m = INV_MULTIPLIERS[invisiblePop];
      const adjusted = (data.projections || []).map((p: any) => ({
        year:      p.year,
        cost_mid:  Math.round(p.cost * m.mid),
        cost_low:  Math.round(p.cost * m.low),
        cost_high: Math.round(p.cost * m.high),
        population: Math.round(p.population * m.mid),
      }));

      const adjustedResults = { ...data, projections: adjusted, np_cod: data.np_cod * m.mid };
      setResults(adjustedResults);

      const templateBrief = generateBrief(
        scenario, delayYears,
        data.np_cod * m.low, data.np_cod * m.high,
        adjusted, invisiblePop
      );
      setBrief(templateBrief);

      // Fire Gemini in parallel — non-blocking
      if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        setGeminiLoading(true);
        callGeminiAPI(
          scenario, delayYears, invisiblePop,
          data.np_cod * m.low, data.np_cod * m.high,
          adjusted
        ).then(text => {
          if (text) {
            setGeminiText(text);
          } else {
            setGeminiError('Gemini did not return a response. Showing template brief.');
          }
        }).catch(() => {
          setGeminiError('Gemini request failed. Showing template brief.');
        }).finally(() => {
          setGeminiLoading(false);
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const npCodLow  = results ? (results.confidence_interval?.lower_80 ?? results.np_cod * 0.8) : 0;
  const npCodHigh = results ? (results.confidence_interval?.upper_80  ?? results.np_cod * 1.2) : 0;
  const lastP     = results?.projections?.[results.projections.length - 1];
  const firstP    = results?.projections?.[0];

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
                { value: 'act_now',    label: 'Act Now',            desc: 'Immediate PSH rollout' },
                { value: 'delay',      label: 'Delay Intervention', desc: `Wait ${delayYears} yr${delayYears !== 1 ? 's' : ''} before acting` },
                { value: 'do_nothing', label: 'Do Nothing',         desc: 'Status quo for 10 years' },
              ].map(s => (
                <button key={s.value} onClick={() => setScenario(s.value)}
                  className={`text-left p-3 rounded-xl border transition-all text-sm ${
                    scenario === s.value
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
                  className={`py-2 rounded-lg text-xs font-semibold border capitalize transition-all ${
                    invisiblePop === opt
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

      {/* ── RIGHT: Results (70%) ──────────────────────────────────────────── */}
      <div className="w-full lg:w-[70%] flex flex-col gap-5">

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/50 rounded-2xl"
          >
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium text-sm">Simulation Error</p>
              <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Idle state */}
        {!results && !isRunning && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center text-slate-500 min-h-[300px]"
          >
            <Activity size={40} className="mb-3 opacity-30" />
            <p className="font-medium">Ready to simulate</p>
            <p className="text-sm text-slate-600 mt-1">Choose a scenario and click Execute</p>
          </motion.div>
        )}

        {/* Loading */}
        {isRunning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center min-h-[300px]"
          >
            <div className="w-14 h-14 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mb-5" />
            <p className="font-medium text-slate-300">Running Markov simulation…</p>
            <p className="text-sm text-slate-500 mt-1">1,000 Monte Carlo iterations</p>
          </motion.div>
        )}

        {/* Results */}
        {results && !isRunning && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">

            {/* ── KPI Range cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-card rounded-2xl p-4 border border-red-900/30">
                <p className="text-xs text-slate-400 mb-1">Net Present Cost of Delay</p>
                <p className="text-xs text-slate-600 mb-2">Estimated Range (80% CI)</p>
                <p className="text-lg font-bold text-red-400">{fmtM(npCodLow)} – {fmtM(npCodHigh)}</p>
                <p className="text-[10px] text-slate-600 mt-1">NP-CoD · additional cost from delay</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-amber-900/30">
                <p className="text-xs text-slate-400 mb-1">Population at Year 10</p>
                <p className="text-xs text-slate-600 mb-2">Chronic homeless estimate</p>
                <p className="text-lg font-bold text-amber-400">{lastP?.population?.toLocaleString() ?? '—'}</p>
                <p className="text-[10px] text-slate-600 mt-1">from {firstP?.population?.toLocaleString() ?? '—'} at start</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-blue-900/30">
                <p className="text-xs text-slate-400 mb-1">10-Year Cost Range</p>
                <p className="text-xs text-slate-600 mb-2">Cumulative system cost</p>
                <p className="text-lg font-bold text-blue-400">
                  {fmtM(results.projections.reduce((s: number, p: any) => s + p.cost_low, 0))} –{' '}
                  {fmtM(results.projections.reduce((s: number, p: any) => s + p.cost_high, 0))}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  Inv. pop: {invisiblePop} ({INV_MULTIPLIERS[invisiblePop].low}× – {INV_MULTIPLIERS[invisiblePop].high}×)
                </p>
              </div>
            </div>

            {/* ── Chart ──────────────────────────────────────────────────── */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-blue-400" />
                <h3 className="text-sm font-medium text-slate-300">Projected Annual System Cost — Range Estimates</h3>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.projections} margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="year" stroke="#475569" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 10 }}
                      tickFormatter={v => `$${(v / 1e6).toFixed(0)}M`} width={55} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any, name: string) => {
                        const labels: Record<string, string> = { cost_high: 'High estimate', cost_mid: 'Mid estimate', cost_low: 'Low estimate' };
                        return [`$${(v / 1e6).toFixed(2)}M`, labels[name] ?? name];
                      }}
                    />
                    <Area type="monotone" dataKey="cost_high" stroke="#3b82f6" strokeWidth={0} fill="url(#bandGrad)" name="cost_high" />
                    <Area type="monotone" dataKey="cost_mid"  stroke="#3b82f6" strokeWidth={2.5} fill="transparent" name="cost_mid" dot={{ r: 2 }} />
                    <Area type="monotone" dataKey="cost_low"  stroke="#3b82f6" strokeWidth={0} fill="#020617" fillOpacity={1} name="cost_low" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-blue-500 inline-block" /> Mid estimate</span>
                <span className="flex items-center gap-1"><span className="w-6 h-2 bg-blue-500/20 rounded inline-block" /> Range band (low–high)</span>
                <span className="ml-auto">Invisible pop: <strong className="text-slate-400">{invisiblePop}</strong></span>
              </div>
            </div>

            {/* ── AI Decision Brief ───────────────────────────────────────── */}
            {brief && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="glass-card rounded-2xl overflow-hidden border border-indigo-900/30"
              >
                {/* Header */}
                <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-slate-800/60">
                  {geminiLoading ? (
                    <Loader2 size={15} className="text-indigo-400 animate-spin" />
                  ) : geminiText ? (
                    <Sparkles size={15} className="text-indigo-400" />
                  ) : (
                    <Brain size={15} className="text-indigo-400" />
                  )}
                  <h3 className="text-sm font-medium text-slate-300">Policy Brief</h3>

                  {/* Status badge */}
                  {geminiLoading && (
                    <span className="ml-auto text-[10px] text-indigo-400 bg-indigo-900/30 border border-indigo-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Loader2 size={9} className="animate-spin" /> Gemini is writing…
                    </span>
                  )}
                  {geminiText && !geminiLoading && (
                    <span className="ml-auto text-[10px] text-indigo-300 bg-indigo-900/30 border border-indigo-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={9} /> AI-generated · Gemini 1.5 Flash
                    </span>
                  )}
                  {!geminiText && !geminiLoading && (
                    <span className="ml-auto text-[10px] text-slate-600 bg-slate-800/60 border border-slate-700/40 px-2.5 py-0.5 rounded-full">
                      {hasGeminiKey ? 'Template fallback' : 'Template · set NEXT_PUBLIC_GEMINI_API_KEY to enable AI'}
                    </span>
                  )}
                </div>

                {/* Gemini content (shown when available) */}
                <AnimatePresence>
                  {geminiText && (
                    <motion.div
                      key="gemini"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="px-5 pt-4 pb-5"
                    >
                      <RenderMarkdown text={geminiText} />
                      <p className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-600">
                        ⚠ AI-generated summary based solely on this model's outputs. Not a substitute for professional policy analysis. All numbers are from the Aegis-Sim model.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Template brief (shown while loading or if Gemini unavailable) */}
                {!geminiText && (
                  <div className="px-5 pt-4 pb-5">
                    {geminiLoading && (
                      <div className="mb-4 flex items-center gap-2 text-xs text-indigo-400/70 bg-indigo-900/10 border border-indigo-900/30 rounded-xl px-3 py-2">
                        <Loader2 size={11} className="animate-spin shrink-0" />
                        Generating AI summary — showing template brief in the meantime
                      </div>
                    )}
                    {geminiError && (
                      <div className="mb-4 flex items-center gap-2 text-xs text-amber-400/70 bg-amber-900/10 border border-amber-900/30 rounded-xl px-3 py-2">
                        <AlertTriangle size={11} className="shrink-0" />
                        {geminiError}
                      </div>
                    )}
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Executive Summary</p>
                        <p className="text-slate-300 leading-relaxed">{brief.executive_summary}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Fiscal Impact</p>
                        <p className="text-slate-300 leading-relaxed">{brief.fiscal_impact}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Major Risks</p>
                          <ul className="space-y-1">
                            {brief.major_risks.map((r: string, i: number) => (
                              <li key={i} className="text-slate-400 text-xs flex gap-2">
                                <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Questions for Policymakers</p>
                          <ul className="space-y-1">
                            {brief.questions_for_policymakers.map((q: string, i: number) => (
                              <li key={i} className="text-slate-400 text-xs flex gap-2">
                                <span className="text-emerald-500 font-bold shrink-0">→</span>
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Model Transparency ──────────────────────────────────────── */}
            <div className="glass-card rounded-2xl border border-slate-700/30 overflow-hidden">
              {/* Model Used */}
              <button onClick={() => setShowModel(!showModel)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitBranch size={15} className="text-cyan-400" />
                  <span className="text-sm font-medium text-slate-300">Model Used</span>
                  <span className="text-xs text-slate-600 ml-2">Discrete-Time Markov State Transition + Monte Carlo</span>
                </div>
                {showModel ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </button>
              {showModel && (
                <div className="px-5 pb-5 border-t border-slate-700/30">
                  <p className="text-xs text-slate-400 mt-4 mb-3 leading-relaxed">
                    A <strong className="text-slate-300">Discrete-Time Markov Chain</strong> models monthly transitions between 6 states over a 10-year horizon.
                    Each state has an associated cost and transition probability matrix. 1,000 Monte Carlo runs produce probability distributions rather than single-point estimates.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MODEL_STATES.map(s => (
                      <div key={s.name} className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
                        <p className="text-xs font-medium text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.cost}</p>
                        <span className={`text-[10px] font-medium mt-1 inline-block ${
                          s.risk === 'Low' ? 'text-emerald-400' : s.risk === 'Moderate' ? 'text-yellow-400' :
                          s.risk === 'High' ? 'text-orange-400' : s.risk === 'Very High' ? 'text-red-400' :
                          s.risk === 'Critical' ? 'text-red-500' : 'text-slate-500'
                        }`}>{s.risk} risk</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preprocessing */}
              <button onClick={() => setShowPreproc(!showPreproc)}
                className="w-full flex items-center justify-between p-5 border-t border-slate-700/30 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-violet-400" />
                  <span className="text-sm font-medium text-slate-300">Preprocessing Operations</span>
                  <span className="text-xs text-slate-600 ml-2">What was done to each dataset</span>
                </div>
                {showPreproc ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </button>
              {showPreproc && (
                <div className="px-5 pb-5 border-t border-slate-700/30 space-y-3 mt-4">
                  {PREPROCESSING_STEPS.map(s => (
                    <div key={s.step} className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <p className="text-xs font-semibold text-violet-300">{s.step}</p>
                      <p className="text-xs text-slate-400 mt-1"><strong className="text-slate-500">Operation:</strong> {s.operation}</p>
                      <p className="text-xs text-amber-500/80 mt-1"><strong>Assumed:</strong> {s.assumed}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Assumptions */}
              <button onClick={() => setShowAssumptions(!showAssumptions)}
                className="w-full flex items-center justify-between p-5 border-t border-slate-700/30 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info size={15} className="text-amber-400" />
                  <span className="text-sm font-medium text-slate-300">Key Assumptions</span>
                  <span className="text-xs text-slate-600 ml-2">What was assumed and why</span>
                </div>
                {showAssumptions ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </button>
              {showAssumptions && (
                <div className="px-5 pb-5 border-t border-slate-700/30 mt-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-700/40">
                        <th className="pb-2 font-medium">Assumption</th>
                        <th className="pb-2 font-medium">Value</th>
                        <th className="pb-2 font-medium">Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ASSUMPTIONS.map((a, i) => (
                        <tr key={i} className="border-b border-slate-800/60">
                          <td className="py-2.5 text-slate-300 pr-3 font-medium align-top">{a.assumption}</td>
                          <td className="py-2.5 text-amber-400 pr-3 align-top whitespace-nowrap">{a.value}</td>
                          <td className="py-2.5 text-slate-500 leading-relaxed align-top">{a.why}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}