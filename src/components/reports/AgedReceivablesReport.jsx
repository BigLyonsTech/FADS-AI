import React from "react";
import { formatMoney } from "@/lib/financeWording";
import { Clock } from "lucide-react";

// Aged receivables: outstanding invoice balances grouped by age bucket.
export default function AgedReceivablesReport({ data, org, invoiceWording }) {
  if (!data || data.count === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Clock className="w-8 h-8 text-status-ok mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No outstanding {invoiceWording.invoicePlural.toLowerCase()} to age.</p>
      </div>
    );
  }
  const cur = org?.currency;
  const maxAmount = Math.max(...data.buckets.map((b) => b.amount), 1);

  return (
    <div className="space-y-4">
      <div className="bg-brand-navy text-white rounded-2xl p-4 flex items-center justify-between">
        <span className="text-sm">Total Outstanding (as of {data.asOf})</span>
        <span className="text-xl font-bold">{formatMoney(data.totalOutstanding, cur)}</span>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-brand-navy text-sm">Age Buckets</h3>
        </div>
        <div className="divide-y divide-border">
          {data.buckets.map((b) => (
            <div key={b.label} className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-brand-navy">{b.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-navy">{formatMoney(b.amount, cur)}</span>
                  {b.count > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{b.count}</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    b.label === "Current" ? "bg-status-ok" :
                    b.label === "1–30 days" ? "bg-status-warn" :
                    "bg-status-bad"
                  }`}
                  style={{ width: `${(b.amount / maxAmount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}