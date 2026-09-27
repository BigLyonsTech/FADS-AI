import React from "react";
import { Sparkles } from "lucide-react";

export default function AssistantSuggestions({ suggestions, onPick, compact }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {!compact && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Sparkles className="w-4 h-4 text-brand-teal" />
          Suggested questions
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.question}
            onClick={() => onPick(s.question)}
            className="text-left text-sm rounded-full border border-border bg-card px-4 py-2.5 hover:border-brand-teal hover:bg-brand-teal/5 transition-colors min-h-touch"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}