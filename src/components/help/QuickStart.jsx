import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { Check, ChevronRight, Clock } from "lucide-react";

const STORAGE_KEY = "fads-quickstart-done";

const STEPS = [
  { label: "Check your business details", to: "/settings" },
  { label: "Add or import your contacts", to: "/crm/contacts" },
  { label: "Record or review your money", to: "/finance" },
  { label: "Try Ask FADS", to: "/assistant" },
  { label: "Check your Daily Brief", to: "/intelligence" },
];

// FADS Quick Start — a very short 5-minute beginner checklist. Users are
// never forced to complete every step. "Do this later" dismisses the
// checklist without pressure. Progress is saved in localStorage.
export default function QuickStart() {
  const [done, setDone] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDone(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = (i) => {
    setDone((prev) => {
      const next = { ...prev, [i]: !prev[i] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const dismiss = () => {
    const all = {};
    STEPS.forEach((_, i) => (all[i] = true));
    setDone(all);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
  };

  const allDone = STEPS.every((_, i) => done[i]);

  if (allDone) {
    return (
      <div className="bg-brand-navy rounded-2xl p-5 space-y-3 text-white">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS QUICK START</p>
        </div>
        <div className="flex flex-col items-center py-2">
          <FadsRobotAvatar size="lg" />
          <p className="text-sm text-white/80 mt-3 text-center max-w-[300px]">
            You're set up. FADS is ready whenever you need me.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-navy rounded-2xl p-5 space-y-4 text-white">
      <div className="flex items-center gap-2">
        <FadsRobotAvatar size="sm" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS QUICK START</p>
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">Your first 5 minutes with FADS</h2>
        <p className="text-sm text-white/60 mt-1">No pressure — do what's useful and come back later.</p>
      </div>

      <div className="space-y-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <button
              onClick={() => toggle(i)}
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors min-h-touch min-w-touch ${
                done[i] ? "bg-status-ok text-white" : "bg-white/10 text-transparent hover:bg-white/20"
              }`}
            >
              <Check className="w-4 h-4" />
            </button>
            <Link
              to={s.to}
              className={`flex-1 flex items-center justify-between text-sm min-h-touch ${done[i] ? "text-white/40 line-through" : "text-white"}`}
            >
              <span>{i + 1}. {s.label}</span>
              {!done[i] && <ChevronRight className="w-4 h-4 text-white/30" />}
            </Link>
          </div>
        ))}
      </div>

      <button
        onClick={dismiss}
        className="w-full inline-flex items-center justify-center gap-1.5 text-white/50 hover:text-white/70 text-xs py-2 min-h-touch transition-colors"
      >
        <Clock className="w-3.5 h-3.5" /> Do this later
      </button>
    </div>
  );
}