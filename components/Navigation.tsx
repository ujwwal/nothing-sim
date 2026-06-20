"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Activity, HeartPulse, BookOpen, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { href: "/",            label: "Home",        icon: Sparkles,       color: "#4f8fff" },
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard, color: "#a855f7" },
  { href: "/simulation",  label: "Simulation",  icon: Activity,       color: "#22d3ee" },
  { href: "/data-health", label: "Data Health", icon: HeartPulse,     color: "#34d399" },
  { href: "/methodology", label: "Methodology", icon: BookOpen,       color: "#f59e0b" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className="nav-glass relative flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 68 : 220 }}
    >
      {/* ── Logo / Brand ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-5 overflow-hidden">
        {/* Logo mark */}
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
            style={{
              background: 'linear-gradient(135deg, #4f8fff 0%, #a855f7 100%)',
              boxShadow: '0 4px 16px rgba(79,143,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            A
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2"
            style={{ borderColor: '#04040e' }}
          />
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-white font-semibold text-sm leading-none">QuietCost</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Policy Simulation</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="divider mx-3 mb-3" />

      {/* ── Nav label ─────────────────────────────────────────────────── */}
      {!collapsed && (
        <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 mb-2">
          Navigation
        </p>
      )}

      {/* ── Nav items ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="relative block">
              {/* Active background pill */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}22 0%, ${item.color}0d 100%)`,
                    border: `1px solid ${item.color}30`,
                    boxShadow: `0 0 16px ${item.color}18`,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}

              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                {/* Icon wrapper */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={isActive ? {
                    background: `${item.color}22`,
                    border: `1px solid ${item.color}40`,
                    boxShadow: `0 0 12px ${item.color}25`,
                  } : {}}
                >
                  <Icon size={15} style={isActive ? { color: item.color } : {}} />
                </div>

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom section ─────────────────────────────────────────────── */}
      <div className="px-3 pb-5 space-y-3">
        <div className="divider" />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] transition-all text-xs font-medium"
        >
          {collapsed
            ? <ChevronRight size={14} />
            : <><ChevronLeft size={14} /><span>Collapse</span></>
          }
        </button>

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-1"
          >
            <div
              className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(79,143,255,0.08), rgba(168,85,247,0.06))',
                border: '1px solid rgba(79,143,255,0.15)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="pulse-dot bg-emerald-400" />
                <p className="text-[10px] font-semibold text-emerald-400">System Online</p>
              </div>
              <p className="text-[9px] text-slate-600 leading-relaxed">
                Markov engine ready · 11 datasets registered
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}