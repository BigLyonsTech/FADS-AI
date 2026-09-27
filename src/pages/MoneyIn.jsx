import React from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { financeWording } from "@/lib/financeWording";
import { ArrowDownLeft } from "lucide-react";
import TransactionForm from "@/components/finance/TransactionForm";
import BackToFinance from "@/components/finance/BackToFinance";

export default function MoneyIn() {
  const { activeOrg } = useWorkspace();
  const fin = useFinance();
  const w = financeWording(activeOrg);
  const navigate = useNavigate();

  if (fin.loading || !activeOrg) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackToFinance />
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-status-ok/15 text-status-ok flex items-center justify-center">
          <ArrowDownLeft className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{w.moneyIn}</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg?.name} · {activeOrg?.currency}
          </p>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <TransactionForm
          direction="in"
          accounts={fin.accounts}
          categories={fin.categories}
          contacts={fin.contacts}
          orgId={activeOrg.id}
          wording={w}
          currency={activeOrg.currency}
          onSaved={() => {
            fin.reload();
            navigate("/finance/transactions");
          }}
          onCancel={() => navigate("/finance")}
          submitLabel="Save"
        />
      </div>
    </div>
  );
}