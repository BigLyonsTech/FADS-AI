import React, { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, MessageCircle, AlertTriangle, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useFinance } from "@/lib/useFinance";
import { useInvoices } from "@/lib/useInvoices";
import { formatMoney } from "@/lib/financeWording";

const FOLLOW_UP_TYPES = [
  { value: "payment_reminder", label: "Payment reminder" },
  { value: "invoice_follow_up", label: "Invoice follow-up" },
  { value: "quotation_follow_up", label: "Quotation follow-up" },
  { value: "general", label: "General customer follow-up" },
];

// "Prepare WhatsApp Follow-up" dialog for a CRM contact. Shows the customer's
// real invoice/outstanding context, drafts a polite message with AI, lets the
// user review/edit, then opens WhatsApp via wa.me (safe share workflow).
// Updates Last Contact + Next Follow-up on send.
export default function FollowUpDialog({ open, onClose, contact, orgId, onSent }) {
  const fin = useFinance();
  const inv = useInvoices();
  const [type, setType] = useState("payment_reminder");
  const [extraNote, setExtraNote] = useState("");
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");

  const financeContact = useMemo(() => {
    if (!contact) return null;
    const norm = (s) => (s || "").trim().toLowerCase();
    if (contact.email) {
      const byEmail = fin.contacts.find((c) => norm(c.email) === norm(contact.email));
      if (byEmail) return byEmail;
    }
    const fullName = `${contact.first_name} ${contact.last_name || ""}`.trim().toLowerCase();
    return fin.contacts.find((c) => norm(c.name) === fullName) || null;
  }, [contact, fin.contacts]);

  const contactInvoices = useMemo(() => {
    if (!financeContact) return [];
    return inv.invoices.filter((i) => i.customer_id === financeContact.id);
  }, [financeContact, inv.invoices]);

  const outstanding = contactInvoices.filter(
    (i) => Number(i.balance) > 0 && i.status !== "cancelled" && i.status !== "paid"
  );
  const totalOutstanding = outstanding.reduce((s, i) => s + (Number(i.balance) || 0), 0);
  const drafts = contactInvoices.filter((i) => i.status === "draft");

  const recipientName = contact
    ? `${contact.first_name} ${contact.last_name || ""}`.trim()
    : "";

  const buildPurpose = () => {
    const parts = [FOLLOW_UP_TYPES.find((t) => t.value === type)?.label || "Follow-up"];
    if (outstanding.length > 0) {
      parts.push(
        `Outstanding: ${outstanding.length} invoice(s), total ${inv.invoices[0]?.currency || ""} ${totalOutstanding.toFixed(2)}. ` +
          `References: ${outstanding.slice(0, 3).map((i) => `${i.invoice_number} (due ${i.due_date}, balance ${(Number(i.balance) || 0).toFixed(2)})`).join("; ")}.`
      );
    }
    if (drafts.length > 0) {
      parts.push(`Draft quotations: ${drafts.map((i) => i.invoice_number).join(", ")}.`);
    }
    if (contact?.last_contact_date) parts.push(`Last contacted: ${contact.last_contact_date}.`);
    if (extraNote.trim()) parts.push(`Note: ${extraNote.trim()}`);
    return parts.join(" ");
  };

  const draftWithAI = async () => {
    if (!contact) return;
    setDrafting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "draft_whatsapp",
        organisation_id: orgId,
        context: {
          purpose: buildPurpose(),
          recipientName,
          recipientType: contact.contact_type,
          recipientTags: contact.tags,
          recipientGroup: contact.organisation_name,
        },
      });
      setDraft(res.message || "");
    } catch (e) {
      setError(e.message || "Unable to draft message.");
    } finally {
      setDrafting(false);
    }
  };

  const openWhatsApp = async () => {
    const cleaned = (contact?.phone || "").replace(/[^\d]/g, "");
    if (!cleaned || !draft.trim()) return;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(draft)}`, "_blank");
    if (onSent) {
      const today = new Date().toISOString().slice(0, 10);
      const next = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      await onSent(contact, draft, { last_contact_date: today, next_follow_up_date: next });
    }
    onClose();
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand-teal" /> Prepare WhatsApp Follow-up
          </DialogTitle>
        </DialogHeader>

        {/* Customer context */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{recipientName}</span>
            {contact.organisation_name && (
              <Badge variant="outline" className="text-xs">{contact.organisation_name}</Badge>
            )}
          </div>
          {financeContact ? (
            <div className="rounded-lg border border-border p-3 space-y-1 text-xs bg-muted/30">
              {outstanding.length > 0 ? (
                <div className="text-status-warn font-medium">
                  {outstanding.length} outstanding invoice(s) · {formatMoney(totalOutstanding, inv.invoices[0]?.currency || "")}
                </div>
              ) : (
                <div className="text-status-ok">No outstanding balance</div>
              )}
              {drafts.length > 0 && (
                <div className="text-muted-foreground">{drafts.length} draft quotation(s)</div>
              )}
              {contact.last_contact_date && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" /> Last contact: {contact.last_contact_date}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No linked finance record. The message will use general context.
            </p>
          )}
        </div>

        {/* Follow-up type */}
        <div className="space-y-1.5">
          <Label>Follow-up type</Label>
          <div className="flex flex-wrap gap-1.5">
            {FOLLOW_UP_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                  type === t.value
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Additional note (optional)</Label>
          <Input
            placeholder="e.g. following up after our call last week"
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
          />
        </div>

        <Button onClick={draftWithAI} disabled={drafting} className="w-full h-11">
          {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Draft with AI
        </Button>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {draft && (
          <div className="space-y-2">
            <Label>Review & edit before sending</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-28"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose}>Cancel</Button>
          <Button
            className="h-11"
            onClick={openWhatsApp}
            disabled={!draft.trim() || !(contact.phone || "").replace(/[^\d]/g, "")}
          >
            <MessageCircle className="w-4 h-4" /> Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}