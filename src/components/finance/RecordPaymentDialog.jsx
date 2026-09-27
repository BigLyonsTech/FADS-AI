import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/invoiceUtils";
import { formatMoney } from "@/lib/financeWording";
import { useDataMode } from "@/lib/useDataMode";

// Modal for recording a full or partial payment against an invoice. Creates
// a Money In transaction, an InvoicePayment, updates the invoice balance and
// issues a receipt — all server-side in one audited action.
export default function RecordPaymentDialog({ open, onClose, onSaved, invoice, accounts, incomeCategories, currency }) {
  const { dataMode } = useDataMode();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && invoice) {
      setAmount(String(invoice.balance || ""));
      setAccountId(accounts[0]?.id || "");
      setCategoryId(incomeCategories[0]?.id || "");
      setReference("");
      setError("");
    }
  }, [open, invoice, accounts, incomeCategories]);

  if (!invoice) return null;
  const balance = Number(invoice.balance) || 0;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter a valid amount");
    if (amt > balance + 0.01) return setError("Amount exceeds outstanding balance");
    if (!accountId) return setError("Select an account");
    setSaving(true);
    try {
      await base44.functions.invoke("invoices", {
        action: "record_payment",
        organisation_id: invoice.organisation_id,
        data_mode: dataMode,
        invoice_id: invoice.id,
        account_id: accountId,
        category_id: categoryId || null,
        amount: amt,
        date,
        payment_method: method,
        reference,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="bg-status-bad/10 border border-status-bad/30 text-status-bad text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          <div className="bg-muted/40 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Outstanding Balance</span>
            <span className="font-bold text-brand-navy">{formatMoney(balance, currency)}</span>
          </div>
          <div>
            <Label className="mb-1.5 block">Amount Received</Label>
            <Input type="number" min="0" step="any" className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Date</Label>
              <Input type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Method</Label>
              <ResponsiveSelect
                value={method}
                onValueChange={setMethod}
                placeholder="Select method"
                triggerClassName="h-11"
                options={PAYMENT_METHODS}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Deposit To</Label>
            <ResponsiveSelect
              value={accountId}
              onValueChange={setAccountId}
              placeholder="Select account…"
              triggerClassName="h-11"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Reference (optional)</Label>
            <Input className="h-11" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}