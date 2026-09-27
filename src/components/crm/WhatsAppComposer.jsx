import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  Check,
  Save,
  Trash2,
  FileEdit,
} from "lucide-react";
import MessageTemplatePicker from "@/components/crm/MessageTemplatePicker";

// Shared WhatsApp composer for CRM contacts across all workspace types
// (Business, School, Church, University). One shared system — wording adapts
// via the AI Assistant backend (org.type).
//
// REUSES:
//   - CRMContact records (phone, contact_type, tags, organisation_name)
//   - CRMOrganisation groups (passed in as part of the selection)
//   - CRMActivity "whatsapp" type (logged by the caller via onSend)
//   - AI Assistant "draft_whatsapp" action (workspace-aware drafting)
//
// HUMAN APPROVAL IS MANDATORY:
//   - Every message is reviewed/edited before sending.
//   - WhatsApp is opened one contact at a time via wa.me (open chat).
//   - No WhatsApp Business API, no bulk sending, no queues, no scheduling.
//
// Props:
//   open, onClose
//   contacts: CRMContact[]        — selected contacts to message
//   orgId: string                  — active organisation id
//   onSend: (contact, message) => void  — logs CRMActivity + updates contact
export default function WhatsAppComposer({ open, onClose, contacts, orgId, onSend, templates, initialDraft }) {
  const [purpose, setPurpose] = useState("");
  const [sharedDraft, setSharedDraft] = useState("");
  const [overrides, setOverrides] = useState({});
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState({});
  // Saved WhatsApp drafts (per contact). Loaded when the composer opens so the
  // user can return to, edit, send or delete a draft without losing the recipient.
  const [drafts, setDrafts] = useState({});
  const [draftBusy, setDraftBusy] = useState({});
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  const withPhone = useMemo(
    () => contacts.filter((c) => (c.phone || "").replace(/[^\d]/g, "")),
    [contacts]
  );

  const audienceSummary = useMemo(() => {
    const types = [...new Set(contacts.map((c) => c.contact_type).filter(Boolean))];
    const tags = [...new Set(contacts.flatMap((c) => c.tags || []))];
    const groups = [...new Set(contacts.map((c) => c.organisation_name).filter(Boolean))];
    return { types, tags, groups, count: contacts.length, withPhone: withPhone.length };
  }, [contacts, withPhone]);

  // Reset state whenever the composer is opened, then preload any saved drafts
  // for the selected contacts so the user can continue where they left off.
  useEffect(() => {
    if (!open || !orgId) return;
    setPurpose("");
    setSharedDraft(initialDraft || "");
    setOverrides({});
    setSent({});
    setError("");
    setDrafts({});
    const ids = contactsRef.current.map((c) => c.id).filter(Boolean);
    if (!ids.length) return;
    base44.entities.WhatsAppDraft.filter({ organisation_id: orgId })
      .then((all) => {
        const map = {};
        all.forEach((d) => {
          if (ids.includes(d.contact_id)) map[d.contact_id] = d;
        });
        setDrafts(map);
        if (Object.keys(map).length) {
          setOverrides((o) => {
            const next = { ...o };
            Object.values(map).forEach((d) => {
              if (d.body != null) next[d.contact_id] = d.body;
            });
            return next;
          });
        }
      })
      .catch(() => {});
  }, [open, orgId]);

  const firstName = (c) => c.first_name || "";
  const substitute = (template, c) =>
    (template || "").replace(/\{name\}/g, firstName(c) || "there");
  const rowValue = (c) => overrides[c.id] ?? substitute(sharedDraft, c);

  const fillFromDraft = (draft) => {
    setSharedDraft(draft);
    setOverrides({}); // clear per-row tweaks so the template applies to all
  };

  const draftWithAI = async () => {
    if (!purpose.trim()) {
      setError("Enter a purpose for the message first.");
      return;
    }
    setDrafting(true);
    setError("");
    try {
      const audienceDescription = `Audience of ${audienceSummary.count} contact(s): types [${audienceSummary.types.join(", ") || "n/a"}], tags [${audienceSummary.tags.join(", ") || "n/a"}], groups [${audienceSummary.groups.join(", ") || "n/a"}].`;
      const res = await base44.functions.invoke("assistant", {
        action: "draft_whatsapp",
        organisation_id: orgId,
        context: {
          purpose: purpose.trim(),
          audienceDescription,
        },
      });
      fillFromDraft(res.message || "");
    } catch (e) {
      setError(e.message || "Unable to draft message.");
    } finally {
      setDrafting(false);
    }
  };

  const openWhatsApp = (c) => {
    const msg = rowValue(c);
    const cleaned = (c.phone || "").replace(/[^\d]/g, "");
    if (!cleaned || !msg.trim()) return;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent((s) => ({ ...s, [c.id]: true }));
    if (onSend) onSend(c, msg);
  };

  // Save (or update) the current per-contact message as a draft, retaining the
  // selected contact + message text. Clearly labelled "Draft" so it is never
  // confused with a sent message (sent messages are logged as CRMActivity).
  const saveDraft = async (c) => {
    const body = rowValue(c);
    if (!body.trim()) {
      setError("Write a message before saving the draft.");
      return;
    }
    setDraftBusy((b) => ({ ...b, [c.id]: true }));
    setError("");
    try {
      const payload = {
        organisation_id: orgId,
        contact_id: c.id,
        contact_name: `${c.first_name} ${c.last_name || ""}`.trim(),
        contact_phone: c.phone || "",
        purpose: purpose || "",
        body,
      };
      const existing = drafts[c.id];
      if (existing) {
        const updated = await base44.entities.WhatsAppDraft.update(existing.id, payload);
        setDrafts((d) => ({ ...d, [c.id]: updated }));
      } else {
        const created = await base44.entities.WhatsAppDraft.create(payload);
        setDrafts((d) => ({ ...d, [c.id]: created }));
      }
    } catch (e) {
      setError(e.message || "Unable to save draft.");
    } finally {
      setDraftBusy((b) => ({ ...b, [c.id]: false }));
    }
  };

  const deleteDraft = async (c) => {
    const existing = drafts[c.id];
    if (!existing) return;
    setDraftBusy((b) => ({ ...b, [c.id]: true }));
    try {
      await base44.entities.WhatsAppDraft.delete(existing.id);
      setDrafts((d) => {
        const next = { ...d };
        delete next[c.id];
        return next;
      });
    } catch (e) {
      setError(e.message || "Unable to delete draft.");
    } finally {
      setDraftBusy((b) => ({ ...b, [c.id]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand-teal" /> WhatsApp Composer
          </DialogTitle>
        </DialogHeader>

        {/* Audience summary */}
        <div className="text-xs text-muted-foreground">
          {audienceSummary.count} contact(s) selected · {audienceSummary.withPhone} with phone
          {audienceSummary.types.length > 0 && <> · types: {audienceSummary.types.join(", ")}</>}
          {audienceSummary.tags.length > 0 && <> · tags: {audienceSummary.tags.join(", ")}</>}
        </div>

        {/* Step 1: purpose + AI draft */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Purpose / message intent</label>
          <Input
            className="h-11"
            placeholder="e.g. Reminder about Sunday service, fee follow-up, event invitation…"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          <Button className="h-11" onClick={draftWithAI} disabled={drafting || !contacts.length}>
            {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Draft with AI
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Step 2: shared editable template */}
        {templates && templates.length > 0 && (
          <MessageTemplatePicker
            templates={templates}
            channel="whatsapp"
            onSelect={(body) => fillFromDraft(body)}
          />
        )}
        {sharedDraft && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">
                Message template{" "}
                <span className="text-xs text-muted-foreground">
                  (use {`{name}`} to personalise per contact)
                </span>
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setOverrides({})}
                title="Reset all per-contact edits to this template"
              >
                Apply template to all
              </Button>
            </div>
            <textarea
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-24"
              value={sharedDraft}
              onChange={(e) => setSharedDraft(e.target.value)}
            />
          </div>
        )}

        {/* Step 3: per-contact review + open */}
        {contacts.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {contacts.map((c) => {
              const cleaned = (c.phone || "").replace(/[^\d]/g, "");
              const hasPhone = !!cleaned;
              return (
                <div key={c.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {c.first_name} {c.last_name || ""}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {hasPhone ? c.phone : "No phone number — skipped"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {drafts[c.id] && (
                        <Badge variant="secondary" className="text-xs gap-1 bg-amber-100 text-amber-800 border-amber-200">
                          <FileEdit className="w-3 h-3" /> Draft
                        </Badge>
                      )}
                      {sent[c.id] && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Check className="w-3 h-3" /> opened
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        onClick={() => saveDraft(c)}
                        disabled={draftBusy[c.id] || !rowValue(c).trim()}
                        title="Save this message as a draft (without sending)"
                      >
                        {draftBusy[c.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Draft
                      </Button>
                      {drafts[c.id] && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-destructive"
                          onClick={() => deleteDraft(c)}
                          disabled={draftBusy[c.id]}
                          title="Delete saved draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-9"
                        onClick={() => openWhatsApp(c)}
                        disabled={!hasPhone || !rowValue(c).trim()}
                      >
                        <MessageCircle className="w-4 h-4" /> Open
                      </Button>
                    </div>
                  </div>
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent p-2 text-xs min-h-16"
                    value={rowValue(c)}
                    onChange={(e) =>
                      setOverrides((o) => ({ ...o, [c.id]: e.target.value }))
                    }
                    placeholder="Message for this contact…"
                  />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}