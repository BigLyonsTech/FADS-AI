import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Save, CheckCircle2, Globe, Lock } from "lucide-react";
import { BILLING_CURRENCIES, formatPrice } from "@/lib/subscriptionPricing";

const ORG_TYPES = [
  { value: "small_business", label: "Small Business" },
  { value: "school", label: "School" },
  { value: "church", label: "Church" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "text-status-ok bg-status-ok/15" },
  { value: "coming_soon", label: "Coming soon", color: "text-muted-foreground bg-muted" },
  { value: "hidden", label: "Hidden", color: "text-status-bad bg-status-bad/15" },
];

export default function PricingTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState({});
  const [savedMsg, setSavedMsg] = useState({});
  const [inputs, setInputs] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("subscription", { action: "admin_get_plans" });
      const planList = res.data.plans || [];
      setPlans(planList);
      const next = {};
      for (const p of planList) {
        for (const cur of BILLING_CURRENCIES) {
          const entry = (p.regional_prices || {})[cur.code] || {};
          const key = `${p.org_type}_${cur.code}`;
          next[`${key}_label`] = entry.label || cur.region_label;
          next[`${key}_trial`] = entry.trial_price != null ? entry.trial_price : "";
          next[`${key}_trial_days`] = entry.trial_days || 5;
          next[`${key}_monthly`] = entry.monthly_price != null ? entry.monthly_price : "";
          next[`${key}_status`] = entry.status || "coming_soon";
        }
      }
      setInputs(next);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (orgType, currency) => {
    const key = `${orgType}_${currency}`;
    const payload = {
      org_type: orgType,
      currency,
      label: inputs[`${key}_label`],
      trial_price: inputs[`${key}_trial`],
      trial_days: inputs[`${key}_trial_days`],
      monthly_price: inputs[`${key}_monthly`],
      status: inputs[`${key}_status`],
    };
    setSaving((s) => ({ ...s, [key]: true }));
    setSavedMsg((s) => ({ ...s, [key]: "" }));
    try {
      await base44.functions.invoke("subscription", {
        action: "admin_set_regional_price",
        ...payload,
      });
      setSavedMsg((s) => ({ ...s, [key]: "Saved!" }));
      setTimeout(() => setSavedMsg((s) => ({ ...s, [key]: "" })), 3000);
      await load();
    } catch (e) {
      setSavedMsg((s) => ({ ...s, [key]: e.response?.data?.error || e.message }));
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-teal" /></div>;
  }

  if (error) {
    return <div className="bg-destructive/10 rounded-lg p-3 text-sm text-destructive">{error}</div>;
  }

  const exchangeRateConnected = plans.some((p) => p.exchange_rate_service_connected);

  return (
    <div className="space-y-4">
      <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-4 flex items-start gap-3">
        <Globe className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-brand-teal">International regional pricing</p>
          <p className="text-muted-foreground mt-1">
            Configure the introductory price, introductory duration, monthly price and status for each
            billing currency. Active currencies are shown to users; coming-soon currencies display a
            "Coming soon" badge; hidden currencies are invisible. Checkout remains disabled until Stripe
            is connected — these prices are configuration only.
          </p>
        </div>
      </div>

      {ORG_TYPES.map((ot) => {
        const plan = plans.find((p) => p.org_type === ot.value);
        return (
          <div key={ot.value} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-brand-mint/30">
              <h3 className="font-semibold text-brand-navy">{ot.label}</h3>
            </div>
            <div className="divide-y divide-border">
              {BILLING_CURRENCIES.map((cur) => {
                const key = `${ot.value}_${cur.code}`;
                const entry = (plan?.regional_prices || {})[cur.code] || {};
                const status = entry.status || "coming_soon";
                const statusCfg = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[1];
                const updated = entry.updated_date ? new Date(entry.updated_date) : null;
                return (
                  <div key={cur.code} className="p-4 space-y-3">
                    {/* Header row: currency + status badge + last updated */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">{cur.symbol}</span>
                        <div>
                          <p className="font-medium text-brand-navy text-sm">{cur.code} — {cur.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Last updated: {updated ? updated.toLocaleString() : "Never"}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Controls grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Regional group</Label>
                        <Input
                          value={inputs[`${key}_label`] ?? ""}
                          onChange={(e) => setInputs((p) => ({ ...p, [`${key}_label`]: e.target.value }))}
                          className="h-9"
                          placeholder={cur.region_label}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <Select
                          value={inputs[`${key}_status`] || "coming_soon"}
                          onValueChange={(v) => setInputs((p) => ({ ...p, [`${key}_status`]: v }))}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Introductory price ({cur.code})</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={inputs[`${key}_trial`] ?? ""}
                          onChange={(e) => setInputs((p) => ({ ...p, [`${key}_trial`]: e.target.value }))}
                          className="h-9"
                          placeholder="—"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Introductory duration (days)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          step="1"
                          value={inputs[`${key}_trial_days`] ?? 5}
                          onChange={(e) => setInputs((p) => ({ ...p, [`${key}_trial_days`]: e.target.value }))}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Monthly price ({cur.code})</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={inputs[`${key}_monthly`] ?? ""}
                          onChange={(e) => setInputs((p) => ({ ...p, [`${key}_monthly`]: e.target.value }))}
                          className="h-9"
                          placeholder="0"
                        />
                      </div>

                      {/* Indicative converted value — disabled until exchange-rate service connected */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Indicative converted value
                        </Label>
                        <Input
                          disabled
                          value=""
                          placeholder={exchangeRateConnected ? "Enter converted value" : "Disabled — no rate service"}
                          className="h-9 bg-muted/50"
                        />
                        <p className="text-xs text-muted-foreground">
                          {exchangeRateConnected
                            ? "Add a converted reference value when a rate service is connected."
                            : "No invented exchange rates. Disabled until a verified rate service is connected."}
                        </p>
                      </div>
                    </div>

                    {/* Save button + feedback */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-muted-foreground">
                        {entry.monthly_price > 0 && entry.status === "active"
                          ? `Live: ${formatPrice(entry.trial_price || 0, cur.code)} for ${entry.trial_days || 5} days, then ${formatPrice(entry.monthly_price, cur.code)}/month`
                          : "Not yet activated for users"}
                      </div>
                      <div className="flex items-center gap-2">
                        {savedMsg[key] && (
                          <p className={`text-xs ${savedMsg[key] === "Saved!" ? "text-status-ok" : "text-destructive"} flex items-center gap-1`}>
                            {savedMsg[key] === "Saved!" && <CheckCircle2 className="w-3 h-3" />}
                            {savedMsg[key]}
                          </p>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSave(ot.value, cur.code)}
                          disabled={saving[key]}
                        >
                          {saving[key] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}