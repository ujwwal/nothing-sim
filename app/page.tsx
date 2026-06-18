"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Activity, ShieldAlert, LineChart } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="text-center space-y-6 max-w-4xl"
      >
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          The Cost of Doing Nothing
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-light max-w-3xl mx-auto">
          Understand the long-term fiscal consequences of delaying supportive housing interventions.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Link href="/dashboard" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-lg flex items-center justify-center gap-2">
          Run Simulation <ArrowRight size={20} />
        </Link>
        <Link href="/data-health" className="px-8 py-4 glass-card rounded-full font-medium transition-all hover:bg-white/10 flex items-center justify-center gap-2">
          Explore Data <Activity size={20} />
        </Link>
        <Link href="/methodology" className="px-8 py-4 glass-card rounded-full font-medium transition-all hover:bg-white/10 flex items-center justify-center gap-2">
          Methodology <LineChart size={20} />
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-12">
        <FeatureCard 
          icon={<ShieldAlert className="text-blue-400 mb-4" size={32} />}
          title="Responsible AI"
          description="Human-in-the-loop design. Aegis-Sim does not replace policy decisions—it projects possible outcomes transparently."
        />
        <FeatureCard 
          icon={<LineChart className="text-purple-400 mb-4" size={32} />}
          title="Markov Simulations"
          description="Discrete-time state transition modeling estimating paths between sheltered, unsheltered, and stabilizing interventions."
        />
        <FeatureCard 
          icon={<Activity className="text-emerald-400 mb-4" size={32} />}
          title="Data Health"
          description="Automated drift detection, missingness tracking, and schema validation across HUD, CDC, and USPS datasets."
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-card p-8 rounded-3xl"
    >
      {icon}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </motion.div>
  );
}