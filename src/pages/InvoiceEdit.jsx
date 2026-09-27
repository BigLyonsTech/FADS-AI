import React, { useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useFinance } from "@/lib/useFinance";
import { useInvoices } from "@/lib/useInvoices";
import { useInventory } from "@/lib/useInventory";
import { invoiceWording } from "@/lib/financeWording";
import InvoiceForm from "@/components/finance/InvoiceForm";
import BackToFinance from "@/components/finance/BackToFinance";

// Create or edit an invoice. When :id is present, loads the existing invoice
// for pre-fill; otherwise renders a blank form.
export default function InvoiceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const fin = useFinance();
  const inv = useInvoices();
  const inventory = useInventory();
  const w = invoiceWording(activeOrg);

  const customers = useMemo(
    () => fin.contacts.filter((c) => ["customer", "parent", "member", "donor"].includes(c.kind)),
    [fin.contacts]
  );

  const draft = location.state?.draft;
  const draftNote = location.state?.note;
  const record = id ? inv.invoices.find((i) => i.id === id) : null;
  const prefill = id ? null : (draft || null);

  if (fin.loading || inv.loading || inventory.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (id && !record) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Invoice not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackToFinance />
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">
          {record ? `Edit ${w.invoiceNoun}` : `New ${w.invoiceNoun}`}
        </h1>
        <p className="text-sm text-muted-foreground">{activeOrg?.name} · {activeOrg?.currency}</p>
      </div>
      {draftNote && (
        <div className="bg-status-warn/10 border border-status-warn/30 text-status-warn text-sm rounded-lg p-3">
          {draftNote}
        </div>
      )}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <InvoiceForm
          key={`${activeOrg.id}:${dataMode}:${id || "new"}`}
          orgId={activeOrg.id}
          currency={activeOrg.currency}
          defaultTaxRate={activeOrg.default_tax_rate}
          contacts={fin.contacts}
          customers={customers}
          inventoryItems={activeOrg?.type === "small_business" ? inventory.items : []}
          enableInventoryLink={activeOrg?.type === "small_business"}
          record={record}
          prefill={prefill}
          wording={w}
          onSaved={async () => {
            await inv.reload();
            await fin.reload();
            navigate(record ? `/finance/invoices/${record.id}` : "/finance/invoices");
          }}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
}