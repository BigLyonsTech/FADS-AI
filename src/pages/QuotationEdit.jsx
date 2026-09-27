import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useFinance } from "@/lib/useFinance";
import { useInventory } from "@/lib/useInventory";
import { useQuotations } from "@/lib/useQuotations";
import { canManageInvoices } from "@/lib/financeWording";
import QuotationForm from "@/components/finance/QuotationForm";
import BackToFinance from "@/components/finance/BackToFinance";

export default function QuotationEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, activeRole } = useWorkspace();
  const { dataMode } = useDataMode();
  const finance = useFinance();
  const inventory = useInventory();
  const quotations = useQuotations();

  const customers = useMemo(
    () => finance.contacts.filter((contact) => contact.kind === "customer"),
    [finance.contacts]
  );
  const record = id ? quotations.quotations.find((quotation) => quotation.id === id) : null;

  if (activeOrg?.type !== "small_business") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Quotations are currently available in Small Business workspaces.
        </div>
      </div>
    );
  }

  if (!canManageInvoices(activeRole)) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          You do not have permission to manage quotations.
        </div>
      </div>
    );
  }

  if (finance.loading || inventory.loading || quotations.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  if (id && !record) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Quotation not found.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackToFinance />
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">
          {record ? "Edit Quotation" : "New Quotation"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeOrg.name} · {activeOrg.currency}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <QuotationForm
          key={`${activeOrg.id}:${dataMode}:${id || "new"}`}
          orgId={activeOrg.id}
          currency={activeOrg.currency}
          defaultTaxRate={activeOrg.default_tax_rate}
          customers={customers}
          inventoryItems={inventory.items}
          record={record}
          onSaved={async (savedId) => {
            await quotations.reload();
            await finance.reload();
            navigate(savedId ? `/finance/quotations/${savedId}` : "/finance/quotations");
          }}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
}
