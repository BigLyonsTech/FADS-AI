import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { useInvoices } from "@/lib/useInvoices";
import { invoiceWording, formatMoney } from "@/lib/financeWording";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2, Receipt as ReceiptIcon } from "lucide-react";

// Create a standalone receipt from an existing cleared Money In transaction.
// Primarily for churches (donations/tithes/offerings) but available to all orgs.
export default function ReceiptNew() {
  const { activeOrg } = useWorkspace();
  const fin = useFinance();
  const inv = useInvoices();
  const w = invoiceWording(activeOrg?.type);
  const navigate = useNavigate();
  const location = useLocation();
  const draft = location.state?.draft;
  const draftNote = location.state?.note;

  const [txnId, setTxnId] = useState("");
  const [kind, setKind] = useState(w.defaultReceiptKind);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Eligible: cleared money-in transactions not already receipted.
  const receiptedTxnIds = useMemo(
    () => new Set(inv.receipts.map((r) => r.finance_transaction_id).filter(Boolean)),
    [inv.receipts]
  );

  const eligible = useMemo(
    () =>
      fin.transactions.filter(
        (t) =>
          t.direction === "in" &&
          t.status === "cleared" &&
          !receiptedTxnIds.has(t.id)
      ),
    [fin.transactions, receiptedTxnIds]
  );

  useEffect(() => {
    if (!txnId && eligible.length) setTxnId(eligible[0].id);
  }, [eligible, txnId]);

  // Pre-fill from an Ask FADS draft (review only — nothing is saved here).
  useEffect(() => {
    if (!draft) return;
    if (draft.finance_transaction_id && eligible.some((t) => t.id === draft.finance_transaction_id)) {
      setTxnId(draft.finance_transaction_id);
    }
    if (draft.kind) setKind(draft.kind);
    if (draft.description) setDescription(draft.description);
  }, [draft, eligible]);

  if (fin.loading || inv.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!txnId) return setError("Select a transaction");
    setSaving(true);
    try {
      const res = await base44.functions.invoke("invoices", {
        action: "create_receipt",
        organisation_id: activeOrg.id,
        finance_transaction_id: txnId,
        kind,
        description,
      });
      await inv.reload();
      navigate(`/finance/receipts/${res.id}`);
    } catch (err) {
      setError(err.message || "Failed to create receipt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackToFinance />
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">New {w.receiptNoun}</h1>
        <p className="text-sm text-muted-foreground">
          Issue a receipt for a recorded {w.moneyIn.toLowerCase()} entry.
        </p>
      </div>

      {draftNote && (
        <div className="bg-status-warn/10 border border-status-warn/30 text-status-warn text-sm rounded-lg p-3">
          {draftNote}
        </div>
      )}
      {eligible.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <ReceiptIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No eligible transactions. Record a {w.moneyIn.toLowerCase()} entry first, then issue a receipt for it.
          </p>
          <Button className="h-11 mt-4" onClick={() => navigate("/finance/money-in")}>
            Record {w.moneyIn}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4">
          {error && (
            <div className="bg-status-bad/10 border border-status-bad/30 text-status-bad text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          <div>
            <Label className="mb-1.5 block">Transaction</Label>
            <ResponsiveSelect
              value={txnId}
              onValueChange={setTxnId}
              placeholder="Select…"
              triggerClassName="h-11"
              options={eligible.map((t) => ({
                value: t.id,
                label: `${t.date} · ${formatMoney(t.amount, t.currency)} · ${t.description || "—"}`,
              }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Receipt Type</Label>
            <ResponsiveSelect
              value={kind}
              onValueChange={setKind}
              placeholder="Select type"
              triggerClassName="h-11"
              options={w.receiptKinds}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Description (optional)</Label>
            <Input
              className="h-11"
              placeholder="e.g. Sunday service tithe"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="h-11 flex-1" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Issue {w.receiptNoun}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}