import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { ACTION_POINT_STATUSES } from "@/lib/transcribeConstants";

// Action points editor — list of action points with owner, due date, and
// status. Each can be edited, approved individually, or deleted.
export default function ActionPointsEditor({ actionPoints, onChange }) {
  const items = Array.isArray(actionPoints) ? actionPoints : [];

  const update = (index, field, val) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    onChange(next);
  };

  const add = () => onChange([...items, { text: "", owner: "", due_date: "", status: "open", approved: false }]);
  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  const approvedCount = items.filter((a) => a.approved).length;

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No action points recorded yet.</p>
      )}
      {items.map((a, i) => (
        <div key={i} className="p-2 rounded-md border border-border bg-card space-y-1.5">
          <div className="flex items-start gap-2">
            <button
              onClick={() => update(i, "approved", !a.approved)}
              className={`mt-1.5 shrink-0 ${a.approved ? "text-status-ok" : "text-muted-foreground hover:text-brand-teal"}`}
              title={a.approved ? "Approved" : "Click to approve"}
            >
              {a.approved ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
            <Input
              value={a.text || ""}
              onChange={(e) => update(i, "text", e.target.value)}
              placeholder="Action to be taken…"
              className="flex-1 h-8 text-sm"
            />
            <button
              onClick={() => remove(i)}
              className="mt-1 text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-1.5 pl-6">
            <Input
              value={a.owner || ""}
              onChange={(e) => update(i, "owner", e.target.value)}
              placeholder="Owner"
              className="text-xs h-7 flex-1"
            />
            <Input
              type="date"
              value={a.due_date || ""}
              onChange={(e) => update(i, "due_date", e.target.value)}
              className="text-xs h-7 flex-1"
            />
            <Select
              value={a.status || "open"}
              onValueChange={(v) => update(i, "status", v)}
            >
              <SelectTrigger className="text-xs h-7 w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_POINT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button onClick={add} variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="w-3 h-3" /> Add Action Point
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