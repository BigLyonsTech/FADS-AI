import React from "react";
import { Sparkles } from "lucide-react";

// Horizontal scrollable row of suggested questions. Clicking a suggestion
// sends it to the officer immediately.
export default function OfficerSuggestions({ suggestions, onAsk, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
        <span>Suggested questions</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onAsk(s.question)}
            disabled={disabled}
            className="shrink-0 inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-2 text-xs text-brand-navy hover:border-brand-teal hover:bg-brand-mint/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}