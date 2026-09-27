import React from "react";

// Shared mini Y2K digital counter used across FADS player pages (CRM,
// Finance). Matches the Intelligence mini-player visual language: deep navy
// surface, teal accents, monospace digits, compact instrument feel.
export default function FadsCounter({ label, value, sublabel, icon: Icon, sublabelAccent = "teal" }) {
  return (
    <div className="bg-brand-navy rounded-xl p-3 text-white">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{label}</p>
        {Icon && <Icon className="w-3 h-3 text-brand-teal/50" />}
      </div>
      <p className="text-xl sm:text-2xl font-bold font-mono text-white leading-none tabular-nums break-words">{value}</p>
      <p
        className={`text-[9px] uppercase tracking-wider mt-1.5 ${
          sublabelAccent === "warn" ? "text-status-warn" : "text-brand-teal/60"
        }`}
      >
        {sublabel}
      </p>
    </div>
  );
}