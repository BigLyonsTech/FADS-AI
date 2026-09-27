import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { CHURCH_FUNDS } from "@/lib/givingWording";

// Create / edit a Giving Pledge. A pledge is a commitment — it is NOT income.
// Finance remains the source of truth; giving is recorded separately and linked.
export default function PledgeDialog({ open, onClose, onSaved, pledge, crmContacts }) {
  const editing = !!pledge;
  const [fund, setFund] = useState(pledge?.fund || "Building Fund");
  const [contactId, setContactId] = useState(pledge?.contact_id || "");
  const [amount, setAmount] = useState(pledge?.pledged_amount || "");
  const [targetDate, setTargetDate] = useState(pledge?.target_date || "");
  const [note, setNote] = useState(pledge?.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFund(pledge?.fund || "Building Fund");
    setContactId(pledge?.contact_id || "");
    setAmount(pledge?.pledged_amount || "");
    setTargetDate(pledge?.target_date || "");
    setNote(pledge?.note || "");
    setError("");
  }, [open, pledge]);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError("Enter a pledge amount"); return; }
    setSaving(true); setError("");
    try {
      const contact = crmContacts.find((c) => c.id === contactId);
      const data = {
        fund,
        pledged_amount: Number(amount),
        contact_id: contactId || null,
        contact_name: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : null,
        target_date: targetDate || null,
        note: note || null,
      };
      await onSaved(data);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save pledge");
    } finally {
      setSaving(false);
    }
  };

  const contactOptions = [
    { value: "", label: "— No linked contact —" },
    ...crmContacts.map((c) => ({
      value: c.id,
      label: `${c.first_name} ${c.last_name || ""}`.trim() + ` · ${c.contact_type}`,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit pledge" : "New pledge"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="bg-status-bad/10 border border-status-bad/30 text-status-bad text-sm rounded-lg p-3">{error}</div>
          )}
          <div>
            <Label className="mb-1.5 block">Fund</Label>
            <ResponsiveSelect value={fund} onValueChange={setFund} triggerClassName="h-11"
              options={CHURCH_FUNDS.map((f) => ({ value: f, label: f }))} />
          </div>
          <div>
            <Label className="mb-1.5 block">Member / Donor (optional)</Label>
            <ResponsiveSelect value={contactId} onValueChange={setContactId} triggerClassName="h-11"
              options={contactOptions} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Pledged amount</Label>
              <Input type="number" min="0" step="0.01" className="h-11" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label className="mb-1.5 block">Target date (optional)</Label>
              <Input type="date" className="h-11" value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Note (optional)</Label>
            <Textarea className="min-h-16" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. pledge towards building project" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="h-11" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save changes" : "Create pledge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}