import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@/lib/financeWording";
import { FileText, AlertCircle } from "lucide-react";

// Outstanding invoices: unpaid invoices with positive balance.
export default function OutstandingInvoicesReport({ data, org, invoiceWording }) {
  if (!data || data.count === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <FileText className="w-8 h-8 text-status-ok mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No outstanding {invoiceWording.invoicePlural.toLowerCase()}.</p>
      </div>
    );
  }
  const cur = org?.currency;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-status-warn/10 rounded-xl border border-status-warn/20 p-4">
          <p className="text-xs uppercase tracking-wide text-status-warn">Total Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{formatMoney(data.totalOutstanding, cur)}</p>
          <p className="text-xs text-muted-foreground">{data.count} {invoiceWording.invoicePlural.toLowerCase()}</p>
        </div>
        <div className="bg-status-bad/10 rounded-xl border border-status-bad/20 p-4">
          <p className="text-xs uppercase tracking-wide text-status-bad">Total Overdue</p>
          <p className="text-2xl font-bold mt-1 text-brand-navy">{formatMoney(data.totalOverdue, cur)}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {data.invoices.map((inv) => (
            <Link
              key={inv.id}
              to={`/finance/invoices/${inv.id}`}
              className="flex items-center justify-between p-3 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-brand-navy">{inv.invoice_number}</p>
                  {inv.is_overdue && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-status-bad font-medium">
                      <AlertCircle className="w-3 h-3" /> {inv.days_overdue}d overdue
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {inv.customer_name} · Due {inv.due_date}
                </p>
              </div>
              <span className="font-semibold text-brand-navy shrink-0 ml-2">
                {formatMoney(inv.balance, inv.currency)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}