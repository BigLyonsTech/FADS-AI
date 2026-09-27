import React, { useState } from "react";
import { Link } from "react-router-dom";
import { HandCoins, Bell, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/currencyFormat";
import ExplainSimply from "@/components/intelligence/ExplainSimply";

const BUCKETS = [
  { key: "1-30", label: "1–30 days" },
  { key: "31-60", label: "31–60 days" },
  { key: "61-90", label: "61–90 days" },
  { key: "90+", label: "90+ days" },
];

// Debt & Payment Recovery — ageing buckets from existing invoices, plus a
// "Prepare reminders" action for customers more than 30 days overdue.
// Reminders are drafted (never auto-sent); the existing invoice page handles
// the WhatsApp draft flow. Reminders stop once an invoice is marked paid.
export default function DebtCard({ debt, currency }) {
  const [showAll, setShowAll] = useState(false);
  if (!debt?.hasData) {
    return (
      <div className="bg-card rounded-2xl border border-brand-teal/15 p-5">
        <Header />
        <p className="text-sm text-muted-foreground mt-3">No outstanding invoices recorded.</p>
      </div>
    );
  }
  const overdue30Plus = debt.overdueRows.filter((r) => r.daysOverdue > 30);
  const visible = showAll ? debt.overdueRows : debt.overdueRows.slice(0, 5);
  return (
    <div className="bg-card rounded-2xl border border-brand-teal/15 p-5 space-y-4">
      <Header />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BUCKETS.map((b) => (
          <div key={b.key} className="bg-muted/40 rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">{b.label}</p>
            <p className="text-sm font-semibold text-brand-navy break-words">{formatCurrency(debt.totals[b.key], currency)}</p>
            <p className="text-[11px] text-muted-foreground">{debt.buckets[b.key].length} invoice(s)</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-status-warn/5 border border-status-warn/20 rounded-xl p-3">
        <div>
          <p className="text-xs text-muted-foreground">Total overdue</p>
          <p className="text-lg font-bold text-brand-navy">{formatCurrency(debt.totalOverdue, currency)}</p>
        </div>
        <span className="text-xs text-muted-foreground">{debt.overdueCount} overdue invoice(s)</span>
      </div>
      {overdue30Plus.length > 0 && (
        <Link
          to="/finance/invoices"
          className="flex items-center justify-between bg-brand-navy text-white rounded-xl p-3 hover:opacity-90"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Bell className="w-4 h-4 text-brand-teal" /> Prepare reminders for {overdue30Plus.length} customer(s) 30+ days overdue
          </span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
      {visible.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Overdue invoices</p>
          {visible.map((r) => (
            <Link
              key={r.id}
              to={r.url}
              className="flex items-center justify-between bg-muted/30 rounded-xl p-3 hover:bg-muted/60"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-navy truncate">{r.customer_name}</p>
                <p className="text-[11px] text-muted-foreground">{r.invoice_number} · due {r.due_date} · {r.daysOverdue}d overdue</p>
              </div>
              <span className="text-sm font-semibold text-status-bad shrink-0 ml-2">{formatCurrency(r.balance, currency)}</span>
            </Link>
          ))}
          {debt.overdueRows.length > 5 && (
            <button onClick={() => setShowAll((v) => !v)} className="text-xs text-brand-teal font-medium">
              {showAll ? "Show fewer" : `Show all ${debt.overdueRows.length}`}
            </button>
          )}
        </div>
      )}
      <div className="pt-1">
        <ExplainSimply topic="Overdue customer debt" figure={formatCurrency(debt.totalOverdue, currency)} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Reminders are drafted for your review — FADS never sends them automatically. Reminders stop once an invoice is marked paid.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <HandCoins className="w-5 h-5 text-brand-teal" />
      <h2 className="font-semibold text-brand-navy">Debt &amp; Payment Recovery</h2>
    </div>
  );
}