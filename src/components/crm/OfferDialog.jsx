import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function OfferDialog({ open, onClose, onSaved, record }) {
  const isEdit = !!record;
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      title: record?.title || "",
      description: record?.description || "",
      start_date: record?.start_date || "",
      end_date: record?.end_date || "",
      status: record?.status || "active",
    });
  }, [open, record]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError("");
    if (!form.title) { setError("Title is required"); return; }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("End date must be on or after the start date");
      return;
    }
    setBusy(true);
    try {
      await onSaved(form, isEdit, record?.id);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Offer" : "New Offer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div>
            <Label>Title *</Label>
            <Input className="h-11" value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input className="h-11" type="date" value={form.start_date || ""} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input className="h-11" type="date" value={form.end_date || ""} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <ResponsiveSelect
              value={form.status || "active"}
              onValueChange={(value) => set("status", value)}
              placeholder="Select status"
              triggerClassName="h-11"
              options={STATUS_OPTIONS}
            />
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