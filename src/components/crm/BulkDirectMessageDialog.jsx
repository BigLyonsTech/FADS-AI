import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, AlertTriangle, X, Sparkles, Loader2, Copy, Check } from "lucide-react";
import MessageTemplatePicker from "@/components/crm/MessageTemplatePicker";

// Direct Message composer — prepares an internal message for selected
// contacts. This is a PREPARED message (logged as CRMActivity type "note"),
// NOT an automated send. Clearly labelled as prepared.
//
// Reused from: CRM contact cards (single), contact details (single),
// pipeline cards (single), pipeline bulk-action bar, and CRM Automations.
// One shared system — no second messaging system.
//
// Features:
//   - Write manually or "Ask FADS" to draft (reuses assistant draft_whatsapp)
//   - Saved message templates (channel "message")
//   - Edit / Preview (textarea + per-contact personalised preview)
//   - Copy Message handoff (no DM channel connected — nothing is auto-sent)
//   - Approval required: "Prepare message" logs CRMActivity, never sends
//
// REUSES: CRMActivity entity, MessageTemplate records, AI Assistant backend.
export default function BulkDirectMessageDialog({ open, onClose, contacts, onPrepared, orgId, templates, initialBody }) {
  const [purpose, setPurpose] = useState("");
  const [body, setBody] = useState("");
  const [removed, setRemoved] = useState({});

  // Pre-fill body from the announcement flow when provided.
  useEffect(() => {
    if (open && initialBody) setBody(initialBody);
  }, [open, initialBody]);
  const [prepared, setPrepared] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const eligible = useMemo(
    () => contacts.filter((c) => c.status !== "inactive" && !removed[c.id]),
    [contacts, removed]
  );
  const skipped = useMemo(
    () => contacts.filter((c) => c.status === "inactive"),
    [contacts]
  );

  const firstName = (c) => c.first_name || "";
  const substitute = (template, c) =>
    (template || "").replace(/\{name\}/g, firstName(c) || "there");
  const previewMessage = (c) => substitute(body, c);

  const close = () => {
    setPurpose(""); setBody(""); setRemoved({}); setPrepared(false); setError(""); setCopiedId(null);
    onClose();
  };

  const draftWithAI = async () => {
    if (!purpose.trim()) {
      setError("Enter a purpose for the message first.");
      return;
    }
    setDrafting(true);
    setError("");
    try {
      const audienceDescription = `Audience of ${eligible.length} contact(s).`;
      const res = await base44.functions.invoke("assistant", {
        action: "draft_whatsapp",
        organisation_id: orgId,
        context: { purpose: purpose.trim(), audienceDescription },
      });
      setBody(res.message || "");
    } catch (e) {
      setError(e.message || "Unable to draft message.");
    } finally {
      setDrafting(false);
    }
  };

  const copyMessage = async (c) => {
    const msg = previewMessage(c);
    if (!msg.trim()) return;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      setError("Unable to copy to clipboard. Please select and copy manually.");
    }
  };

  const handlePrepare = async () => {
    if (!body.trim() || eligible.length === 0) return;
    setPrepared(true);
    if (onPrepared) onPrepared(eligible, body.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-teal" /> Direct Message — {eligible.length} {eligible.length === 1 ? "recipient" : "recipients"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-teal/5 border border-brand-teal/20 text-sm">
          <Sparkles className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <p className="text-brand-navy">
            You're preparing a message for <strong>{eligible.length} {eligible.length === 1 ? "person" : "people"}</strong>.
            Review the recipients and message below. FADS will not send anything until you approve it.
          </p>
        </div>

        {skipped.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{skipped.length} {skipped.length === 1 ? "contact was" : "contacts were"} skipped (inactive / opted out):</p>
              <p className="text-xs mt-1">{skipped.map((c) => `${c.first_name} ${c.last_name || ""}`).join(", ")}</p>
            </div>
          </div>
        )}

        {/* Recipients */}
        <div className="space-y-1 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground">Recipients ({eligible.length})</p>
          {eligible.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
              <div className="min-w-0">
                <span className="text-sm font-medium">{c.first_name} {c.last_name || ""}</span>
              </div>
              <button
                onClick={() => setRemoved((r) => ({ ...r, [c.id]: true }))}
                className="p-1 rounded hover:bg-accent shrink-0 min-h-touch min-w-touch"
                title="Remove recipient"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        {/* Purpose + AI Draft */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Purpose / message intent</label>
          <div className="flex gap-2">
            <Input
              className="h-11"
              placeholder="e.g. Check in after last visit, share an update…"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
            <Button className="h-11 shrink-0" onClick={draftWithAI} disabled={drafting || !eligible.length}>
              {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Ask FADS
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Templates */}
        {templates && templates.length > 0 && (
          <MessageTemplatePicker
            templates={templates}
            channel="message"
            onSelect={(tmpl) => setBody(tmpl)}
          />
        )}

        {/* Message body */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Message{" "}
            <span className="text-xs text-muted-foreground">
              (use {`{name}`} to personalise per contact)
            </span>
          </label>
          <textarea
            className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-24"
            placeholder="Type your message here…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {/* Per-contact preview + copy */}
        {body.trim() && eligible.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            {eligible.map((c) => (
              <div key={c.id} className="rounded-lg border p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.first_name} {c.last_name || ""}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs shrink-0"
                    onClick={() => copyMessage(c)}
                    disabled={!previewMessage(c).trim()}
                    title="Copy this message to paste into your DM app"
                  >
                    {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-status-ok" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === c.id ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{previewMessage(c)}</p>
              </div>
            ))}
          </div>
        )}

        {/* No connected DM channel notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
          <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            No direct-message channel is connected. Use <strong>Copy</strong> to paste the message into your DM app, or <strong>Prepare message</strong> to save it as a note on the contact's record.
          </p>
        </div>

        {prepared && (
          <div className="text-sm text-status-ok font-medium">
            Message prepared for {eligible.length} {eligible.length === 1 ? "person" : "people"}. Review and send each one from your contacts.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={close}>Close</Button>
          <Button className="h-11 gap-1.5" onClick={handlePrepare} disabled={!body.trim() || eligible.length === 0 || prepared}>
            <MessageSquare className="w-4 h-4" /> {prepared ? "Prepared" : "Prepare message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}