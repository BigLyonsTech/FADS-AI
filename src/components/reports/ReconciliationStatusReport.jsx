import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@/lib/financeWording";
import { CheckCircle2, AlertCircle, Clock, Landmark } from "lucide-react";

// Reconciliation status report: per-reconciliation status with the
// corrected "Reconciled" definition (all lines matched/ignored with
// reasons AND closing difference is zero).
export default function ReconciliationStatusReport({ data, org }) {
  if (!data || data.total === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Landmark className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No reconciliation sessions found.</p>
      </div>
    );
  }
  const cur = org?.currency;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-status-ok/10 rounded-xl border border-status-ok/20 p-4">
          <div className="flex items-center gap-1.5 text-status-ok text-xs uppercase tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
          </div>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{data.reconciledCount}</p>
        </div>
        <div className="bg-status-warn/10 rounded-xl border border-status-warn/20 p-4">
          <div className="flex items-center gap-1.5 text-status-warn text-xs uppercase tracking-wide">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </div>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{data.inProgressCount}</p>
        </div>
        <div className="bg-brand-navy text-white rounded-xl p-4">
          <p className="text-white/60 text-xs uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold mt-1">{data.total}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {data.rows.map((r) => (
            <Link
              key={r.id}
              to={`/finance/reconciliation/${r.id}`}
              className="flex items-center justify-between p-3 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-navy truncate">{r.account_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.period_start} → {r.period_end}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {r.matched_count} matched · {r.ignored_count} ignored · {r.unmatched_count} unmatched
                  </p>
                  <p className={`text-xs font-medium ${Math.abs(r.difference) > 0.01 ? "text-status-bad" : "text-muted-foreground"}`}>
                    Diff: {formatMoney(r.difference, cur)}
                  </p>
                </div>
                {r.reconciled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-status-ok/15 text-status-ok border border-status-ok/30">
                    <CheckCircle2 className="w-3 h-3" /> Reconciled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-status-warn/15 text-status-warn border border-status-warn/30">
                    <AlertCircle className="w-3 h-3" /> {r.displayStatus === "ready" ? "Ready" : "In Progress"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}