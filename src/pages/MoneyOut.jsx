import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { financeWording } from "@/lib/financeWording";
import { ArrowUpRight, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionForm from "@/components/finance/TransactionForm";
import BackToFinance from "@/components/finance/BackToFinance";
import ReceiptScanDialog from "@/components/finance/ReceiptScanDialog";

export default function MoneyOut() {
  const { activeOrg } = useWorkspace();
  const fin = useFinance();
  const w = financeWording(activeOrg);
  const navigate = useNavigate();
  const [scanOpen, setScanOpen] = useState(false);

  if (fin.loading || !activeOrg) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackToFinance />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-status-bad/15 text-status-bad flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">{w.moneyOut}</h1>
            <p className="text-sm text-muted-foreground">
              {activeOrg?.name} · {activeOrg?.currency}
            </p>
          </div>
        </div>
        <Button variant="outline" className="h-10 gap-2" onClick={() => setScanOpen(true)}>
          <ScanLine className="w-4 h-4 text-brand-teal" /> Scan Receipt
        </Button>
      </div>
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <TransactionForm
          direction="out"
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
      <ReceiptScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onSaved={() => fin.reload()}
      />
    </div>
  );
}