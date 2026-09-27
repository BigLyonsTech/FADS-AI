import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/lib/useCrm";
import { getCrmConfig } from "@/lib/crmWording";
import { Users, CheckSquare, Square, AlertTriangle } from "lucide-react";

// Audience picker for Content Centre → CRM communication handoff.
// Reuses the existing useCrm hook (contacts, groups) and the same
// selection pattern as CRMContacts: individual, all visible, by type, by group.
//
// NEVER auto-selects the entire database. Selection is always scoped to
// the current filtered list. Shows "You are preparing this for X people."
//
// On confirm, calls onConfirm(selectedContacts) — the parent then opens
// the existing WhatsAppComposer / BulkEmailDialog with those contacts.
export default function ContentAudienceDialog({ open, onClose, channel, contentPreview, onConfirm }) {
  const crm = useCrm();
  const { activeOrg, contacts, orgs, loading } = crm;
  const config = getCrmConfig(activeOrg);
  const [selected, setSelected] = useState({});
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    if (open) {
      setSelected({});
      setTypeFilter("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (c.status === "inactive") return false;
      if (typeFilter && c.contact_type !== typeFilter) return false;
      return true;
    });
  }, [contacts, typeFilter]);

  const selectedContacts = useMemo(
    () => filtered.filter((c) => selected[c.id]),
    [filtered, selected]
  );

  const toggle = (id) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });

  const selectAll = () => {
    const next = {};
    filtered.forEach((c) => { next[c.id] = true; });
    setSelected(next);
  };

  const selectByType = (type) => {
    const next = {};
    filtered.filter((c) => c.contact_type === type).forEach((c) => { next[c.id] = true; });
    setSelected(next);
  };

  const selectByGroup = (groupId) => {
    const next = {};
    filtered.filter((c) => c.crm_organisation_id === groupId).forEach((c) => { next[c.id] = true; });
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  const handleConfirm = () => {
    onConfirm(selectedContacts);
    setSelected({});
    onClose();
  };

  const channelLabel = channel === "email" ? "email" : "WhatsApp message";
  const needsEmail = channel === "email";
  const eligibleCount = needsEmail
    ? selectedContacts.filter((c) => c.email).length
    : selectedContacts.filter((c) => (c.phone || "").replace(/[^\d]/g, "")).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-teal" /> Who do you want to tell?
          </DialogTitle>
        </DialogHeader>

        {contentPreview && (
          <div className="rounded-lg bg-brand-mint/40 border border-brand-teal/20 p-3 text-sm text-brand-navy">
            <p className="font-medium text-xs text-muted-foreground mb-1">Your {channelLabel}:</p>
            <p className="line-clamp-3 whitespace-pre-wrap">{contentPreview}</p>
          </div>
        )}

        {/* Quick-select */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={selectAll} disabled={!filtered.length}>
              <CheckSquare className="w-4 h-4" /> All visible ({filtered.length})
            </Button>
            {config.contactTypes.map((t) => {
              const count = filtered.filter((c) => c.contact_type === t.value).length;
              if (count === 0) return null;
              return (
                <Button
                  key={t.value}
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={() => selectByType(t.value)}
                >
                  {t.label} ({count})
                </Button>
              );
            })}
          </div>
          {orgs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Groups:</span>
              {orgs.map((g) => {
                const count = filtered.filter((c) => c.crm_organisation_id === g.id).length;
                if (count === 0) return null;
                return (
                  <Button
                    key={g.id}
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5"
                    onClick={() => selectByGroup(g.id)}
                  >
                    {g.name} ({count})
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recipient count banner */}
        {selectedContacts.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-teal/5 border border-brand-teal/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-navy font-medium">
                You are preparing this {channelLabel} for {selectedContacts.length} {selectedContacts.length === 1 ? "person" : "people"}.
              </p>
              {needsEmail && eligibleCount < selectedContacts.length && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {eligibleCount} have an email address. {selectedContacts.length - eligibleCount} will be skipped (no email).
                </p>
              )}
              {!needsEmail && eligibleCount < selectedContacts.length && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {eligibleCount} have a phone number. {selectedContacts.length - eligibleCount} will be skipped (no phone).
                </p>
              )}
            </div>
          </div>
        )}

        {/* Individual selection */}
        <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
          {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading contacts…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No contacts available.</p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-accent min-h-touch"
            >
              {selected[c.id] ? (
                <CheckSquare className="w-4 h-4 text-brand-teal shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium truncate flex-1">
                {c.first_name} {c.last_name || ""}
              </span>
              {c.contact_type && (
                <Badge variant="secondary" className="text-xs capitalize">{c.contact_type}</Badge>
              )}
            </button>
          ))}
        </div>

        {selectedContacts.length > 0 && (
          <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={clearSelection}>
            Clear selection
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose}>Cancel</Button>
          <Button className="h-11 gap-1.5" onClick={handleConfirm} disabled={selectedContacts.length === 0}>
            Review {selectedContacts.length} {selectedContacts.length === 1 ? "recipient" : "recipients"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}