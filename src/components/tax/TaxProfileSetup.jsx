import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import {
  getTaxPack,
  getTaxYears,
  getEntityTypes,
  getStates,
} from "@/lib/taxRules";

// Jurisdiction-aware Tax Profile form. Only asks questions relevant to the
// active country pack (states for Nigeria, entity-type-specific IDs, etc.).
export default function TaxProfileSetup({ org, profile, onSave, compact, country: countryOverride }) {
  const country = countryOverride || org?.country;
  const pack = getTaxPack(country);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tax_year: String(new Date().getFullYear()),
    entity_type: "",
    state_region: "",
    tax_ids: {},
    vat_registered: false,
    employer: false,
    filing_frequency: "",
    notes: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        tax_year: profile.tax_year || String(new Date().getFullYear()),
        entity_type: profile.entity_type || "",
        state_region: profile.state_region || "",
        tax_ids: profile.tax_ids || {},
        vat_registered: !!profile.vat_registered,
        employer: !!profile.employer,
        filing_frequency: profile.filing_frequency || "",
        notes: profile.notes || "",
      });
    }
  }, [profile]);

  if (!pack) return null;

  const setTaxId = (key, val) =>
    setForm((f) => ({ ...f, tax_ids: { ...f.tax_ids, [key]: val } }));

  const handleSave = async () => {
    if (!form.entity_type) {
      toast({ title: "Please select your entity / business type.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast({ title: "Tax profile saved." });
    } catch (e) {
      toast({ title: "Could not save tax profile.", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const entityTypes = getEntityTypes(country);
  const states = getStates(country);
  const years = getTaxYears();

  return (
    <div className={`bg-card rounded-2xl border border-border p-5 space-y-4 ${compact ? "" : ""}`}>
      <div>
        <h3 className="font-semibold text-brand-navy">Tax Profile</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {pack.flag} {pack.label} · only the details relevant to your jurisdiction.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tax Year</Label>
          <Select value={form.tax_year} onValueChange={(v) => setForm((f) => ({ ...f, tax_year: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Entity / Business Type</Label>
          <Select value={form.entity_type} onValueChange={(v) => setForm((f) => ({ ...f, entity_type: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {entityTypes.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pack.hasStates && (
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select value={form.state_region} onValueChange={(v) => setForm((f) => ({ ...f, state_region: v }))}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Filing Frequency</Label>
          <Select
            value={form.filing_frequency}
            onValueChange={(v) => setForm((f) => ({ ...f, filing_frequency: v }))}
          >
            <SelectTrigger className="h-11"><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              {pack.filingFrequencies.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jurisdiction-specific tax IDs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pack.taxIdFields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <Input
              className="h-11"
              value={form.tax_ids[f.key] || ""}
              onChange={(e) => setTaxId(f.key, e.target.value)}
              placeholder={f.label}
            />
          </div>
        ))}
      </div>

      {/* VAT registration toggle + number */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-brand-navy">VAT Registered</p>
            <p className="text-xs text-muted-foreground">Are you registered for {pack.authorityLabel} VAT?</p>
          </div>
          <Switch
            checked={form.vat_registered}
            onCheckedChange={(v) => setForm((f) => ({ ...f, vat_registered: v }))}
          />
        </div>
        {form.vat_registered && pack.vatIdField && (
          <div className="space-y-1.5">
            <Label>{pack.vatIdField.label}</Label>
            <Input
              className="h-11"
              value={form.tax_ids[pack.vatIdField.key] || ""}
              onChange={(e) => setTaxId(pack.vatIdField.key, e.target.value)}
              placeholder={pack.vatIdField.label}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-brand-navy">Employer (PAYE)</p>
            <p className="text-xs text-muted-foreground">Do you pay employees and operate PAYE?</p>
          </div>
          <Switch
            checked={form.employer}
            onCheckedChange={(v) => setForm((f) => ({ ...f, employer: v }))}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 min-h-touch">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {saving ? "Saving…" : "Save Tax Profile"}
      </Button>
    </div>
  );
}