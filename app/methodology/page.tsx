"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function MethodologyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <motion.header 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-semibold mb-4">Methodology</h1>
        <p className="text-xl text-slate-400 font-light">
          QuietCost utilizes a Discrete-Time Markov State Transition Model layered with Monte Carlo simulations to project long-term fiscal outcomes.
        </p>
      </motion.header>

      <section className="glass-card p-8 rounded-3xl space-y-6">
        <h2 className="text-2xl font-semibold">Markov Model States</h2>
        <p className="text-slate-300">
          The population simulates transitions between six defined states monthly:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-400">
          <li><strong>Stable Housing:</strong> Individuals sustainably housed.</li>
          <li><strong>Emergency Shelter:</strong> Temporary emergency housing utilization.</li>
          <li><strong>Street Homelessness:</strong> Unsheltered chronic homelessness.</li>
          <li><strong>Jail / Justice System:</strong> Periods of incarceration preventing housing.</li>
          <li><strong>Acute Healthcare:</strong> Emergency department or prolonged inpatient care.</li>
          <li><strong>Deceased:</strong> An absorbing state calculating survival hazard functions.</li>
        </ul>
      </section>

      <section className="glass-card p-8 rounded-3xl space-y-6">
        <h2 className="text-2xl font-semibold">Responsible AI Limitations</h2>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-red-400 mb-2">Hard Bypass Conditions</h3>
          <p className="text-slate-300 mb-4">The simulator will disable itself if any of the following conditions are met to prevent misinformed policy decisions:</p>
          <ul className="list-disc pl-6 space-y-2 text-red-200/70">
            <li>Data is older than 18 months.</li>
            <li>Missing data exceeds 25% of any critical column.</li>
            <li>Baseline population size falls below 100 individuals.</li>
            <li>An external shock flag (e.g., pandemic, disaster) has been toggled overriding standard transitions.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}