import React from "react";
import { formatMoney } from "@/lib/financeWording";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

// Income and Expense report: summary cards + monthly breakdown table.
export default function IncomeExpenseReport({ data, org, wording }) {
  if (!data) return null;
  const cur = org?.currency;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-status-ok/10 rounded-xl border border-status-ok/20 p-4">
          <div className="flex items-center gap-1.5 text-status-ok text-xs uppercase tracking-wide">
            <TrendingUp className="w-3.5 h-3.5" /> {wording.moneyIn}
          </div>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{formatMoney(data.totalIncome, cur)}</p>
        </div>
        <div className="bg-status-bad/10 rounded-xl border border-status-bad/20 p-4">
          <div className="flex items-center gap-1.5 text-status-bad text-xs uppercase tracking-wide">
            <TrendingDown className="w-3.5 h-3.5" /> {wording.moneyOut}
          </div>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{formatMoney(data.totalExpense, cur)}</p>
        </div>
        <div className="bg-brand-navy text-white rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-white/60 text-xs uppercase tracking-wide">
            <Wallet className="w-3.5 h-3.5" /> Net
          </div>
          <p className="text-2xl font-bold mt-1">{formatMoney(data.net, cur)}</p>
        </div>
      </div>

      {data.byMonth.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-brand-navy text-sm">Monthly Breakdown</h3>
          </div>
          <div className="divide-y divide-border">
            {data.byMonth.map((m) => (
              <div key={m.month} className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium text-brand-navy">{m.month}</span>
                <div className="flex gap-4">
                  <span className="text-status-ok">{formatMoney(m.income, cur)}</span>
                  <span className="text-status-bad">{formatMoney(m.expense, cur)}</span>
                  <span className={`font-medium ${m.net >= 0 ? "text-brand-navy" : "text-status-bad"}`}>
                    {formatMoney(m.net, cur)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyReport label="No transactions in the selected period." />
      )}
    </div>
  );
}

function EmptyReport({ label }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}