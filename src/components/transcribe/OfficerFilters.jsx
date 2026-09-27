import React from "react";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { TRANSCRIBE_SESSION_TYPES } from "@/lib/transcribeConstants";
import { Filter, RotateCcw } from "lucide-react";

// Filter bar for the Transcribe Officer. Filters limit which transcripts
// are searched: folder, tag, session type, participant, date range.
export default function OfficerFilters({ value, onChange, folders, tags }) {
  const update = (field, val) => onChange({ ...value, [field]: val });
  const hasFilters = value.session_type || value.folder_id || value.tag || value.participant || value.date_from || value.date_to;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Search scope</span>
        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground ml-auto"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ResponsiveSelect
          value={value.session_type || "all"}
          onValueChange={(v) => update("session_type", v === "all" ? null : v)}
          placeholder="Type"
          triggerClassName="w-[130px] h-7 text-xs"
          options={[
            { value: "all", label: "All types" },
            ...TRANSCRIBE_SESSION_TYPES.map((t) => ({ value: t.value, label: t.label })),
          ]}
        />

        <ResponsiveSelect
          value={value.folder_id || "all"}
          onValueChange={(v) => update("folder_id", v === "all" ? null : v)}
          placeholder="Folder"
          triggerClassName="w-[120px] h-7 text-xs"
          options={[
            { value: "all", label: "All folders" },
            ...folders.map((f) => ({ value: f.id, label: f.name })),
          ]}
        />

        <ResponsiveSelect
          value={value.tag || "all"}
          onValueChange={(v) => update("tag", v === "all" ? null : v)}
          placeholder="Tag"
          triggerClassName="w-[110px] h-7 text-xs"
          options={[
            { value: "all", label: "All tags" },
            ...tags.map((t) => ({ value: t.name, label: t.name })),
          ]}
        />

        <Input
          value={value.participant || ""}
          onChange={(e) => update("participant", e.target.value)}
          placeholder="Participant"
          className="w-[120px] h-7 text-xs"
        />
        <Input
          type="date"
          value={value.date_from || ""}
          onChange={(e) => update("date_from", e.target.value)}
          className="w-[130px] h-7 text-xs"
          title="From date"
        />
        <Input
          type="date"
          value={value.date_to || ""}
          onChange={(e) => update("date_to", e.target.value)}
          className="w-[130px] h-7 text-xs"
          title="To date"
        />
      </div>
    </div>
  );
}