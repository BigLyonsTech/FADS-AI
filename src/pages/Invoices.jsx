import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInvoices } from "@/lib/useInvoices";
import { useFinance } from "@/lib/useFinance";
import { invoiceWording, formatMoney } from "@/lib/financeWording";
import { deriveInvoiceStatus, statusLabel } from "@/lib/invoiceUtils";
import InvoiceStatusBadge from "@/components/finance/InvoiceStatusBadge";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Receipt as ReceiptIcon } from "lucide-react";

export default function Invoices() {
  const { activeOrg } = useWorkspace();
  const inv = useInvoices();
  const fin = useFinance();
  const w = invoiceWording(activeOrg);
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const customers = useMemo(
    () => fin.contacts.filter((c) => ["customer", "parent", "member", "donor"].includes(c.kind)),
    [fin.contacts]
  );

  const displayed = useMemo(() => {
    let list = inv.invoices;
    if (filter !== "all") {
      list = list.filter((i) => deriveInvoiceStatus(i) === filter);
    }
    return list;
  }, [inv.invoices, filter]);

  if (inv.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  // Churches do not use invoicing by default.
  if (!w.invoicesEnabled) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-xl font-bold text-brand-navy mb-1">Invoicing not available</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {activeOrg?.type === "church"
              ? "Churches use receipts for donations, tithes and offerings rather than invoices."
              : "This organisation type does not use invoicing."}
          </p>
          <Button onClick={() => navigate("/finance/receipts")}>
            <ReceiptIcon className="w-4 h-4" /> Go to Receipts
          </Button>
        </div>
      </div>
    );
  }

  const filters = ["all", "draft", "issued", "part_paid", "overdue", "paid", "cancelled"];

  return (
    <div className="space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{w.invoicePlural}</h1>
          <p className="text-sm text-muted-foreground">{activeOrg?.name} · {activeOrg?.currency}</p>
        </div>
        <Button className="h-11" onClick={() => navigate("/finance/invoices/new")}>
          <Plus className="w-4 h-4" /> New {w.invoiceNoun}
        </Button>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              filter === f
                ? "bg-brand-navy text-white border-brand-navy"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            {f === "all" ? "All" : statusLabel(f)}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No {w.invoicePlural.toLowerCase()} yet. Create your first one to start tracking payments.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((invoice) => {
            const status = deriveInvoiceStatus(invoice);
            const customer = customers.find((c) => c.id === invoice.customer_id);
            return (
              <Link
                key={invoice.id}
                to={`/finance/invoices/${invoice.id}`}
                className="block bg-card rounded-xl border border-border p-4 hover:border-brand-teal"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-brand-navy">{invoice.invoice_number}</span>
                      <InvoiceStatusBadge status={status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {customer?.name || invoice.customer_name} · Due {invoice.due_date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-navy">{formatMoney(invoice.total, invoice.currency)}</p>
                    {Number(invoice.balance) > 0 && Number(invoice.amount_paid) > 0 && (
                      <p className="text-xs text-status-warn">Bal {formatMoney(invoice.balance, invoice.currency)}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}