import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { GIVING_KINDS } from "@/lib/givingWording";
import { PAYMENT_METHODS } from "@/lib/financeConstants";

// Record a tithe / offering / donation. Creates a real FinanceTransaction
// (direction "in") via the finance backend — Finance is the source of truth.
// Optionally links the gift to an open pledge, incrementing its contributed total.
export default function RecordGivingDialog({ open, onClose, onSaved, giving }) {
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState("Tithes");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [contactId, setContactId] = useState("");
  const [pledgeId, setPledgeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accounts = giving.accounts || [];
  const crmContacts = giving.crmContacts || [];
  const openPledges = giving.outstandingPledges || [];

  useEffect(() => {
    if (!open) return;
    setKind("Tithes"); setAmount(""); setDate(today); setPaymentMethod("cash");
    setContactId(""); setPledgeId(""); setError("");
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError("Enter an amount"); return; }
    if (!accountId) { setError("Select an account"); return; }
    setSaving(true); setError("");
    try {
      await onSaved({
        fund: kind,
        amount: Number(amount),
        accountId,
        date,
        paymentMethod,
        contactId: contactId || null,
        pledgeId: pledgeId || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to record giving");
    } finally {
      setSaving(false);
    }
  };

  const pledgeOptions = [
    { value: "", label: "— No linked pledge —" },
    ...openPledges.map((p) => ({
      value: p.id,
      label: `${p.fund} · ${p.contact_name || "General"} · outstanding ${p.outstanding}`,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record giving</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="bg-status-bad/10 border border-status-bad/30 text-status-bad text-sm rounded-lg p-3">{error}</div>
          )}
          <div>
            <Label className="mb-1.5 block">Type / Fund</Label>
            <ResponsiveSelect value={kind} onValueChange={setKind} triggerClassName="h-11"
              options={GIVING_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Amount</Label>
              <Input type="number" min="0" step="0.01" className="h-11" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label className="mb-1.5 block">Date</Label>
              <Input type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Account</Label>
            <ResponsiveSelect value={accountId} onValueChange={setAccountId} triggerClassName="h-11"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
          </div>
          <div>
            <Label className="mb-1.5 block">Payment method</Label>
            <ResponsiveSelect value={paymentMethod} onValueChange={setPaymentMethod} triggerClassName="h-11"
              options={PAYMENT_METHODS.map((p) => ({ value: p.value, label: p.label }))} />
          </div>
          <div>
            <Label className="mb-1.5 block">Member / Donor (optional)</Label>
            <ResponsiveSelect value={contactId} onValueChange={setContactId} triggerClassName="h-11"
              options={[{ value: "", label: "— None —" }, ...crmContacts.map((c) => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name || ""}`.trim() + ` · ${c.contact_type}`,
              }))]} />
          </div>
          <div>
            <Label className="mb-1.5 block">Link to pledge (optional)</Label>
            <ResponsiveSelect value={pledgeId} onValueChange={setPledgeId} triggerClassName="h-11"
              options={pledgeOptions} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="h-11" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Record giving
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}