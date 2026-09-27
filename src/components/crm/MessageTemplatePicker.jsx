import React, { useMemo } from "react";
import { TEMPLATE_CATEGORY_LABELS } from "@/lib/automationWording";

// Lightweight template picker — reused by WhatsAppComposer and BulkEmailDialog.
// Shows curated default templates + owner-created templates for the active channel.
// Selecting one calls onSelect(body) — the composer remains the single review surface.
export default function MessageTemplatePicker({ templates, channel, onSelect, value }) {
  const channelTemplates = useMemo(
    () => (templates || []).filter((t) => t.channel === channel),
    [templates, channel]
  );

  if (!channelTemplates.length) return null;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Use a saved template</label>
      <select
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={value || ""}
        onChange={(e) => {
          const t = channelTemplates.find((x) => x.id === e.target.value);
          if (t && onSelect) onSelect(t.body);
        }}
      >
        <option value="">— Choose a template —</option>
        {channelTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {TEMPLATE_CATEGORY_LABELS[t.category] || t.category}: {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}