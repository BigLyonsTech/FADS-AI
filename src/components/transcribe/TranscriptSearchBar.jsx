import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

// Search bar for the transcript library. Searches across titles,
// participants, transcript text, summaries, decisions and action points.
export default function TranscriptSearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search titles, text, decisions…"}
        className="pl-9 pr-9 h-9"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}