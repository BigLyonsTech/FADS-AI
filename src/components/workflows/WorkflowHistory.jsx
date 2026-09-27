import React from "react";
import { History, Check, Clock, Pause, X } from "lucide-react";

const STATUS_META = {
  completed: { label: "Completed", icon: Check, cls: "text-status-ok" },
  active: { label: "Active", icon: Clock, cls: "text-brand-teal" },
  waiting_for_approval: { label: "Waiting for approval", icon: Clock, cls: "text-status-warn" },
  paused: { label: "Paused", icon: Pause, cls: "text-muted-foreground" },
  failed: { label: "Failed", icon: X, cls: "text-status-bad" },
};

// Lightweight workflow run history — shows recent runs with status, summary
// and timestamp. Not a full analytics dashboard; just a simple activity log.
export default function WorkflowHistory({ runs }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-brand-teal" />
          <h2 className="font-semibold text-brand-navy">Workflow History</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No workflows run yet. Activate a template and run it to see your history here.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-brand-teal" />
        <h2 className="font-semibold text-brand-navy">Workflow History</h2>
      </div>
      <div className="space-y-2">
        {runs.map((r) => {
          const meta = STATUS_META[r.status] || STATUS_META.active;
          const Icon = meta.icon;
          return (
            <div key={r.id} className="flex items-start gap-3 bg-muted/30 rounded-xl p-3">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${meta.cls}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-brand-navy truncate">{r.template_name}</p>
                  <span className={`text-xs font-medium shrink-0 ${meta.cls}`}>{meta.label}</span>
                </div>
                {r.summary && <p className="text-xs text-muted-foreground mt-0.5">{r.summary}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(r.started_date).toLocaleDateString()} ·{" "}
                  {new Date(r.started_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}