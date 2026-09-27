import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, CheckSquare, Square, Send } from "lucide-react";
import { resolveAudienceContacts } from "@/lib/automationWording";
import { getContactTypeLabel } from "@/lib/crmWording";

// Broadcast review dialog — the approval gate for audience automations.
// Resolves the automation's audience to a deduplicated contact list,
// filters out invalid/opted-out contacts, and lets the owner untick
// individual recipients before handing off to the existing composers.
//
// REUSES: resolveAudienceContacts (shared helper), existing CRM data,
// existing composers (opened by the parent on approve). No second
// messaging system.
//
// SAFETY: contacts with status "inactive" (opted out), no phone (WhatsApp),
// or no email are automatically excluded and shown as skipped. The owner
// must explicitly approve before anything is sent/prepared.
export default function BroadcastReviewDialog({
  open, onClose, automation, contacts, leads, orgs, stages, templates, orgType, onApprove,
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});

  const cfg = automation?.action_config || {};
  const channels = cfg.channels || [];

  // Resolve audience to contacts
  const allResolved = useMemo(
    () => resolveAudienceContacts(cfg, contacts || [], leads || []),
    [cfg, contacts, leads]
  );

  // For "individual" audience type, show all contacts (user picks).
  // For other types, show only the resolved audience.
  const reviewContacts = cfg.audience_type === "individual" ? (contacts || []) : allResolved;

  // Initialize selection when dialog opens
  useEffect(() => {
    if (open) {
      const initial = {};
      if (cfg.audience_type !== "individual") {
        allResolved.forEach((c) => { initial[c.id] = true; });
      }
      setSelected(initial);
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Determine which channels each contact can receive
  const getContactChannels = (c) => {
    const available = [];
    if (channels.includes("whatsapp") && (c.phone || "").replace(/[^\d]/g, "") && c.status !== "inactive")
      available.push("whatsapp");
    if (channels.includes("email") && c.email && c.status !== "inactive")
      available.push("email");
    if (channels.includes("message") && c.status !== "inactive")
      available.push("message");
    return available;
  };

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return reviewContacts;
    return reviewContacts.filter((c) =>
      `${c.first_name} ${c.last_name || ""} ${c.email || ""} ${c.phone || ""}`.toLowerCase().includes(q)
    );
  }, [reviewContacts, search]);

  // Valid recipients (selected + at least one channel available)
  const validSelected = useMemo(
    () => reviewContacts.filter((c) => selected[c.id] && getContactChannels(c).length > 0),
    [reviewContacts, selected, channels]
  );

  // Skipped (selected but no valid channel)
  const skippedSelected = useMemo(
    () => reviewContacts.filter((c) => selected[c.id] && getContactChannels(c).length === 0),
    [reviewContacts, selected, channels]
  );

  const toggleRecipient = (id) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  };

  const selectAll = () => {
    const next = {};
    reviewContacts.forEach((c) => {
      if (getContactChannels(c).length > 0) next[c.id] = true;
    });
    setSelected(next);
  };

  const deselectAll = () => setSelected({});

  const handleApprove = () => {
    const selectedContacts = reviewContacts.filter((c) => selected[c.id] && getContactChannels(c).length > 0);
    onApprove(selectedContacts, channels, cfg);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-4 gap-3 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-0.5">
          <DialogTitle className="text-base">Review recipients</DialogTitle>
          <DialogDescription className="text-xs">
            You're about to contact {validSelected.length} {validSelected.length === 1 ? "person" : "people"}.
            FADS will not send anything until you approve it.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-brand-teal/5 border border-brand-teal/20 text-xs">
          <span className="font-medium text-brand-navy">{validSelected.length} selected</span>
          {skippedSelected.length > 0 && (
            <span className="text-muted-foreground">· {skippedSelected.length} can't receive (missing details or opted out)</span>
          )}
        </div>

        {/* Search + actions */}
        <div className="flex gap-2">
          <Input className="h-9" placeholder="Search recipients…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline" size="sm" className="h-9" onClick={selectAll}>Select all</Button>
          <Button variant="outline" size="sm" className="h-9" onClick={deselectAll}>Clear</Button>
        </div>

        {/* Recipient list */}
        <div className="space-y-1 max-h-[40vh] overflow-y-auto">
          {filtered.map((c) => {
            const isSelected = selected[c.id];
            const contactChannels = getContactChannels(c);
            const isValid = contactChannels.length > 0;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-2 p-2 rounded-md border ${!isSelected ? "opacity-40" : ""} ${!isValid ? "opacity-50" : ""}`}
              >
                <button onClick={() => isValid && toggleRecipient(c.id)} className="shrink-0">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-brand-teal" /> : <Square className="w-4 h-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.first_name} {c.last_name || ""}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {getContactTypeLabel(orgType, c.contact_type)}
                    {!c.phone && channels.includes("whatsapp") && " · No phone"}
                    {!c.email && channels.includes("email") && " · No email"}
                    {c.status === "inactive" && " · Inactive (opted out)"}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {contactChannels.map((ch) => (
                    <Badge key={ch} variant="outline" className="text-xs">
                      {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "DM"}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              {search ? "No one matches your search." : "No recipients found."}
            </div>
          )}
        </div>

        {/* Skipped info */}
        {skippedSelected.length > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {skippedSelected.length} {skippedSelected.length === 1 ? "person was" : "people were"} excluded — missing contact details or opted out.
          </div>
        )}

        {/* Safety notice */}
        <div className="text-xs text-muted-foreground">
          FADS will not send anything until you approve it.
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 sticky bottom-0 bg-background pb-1 -mx-4 px-4">
          <Button variant="outline" className="h-9 flex-1" onClick={onClose}>Cancel</Button>
          <Button className="h-9 flex-1 gap-1.5" onClick={handleApprove} disabled={validSelected.length === 0}>
            <Send className="w-4 h-4" /> Review & Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}