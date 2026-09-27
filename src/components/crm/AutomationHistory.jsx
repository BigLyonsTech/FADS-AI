import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle, FileEdit } from "lucide-react";

// Lightweight automation history panel.
// Shows recent AutomationRun records with their status.
// Never shows "Sent" unless the provider confirmed success (email via SendEmail).
const STATUS_META = {
  draft: { label: "Draft", icon: FileEdit, color: "bg-amber-100 text-amber-800" },
  ready: { label: "Ready", icon: Clock, color: "bg-blue-100 text-blue-800" },
  sent: { label: "Sent", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  failed: { label: "Failed", icon: XCircle, color: "bg-red-100 text-red-800" },
  skipped: { label: "Skipped", icon: AlertCircle, color: "bg-slate-100 text-slate-600" },
};

export default function AutomationHistory({ runs, limit = 20 }) {
  const sorted = useMemo(
    () => [...runs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, limit),
    [runs, limit]
  );

  if (!sorted.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        No automation activity yet. When a rule fires, you'll see it here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((run) => {
        const meta = STATUS_META[run.status] || STATUS_META.ready;
        const Icon = meta.icon;
        return (
          <div key={run.id} className="flex items-start gap-2 rounded-lg border px-3 py-2">
            <div className="shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {run.contact_name || "—"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {run.action_label || run.rule_name || run.action_type}
                {run.detail && ` · ${run.detail}`}
              </div>
              <div className="text-[11px] text-muted-foreground/70">
                {run.rule_name ? `${run.rule_name} · ` : ""}{formatDate(run.created_date)}
              </div>
            </div>
            <Badge variant="secondary" className={`text-[11px] shrink-0 ${meta.color}`}>
              {meta.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}