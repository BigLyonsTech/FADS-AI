import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { TRANSCRIBE_SESSION_TYPES, TRANSCRIBE_LANGUAGES } from "@/lib/transcribeConstants";

// Session setup form. Collects title, type, date, language, participants,
// folder, tags, and notes before recording begins.
export default function SessionSetup({
  value, onChange, folders, tags, onCreateFolder, onCreateTag,
}) {
  const update = (field, val) => onChange({ ...value, [field]: val });

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="title">Session title *</Label>
        <Input
          id="title"
          value={value.title || ""}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Weekly Team Meeting"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Session type</Label>
          <ResponsiveSelect
            value={value.session_type || "other"}
            onValueChange={(v) => update("session_type", v)}
            placeholder="Select type"
            triggerClassName="mt-1"
            options={TRANSCRIBE_SESSION_TYPES}
          />
        </div>

        <div>
          <Label htmlFor="session_date">Date and time</Label>
          <Input
            id="session_date"
            type="datetime-local"
            value={value.session_date || ""}
            onChange={(e) => update("session_date", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Language</Label>
          <ResponsiveSelect
            value={value.language || "en"}
            onValueChange={(v) => update("language", v)}
            placeholder="Select language"
            triggerClassName="mt-1"
            options={TRANSCRIBE_LANGUAGES}
          />
        </div>

        <div>
          <Label>Folder (optional)</Label>
          <ResponsiveSelect
            value={value.folder_id || "none"}
            onValueChange={(v) => update("folder_id", v === "none" ? null : v)}
            placeholder="Select folder"
            triggerClassName="mt-1"
            options={[
              { value: "none", label: "No folder" },
              ...folders.map((f) => ({ value: f.id, label: f.name })),
            ]}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="participants">Participants (optional, comma-separated)</Label>
        <Input
          id="participants"
          value={(value.participants || []).join(", ")}
          onChange={(e) =>
            update("participants", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
          }
          placeholder="e.g. John, Mary, David"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (optional, comma-separated)</Label>
        <Input
          id="tags"
          value={(value.tags || []).join(", ")}
          onChange={(e) =>
            update("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
          }
          placeholder="e.g. Finance, Review"
          className="mt-1"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update("tags", [...new Set([...(value.tags || []), t.name])])}
                className="text-xs px-2 py-0.5 rounded-full border border-border hover:bg-muted"
                style={{ color: t.color }}
              >
                + {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={value.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Any notes about this session…"
          className="mt-1 min-h-[60px]"
        />
      </div>
    </div>
  );
}