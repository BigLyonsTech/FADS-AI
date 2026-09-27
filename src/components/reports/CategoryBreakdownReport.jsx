import React from "react";
import { formatMoney } from "@/lib/financeWording";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0d9488", "#1e293b", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

// Income and expenses by category: pie charts + breakdown lists.
export default function CategoryBreakdownReport({ data, org, wording }) {
  if (!data) return null;
  const cur = org?.currency;

  const renderPie = (items, title, colorOffset) => {
    if (!items.length) return null;
    const chartData = items.map((c) => ({ name: c.name, value: c.amount }));
    return (
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-semibold text-brand-navy text-sm mb-3">{title}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[(i + colorOffset) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => formatMoney(v, cur)}
                contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 mt-2">
          {items.map((c, i) => (
            <div key={c.category_id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[(i + colorOffset) % COLORS.length] }}
                />
                <span className="text-muted-foreground truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium text-brand-navy">{formatMoney(c.amount, cur)}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">{c.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasData = data.income.length > 0 || data.expense.length > 0 ||
    data.uncategorisedIncome > 0 || data.uncategorisedExpense > 0;

  if (!hasData) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No categorised transactions in the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderPie(data.income, `${wording.moneyIn} by Category`, 0)}
        {renderPie(data.expense, `${wording.moneyOut} by Category`, 4)}
      </div>
      {(data.uncategorisedIncome > 0 || data.uncategorisedExpense > 0) && (
        <div className="bg-status-warn/10 rounded-xl border border-status-warn/20 p-3 text-xs text-status-warn">
          Some transactions are uncategorised ({formatMoney(data.uncategorisedIncome + data.uncategorisedExpense, cur)}).
          Assign categories to individual transactions for a complete breakdown.
        </div>
      )}
    </div>
  );
}