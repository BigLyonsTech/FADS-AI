import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, AlertTriangle, Loader2, Sparkles, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MessageTemplatePicker from "@/components/crm/MessageTemplatePicker";

// Review-first bulk email dialog. NEVER sends automatically.
// Uses the existing SendEmail integration via the assistant backend function
// (one email per recipient, explicit approval required).
//
// Respects opt-outs: contacts with status "inactive" are excluded and shown
// as skipped. Contacts without email are also skipped.
//
// SAFETY: The user must review recipients, edit the message, and click
// "Send to N people" before anything is sent.
export default function BulkEmailDialog({ open, onClose, contacts, orgId, onSent, templates, initialSubject, initialBody }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState({});

  // Pre-fill subject/body from the Content Centre when provided.
  useEffect(() => {
    if (open) {
      if (initialSubject) setSubject(initialSubject);
      if (initialBody) setBody(initialBody);
    }
  }, [open, initialSubject, initialBody]);

  const eligible = useMemo(
    () => contacts.filter((c) => c.email && c.status !== "inactive" && !removed[c.id]),
    [contacts, removed]
  );
  const skipped = useMemo(
    () => contacts.filter((c) => !c.email || c.status === "inactive"),
    [contacts]
  );

  const removeRecipient = (id) => {
    setRemoved((r) => ({ ...r, [id]: true }));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Enter a subject and message before sending.");
      return;
    }
    if (eligible.length === 0) {
      setError("No eligible recipients with an email address.");
      return;
    }
    setSending(true);
    setError("");
    setSentCount(0);
    try {
      let count = 0;
      for (const c of eligible) {
        try {
          await base44.functions.invoke("assistant", {
            action: "send_email",
            organisation_id: orgId,
            to: c.email,
            subject: subject.trim(),
            body: body.trim(),
          });
          count++;
          setSentCount(count);
        } catch (e) {
          // continue sending to others
        }
      }
      if (onSent) onSent(count);
      if (count === eligible.length) {
        onClose();
        setSubject(""); setBody(""); setRemoved({});
      } else {
        setError(`${count} of ${eligible.length} sent. Some failed — try again for the rest.`);
      }
    } catch (e) {
      setError(e.message || "Unable to send emails.");
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    if (sending) return;
    onClose();
    setSubject(""); setBody(""); setRemoved({}); setError(""); setSentCount(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-teal" /> Email {eligible.length} {eligible.length === 1 ? "person" : "people"}
          </DialogTitle>
        </DialogHeader>

        {/* Safety notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-teal/5 border border-brand-teal/20 text-sm">
          <Sparkles className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <p className="text-brand-navy">
            You're about to email <strong>{eligible.length} {eligible.length === 1 ? "person" : "people"}</strong>.
            Review the recipients and message below. FADS will never send this until you approve it.
          </p>
        </div>

        {/* Skipped contacts */}
        {skipped.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{skipped.length} {skipped.length === 1 ? "contact was" : "contacts were"} skipped (no email or inactive):</p>
              <p className="text-xs mt-1">{skipped.map((c) => `${c.first_name} ${c.last_name || ""}`).join(", ")}</p>
            </div>
          </div>
        )}

        {/* Recipient list with remove buttons */}
        <div className="space-y-1 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground">Recipients ({eligible.length})</p>
          {eligible.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
              <div className="min-w-0">
                <span className="text-sm font-medium">{c.first_name} {c.last_name || ""}</span>
                <span className="text-xs text-muted-foreground ml-2 truncate">{c.email}</span>
              </div>
              <button
                onClick={() => removeRecipient(c.id)}
                className="p-1 rounded hover:bg-accent shrink-0 min-h-touch min-w-touch"
                title="Remove recipient"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        {/* Subject + body */}
        <div className="space-y-2">
          <Input
            className="h-11"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          {templates && templates.length > 0 && (
            <MessageTemplatePicker
              templates={templates}
              channel="email"
              onSelect={(b) => setBody(b)}
            />
          )}
          <textarea
            className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-24"
            placeholder="Type your message here…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {sentCount > 0 && !sending && (
          <div className="text-sm text-status-ok font-medium">
            {sentCount} email{sentCount !== 1 ? "s" : ""} sent successfully.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={close} disabled={sending}>
            Cancel
          </Button>
          <Button className="h-11 gap-1.5" onClick={handleSend} disabled={sending || eligible.length === 0}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {sending ? `Sending… (${sentCount}/${eligible.length})` : `Send to ${eligible.length} ${eligible.length === 1 ? "person" : "people"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}