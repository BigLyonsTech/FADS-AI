import React from "react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/financeWording";
import { Users, Wallet, TrendingDown, PiggyBank, Banknote } from "lucide-react";

export default function PayrollReport({ data, org }) {
  if (!data) return null;
  const currency = org?.currency || "";
  const fmt = (n) => formatMoney(n, currency);

  const stats = [
    { label: "Payroll Total (Gross)", value: fmt(data.total_gross), icon: Banknote },
    { label: "Gross Pay", value: fmt(data.total_gross), icon: Wallet },
    { label: "Allowances", value: fmt(data.total_allowances), icon: PiggyBank },
    { label: "Deductions", value: fmt(data.total_deductions), icon: TrendingDown },
    { label: "Net Pay", value: fmt(data.total_net), icon: Wallet },
    { label: "Employees Paid", value: data.employee_count, icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4 text-brand-teal" />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-xl font-heading font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">Payroll Runs ({data.run_count})</h3>
        </div>
        {data.runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No posted payroll runs in this period.
          </p>
        ) : (
          <div className="space-y-2">
            {data.runs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm border-b last:border-0 border-border pb-2 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-xs">
                    {r.pay_period_start} → {r.pay_period_end}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.employee_count} employees · {r.status}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-xs">Net {fmt(r.total_net)}</p>
                  <p className="text-xs text-muted-foreground">Gross {fmt(r.total_gross)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}