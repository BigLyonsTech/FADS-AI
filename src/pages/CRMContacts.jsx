import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { UserPlus, Search, Download, Mail, Phone, CheckSquare, Square, Upload, Tag, MessageSquare, Users, MessageCircle, CalendarClock } from "lucide-react";

import { useCrm } from "@/lib/useCrm";
import { getCrmConfig, getContactTypeLabel, CONTACT_STATUS_OPTIONS, getContactFilterGroups, getStageDisplayName } from "@/lib/crmWording";
import ExportDialog from "@/components/shared/ExportDialog";
import { downloadSpreadsheet, exportFilename } from "@/lib/spreadsheetExport";
import { getContactStatusColor, getLabelColor } from "@/lib/crmColors";
import ContactDialog from "@/components/crm/ContactDialog";
import WhatsAppComposer from "@/components/crm/WhatsAppComposer";
import BulkEmailDialog from "@/components/crm/BulkEmailDialog";
import BulkDirectMessageDialog from "@/components/crm/BulkDirectMessageDialog";
import BulkActionsBar from "@/components/crm/BulkActionsBar";
import BulkImportDialog from "@/components/import/BulkImportDialog";
import FollowUpDialog from "@/components/crm/FollowUpDialog";
import TaskDialog from "@/components/crm/TaskDialog";
import CrmPageIntro from "@/components/crm/CrmPageIntro";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmNav from "@/components/crm/CrmNav";
import { useToast } from "@/components/ui/use-toast";

const FINDER_SOURCE = "HBA Friend Finder";
const FINDER_TAGS = ["hba", "facebook", "friend-finder"];

function decodeFinderPayload(encoded) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function normaliseFacebookProfileUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:" || (hostname !== "facebook.com" && !hostname.endsWith(".facebook.com"))) {
      return "";
    }
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path.toLowerCase() === "/profile.php") {
      const id = url.searchParams.get("id");
      return id ? `https://facebook.com/profile.php?id=${id}` : "";
    }
    return `https://facebook.com${path}`;
  } catch {
    return "";
  }
}

function contactFacebookProfileUrl(contact) {
  const match = String(contact?.notes || "").match(/Facebook profile:\s*(https?:\/\/\S+)/i);
  return normaliseFacebookProfileUrl(match?.[1] || "");
}

function finderNotes(payload, profileUrl) {
  const lines = [
    `Facebook profile: ${profileUrl}`,
    `Relationship: ${payload.relationshipType || payload.relationshipStatus || "New person"}`,
    payload.relationshipNote && `Relationship note: ${payload.relationshipNote}`,
    payload.visibleContext && `Relationship context: ${payload.visibleContext}`,
    Number.isFinite(Number(payload.mutualFriends)) && `Mutual friends: ${Number(payload.mutualFriends)}`,
    payload.sourceGroup && `Found in: ${payload.sourceGroup}`,
    payload.sourceUrl && `Source URL: ${payload.sourceUrl}`,
    payload.matchedKeywords?.length && `Matched keywords: ${payload.matchedKeywords.join(", ")}`,
    payload.preferredLocationClues?.length && `Location clues: ${payload.preferredLocationClues.join(", ")}`,
    payload.nextAction && `Next action: ${payload.nextAction}`,
    payload.ownerTeam && `Owner/team: ${payload.ownerTeam}`,
    payload.foundAt && `Found at: ${payload.foundAt}`,
    payload.approvedAt && `Approved at: ${payload.approvedAt}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export default function CRMContacts() {
  const crm = useCrm();
  const navigate = useNavigate();
  const { orgType, activeOrg, loading, contacts, orgs, stages } = crm;
  const config = getCrmConfig(activeOrg);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [chipFilter, setChipFilter] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("chip") || "";
  });
  const [showDialog, setShowDialog] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [directMsgOpen, setDirectMsgOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarContact, setCalendarContact] = useState(null);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [moveStageOpen, setMoveStageOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [whatsappContact, setWhatsappContact] = useState(null);
  const [dmContact, setDmContact] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [finderPayload, setFinderPayload] = useState(null);
  const [finderError, setFinderError] = useState("");
  const [finderDuplicate, setFinderDuplicate] = useState(null);
  const [finderSaving, setFinderSaving] = useState(false);
  const handledFinderPayloadRef = useRef("");
  const finderSaveRef = useRef(false);
  const { toast } = useToast();

  const clearFinderUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("finder_payload");
    url.searchParams.delete("source");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => {
    if (typeof window === "undefined" || loading || !crm.orgId) return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("finder_payload");
    if (!encoded) return;

    const requestKey = `${crm.orgId}:${crm.dataMode}:${encoded}`;
    if (handledFinderPayloadRef.current === requestKey) return;
    handledFinderPayloadRef.current = requestKey;

    try {
      const decoded = decodeFinderPayload(encoded);
      const profileUrl = normaliseFacebookProfileUrl(decoded.facebookProfileUrl);
      const firstName = String(decoded.firstName || decoded.fullName || "").trim().split(/\s+/)[0];
      if (!decoded || decoded.source !== FINDER_SOURCE || !firstName || !profileUrl) {
        throw new Error("The Friend Finder handoff is missing a valid name, source, or Facebook profile URL.");
      }

      const duplicate = contacts.find(
        (contact) => contactFacebookProfileUrl(contact) === profileUrl
      ) || null;
      setFinderPayload({ ...decoded, firstName, facebookProfileUrl: profileUrl });
      setFinderDuplicate(duplicate);
      setFinderError("");
    } catch (error) {
      setFinderPayload(null);
      setFinderDuplicate(null);
      setFinderError(error?.message || "FADS could not read this Friend Finder handoff.");
    }
  }, [loading, crm.orgId, crm.dataMode, contacts]);

  const closeFinderReview = () => {
    clearFinderUrl();
    setFinderPayload(null);
    setFinderDuplicate(null);
    setFinderError("");
  };

  const saveFinderContact = async () => {
    if (!finderPayload || finderSaving || finderSaveRef.current || !crm.orgId) return;
    finderSaveRef.current = true;
    setFinderSaving(true);
    try {
      const profileUrl = normaliseFacebookProfileUrl(finderPayload.facebookProfileUrl);
      const existing = contacts.find(
        (contact) => contactFacebookProfileUrl(contact) === profileUrl
      );
      if (existing) {
        setFinderDuplicate(existing);
        toast({
          title: "Already in FADS CRM",
          description: "This Facebook profile is already saved in the active workspace.",
        });
        return;
      }

      const availableTypes = config.contactTypes.map((type) => type.value);
      const contactType = availableTypes.includes("prospect")
        ? "prospect"
        : availableTypes.includes("lead")
          ? "lead"
          : availableTypes[0];

      const created = await crm.createContact({
        first_name: finderPayload.firstName,
        last_name: String(finderPayload.lastName || "").trim(),
        contact_type: contactType,
        status: "new",
        source: FINDER_SOURCE,
        tags: FINDER_TAGS,
        notes: finderNotes(finderPayload, profileUrl),
      });

      clearFinderUrl();
      setFinderPayload(null);
      setFinderDuplicate(null);
      setFinderError("");
      setSearch(`${created?.first_name || finderPayload.firstName} ${created?.last_name || finderPayload.lastName || ""}`.trim());
      toast({
        title: "Added to FADS CRM",
        description: `${finderPayload.fullName || `${finderPayload.firstName} ${finderPayload.lastName || ""}`.trim()} was saved once in ${activeOrg?.name || "the active workspace"} (${crm.dataMode}).`,
      });
    } catch (error) {
      setFinderError(error?.message || "FADS could not save this contact. Please try again.");
    } finally {
      finderSaveRef.current = false;
      setFinderSaving(false);
    }
  };

  const allTags = useMemo(() => [...new Set(contacts.flatMap((c) => c.tags || []))].sort(), [contacts]);
  const groupOptions = useMemo(() => orgs.map((o) => ({ value: o.id, label: o.name })), [orgs]);
  const filterGroups = useMemo(() => getContactFilterGroups(activeOrg), [activeOrg]);
  const activeChip = useMemo(() => filterGroups.find((g) => g.label === chipFilter) || null, [filterGroups, chipFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return contacts.filter((c) => {
      if (typeFilter && c.contact_type !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;
      if (groupFilter && c.crm_organisation_id !== groupFilter) return false;
      if (activeChip && activeChip.types) {
        if (activeChip.other) {
          // "Other" = contacts whose type is NOT in any named group
          const allNamedTypes = filterGroups
            .filter((g) => !g.other && g.types)
            .flatMap((g) => g.types);
          if (allNamedTypes.includes(c.contact_type)) return false;
        } else if (!activeChip.types.includes(c.contact_type)) {
          return false;
        }
      }
      if (q) {
        const hay = `${c.first_name} ${c.last_name || ""} ${c.email || ""} ${c.phone || ""} ${c.organisation_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, search, typeFilter, statusFilter, tagFilter, groupFilter, activeChip]);

  const selectedContacts = useMemo(
    () => filtered.filter((c) => selected[c.id]),
    [filtered, selected]
  );

  const toggleSelect = (id) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });

  const selectAll = () => {
    const next = {};
    filtered.forEach((c) => { next[c.id] = true; });
    setSelected(next);
  };
  // Quick-select helpers — always operate on the currently FILTERED list only,
  // never the entire database. This keeps "select by group/type" scoped to what
  // the user is actually looking at.
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

  const leadByContact = useMemo(() => {
    const m = {};
    crm.leads.forEach((l) => { if (l.contact_id) m[l.contact_id] = l; });
    return m;
  }, [crm.leads]);

  const orgNameById = useMemo(() => {
    const m = {};
    orgs.forEach((o) => { m[o.id] = o.name; });
    return m;
  }, [orgs]);

  const exportOptions = useMemo(() => {
    const opts = [
      { key: "all", label: "All Contacts", count: contacts.length },
      { key: "filtered", label: "Current Filtered", count: filtered.length },
      { key: "selected", label: "Selected", count: selectedContacts.length },
    ];
    filterGroups.filter((g) => g.label !== "All" && !g.other).forEach((g) => {
      const count = g.types ? contacts.filter((c) => g.types.includes(c.contact_type)).length : 0;
      if (count > 0) opts.push({ key: `cat_${g.label}`, label: g.label, count });
    });
    opts.push(
      { key: "groups", label: "Groups", count: orgs.length },
      { key: "pipeline", label: "Pipeline", count: crm.leads.length },
    );
    return opts;
  }, [contacts, filtered, selectedContacts, filterGroups, orgs, crm.leads]);

  const handleExport = async (optionKey, format) => {
    if (format === "google_sheets") return;
    const contactColumns = [
      { key: "name", label: "Name" },
      { key: "company", label: "Company" },
      { key: "type", label: "Type" },
      { key: "pipeline_stage", label: "Pipeline Stage" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "labels", label: "Labels" },
      { key: "group", label: "Group" },
      { key: "last_contact", label: "Last Contact" },
      { key: "next_followup", label: "Next Follow-Up" },
      { key: "opportunity_value", label: "Opportunity Value" },
      { key: "currency", label: "Currency" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
    ];
    const buildContactRows = (list) => list.map((c) => {
      const lead = leadByContact[c.id];
      return {
        name: `${c.first_name} ${c.last_name || ""}`.trim(),
        company: c.organisation_name || "",
        type: getContactTypeLabel(orgType, c.contact_type),
        pipeline_stage: lead ? getStageDisplayName(lead.stage, orgType) : "",
        email: c.email || "",
        phone: c.phone || "",
        labels: (c.tags || []).join("; "),
        group: c.crm_organisation_id ? (orgNameById[c.crm_organisation_id] || "") : "",
        last_contact: c.last_contact_date || "",
        next_followup: c.next_follow_up_date || "",
        opportunity_value: lead?.value || "",
        currency: lead?.currency || "",
        source: c.source || "",
        status: c.status || "",
      };
    });
    if (optionKey === "all") {
      downloadSpreadsheet(buildContactRows(contacts), contactColumns, exportFilename("Contacts", activeOrg?.name));
    } else if (optionKey === "filtered") {
      downloadSpreadsheet(buildContactRows(filtered), contactColumns, exportFilename("Contacts-Filtered", activeOrg?.name));
    } else if (optionKey === "selected") {
      downloadSpreadsheet(buildContactRows(selectedContacts), contactColumns, exportFilename("Contacts-Selected", activeOrg?.name));
    } else if (optionKey.startsWith("cat_")) {
      const label = optionKey.slice(4);
      const group = filterGroups.find((g) => g.label === label);
      const list = group?.types ? contacts.filter((c) => group.types.includes(c.contact_type)) : [];
      downloadSpreadsheet(buildContactRows(list), contactColumns, exportFilename(`Contacts-${label}`, activeOrg?.name));
    } else if (optionKey === "groups") {
      const groupColumns = [
        { key: "name", label: "Group Name" },
        { key: "contact_count", label: "Contacts" },
      ];
      const rows = orgs.map((o) => ({
        name: o.name,
        contact_count: contacts.filter((c) => c.crm_organisation_id === o.id).length,
      }));
      downloadSpreadsheet(rows, groupColumns, exportFilename("Groups", activeOrg?.name));
    } else if (optionKey === "pipeline") {
      const pipelineColumns = [
        { key: "title", label: "Title" },
        { key: "contact_name", label: "Contact" },
        { key: "stage_display", label: "Stage" },
        { key: "value", label: "Value" },
        { key: "currency", label: "Currency" },
        { key: "source", label: "Source" },
        { key: "expected_close_date", label: "Expected Close" },
        { key: "assigned_user_name", label: "Assigned To" },
      ];
      const rows = crm.leads.map((l) => ({
        ...l,
        stage_display: getStageDisplayName(l.stage, orgType),
      }));
      downloadSpreadsheet(rows, pipelineColumns, exportFilename("Pipeline", activeOrg?.name));
    }
  };

  // Open the WhatsApp composer for a single contact from a card. Reuses the
  // same WhatsAppComposer instance as bulk messaging — just with one contact.
  const openCardWhatsApp = (contact) => {
    setWhatsappContact(contact);
    setComposerOpen(true);
  };

  // Open the DM composer for a single contact from a card. Reuses the same
  // BulkDirectMessageDialog as bulk messaging — just with one contact.
  const openCardDM = (contact) => {
    setDmContact(contact);
    setDirectMsgOpen(true);
  };

  const openCardCalendar = (contact) => {
    setCalendarContact(contact);
    setCalendarOpen(true);
  };

  const handleSendWhatsApp = async (contact, message) => {
    await crm.createActivity({
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
      type: "whatsapp",
      subject: "WhatsApp message",
      content: message,
    });
    await crm.updateContact(contact.id, { last_contact_date: new Date().toISOString().slice(0, 10) });
  };

  const handleFollowUpSent = async (c, message, updates) => {
    await crm.createActivity({
      contact_id: c.id,
      contact_name: `${c.first_name} ${c.last_name || ""}`.trim(),
      type: "whatsapp",
      subject: "WhatsApp follow-up",
      content: message,
    });
    await crm.updateContact(c.id, {
      last_contact_date: updates.last_contact_date,
      next_follow_up_date: updates.next_follow_up_date,
    });
  };

  const handleAddLabel = async () => {
    if (!newLabel.trim()) return;
    await Promise.all(selectedContacts.map((c) =>
      crm.updateContact(c.id, { tags: [...new Set([...(c.tags || []), newLabel.trim()])] })
    ));
    setNewLabel("");
    setLabelModalOpen(false);
  };

  const handleMoveStage = async (stageName) => {
    // For contacts that are leads, update their lead's stage
    const leadsForSelected = crm.leads.filter((l) => selected[l.contact_id]);
    await Promise.all(leadsForSelected.map((l) => crm.updateLead(l.id, { stage: stageName })));
    setMoveStageOpen(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <CrmNav orgType={crm.orgType} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{config.contactsLabel}</h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="h-9 gap-1" onClick={() => setShowDialog(true)}>
            <UserPlus className="w-4 h-4" /> {config.newContactLabel}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> Bring Data In
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => setExportOpen(true)}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <details className="relative">
            <summary className="list-none cursor-pointer inline-flex items-center h-9 px-3 rounded-md border border-input bg-transparent text-sm hover:bg-accent min-h-touch">
              Select
            </summary>
            <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-md shadow-lg p-2 space-y-1 min-w-[200px] max-h-[60vh] overflow-y-auto">
              <p className="text-[11px] font-medium text-muted-foreground px-1 pt-1">Current results</p>
              <Button variant="ghost" size="sm" className="w-full justify-start h-9 gap-1.5" onClick={selectAll} disabled={!filtered.length}>
                <CheckSquare className="w-4 h-4" /> All visible ({filtered.length})
              </Button>
              {config.contactTypes.length > 0 && (
                <p className="text-[11px] font-medium text-muted-foreground px-1 pt-2">By type</p>
              )}
              {config.contactTypes.map((t) => {
                const count = filtered.filter((c) => c.contact_type === t.value).length;
                if (count === 0) return null;
                return (
                  <Button key={t.value} variant="ghost" size="sm" className="w-full justify-start h-9 gap-1.5" onClick={() => selectByType(t.value)}>
                    <Users className="w-4 h-4" /> {t.label} ({count})
                  </Button>
                );
              })}
              {groupOptions.length > 0 && (
                <p className="text-[11px] font-medium text-muted-foreground px-1 pt-2">By group</p>
              )}
              {groupOptions.map((g) => {
                const count = filtered.filter((c) => c.crm_organisation_id === g.value).length;
                if (count === 0) return null;
                return (
                  <Button key={g.value} variant="ghost" size="sm" className="w-full justify-start h-9 gap-1.5" onClick={() => selectByGroup(g.value)}>
                    <Users className="w-4 h-4" /> {g.label} ({count})
                  </Button>
                );
              })}
              {selectedContacts.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-9 gap-1.5 text-muted-foreground" onClick={clearSelection}>
                  <Square className="w-4 h-4" /> Clear selection
                </Button>
              )}
            </div>
          </details>
        </div>
      </div>

      <CrmPageIntro
        whatIs="This is where everyone you deal with lives — customers, suppliers, and anyone you're in touch with."
        whatYouCanDo="Search for someone, add a new person, or import your existing contacts from a spreadsheet."
      />

      {/* Quick filter chips — adapted per workspace */}
      <div className="flex flex-wrap gap-2">
        {filterGroups.map((g) => {
          const active = (chipFilter || "All") === g.label;
          return (
            <button
              key={g.label}
              onClick={() => setChipFilter(active ? "" : g.label)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? "bg-brand-teal text-white border-brand-teal"
                  : "bg-card border-border text-brand-navy hover:border-brand-teal"
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Search & filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="h-11 pl-9" placeholder="Search name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ResponsiveSelect
          value={typeFilter}
          onValueChange={setTypeFilter}
          placeholder="Who are they?"
          triggerClassName="h-11"
          options={[{ value: "", label: "Who are they?" }, ...config.contactTypes]}
        />
        <ResponsiveSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Where are we with them?"
          triggerClassName="h-11"
          options={[{ value: "", label: "Where are we with them?" }, ...CONTACT_STATUS_OPTIONS]}
        />
        <ResponsiveSelect
          value={tagFilter}
          onValueChange={setTagFilter}
          placeholder="All labels"
          triggerClassName="h-11"
          options={[{ value: "", label: "All labels" }, ...allTags.map((t) => ({ value: t, label: t }))]}
        />
        <ResponsiveSelect
          value={groupFilter}
          onValueChange={setGroupFilter}
          placeholder="All groups"
          triggerClassName="h-11"
          options={[{ value: "", label: "All groups" }, ...groupOptions]}
        />
      </div>

      {/* Contacts grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <CrmEmptyState
              message={contacts.length === 0
                ? "No one's here yet. Add your first person or import your existing contacts from a spreadsheet."
                : "No one matches your filters. Try changing who you're looking for."}
              actionLabel={contacts.length === 0 ? "Add someone" : undefined}
              actionIcon={UserPlus}
              onAction={contacts.length === 0 ? () => setShowDialog(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer h-full" style={{ borderLeftColor: getContactStatusColor(c.status).accent, borderLeftWidth: "3px" }} onClick={() => navigate(`/crm/contacts/${c.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.first_name} {c.last_name || ""}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{getContactTypeLabel(orgType, c.contact_type)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize border"
                      style={{
                        backgroundColor: getContactStatusColor(c.status).bg,
                        color: getContactStatusColor(c.status).text,
                        borderColor: getContactStatusColor(c.status).border,
                      }}
                    >
                      {c.status}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}
                      title={selected[c.id] ? "Deselect" : "Select for bulk actions"}
                    >
                      {selected[c.id] ? <CheckSquare className="w-5 h-5 text-brand-teal" /> : <Square className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {c.organisation_name && <div className="text-xs text-muted-foreground mt-2 truncate">{c.organisation_name}</div>}
                <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                  {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> <span className="truncate">{c.email}</span></div>}
                  {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</div>}
                  {!c.phone && <div className="flex items-center gap-1.5 text-amber-600"><Phone className="w-3 h-3" /> This contact doesn't have a mobile number saved yet.</div>}
                </div>
                <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : undefined}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors min-h-touch ${!c.phone ? "opacity-40 pointer-events-none" : ""}`}
                    title={c.phone ? "Call" : "No mobile number"}
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                  <button
                    type="button"
                    onClick={() => openCardWhatsApp(c)}
                    disabled={!c.phone}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors min-h-touch disabled:opacity-40"
                    title={c.phone ? "Open WhatsApp" : "No mobile number"}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => openCardDM(c)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors min-h-touch"
                    title="Direct message"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> DM
                  </button>
                  <a
                    href={c.email ? `mailto:${c.email}` : undefined}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors min-h-touch ${!c.email ? "opacity-40 pointer-events-none" : ""}`}
                    title={c.email ? "Email" : "No email address"}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                  <button
                    type="button"
                    onClick={() => openCardCalendar(c)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors min-h-touch"
                    title="Book a call or appointment and save it to this CRM contact"
                  >
                    <CalendarClock className="w-3.5 h-3.5" /> Calendar
                  </button>
                </div>
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.slice(0, 3).map((t) => {
                      const lc = getLabelColor(t);
                      return (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium border"
                          style={{ backgroundColor: lc.bg, color: lc.text, borderColor: lc.border }}
                        >
                          {t}
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedCount={selectedContacts.length}
        totalCount={filtered.length}
        onSelectAll={selectAll}
        onClear={clearSelection}
        onWhatsApp={() => { setWhatsappContact(null); setComposerOpen(true); }}
        onDirectMessage={() => { setDmContact(null); setDirectMsgOpen(true); }}
        onEmail={() => setEmailOpen(true)}
        onAddLabel={() => setLabelModalOpen(true)}
        onMoveStage={stages.length > 0 ? () => setMoveStageOpen(true) : undefined}
        onFollowUp={selectedContacts.length === 1 ? () => { setFollowUpOpen(true); } : undefined}
      />

      {/* Add label modal */}
      {labelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setLabelModalOpen(false)}>
          <div className="bg-card rounded-xl shadow-lg p-4 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium text-sm">Add a label to {selectedContacts.length} {selectedContacts.length === 1 ? "person" : "people"}</h3>
            <Input className="h-11" placeholder="Label name…" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="h-9" onClick={() => setLabelModalOpen(false)}>Cancel</Button>
              <Button className="h-9 gap-1.5" onClick={handleAddLabel} disabled={!newLabel.trim()}>
                <Tag className="w-4 h-4" /> Add label
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move stage modal */}
      {moveStageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setMoveStageOpen(false)}>
          <div className="bg-card rounded-xl shadow-lg p-4 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium text-sm">Move {selectedContacts.length} {selectedContacts.length === 1 ? "person" : "people"} to a pipeline stage</h3>
            <p className="text-xs text-muted-foreground">Only contacts with an existing pipeline entry will be moved.</p>
            <div className="space-y-1">
              {stages.map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-accent flex items-center gap-2 min-h-touch border"
                  onClick={() => handleMoveStage(s.name)}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(finderPayload || finderError) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={closeFinderReview}>
          <div className="bg-card rounded-xl shadow-xl border p-5 max-w-lg w-full space-y-4" onClick={(event) => event.stopPropagation()}>
            <div>
              <h2 className="text-lg font-semibold">Add Friend Finder prospect?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review the incoming details before anything is saved to {activeOrg?.name || "this organisation"} · {crm.dataMode === "demo" ? "Demo" : "Live"}.
              </p>
            </div>

            {finderError ? (
              <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{finderError}</div>
            ) : (
              <>
                <div className="rounded-lg border p-3 space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {finderPayload.fullName || `${finderPayload.firstName} ${finderPayload.lastName || ""}`.trim()}</p>
                  <p>
                    <span className="font-medium">Facebook:</span>{" "}
                    <a className="text-brand-teal underline break-all" href={finderPayload.facebookProfileUrl} target="_blank" rel="noopener noreferrer">
                      {finderPayload.facebookProfileUrl}
                    </a>
                  </p>
                  <p><span className="font-medium">Relationship:</span> {finderPayload.relationshipType || finderPayload.relationshipStatus || "New person"}</p>
                  {finderPayload.relationshipNote && <p><span className="font-medium">Context:</span> {finderPayload.relationshipNote}</p>}
                  {finderPayload.sourceGroup && <p><span className="font-medium">Found in:</span> {finderPayload.sourceGroup}</p>}
                </div>

                {finderDuplicate && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3">
                    This Facebook profile is already saved as {finderDuplicate.first_name} {finderDuplicate.last_name || ""}. A second contact will not be created.
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-10" onClick={closeFinderReview}>Cancel</Button>
              {!finderError && (
                <Button className="h-10" onClick={finderDuplicate ? closeFinderReview : saveFinderContact} disabled={finderSaving}>
                  {finderSaving ? "Saving…" : finderDuplicate ? "Already in CRM" : "Add to FADS CRM"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <ContactDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        orgId={crm.orgId}
        orgType={orgType}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateContact(id, payload);
          else await crm.createContact(payload);
          setShowDialog(false);
        }}
      />

      <WhatsAppComposer
        open={composerOpen}
        onClose={() => { setComposerOpen(false); setWhatsappContact(null); }}
        contacts={whatsappContact ? [whatsappContact] : selectedContacts}
        orgId={crm.orgId}
        templates={crm.templates}
        onSend={handleSendWhatsApp}
      />

      <BulkEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        contacts={selectedContacts}
        orgId={crm.orgId}
        templates={crm.templates}
      />

      <BulkDirectMessageDialog
        open={directMsgOpen}
        onClose={() => { setDirectMsgOpen(false); setDmContact(null); }}
        contacts={dmContact ? [dmContact] : selectedContacts}
        orgId={crm.orgId}
        templates={crm.templates}
        onPrepared={async (recipients, message) => {
          // Log each prepared message as a CRM activity (review-first).
          await Promise.all(recipients.map((c) =>
            crm.createActivity({
              contact_id: c.id,
              contact_name: `${c.first_name} ${c.last_name || ""}`.trim(),
              type: "note",
              subject: "Prepared message",
              content: message,
            })
          ));
          await Promise.all(recipients.map((c) =>
            crm.updateContact(c.id, { last_contact_date: new Date().toISOString().slice(0, 10) })
          ));
        }}
      />

      {followUpOpen && selectedContacts[0] && (
        <FollowUpDialog
          open={followUpOpen}
          onClose={() => setFollowUpOpen(false)}
          contact={selectedContacts[0]}
          orgId={crm.orgId}
          onSent={handleFollowUpSent}
        />
      )}

      <TaskDialog
        open={calendarOpen}
        onClose={() => { setCalendarOpen(false); setCalendarContact(null); }}
        contacts={contacts}
        tasks={crm.tasks}
        defaultContactId={calendarContact?.id || ""}
        defaultType="appointment"
        onSaved={async (payload) => {
          const task = await crm.createTask(payload);
          const contact = calendarContact || contacts.find((c) => c.id === payload.contact_id);
          if (contact) {
            await crm.updateContact(contact.id, {
              next_follow_up_date: payload.due_date || contact.next_follow_up_date || "",
            });
            await crm.createActivity({
              contact_id: contact.id,
              contact_name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
              type: "meeting",
              subject: "Call / appointment booked",
              content: `${payload.title || "Appointment"} booked for ${payload.due_date || "date TBD"}${payload.due_time ? ` at ${payload.due_time}` : ""}${payload.location ? ` · ${payload.location}` : ""}.`,
            });
          }
          setCalendarOpen(false);
          setCalendarContact(null);
          return task;
        }}
      />

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importType="crm"
        orgId={crm.orgId}
        orgType={orgType}
        orgName={activeOrg?.name}
        dataMode={activeOrg?.data_mode}
        existingRecords={contacts}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Contacts"
        options={exportOptions}
        onExport={handleExport}
        googleSheetsAvailable={false}
      />
    </div>
  );
}