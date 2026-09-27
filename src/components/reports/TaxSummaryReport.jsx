import React from "react";
import { formatMoney } from "@/lib/financeWording";
import { Receipt, Info } from "lucide-react";

// Tax-record summary: tax collected on income, tax paid on expenses, net tax.
// Marked as record-based estimates requiring professional verification.
export default function TaxSummaryReport({ data, org }) {
  if (!data) return null;
  const cur = org?.currency;
  const taxLabel = org?.tax_label || "Tax";

  return (
    <div className="space-y-4">
      <div className="bg-status-warn/10 rounded-xl border border-status-warn/30 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
        <p className="text-xs text-status-warn">
          Tax figures are record-based estimates calculated from transaction tax rates.
          They require professional verification before filing. Consult a qualified accountant
          or tax advisor for your jurisdiction.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-1.5 text-status-ok text-xs uppercase tracking-wide">
            <Receipt className="w-3.5 h-3.5" /> {taxLabel} Collected
          </div>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{formatMoney(data.taxCollected, cur)}</p>
          <p className="text-xs text-muted-foreground">On income transactions</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-1.5 text-status-bad text-xs uppercase tracking-wide">
            <Receipt className="w-3.5 h-3.5" /> {taxLabel} Paid
          </div>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{formatMoney(data.taxPaid, cur)}</p>
          <p className="text-xs text-muted-foreground">On expense transactions</p>
        </div>
        <div className="bg-brand-navy text-white rounded-2xl p-4">
          <p className="text-white/60 text-xs uppercase tracking-wide">Net {taxLabel}</p>
          <p className="text-2xl font-bold mt-1">{formatMoney(data.netTax, cur)}</p>
          <p className="text-xs text-white/60">Collected minus paid</p>
        </div>
      </div>

      {data.byMonth.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-brand-navy text-sm">Monthly {taxLabel} Breakdown</h3>
          </div>
          <div className="divide-y divide-border">
            {data.byMonth.map((m) => (
              <div key={m.month} className="grid grid-cols-4 gap-2 p-3 text-sm">
                <span className="font-medium text-brand-navy">{m.month}</span>
                <span className="text-status-ok text-right">{formatMoney(m.collected, cur)}</span>
                <span className="text-status-bad text-right">{formatMoney(m.paid, cur)}</span>
                <span className="font-medium text-right text-brand-navy">
                  {formatMoney(m.collected - m.paid, cur)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}