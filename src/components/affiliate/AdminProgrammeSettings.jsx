import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AdminProgrammeSettings({ settings, onSaved }) {
  const [form, setForm] = useState({
    default_commission_type: settings?.default_commission_type || "percentage",
    default_commission_value: settings?.default_commission_value ?? 20,
    default_commission_frequency: settings?.default_commission_frequency || "recurring",
    default_payout_currency: settings?.default_payout_currency || "EUR",
    min_payout_amount: settings?.min_payout_amount ?? 50,
    is_programme_active: settings?.is_programme_active ?? true,
    terms_version: settings?.terms_version || "1.0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("affiliate", { action: "admin_update_settings", ...form });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <h3 className="font-semibold text-brand-navy">Programme Settings</h3>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Commission type</Label>
          <Select value={form.default_commission_type} onValueChange={(v) => set("default_commission_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed_amount">Fixed amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="val">
            Default commission value {form.default_commission_type === "percentage" ? "(%)" : "(amount)"}
          </Label>
          <Input
            id="val" type="number" min="0" step="0.01"
            value={form.default_commission_value}
            onChange={(e) => set("default_commission_value", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Commission frequency</Label>
          <Select value={form.default_commission_frequency} onValueChange={(v) => set("default_commission_frequency", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recurring">Recurring</SelectItem>
              <SelectItem value="one_time">One-time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Payout currency</Label>
          <Select value={form.default_payout_currency} onValueChange={(v) => set("default_payout_currency", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["NGN", "EUR", "GBP", "USD"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="min">Minimum payout amount</Label>
          <Input
            id="min" type="number" min="0" step="0.01"
            value={form.min_payout_amount}
            onChange={(e) => set("min_payout_amount", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="terms">Terms version</Label>
          <Input id="terms" value={form.terms_version} onChange={(e) => set("terms_version", e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_programme_active}
          onChange={(e) => set("is_programme_active", e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <span className="text-sm text-brand-navy">Programme is active (accepting applications)</span>
      </label>

      <Button onClick={save} disabled={loading} className="w-full sm:w-auto bg-brand-navy hover:bg-brand-navy/90 min-h-touch">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}