import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInvoices } from "@/lib/useInvoices";
import { invoiceWording, formatMoney } from "@/lib/financeWording";
import { receiptKindLabel } from "@/lib/invoiceUtils";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import { Plus, Receipt as ReceiptIcon } from "lucide-react";

export default function Receipts() {
  const { activeOrg } = useWorkspace();
  const inv = useInvoices();
  const w = invoiceWording(activeOrg);
  const navigate = useNavigate();

  const sorted = useMemo(
    () => [...inv.receipts].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [inv.receipts]
  );

  if (inv.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{w.receiptPlural}</h1>
          <p className="text-sm text-muted-foreground">{activeOrg?.name} · {activeOrg?.currency}</p>
        </div>
        <Button className="h-11" onClick={() => navigate("/finance/receipts/new")}>
          <Plus className="w-4 h-4" /> New {w.receiptNoun}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <ReceiptIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No {w.receiptPlural.toLowerCase()} yet.
            {w.invoicesEnabled
              ? ` Receipts are issued automatically when you record a ${w.invoiceNoun.toLowerCase()} payment.`
              : " Create a receipt from a recorded money-in entry."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => (
            <Link
              key={r.id}
              to={`/finance/receipts/${r.id}`}
              className="block bg-card rounded-xl border border-border p-4 hover:border-brand-teal"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-brand-navy">{r.receipt_number}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-teal/15 text-brand-teal">
                      {receiptKindLabel(r.kind)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {r.payer_name || "Anonymous"} · {r.date}
                  </p>
                </div>
                <p className="font-bold text-status-ok shrink-0">{formatMoney(r.amount, r.currency)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}