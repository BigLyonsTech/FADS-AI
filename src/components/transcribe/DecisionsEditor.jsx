import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

// Decisions editor — list of key decisions or resolutions. Each can be
// edited, approved individually, or deleted. New decisions can be added.
export default function DecisionsEditor({ decisions, onChange }) {
  const items = Array.isArray(decisions) ? decisions : [];

  const update = (index, field, val) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    onChange(next);
  };

  const add = () => onChange([...items, { text: "", approved: false }]);
  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  const approvedCount = items.filter((d) => d.approved).length;

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No decisions recorded yet.</p>
      )}
      {items.map((d, i) => (
        <div key={i} className="flex items-start gap-2 p-2 rounded-md border border-border bg-card">
          <button
            onClick={() => update(i, "approved", !d.approved)}
            className={`mt-1.5 shrink-0 ${d.approved ? "text-status-ok" : "text-muted-foreground hover:text-brand-teal"}`}
            title={d.approved ? "Approved" : "Click to approve"}
          >
            {d.approved ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          </button>
          <Input
            value={d.text || ""}
            onChange={(e) => update(i, "text", e.target.value)}
            placeholder="Decision or resolution…"
            className="flex-1 h-8 text-sm"
          />
          <button
            onClick={() => remove(i)}
            className="mt-1 text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button onClick={add} variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="w-3 h-3" /> Add Decision
        </Button>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {approvedCount}/{items.length} approved
          </span>
        )}
      </div>
    </div>
  );
}