import React from "react";
import { formatMoney } from "@/lib/financeWording";
import { Wallet } from "lucide-react";

// Account balance summary: per-account opening, inflow, outflow, current.
export default function AccountBalanceReport({ data, org }) {
  if (!data || !data.length) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No accounts found.</p>
      </div>
    );
  }
  const cur = org?.currency;
  const total = data.reduce((s, a) => s + a.current_balance, 0);

  return (
    <div className="space-y-3">
      {data.map((a) => (
        <div key={a.account_id} className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-brand-navy">{a.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {a.account_type?.replace(/_/g, " ")}
                {!a.is_active && " · Inactive"}
              </p>
            </div>
            <p className="text-lg font-bold text-brand-navy">{formatMoney(a.current_balance, cur)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-muted-foreground">Opening</p>
              <p className="font-medium text-brand-navy">{formatMoney(a.opening_balance, cur)}</p>
            </div>
            <div className="bg-status-ok/10 rounded-lg p-2">
              <p className="text-muted-foreground">Inflow</p>
              <p className="font-medium text-status-ok">{formatMoney(a.inflow, cur)}</p>
            </div>
            <div className="bg-status-bad/10 rounded-lg p-2">
              <p className="text-muted-foreground">Outflow</p>
              <p className="font-medium text-status-bad">{formatMoney(a.outflow, cur)}</p>
            </div>
          </div>
        </div>
      ))}
      <div className="bg-brand-navy text-white rounded-2xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium">Total Across All Accounts</span>
        <span className="text-xl font-bold">{formatMoney(total, cur)}</span>
      </div>
    </div>
  );
}