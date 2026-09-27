import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, RefreshCw, AlertTriangle, Phone } from "lucide-react";

// Reusable "Draft WhatsApp Reminder" dialog for overdue receivables
// (invoices / fee statements / pledges). Shared across all workspace types.
//
// Props:
//   open, onClose
//   organisationId        — active org id (for membership + AI context)
//   receivable            — { recipientName, outstandingAmount, currency,
//                            dueDate, issueDate?, reference?, description? }
//   phone                 — recipient phone (any format; cleaned caller-side)
//
// Calls the AI Assistant backend (action: "draft_reminder") to draft a polite,
// workspace-aware reminder. The user reviews/edits, then opens WhatsApp via a
// wa.me link. Never sends automatically. If no valid phone is available, the
// user is clearly told and the Open WhatsApp button is disabled.
export default function DraftWhatsAppReminderDialog({
  open,
  onClose,
  organisationId,
  receivable,
  phone,
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasPhone = !!((phone || "").replace(/[^\d]/g, ""));

  // Draft the message whenever the dialog is opened.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setMessage("");
    (async () => {
      try {
        const res = await base44.functions.invoke("assistant", {
          action: "draft_reminder",
          organisation_id: organisationId,
          receivable,
        });
        if (!cancelled) setMessage(res.message || "");
      } catch (e) {
        if (!cancelled) setError(e.message || "Unable to draft reminder.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organisationId]);

  const regenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "draft_reminder",
        organisation_id: organisationId,
        receivable,
      });
      setMessage(res.message || "");
    } catch (e) {
      setError(e.message || "Unable to draft reminder.");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    const cleaned = (phone || "").replace(/[^\d]/g, "");
    if (!cleaned || !message.trim()) return;
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand-teal" /> Draft WhatsApp Reminder
          </DialogTitle>
        </DialogHeader>

        {!hasPhone && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <Phone className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No valid phone number available for this recipient.</p>
              <p className="mt-1">
                Add a phone number to the contact to send a WhatsApp reminder. You can still
                review and copy the draft below, but WhatsApp cannot be opened without a phone
                number.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Drafting a polite reminder…
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              AI-generated draft — review and edit before sending. This is a draft, not
              professional advice.
            </p>
            <textarea
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-40"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your reminder draft will appear here…"
            />
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={regenerate}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" /> Regenerate
          </Button>
          <Button variant="outline" className="h-11" onClick={onClose}>
            Close
          </Button>
          <Button
            className="h-11"
            onClick={openWhatsApp}
            disabled={loading || !hasPhone || !message.trim()}
          >
            <MessageCircle className="w-4 h-4" /> Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}