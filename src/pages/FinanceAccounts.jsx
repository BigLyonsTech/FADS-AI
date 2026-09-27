import React, { useState, useMemo } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { canManageFinance, formatMoney } from "@/lib/financeWording";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import AccountDialog from "@/components/finance/AccountDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import { base44 } from "@/api/base44Client";
import { CLASS_ORDER, accountClassLabel } from "@/lib/chartOfAccounts";

export default function FinanceAccounts() {
  const { activeOrg, activeRole } = useWorkspace();
  const fin = useFinance();
  const canManage = canManageFinance(activeRole);
  const [dialog, setDialog] = useState(null);

  const balanceOf = (a) => {
    const txns = fin.transactions.filter((t) => t.account_id === a.id && (t.status === "cleared" || t.status === "completed"));
    const net = txns.reduce(
      (s, t) => s + (t.direction === "in" ? Number(t.amount) : -Number(t.amount)),
      0
    );
    return (Number(a.opening_balance) || 0) + net;
  };

  // Group accounts by accounting class for a readable Chart of Accounts.
  // Legacy accounts without a class fall into an "Other" group at the end.
  const grouped = useMemo(() => {
    const map = {};
    CLASS_ORDER.forEach((c) => (map[c] = []));
    map.__other = [];
    fin.accounts.forEach((a) => {
      if (a.account_class && map[a.account_class]) map[a.account_class].push(a);
      else map.__other.push(a);
    });
    return map;
  }, [fin.accounts]);

  const remove = async (a) => {
    if (!confirm("Delete this account?")) return;
    try {
      await base44.functions.invoke("finance", {
        action: "delete_account",
        organisation_id: activeOrg.id,
        account_id: a.id,
      });
      fin.reload();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const classTotals = (list) =>
    list.reduce((s, a) => s + balanceOf(a), 0);

  return (
    <div className="space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            All accounts for {activeOrg?.name} · {activeOrg?.currency}
          </p>
        </div>
        {canManage && (
          <Button className="h-11" onClick={() => setDialog({ type: "account" })}>
            <Plus className="w-4 h-4" /> Add account
          </Button>
        )}
      </div>

      {fin.accounts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Wallet className="w-10 h-10 text-brand-teal mx-auto mb-3" />
          <p className="font-medium text-brand-navy">No accounts yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Your Chart of Accounts lists every account you use to record money — bank accounts, cash, what customers owe you, loans, income and expenses.
          </p>
          {canManage && (
            <Button className="h-11" onClick={() => setDialog({ type: "account" })}>
              <Plus className="w-4 h-4" /> Add your first account
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {CLASS_ORDER.map((cls) => {
            const list = grouped[cls] || [];
            if (list.length === 0) return null;
            return (
              <div key={cls}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-brand-navy">{accountClassLabel(cls)}</h2>
                  <span className="text-sm text-muted-foreground">
                    {formatMoney(classTotals(list), activeOrg?.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {list.map((a) => (
                    <div key={a.id} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Wallet className="w-5 h-5 text-brand-teal shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-brand-navy truncate">{a.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {a.account_category || a.account_type.replace("_", " ")}
                              {a.account_number ? ` · ${a.account_number}` : ""}
                            </p>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDialog({ type: "account", record: a })}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-status-bad" onClick={() => remove(a)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-muted-foreground">Opening</span>
                        <span>{formatMoney(a.opening_balance, a.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="text-brand-navy">{formatMoney(balanceOf(a), a.currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {grouped.__other.length > 0 && (
            <div>
              <h2 className="font-semibold text-brand-navy mb-2">Other accounts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {grouped.__other.map((a) => (
                  <div key={a.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Wallet className="w-5 h-5 text-brand-teal shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-brand-navy truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground capitalize truncate">
                            {a.account_type.replace("_", " ")}
                            {a.account_number ? ` · ${a.account_number}` : ""}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDialog({ type: "account", record: a })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-status-bad" onClick={() => remove(a)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-between text-sm font-medium">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="text-brand-navy">{formatMoney(balanceOf(a), a.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {dialog?.type === "account" && (
        <AccountDialog open onClose={() => setDialog(null)} onSaved={fin.reload} record={dialog.record} orgId={activeOrg.id} />
      )}
    </div>
  );
}