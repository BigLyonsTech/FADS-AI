import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { getCrmConfig, getStageDisplayName, getPipelineConfig } from "@/lib/crmWording";

export default function LeadDialog({ open, onClose, onSaved, record, contacts, stages, orgType, defaultContactId }) {
  const isEdit = !!record;
  const config = getCrmConfig(orgType);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const contactOptions = [
    { value: "", label: "—" },
    ...contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ""}`.trim() })),
  ];

  const stageOptions = stages.length
    ? stages.map((s) => ({ value: s.name, label: getStageDisplayName(s.name, orgType) }))
    : getDefaultStageOptions(orgType);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (record) {
      setForm({
        title: record.title || "",
        contact_id: record.contact_id || "",
        stage: record.stage || stageOptions[0]?.value || "New",
        value: record.value ?? "",
        source: record.source || "",
        expected_close_date: record.expected_close_date || "",
        notes: record.notes || "",
      });
    } else {
      setForm({
        title: "",
        contact_id: defaultContactId || "",
        stage: stageOptions[0]?.value || "New",
        value: "",
        source: "",
        expected_close_date: "",
        notes: "",
      });
    }
  }, [open, record, defaultContactId]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.title) { setError("Title is required"); return; }
    setBusy(true);
    try {
      const contact = contacts.find((c) => c.id === form.contact_id);
      const payload = {
        ...form,
        value: Number(form.value) || 0,
        contact_name: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : "",
      };
      await onSaved(payload, isEdit, record?.id);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : config.newLeadLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div>
            <Label>Title *</Label>
            <Input className="h-11" value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>Contact</Label>
            <ResponsiveSelect
              value={form.contact_id || ""}
              onValueChange={(v) => set("contact_id", v)}
              placeholder="Select contact"
              triggerClassName="h-11"
              options={contactOptions}
            />
          </div>
          <div>
            <Label>Stage</Label>
            <ResponsiveSelect
              value={form.stage || "New"}
              onValueChange={(v) => set("stage", v)}
              placeholder="Select stage"
              triggerClassName="h-11"
              options={stageOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Value</Label>
              <Input className="h-11" type="number" step="0.01" value={form.value ?? ""} onChange={(e) => set("value", e.target.value)} />
            </div>
            <div>
              <Label>Expected close</Label>
              <Input className="h-11" type="date" value={form.expected_close_date || ""} onChange={(e) => set("expected_close_date", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Source</Label>
            <ResponsiveSelect
              value={form.source || ""}
              onValueChange={(v) => set("source", v)}
              placeholder="Select source"
              triggerClassName="h-11"
              options={[{ value: "", label: "—" }, ...config.sourceOptions.map((s) => ({ value: s, label: s }))]}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="h-11" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultStageOptions(orgType) {
  const pipe = getPipelineConfig(orgType);
  return pipe.stages.map((s) => ({ value: s.name, label: s.name }));
}