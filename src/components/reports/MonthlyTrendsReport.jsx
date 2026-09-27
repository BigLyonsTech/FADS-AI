import React from "react";
import { formatMoney } from "@/lib/financeWording";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

// Monthly comparisons and trend charts: 12-month income vs expense bar
// chart with a cumulative net line overlay.
export default function MonthlyTrendsReport({ data, org, wording }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No transaction data available for trend analysis.</p>
      </div>
    );
  }
  const cur = org?.currency;
  const chartData = data.map((m) => ({
    month: m.month.slice(5),
    Income: m.income,
    Expense: m.expense,
    Net: m.net,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-semibold text-brand-navy text-sm mb-3">
          {wording.moneyIn} vs {wording.moneyOut} — Last 12 Months
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoney(v, cur).replace(/\.\d+/, "")} />
              <Tooltip
                formatter={(v) => formatMoney(v, cur)}
                contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line dataKey="Net" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-brand-navy text-sm">Monthly Detail</h3>
        </div>
        <div className="divide-y divide-border">
          {data.map((m) => (
            <div key={m.month} className="grid grid-cols-4 gap-2 p-3 text-sm">
              <span className="font-medium text-brand-navy">{m.month}</span>
              <span className="text-status-ok text-right">{formatMoney(m.income, cur)}</span>
              <span className="text-status-bad text-right">{formatMoney(m.expense, cur)}</span>
              <span className={`font-medium text-right ${m.net >= 0 ? "text-brand-navy" : "text-status-bad"}`}>
                {formatMoney(m.net, cur)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}