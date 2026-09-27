import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Send, CheckCircle2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

const COUNTRIES = [
  { value: "NG", label: "Nigeria" },
  { value: "IE", label: "Ireland" },
  { value: "GB", label: "United Kingdom" },
  { value: "FR", label: "France" },
  { value: "US", label: "United States" },
];

const CURRENCIES = ["NGN", "EUR", "GBP", "USD"];

export default function AffiliateApplyForm({ settings, onApplied }) {
  const [form, setForm] = useState({
    country: settings?.default_payout_currency === "EUR" ? "IE" : "NG",
    payout_currency: settings?.default_payout_currency || "EUR",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null); // created profile on success

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("affiliate", {
        action: "apply",
        country: form.country,
        payout_currency: form.payout_currency,
        notes: form.notes || null,
      });
      setSubmitted(res?.data?.profile || res?.profile || { status: "pending" });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Application failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-status-ok/15 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-status-ok" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Application Submitted!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You're now registered as an affiliate. Your application is being reviewed.
          </p>
        </div>
        <div className="bg-brand-mint/40 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-status-warn" />
            <span>Status: <strong className="text-brand-navy">Pending Review</strong></span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Once approved, your unique referral link and code will appear here so you can start sharing and earning.
          </p>
        </div>
        <Button onClick={() => onApplied()} className="w-full h-12 bg-brand-navy hover:bg-brand-navy/90 min-h-touch">
          Continue to Affiliate Centre
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Become an Affiliate</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Earn {settings?.default_commission_value || 20}
          {settings?.default_commission_type === "percentage" ? "%" : ""}{" "}
          {settings?.default_commission_frequency === "recurring" ? "recurring" : "one-time"}{" "}
          commission for every organisation you refer to FADS AI.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={form.country} onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Payout currency</Label>
          <Select value={form.payout_currency} onValueChange={(v) => setForm((f) => ({ ...f, payout_currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Why do you want to join? (optional)</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Tell us about your audience or how you plan to promote FADS AI"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full h-12 bg-brand-navy hover:bg-brand-navy/90 min-h-touch" disabled={loading}>
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
        ) : (
          <><Send className="w-4 h-4 mr-2" /> Submit Application</>
        )}
      </Button>
    </form>
  );
}