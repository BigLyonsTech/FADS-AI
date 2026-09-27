import React from "react";

// Mini Y2K digital counter for the Transcribe dashboard stats. Matches the
// FADS Intelligence mini-player visual language: deep navy surface, teal
// accents, monospace digits, compact instrument feel.
export default function TranscribeCounter({ label, value, sublabel, icon: Icon }) {
  return (
    <div className="bg-brand-navy rounded-xl p-3 text-white">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{label}</p>
        {Icon && <Icon className="w-3 h-3 text-brand-teal/50" />}
      </div>
      <p className="text-xl sm:text-2xl font-bold font-mono text-white leading-none tabular-nums break-words">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-brand-teal/60 mt-1.5">{sublabel}</p>
    </div>
  );
}