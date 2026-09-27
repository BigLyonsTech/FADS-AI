import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Users, ArrowLeft } from "lucide-react";
import { useCrm } from "@/lib/useCrm";

function decodePayloads() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("payload");
    if (!raw) return [];
    const normalised = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised + "=".repeat((4 - (normalised.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const seen = new Set();
    return list.filter((p) => {
      const profileUrl = String(p?.profileUrl || p?.facebookProfileUrl || "").trim().toLowerCase();
      const name = String(p?.fullName || [p?.firstName, p?.lastName].filter(Boolean).join(" ")).trim().toLowerCase();
      const key = profileUrl || name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 50);
  } catch {
    return [];
  }
}

function fullName(p) {
  return String(p?.fullName || [p?.firstName, p?.lastName].filter(Boolean).join(" ")).trim() || "Facebook lead";
}

function profileUrlFor(p) {
  return String(p?.profileUrl || p?.facebookProfileUrl || "").trim();
}

function notesFor(p) {
  const profileUrl = profileUrlFor(p);
  return [
    profileUrl ? `Facebook profile: ${profileUrl}` : "",
    p.sourceGroup ? `Found in: ${p.sourceGroup}` : "",
    p.visibleContext ? `Visible context: ${p.visibleContext}` : "",
    p.relationshipType ? `Relationship: ${p.relationshipType}` : "",
    p.relationshipNote ? `Relationship note: ${p.relationshipNote}` : "",
    Array.isArray(p.matchedKeywords) && p.matchedKeywords.length ? `Matched keywords: ${p.matchedKeywords.join(", ")}` : "",
    p.nextAction ? `Next action: ${p.nextAction}` : "",
  ].filter(Boolean).join("\n");
}

export default function CRMHBAImport() {
  const crm = useCrm();
  const navigate = useNavigate();
  const payloads = useMemo(() => decodePayloads(), []);
  const [selected, setSelected] = useState(() => new Set(payloads.map((_, i) => i)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const duplicateByIndex = useMemo(() => {
    const map = {};
    payloads.forEach((p, i) => {
      const profileUrl = profileUrlFor(p).toLowerCase();
      const name = fullName(p).toLowerCase();
      map[i] = (crm.contacts || []).find((c) => {
        const existingName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim().toLowerCase();
        const notes = String(c.notes || "").toLowerCase();
        if (profileUrl && notes.includes(profileUrl)) return true;
        return name && existingName === name && String(c.source || "").toLowerCase().includes("hba friend finder");
      }) || null;
    });
    return map;
  }, [payloads, crm.contacts]);

  const toggle = (i) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(payloads.map((_, i) => i)));
  const clearAll = () => setSelected(new Set());

  const saveOne = async (p, duplicate) => {
    const name = fullName(p);
    const firstName = String(p.firstName || name.split(/\s+/)[0] || "Facebook").trim();
    const lastName = String(p.lastName || name.split(/\s+/).slice(1).join(" ")).trim();
    const notes = notesFor(p);
    const tags = [...new Set(["hba-friend-finder", "facebook", "daily-dmo", ...(Array.isArray(p.tags) ? p.tags : [])].filter(Boolean))];

    if (duplicate) {
      await crm.updateContact(duplicate.id, {
        source: "HBA Friend Finder",
        tags: [...new Set([...(duplicate.tags || []), ...tags])],
        notes: [duplicate.notes, notes].filter(Boolean).join("\n\n"),
      });
      await crm.createActivity({
        contact_id: duplicate.id,
        contact_name: name || duplicate.first_name,
        type: "note",
        subject: "Updated from HBA Friend Finder",
        content: p.relationshipNote || p.visibleContext || "HBA Friend Finder relationship record updated.",
      });
      return { id: duplicate.id, updated: true };
    }

    const contact = await crm.createContact({
      first_name: firstName,
      last_name: lastName,
      contact_type: "lead",
      status: "new",
      source: "HBA Friend Finder",
      tags,
      notes,
    });

    const stage = crm.stages?.[0]?.name || "New";
    await crm.createLead({
      title: `${name} · HBA Friend Finder`,
      contact_id: contact.id,
      contact_name: name,
      stage,
      source: "HBA Friend Finder",
      notes: p.relationshipNote || p.visibleContext || "",
    });
    await crm.createActivity({
      contact_id: contact.id,
      contact_name: name,
      type: "note",
      subject: "Imported from HBA Friend Finder",
      content: p.relationshipNote || p.visibleContext || "Approved in HBA Friend Finder and added to FADS CRM.",
    });
    return { id: contact.id, updated: false };
  };

  const saveBatch = async () => {
    const indexes = [...selected].sort((a, b) => a - b);
    if (!indexes.length) return;
    setBusy(true);
    setError("");
    try {
      let added = 0;
      let updated = 0;
      for (const i of indexes) {
        const res = await saveOne(payloads[i], duplicateByIndex[i]);
        if (res.updated) updated += 1; else added += 1;
      }
      setResult({ added, updated, total: indexes.length });
    } catch (e) {
      setError(e.message || "Could not save the selected people.");
    } finally {
      setBusy(false);
    }
  };

  if (crm.loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (!payloads.length) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-700"><AlertTriangle className="w-5 h-5" /><strong>No HBA Friend Finder leads were supplied.</strong></div>
          <p className="text-sm text-muted-foreground">Return to HBA Friend Finder and choose “Add selected to my FADS CRM”.</p>
          <Button variant="outline" onClick={() => navigate("/crm/contacts")}><ArrowLeft className="w-4 h-4 mr-2" />Back to CRM</Button>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="p-6 space-y-4 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
          <h1 className="text-xl font-bold">HBA Friend Finder batch saved to FADS CRM</h1>
          <p className="text-sm text-muted-foreground">
            {result.added} new {result.added === 1 ? "person" : "people"} added
            {result.updated ? ` · ${result.updated} existing ${result.updated === 1 ? "record" : "records"} updated` : ""}.
          </p>
          <Button onClick={() => navigate("/crm/contacts")}>Open FADS CRM</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Add HBA Friend Finder people to FADS CRM</h1>
        <p className="text-sm text-muted-foreground mt-1">Review the approved people below, then save them to the active workspace.</p>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select all</Button>
          <Button variant="outline" size="sm" onClick={clearAll}>Clear</Button>
        </div>
        <Badge variant="secondary">{selected.size} selected</Badge>
      </div>

      <div className="space-y-2">
        {payloads.map((p, i) => {
          const duplicate = duplicateByIndex[i];
          return (
            <Card key={i}>
              <CardContent className="p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong>{fullName(p)}</strong>
                    {duplicate && <Badge variant="outline">Already in CRM · will update</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.relationshipType || "New person"}{p.sourceGroup ? ` · ${p.sourceGroup}` : ""}</p>
                  {profileUrlFor(p) && (
                    <a className="text-xs text-brand-teal underline break-all" href={profileUrlFor(p)} target="_blank" rel="noopener noreferrer">
                      {profileUrlFor(p)}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="outline" onClick={() => navigate("/crm/contacts")}><ArrowLeft className="w-4 h-4 mr-2" />Cancel</Button>
        <Button onClick={saveBatch} disabled={busy || !selected.size}>
          <Users className="w-4 h-4 mr-2" />
          {busy ? "Saving..." : `Add ${selected.size} selected to FADS CRM`}
        </Button>
      </div>
    </div>
  );
}
