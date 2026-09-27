import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, AlertTriangle } from "lucide-react";

export default function DocumentEmailDialog({
  open,
  onClose,
  organisationId,
  dataMode,
  endpoint,
  action,
  idField,
  recordId,
  documentLabel,
  documentNumber,
  customerName,
  customerEmail,
  totalLabel,
  defaultSubject,
  defaultBody,
  onSent,
}) {
  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubject(defaultSubject || "");
    setBody(defaultBody || "");
    setError("");
  }, [open, defaultSubject, defaultBody]);

  const send = async () => {
    if (!customerEmail) {
      setError("This customer does not have an email address.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Enter a subject and message before sending.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await base44.functions.invoke(endpoint, {
        action,
        organisation_id: organisationId,
        data_mode: dataMode,
        [idField]: recordId,
        subject: subject.trim(),
        message: body.trim(),
      });
      onSent?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !sending && onClose?.()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-teal" />
            Email {documentLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-brand-teal/20 bg-brand-mint/40 p-3 text-sm">
            <p className="font-medium text-brand-navy">{customerName || "Customer"}</p>
            <p className="text-muted-foreground">{customerEmail || "No email address"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {documentNumber}{totalLabel ? ` · ${totalLabel}` : ""}
            </p>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              className="h-11 mt-1.5"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div>
            <Label>Message</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-32 mt-1.5"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Review before sending. The existing FADS email service sends the message body only;
              use Download PDF separately when the customer needs the PDF file.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-status-bad/30 bg-status-bad/10 p-3 text-sm text-status-bad">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button className="h-11 gap-2" onClick={send} disabled={sending || !customerEmail}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {sending ? "Sending…" : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
