import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { formatMoney } from "@/lib/financeWording";
import { invoiceToReceivable, pledgeToReceivable } from "@/lib/collectionsWording";
import {
  Loader2, Sparkles, MessageCircle, Mail, MessageSquare, AlertTriangle,
  Check, Send,
} from "lucide-react";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "dm", label: "DM / Message", icon: MessageSquare },
];

// Bulk collection reminder review dialog. Drafts per-person personalised
// reminders using each person's ACTUAL balance (not one generic message).
// The user reviews, edits, selects channels, and approves. FADS never sends
// anything until the user approves. Paid accounts are automatically excluded.
//
// Reuses:
//   - assistant.draft_bulk_reminders (one LLM call for all reminders)
//   - assistant.send_email (per-person email sending)
//   - wa.me links (per-person WhatsApp, user clicks send in WhatsApp)
//   - invoices.record_reminder (records last reminder date on invoice)
export default function CollectionsReviewDialog({
  open, onClose, accounts, orgId, currency, wording, onReminderSent,
}) {
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [reminders, setReminders] = useState({}); // key -> { message, channel, selected, contact }
  const [sending, setSending] = useState(false);
  const [sentResults, setSentResults] = useState({});

  // Build receivables and draft messages when dialog opens
  useEffect(() => {
    if (!open || accounts.length === 0) return;
    let cancelled = false;
    setDrafting(true);
    setError("");
    setReminders({});
    setSentResults({});

    (async () => {
      const receivables = accounts.map((a) => {
        const isPledge = !a.invoice_number;
        const receivable = isPledge
          ? pledgeToReceivable(a, currency)
          : invoiceToReceivable(a);
        return receivable;
      });

      // Initialise reminder state with default channel
      const initial = {};
      accounts.forEach((a) => {
        const key = a.id;
        const isPledge = !a.invoice_number;
        const hasEmail = !!(a.customer_email || a.contact_email || a.email);
        const hasPhone = !!((a.customer_phone || a.phone || a.mobile || "").replace(/[^\d]/g, ""));
        initial[key] = {
          key,
          account: a,
          message: "",
          channel: hasPhone ? "whatsapp" : hasEmail ? "email" : "dm",
          selected: true,
          hasPhone,
          hasEmail,
        };
      });
      if (!cancelled) setReminders(initial);

      try {
        const res = await base44.functions.invoke("assistant", {
          action: "draft_bulk_reminders",
          organisation_id: orgId,
          receivables,
        });
        if (cancelled) return;
        const updated = { ...initial };
        (res.reminders || []).forEach((r) => {
          if (updated[r.key]) {
            updated[r.key].message = r.message || "";
          }
        });
        setReminders(updated);
      } catch (e) {
        if (!cancelled) setError(e.message || "I couldn't draft the reminders. Please try again.");
      } finally {
        if (!cancelled) setDrafting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, accounts, orgId, currency]);

  const selectedReminders = Object.values(reminders).filter((r) => r.selected);
  const selectedTotal = selectedReminders.reduce((s, r) => {
    const bal = r.account.invoice_number
      ? Number(r.account.balance)
      : (Number(r.account.pledged_amount) - Number(r.account.contributed_amount));
    return s + (bal || 0);
  }, 0);

  const toggleSelect = (key) => {
    setReminders((prev) => ({ ...prev, [key]: { ...prev[key], selected: !prev[key].selected } }));
  };

  const changeChannel = (key, channel) => {
    setReminders((prev) => ({ ...prev, [key]: { ...prev[key], channel } }));
  };

  const editMessage = (key, message) => {
    setReminders((prev) => ({ ...prev, [key]: { ...prev[key], message } }));
  };

  const recordReminder = async (account, channel) => {
    if (!account.invoice_number) return; // Pledges don't have last_reminder_date
    try {
      await base44.functions.invoke("invoices", {
        action: "record_reminder",
        organisation_id: orgId,
        invoice_id: account.id,
        channel,
      });
    } catch {}
  };

  const handleApproveAndSend = async () => {
    setSending(true);
    setError("");
    const results = {};
    for (const r of selectedReminders) {
      const a = r.account;
      const phone = ((a.customer_phone || a.phone || a.mobile || "").replace(/[^\d]/g, ""));
      const email = a.customer_email || a.contact_email || a.email || "";
      const isPledge = !a.invoice_number;
      const key = r.key;

      try {
        if (r.channel === "whatsapp") {
          if (!phone) { results[key] = { ok: false, reason: "No phone number" }; continue; }
          const url = `https://wa.me/${phone}?text=${encodeURIComponent(r.message)}`;
          window.open(url, "_blank");
          results[key] = { ok: true, channel: "whatsapp" };
          await recordReminder(a, "whatsapp");
        } else if (r.channel === "email") {
          if (!email) { results[key] = { ok: false, reason: "No email address" }; continue; }
          await base44.functions.invoke("assistant", {
            action: "send_email",
            organisation_id: orgId,
            to: email,
            subject: `Reminder from ${a.organisation_name || ""}`.trim(),
            body: r.message,
          });
          results[key] = { ok: true, channel: "email" };
          await recordReminder(a, "email");
        } else { // dm
          await navigator.clipboard.writeText(r.message).catch(() => {});
          results[key] = { ok: true, channel: "dm", copied: true };
          await recordReminder(a, "dm");
        }
      } catch (e) {
        results[key] = { ok: false, reason: e.message || "Failed" };
      }
    }
    setSentResults(results);
    setSending(false);
    onReminderSent?.();
  };

  const allSent = Object.keys(sentResults).length > 0 &&
    selectedReminders.every((r) => sentResults[r.key]?.ok);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-teal" /> Review Collection Reminders
          </DialogTitle>
        </DialogHeader>

        {/* Info banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-mint/40 border border-brand-teal/20 text-sm">
          <AlertTriangle className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <div>
            <p className="text-brand-navy font-medium">
              {selectedReminders.length} outstanding account{selectedReminders.length === 1 ? "" : "s"} selected
              {selectedTotal > 0 && ` · Total: ${formatMoney(selectedTotal, currency)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              FADS will not send anything until you approve it. Each message is personalised with the person's actual balance.
            </p>
          </div>
        </div>

        {drafting ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            FADS is writing personalised reminders for {accounts.length} account{accounts.length === 1 ? "" : "s"}…
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : allSent ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-status-ok/15 text-status-ok flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="font-medium text-brand-navy">Reminders sent!</p>
            <p className="text-sm text-muted-foreground">
              {selectedReminders.filter((r) => sentResults[r.key]?.channel === "whatsapp").length > 0 &&
                "WhatsApp reminders opened in new tabs — click send in each. "}
              {selectedReminders.filter((r) => sentResults[r.key]?.channel === "dm").length > 0 &&
                "DM messages copied to clipboard — paste into your messaging app. "}
              {selectedReminders.filter((r) => sentResults[r.key]?.channel === "email").length > 0 &&
                "Email reminders sent. "}
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            {/* Per-person review list */}
            <div className="space-y-3">
              {Object.values(reminders).map((r) => {
                const a = r.account;
                const balance = a.invoice_number
                  ? Number(a.balance)
                  : (Number(a.pledged_amount) - Number(a.contributed_amount));
                const result = sentResults[r.key];
                return (
                  <div
                    key={r.key}
                    className={`border rounded-lg p-3 ${r.selected ? "border-border" : "border-border opacity-50"}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={r.selected}
                        onCheckedChange={() => toggleSelect(r.key)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-brand-navy truncate">
                              {a.customer_name || a.contact_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoney(balance, currency)}
                              {a.due_date && ` · Due ${a.due_date}`}
                            </p>
                          </div>
                          {/* Channel selector */}
                          <div className="flex items-center gap-1 shrink-0">
                            {CHANNELS.map((ch) => {
                              const disabled =
                                (ch.value === "whatsapp" && !r.hasPhone) ||
                                (ch.value === "email" && !r.hasEmail);
                              return (
                                <button
                                  key={ch.value}
                                  disabled={disabled}
                                  onClick={() => changeChannel(r.key, ch.value)}
                                  className={`px-2 py-1 rounded text-xs border transition-colors min-h-touch ${
                                    r.channel === ch.value
                                      ? "bg-brand-teal text-white border-brand-teal"
                                      : "bg-transparent text-muted-foreground border-border hover:border-brand-teal"
                                  } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                                >
                                  <ch.icon className="w-3.5 h-3.5 inline mr-1" />
                                  {ch.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message preview */}
                    {r.message && (
                      <textarea
                        className="w-full mt-2 rounded-md border border-input bg-transparent p-2.5 text-sm min-h-20"
                        value={r.message}
                        onChange={(e) => editMessage(r.key, e.target.value)}
                      />
                    )}

                    {/* Send result */}
                    {result && (
                      <div className={`mt-2 text-xs ${result.ok ? "text-status-ok" : "text-status-bad"}`}>
                        {result.ok ? (
                          result.channel === "whatsapp" ? "WhatsApp opened — click send in the new tab."
                          : result.channel === "email" ? "Email sent."
                          : "Message copied to clipboard."
                        ) : (
                          `Failed: ${result.reason}`
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <p className="text-xs text-muted-foreground flex-1 text-center sm:text-left">
                {selectedReminders.length} selected · {formatMoney(selectedTotal, currency)}
              </p>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="gap-1.5"
                onClick={handleApproveAndSend}
                disabled={sending || selectedReminders.length === 0}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Approve & Send
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}