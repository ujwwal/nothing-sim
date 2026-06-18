"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PieChart, Activity, BookOpen, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: PieChart },
  { href: "/simulation", label: "Simulation", icon: Activity },
  { href: "/data-health", label: "Data Health", icon: Heart },
  { href: "/methodology", label: "Methodology", icon: BookOpen },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-20 md:w-64 glass-card border-r border-white/10 flex flex-col h-full transition-all flex-shrink-0">
      <div className="p-4 md:p-6 mb-8 mt-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg flex items-center justify-center font-bold text-white mb-2 mx-auto md:mx-0">
          A
        </div>
        <h2 className="hidden md:block text-xl font-semibold tracking-tight text-white/90">Aegis-Sim</h2>
      </div>

      <div className="flex-1 flex flex-col gap-2 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} className="relative group">
              {isActive && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute inset-0 bg-white/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                <Icon size={20} />
                <span className="hidden md:block font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}