import React from "react";
import { formatMoney } from "@/lib/financeWording";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

// Cash-flow summary: opening → inflows → outflows → closing.
export default function CashFlowReport({ data, org }) {
  if (!data) return null;
  const cur = org?.currency;
  const rows = [
    { label: "Opening Balance", value: data.openingBalance, icon: Wallet, color: "text-brand-navy" },
    { label: "Total Inflow", value: data.totalInflow, icon: ArrowDownLeft, color: "text-status-ok" },
    { label: "Total Outflow", value: data.totalOutflow, icon: ArrowUpRight, color: "text-status-bad" },
    { label: "Net Flow", value: data.netFlow, icon: Wallet, color: data.netFlow >= 0 ? "text-status-ok" : "text-status-bad" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <r.icon className={`w-4 h-4 ${r.color}`} />
                <span className="text-sm text-muted-foreground">{r.label}</span>
              </div>
              <span className={`font-semibold ${r.color}`}>{formatMoney(r.value, cur)}</span>
            </div>
          ))}
        </div>
        <div className="bg-brand-navy text-white p-4 flex items-center justify-between">
          <span className="text-sm font-medium">Closing Balance</span>
          <span className="text-xl font-bold">{formatMoney(data.closingBalance, cur)}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Based on {data.transactionCount} cleared transaction{data.transactionCount !== 1 ? "s" : ""}.
        Pending and cancelled transactions are excluded.
      </p>
    </div>
  );
}