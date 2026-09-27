import React from "react";

// Shared "FADS recommends" action area used across Intelligence cards.
// Soft teal tint with a teal label — visually distinct from raw statistics,
// keeps every card in one FADS design system.
export default function FadsRecommendation({ children, label = "FADS recommends" }) {
  return (
    <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-xl p-3">
      <p className="text-xs font-medium text-brand-teal">{label}</p>
      <p className="text-sm text-brand-navy mt-0.5">{children}</p>
    </div>
  );
}