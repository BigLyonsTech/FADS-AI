import React from "react";
import { Sparkles } from "lucide-react";

// Suggested questions shown when the conversation is empty or as quick prompts.
export default function OfficerSuggestions({ suggestions, onAsk, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-brand-teal" /> Try asking
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onAsk(s.question)}
            disabled={disabled}
            className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-brand-mint hover:border-brand-teal/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}