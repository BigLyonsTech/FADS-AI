import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { Loader2, ImagePlus, X } from "lucide-react";
import FaithTerminologySection from "@/components/organisation/FaithTerminologySection";

const PRESETS = {
  NG: { currency: "NGN", tax_label: "VAT" },
  IE: { currency: "EUR", tax_label: "VAT" },
  GB: { currency: "GBP", tax_label: "VAT" },
  FR: { currency: "EUR", tax_label: "TVA" },
  US: { currency: "USD", tax_label: "Sales Tax" },
};

// Owner-only dialog for editing organisation display/contact/tax details.
// Structural fields (type, country, currency, data_mode) are locked — those
// are set at onboarding and cannot be changed here.
export default function OrganisationEditDialog({ open, onClose, org, onSaved }) {
  const { reload } = useWorkspace();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !org) return;
    setError("");
    setForm({
      name: org.name || "",
      address: org.address || "",
      phone: org.phone || "",
      email: org.email || "",
      logo_url: org.logo_url || "",
      region: org.region || "",
      financial_year_start: org.financial_year_start || 1,
      tax_label: org.tax_label || PRESETS[org.country]?.tax_label || "Tax",
      default_tax_rate: org.default_tax_rate ?? 0,
      tax_id_label: org.tax_id_label || "",
      tax_id_value: org.tax_id_value || "",
      faith_type: org.faith_type || "church",
      faith_type_other: org.faith_type_other || "",
      terminology: org.terminology || {},
    });
  }, [open, org]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onLogoSelected = async (file) => {
    if (!file) return;
    try {
      setLogoUploading(true);
      setError("");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logo_url", file_url);
    } catch (err) {
      setError(err.message || "Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!form.name?.trim()) {
      setError("Organisation name is required");
      return;
    }
    setBusy(true);
    try {
      await base44.functions.invoke("workspace", {
        action: "update_organisation",
        organisation_id: org.id,
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        logo_url: form.logo_url || null,
        region: form.region.trim() || null,
        financial_year_start: Number(form.financial_year_start) || 1,
        tax_label: form.tax_label || "Tax",
        default_tax_rate: Number(form.default_tax_rate) || 0,
        tax_id_label: form.tax_id_label.trim() || null,
        tax_id_value: form.tax_id_value.trim() || null,
        faith_type: org.type === "church" ? form.faith_type : null,
        faith_type_other: org.type === "church" && form.faith_type === "other" ? form.faith_type_other.trim() || null : null,
        terminology: org.type === "church" ? form.terminology : {},
      });
      await reload();
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (!org) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit organisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <div>
            <Label>Organisation name</Label>
            <Input className="h-11" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div>
            <Label>Organisation logo</Label>
            {form.logo_url ? (
              <div className="flex items-center gap-3">
                <img src={form.logo_url} alt="Logo" className="h-14 w-14 object-contain rounded-lg border border-border bg-muted/30 p-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => set("logo_url", "")}>
                  <X className="w-4 h-4" /> Remove
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-14 rounded-lg border border-dashed border-input cursor-pointer hover:bg-muted/30 text-sm text-muted-foreground">
                <ImagePlus className="w-4 h-4" />
                {logoUploading ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoSelected(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          <div>
            <Label>Address</Label>
            <Textarea
              rows={2}
              value={form.address || ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Postal address shown on invoices and receipts"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input className="h-11" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="h-11" type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>State / county / region</Label>
            <Input className="h-11" value={form.region || ""} onChange={(e) => set("region", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Financial year starts</Label>
              <Select
                value={String(form.financial_year_start)}
                onValueChange={(v) => set("financial_year_start", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>Month {m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax label</Label>
              <Input className="h-11" value={form.tax_label || ""} onChange={(e) => set("tax_label", e.target.value)} placeholder="VAT, Sales Tax…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Default tax rate (%)</Label>
              <Input
                className="h-11"
                type="number"
                min="0"
                step="0.01"
                value={form.default_tax_rate ?? 0}
                onChange={(e) => set("default_tax_rate", e.target.value)}
              />
            </div>
            <div>
              <Label>Tax number</Label>
              <Input className="h-11" value={form.tax_id_value || ""} onChange={(e) => set("tax_id_value", e.target.value)} />
            </div>
          </div>

          {org.type === "church" && (
            <FaithTerminologySection
              values={{
                faith_type: form.faith_type,
                faith_type_other: form.faith_type_other,
                terminology: form.terminology,
              }}
              onChange={(v) => setForm((f) => ({ ...f, ...v }))}
            />
          )}

          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            Organisation type, country and currency are locked after creation.
            Each organisation keeps its own contacts, employees, finance records
            and invoices — data is never mixed.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="h-11" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}