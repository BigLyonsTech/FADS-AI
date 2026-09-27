import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { DOCUMENT_CATEGORIES } from "@/lib/hrDocuments";
import { Loader2, X } from "lucide-react";

export default function DocumentTypeDialog({ open, onClose, onSave, editType }) {
  const [form, setForm] = useState({
    name: "", description: "", category: "contract",
    is_confidential_default: true, is_required_for_onboarding: false, has_expiry: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: editType?.name || "",
        description: editType?.description || "",
        category: editType?.category || "contract",
        is_confidential_default: editType?.is_confidential_default ?? true,
        is_required_for_onboarding: editType?.is_required_for_onboarding || false,
        has_expiry: editType?.has_expiry || false,
      });
    }
  }, [open, editType]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      // handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <Card className="p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{editType ? "Edit Document Type" : "Add Document Type"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Employment Contract" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Category</Label>
            <ResponsiveSelect
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
              placeholder="Select category"
              options={DOCUMENT_CATEGORIES}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_confidential_default} onCheckedChange={(v) => setForm({ ...form, is_confidential_default: v })} id="conf" />
              <Label htmlFor="conf" className="text-sm font-normal cursor-pointer">Confidential by default</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_required_for_onboarding} onCheckedChange={(v) => setForm({ ...form, is_required_for_onboarding: v })} id="req" />
              <Label htmlFor="req" className="text-sm font-normal cursor-pointer">Required for onboarding</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.has_expiry} onCheckedChange={(v) => setForm({ ...form, has_expiry: v })} id="exp" />
              <Label htmlFor="exp" className="text-sm font-normal cursor-pointer">Typically has an expiry date</Label>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name} className="gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editType ? "Save" : "Add Type"}
          </Button>
        </div>
      </Card>
    </div>
  );
}