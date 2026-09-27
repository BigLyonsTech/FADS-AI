import React, { useState } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { financeWording, canManageFinance } from "@/lib/financeWording";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import ContactDialog from "@/components/finance/ContactDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import { base44 } from "@/api/base44Client";

const KIND_LABEL = {
  customer: "Customer",
  parent: "Parent/Guardian",
  member: "Member",
  donor: "Donor",
  supplier: "Supplier",
  other: "Other",
};

export default function FinanceContacts() {
  const { activeOrg, activeRole } = useWorkspace();
  const fin = useFinance();
  const w = financeWording(activeOrg?.type);
  const canManage = canManageFinance(activeRole);
  const [dialog, setDialog] = useState(null);

  const remove = async (c) => {
    if (!confirm("Delete this contact?")) return;
    try {
      await base44.functions.invoke("finance", {
        action: "delete_contact",
        organisation_id: activeOrg.id,
        contact_id: c.id,
      });
      fin.reload();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  return (
    <div className="space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-brand-navy">{w.contactInPlural} & Suppliers</h1>
        {canManage && (
          <Button className="h-11" onClick={() => setDialog({ type: "contact" })}>
            <Plus className="w-4 h-4" /> New contact
          </Button>
        )}
      </div>
      {fin.contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">No contacts yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fin.contacts.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-brand-navy">{c.name}</p>
                <p className="text-xs text-muted-foreground">{KIND_LABEL[c.kind] || c.kind}</p>
                {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDialog({ type: "contact", record: c })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-status-bad" onClick={() => remove(c)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {dialog?.type === "contact" && (
        <ContactDialog open onClose={() => setDialog(null)} onSaved={fin.reload} record={dialog.record} orgId={activeOrg.id} />
      )}
    </div>
  );
}