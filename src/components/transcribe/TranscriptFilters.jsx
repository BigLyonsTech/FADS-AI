import React from "react";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { TRANSCRIBE_SESSION_TYPES } from "@/lib/transcribeConstants";
import { Star, Archive, RotateCcw } from "lucide-react";

// Filter bar for the transcript library. Provides type, folder, tag, status,
// favourite, and archived filters. All filters are optional and combine.
export default function TranscriptFilters({
  value, onChange, folders, tags,
}) {
  const update = (field, val) => onChange({ ...value, [field]: val });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ResponsiveSelect
        value={value.session_type || "all"}
        onValueChange={(v) => update("session_type", v === "all" ? null : v)}
        placeholder="Type"
        triggerClassName="w-[150px] h-8 text-xs"
        options={[
          { value: "all", label: "All types" },
          ...TRANSCRIBE_SESSION_TYPES.map((t) => ({ value: t.value, label: t.label })),
        ]}
      />

      <ResponsiveSelect
        value={value.folder_id || "all"}
        onValueChange={(v) => update("folder_id", v === "all" ? null : v)}
        placeholder="Folder"
        triggerClassName="w-[140px] h-8 text-xs"
        options={[
          { value: "all", label: "All folders" },
          ...folders.map((f) => ({ value: f.id, label: f.name })),
        ]}
      />

      <ResponsiveSelect
        value={value.tag || "all"}
        onValueChange={(v) => update("tag", v === "all" ? null : v)}
        placeholder="Tag"
        triggerClassName="w-[120px] h-8 text-xs"
        options={[
          { value: "all", label: "All tags" },
          ...tags.map((t) => ({ value: t.name, label: t.name })),
        ]}
      />

      <ResponsiveSelect
        value={value.status || "all"}
        onValueChange={(v) => update("status", v === "all" ? null : v)}
        placeholder="Status"
        triggerClassName="w-[110px] h-8 text-xs"
        options={[
          { value: "all", label: "All statuses" },
          { value: "draft", label: "Draft" },
          { value: "completed", label: "Completed" },
        ]}
      />

      <button
        onClick={() => update("favourite_only", !value.favourite_only)}
        className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-md border text-xs transition-colors ${
          value.favourite_only
            ? "bg-status-warn/15 border-status-warn/40 text-status-warn"
            : "bg-card border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        <Star className="w-3 h-3" /> Favourites
      </button>

      <button
        onClick={() => update("archived_only", !value.archived_only)}
        className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-md border text-xs transition-colors ${
          value.archived_only
            ? "bg-brand-navy border-brand-navy text-white"
            : "bg-card border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        <Archive className="w-3 h-3" /> Archived
      </button>

      {(value.session_type || value.folder_id || value.tag || value.status || value.favourite_only || value.archived_only) && (
        <button
          onClick={() => onChange({})}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}