import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Building2, ImagePlus, X } from "lucide-react";
import FaithTerminologySection from "@/components/organisation/FaithTerminologySection";

const PRESETS = {
  NG: { currency: "NGN", timezone: "Africa/Lagos", tax_regime: "vat", tax_label: "VAT" },
  IE: { currency: "EUR", timezone: "Europe/Dublin", tax_regime: "vat", tax_label: "VAT" },
  GB: { currency: "GBP", timezone: "Europe/London", tax_regime: "vat", tax_label: "VAT" },
  FR: { currency: "EUR", timezone: "Europe/Paris", tax_regime: "vat", tax_label: "TVA" },
  US: { currency: "USD", timezone: "America/New_York", tax_regime: "sales_tax", tax_label: "Sales Tax" },
};

export default function Onboarding() {
  const [form, setForm] = useState({
    name: "",
    type: sessionStorage.getItem("fads_signup_type") || "small_business",
    country: "NG",
    region: "",
    financial_year_start: 1,
    tax_id_value: "",
    default_tax_rate: 0,
    logo_url: "",
    faith_type: "church",
    faith_type_other: "",
    terminology: {},
  });
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("form");
  const [createdName, setCreatedName] = useState("");

  const preset = PRESETS[form.country];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Organisation name is required");
      return;
    }
    setLoading(true);
    try {
      const refCode = localStorage.getItem("fads_ref_code");
      await base44.functions.invoke("workspace", {
        action: "onboard",
        name: form.name.trim(),
        type: form.type,
        country: form.country,
        region: form.region.trim() || null,
        financial_year_start: Number(form.financial_year_start),
        default_tax_rate: Number(form.default_tax_rate) || 0,
        tax_id_value: form.tax_id_value.trim() || null,
        logo_url: form.logo_url || null,
        faith_type: form.type === "church" ? form.faith_type : null,
        faith_type_other: form.type === "church" && form.faith_type === "other" ? form.faith_type_other.trim() || null : null,
        terminology: form.type === "church" ? form.terminology : {},
        referral_code: refCode || null,
        ...preset,
      });
      if (refCode) localStorage.removeItem("fads_ref_code");
      sessionStorage.removeItem("fads_signup_type");
      setCreatedName(form.name.trim());
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-xl bg-brand-mint flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-brand-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Workspace ready</h1>
            <p className="text-muted-foreground text-sm mt-1">
              &ldquo;{createdName}&rdquo; is set up and ready to use.
            </p>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-brand-navy">Do you manage another organisation?</p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-12 bg-brand-navy hover:bg-brand-navy/90"
                onClick={() => { window.location.href = "/"; }}
              >
                No, continue to FADS
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => {
                  setForm((f) => ({ ...f, name: "", region: "", tax_id_value: "", logo_url: "" }));
                  setError("");
                  setStep("form");
                }}
              >
                Yes, add another organisation
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center">
          <Building2 className="w-6 h-6 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Set up your organisation</h1>
          <p className="text-muted-foreground text-sm">
            Your workspace starts in Demo mode. You can promote it to Live later.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-card rounded-2xl border border-border p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Organisation name</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Ltd" required />
        </div>

        <div className="space-y-2">
          <Label>Organisation logo (optional)</Label>
          {form.logo_url ? (
            <div className="flex items-center gap-3">
              <img src={form.logo_url} alt="Organisation logo" className="h-16 w-16 object-contain rounded-lg border border-border bg-muted/30 p-1" />
              <Button type="button" variant="outline" size="sm" onClick={() => set("logo_url", "")}>
                <X className="w-4 h-4" /> Remove
              </Button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-16 rounded-lg border border-dashed border-input cursor-pointer hover:bg-muted/30 text-sm text-muted-foreground">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Organisation type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small_business">Small Business</SelectItem>
                <SelectItem value="self_employed">Self-Employed / Sole Trader</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="church">Church</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={form.country} onValueChange={(v) => set("country", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NG">Nigeria (NGN)</SelectItem>
                <SelectItem value="IE">Ireland (EUR)</SelectItem>
                <SelectItem value="GB">United Kingdom (GBP)</SelectItem>
                <SelectItem value="FR">France (EUR)</SelectItem>
                <SelectItem value="US">United States (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {form.type === "church" && (
          <FaithTerminologySection
            values={{
              faith_type: form.faith_type,
              faith_type_other: form.faith_type_other,
              terminology: form.terminology,
            }}
            onChange={(v) => setForm((f) => ({ ...f, ...v }))}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="region">State / county / region</Label>
            <Input id="region" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate">Default {preset.tax_label} rate (%)</Label>
            <Input
              id="rate"
              type="number"
              min="0"
              step="0.01"
              value={form.default_tax_rate}
              onChange={(e) => set("default_tax_rate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxid">{preset.tax_label} number</Label>
            <Input id="taxid" value={form.tax_id_value} onChange={(e) => set("tax_id_value", e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="rounded-lg bg-brand-mint/60 border border-brand-mint p-3 text-sm text-muted-foreground">
          Currency <strong className="text-brand-navy">{preset.currency}</strong>, timezone{" "}
          <strong className="text-brand-navy">{preset.timezone}</strong>, tax regime{" "}
          <strong className="text-brand-navy">{preset.tax_label}</strong> — applied from the country preset.
        </div>

        <Button type="submit" className="w-full h-12 bg-brand-navy hover:bg-brand-navy/90" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating workspace…
            </>
          ) : (
            "Create workspace"
          )}
        </Button>
      </form>
    </div>
  );
}