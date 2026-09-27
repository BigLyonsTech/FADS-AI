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
    const json = decodeURIComponent(escape(atob(raw.replace(/-/g, "+").replace(/_/g, "/"))));
    const parsed = JSON.parse(json);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const seen = new Set();
    return list.filter((p) => {
      const key = String(p?.profileUrl || [p?.firstName, p?.lastName].filter(Boolean).join(" ")).trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 50);
  } catch {
    return [];
  }
}

function fullName(p) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() || "Facebook lead";
}

function notesFor(p) {
  return [
    p.profileUrl ? `Facebook profile: ${p.profileUrl}` : "",
    p.groupName ? `Facebook group/page: ${p.groupName}` : "",
    p.context ? `Context: ${p.context}` : "",
    p.conversationSummary ? `Conversation summary: ${p.conversationSummary}` : "",
    p.nextAction ? `Next action: ${p.nextAction}` : "",
  ].filter(Boolean).join("\n");
}

export default function CRMAmelieImport() {
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
      const profileUrl = String(p.profileUrl || "").trim().toLowerCase();
      const name = fullName(p).toLowerCase();
      map[i] = (crm.contacts || []).find((c) => {
        const existingName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim().toLowerCase();
        const notes = String(c.notes || "").toLowerCase();
        if (profileUrl && notes.includes(profileUrl)) return true;
        return name && existingName === name && String(c.source || "").toLowerCase().includes("amelie");
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
    const notes = notesFor(p);
    const tags = [...new Set(["amelie", "facebook", ...(p.tags || [])].filter(Boolean))];

    if (duplicate) {
      await crm.updateContact(duplicate.id, {
        source: p.groupName ? `Amélie · Facebook · ${p.groupName}` : "Amélie · Facebook",
        tags: [...new Set([...(duplicate.tags || []), ...tags])],
        notes: [duplicate.notes, notes].filter(Boolean).join("\n\n"),
        next_follow_up_date: p.followUpDate || duplicate.next_follow_up_date || "",
      });
      await crm.createActivity({
        contact_id: duplicate.id,
        contact_name: name || duplicate.first_name,
        type: "note",
        subject: "Updated from Amélie",
        content: p.context || p.conversationSummary || "Amélie relationship record updated.",
      });
      return { id: duplicate.id, updated: true };
    }

    const contact = await crm.createContact({
      first_name: p.firstName || name || "Facebook",
      last_name: p.lastName || "",
      organisation_name: p.business || "",
      contact_type: "lead",
      status: "new",
      source: p.groupName ? `Amélie · Facebook · ${p.groupName}` : "Amélie · Facebook",
      tags,
      notes,
      next_follow_up_date: p.followUpDate || "",
    });

    const stage = crm.stages?.[0]?.name || "New";
    await crm.createLead({
      title: `${name} · BestieBoss`,
      contact_id: contact.id,
      contact_name: name,
      stage,
      source: "Amélie · Facebook",
      notes: p.context || p.fitReason || "",
    });
    await crm.createActivity({
      contact_id: contact.id,
      contact_name: name,
      type: "note",
      subject: "Imported from Amélie",
      content: p.context || "Reviewed in Amélie and approved for BestieBoss CRM.",
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
          <div className="flex items-center gap-2 text-amber-700"><AlertTriangle className="w-5 h-5" /><strong>No Amélie leads were supplied.</strong></div>
          <p className="text-sm text-muted-foreground">Return to Amélie and choose “Add approved to FADS CRM”.</p>
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
          <h1 className="text-xl font-bold">Amélie batch saved to BestieBoss CRM</h1>
          <p className="text-sm text-muted-foreground">
            {result.added} new {result.added === 1 ? "person" : "people"} added
            {result.updated ? ` · ${result.updated} existing ${result.updated === 1 ? "record" : "records"} updated` : ""}.
          </p>
          <Button onClick={() => navigate("/crm/contacts")}>Open BestieBoss CRM</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Amélie → FADS</p>
        <h1 className="text-2xl font-bold">Add approved people to BestieBoss CRM</h1>
        <p className="text-sm text-muted-foreground mt-1">One batch, one review. Untick anyone you do not want to save.</p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{selected.size} selected</Badge>
          <Badge variant="outline">{payloads.length} from Amélie</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select all</Button>
          <Button variant="outline" size="sm" onClick={clearAll}>Clear</Button>
        </div>
      </div>

      <div className="space-y-2">
        {payloads.map((p, i) => {
          const duplicate = duplicateByIndex[i];
          return (
            <Card key={p.profileUrl || i} className={selected.has(i) ? "border-brand-teal" : "opacity-60"}>
              <CardContent className="p-4">
                <label className="flex gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={selected.has(i)}
                    onChange={() => toggle(i)}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong>{fullName(p)}</strong>
                      {duplicate && <Badge variant="outline" className="border-amber-300 text-amber-700">Existing CRM contact</Badge>}
                      {p.groupName && <Badge variant="outline">{p.groupName}</Badge>}
                    </div>
                    {p.fitReason && <p className="text-xs text-muted-foreground">{p.fitReason}</p>}
                    {p.context && <p className="text-xs text-muted-foreground line-clamp-2">{p.context}</p>}
                    {p.profileUrl && <a className="text-xs underline" href={p.profileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Facebook profile ↗</a>}
                  </div>
                </label>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-xl p-3 shadow-lg flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate("/crm/contacts")}>Cancel</Button>
        <Button onClick={saveBatch} disabled={busy || !selected.size} className="gap-2">
          <Users className="w-4 h-4" />
          {busy ? "Adding to CRM…" : `Add ${selected.size} selected to CRM`}
        </Button>
      </div>
    </div>
  );
}
