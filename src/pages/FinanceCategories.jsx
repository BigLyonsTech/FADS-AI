import React, { useState } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { canManageFinance } from "@/lib/financeWording";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Plus, Pencil, RefreshCw, Trash2, Tag } from "lucide-react";
import CategoryDialog from "@/components/finance/CategoryDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import { base44 } from "@/api/base44Client";

export default function FinanceCategories() {
  const { activeOrg, activeRole } = useWorkspace();
  const fin = useFinance();
  const canManage = canManageFinance(activeRole);
  const [dialog, setDialog] = useState(null);

  const remove = async (c) => {
    if (!confirm("Delete this category?")) return;
    try {
      await base44.functions.invoke("finance", {
        action: "delete_category",
        organisation_id: activeOrg.id,
        category_id: c.id,
      });
      fin.reload();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const income = fin.categories.filter((c) => c.kind === "income");
  const expense = fin.categories.filter((c) => c.kind === "expense");

  const Row = ({ c }) => (
    <div className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-brand-teal" />
        <span className="text-sm font-medium text-brand-navy">{c.name}</span>
      </div>
      {canManage && (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDialog({ type: "category", record: c })}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-status-bad" onClick={() => remove(c)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  if (!activeOrg) {
    return (
      <div className="space-y-4">
        <BackToFinance />
        <div className="rounded-xl border border-status-warn/30 bg-status-warn/10 p-5">
          <h1 className="font-semibold text-brand-navy">Choose a workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            FADS needs an active organisation before Finance categories can load.
          </p>
        </div>
      </div>
    );
  }

  if (fin.loading) {
    return (
      <div className="space-y-4">
        <BackToFinance />
        <div className="min-h-48 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-brand-teal" /> Loading categories…
        </div>
      </div>
    );
  }

  if (fin.loadError) {
    const message = fin.loadError?.response?.data?.error || fin.loadError?.message || "Finance categories could not be loaded.";
    return (
      <div className="space-y-4">
        <BackToFinance />
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h1 className="font-semibold text-brand-navy">Categories could not load</h1>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
          </div>
          <Button variant="outline" className="h-10" onClick={() => fin.reload()}>
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-brand-navy">Categories</h1>
        {canManage && (
          <Button className="h-11" onClick={() => setDialog({ type: "category" })}>
            <Plus className="w-4 h-4" /> New category
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-medium text-status-ok mb-2">Money In</h2>
          <div className="space-y-2">
            {income.length ? income.map((category) => <Row key={category.id} c={category} />) : <p className="text-xs text-muted-foreground">None</p>}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-status-bad mb-2">Money Out</h2>
          <div className="space-y-2">
            {expense.length ? expense.map((category) => <Row key={category.id} c={category} />) : <p className="text-xs text-muted-foreground">None</p>}
          </div>
        </div>
      </div>
      {dialog?.type === "category" && (
        <CategoryDialog open onClose={() => setDialog(null)} onSaved={fin.reload} record={dialog.record} orgId={activeOrg.id} />
      )}
    </div>
  );
}