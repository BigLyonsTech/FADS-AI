import React from "react";

// 4-action grid shown on the Finance dashboard for Nigerian organisations only.
// Reuses existing Speak-a-Record and Scan-a-Receipt handlers from Finance, and
// adds Nigeria Tax + Estimate My Tax entry points. Mobile-friendly, plain
// language for non-accountants.
export default function NigeriaFinanceActions({ onSpeak, onScan, onTax, onEstimate, micSupported }) {
  const actions = [
    { key: "speak", label: "Speak a Record", emoji: "🎙️", onClick: onSpeak, show: micSupported },
    { key: "scan", label: "Scan a Receipt", emoji: "📷", onClick: onScan, show: true },
    { key: "tax", label: "Nigeria Tax", emoji: "🇳🇬", onClick: onTax, show: true },
    { key: "estimate", label: "Estimate My Tax", emoji: "🧮", onClick: onEstimate, show: true },
  ].filter((a) => a.show);

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-brand-navy">Quick Capture & Tax</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors text-left flex flex-col gap-2 min-h-touch"
          >
            <span className="text-2xl leading-none">{a.emoji}</span>
            <p className="text-sm font-medium text-brand-navy leading-tight">{a.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}