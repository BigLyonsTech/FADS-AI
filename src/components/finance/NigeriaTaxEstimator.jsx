import React, { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { useWorkspace } from "@/lib/useWorkspace";
import { useTax } from "@/lib/useTax";
import { formatCurrency } from "@/lib/currencyFormat";
import {
  computeNigeriaEstimate, getNigeriaTaxPeriods, NIGERIA_TAX_DISCLAIMER,
  NIGERIA_2026_ESTIMATE_DISCLAIMER,
} from "@/lib/nigeriaTaxRules";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowDownLeft, ArrowUpRight, CheckCircle2, Info, Loader2,
  ClipboardCheck, ArrowLeft,
} from "lucide-react";

const STEPS = ["Period", "Review", "Result", "Save"];

// Estimate My Tax — a guided estimator for Nigerian organisations that uses
// the organisation's existing Finance records. Workflow: choose period →
// review income/expenses → calculate → explain → save. Never invents rates.
export default function NigeriaTaxEstimator({ open, onClose }) {
  const { activeOrg } = useWorkspace();
  const { profile, finance, saveProfile } = useTax("NG");
  const { toast } = useToast();
  const cur = activeOrg?.currency;
  const periods = useMemo(() => getNigeriaTaxPeriods(finance.transactions), [finance.transactions]);
  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState(profile?.tax_year || String(new Date().getFullYear()));
  const [rentPaid, setRentPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const estimate = useMemo(
    () =>
      computeNigeriaEstimate({
        transactions: finance.transactions,
        categories: finance.categories,
        profile: { ...profile, _currency: cur },
        periodKey: period,
        rentPaid: Number(rentPaid) || 0,
      }),
    [finance.transactions, finance.categories, profile, cur, period, rentPaid]
  );

  const reset = () => { setStep(0); setSaved(false); setRentPaid(""); };
  const close = () => { reset(); onClose(); };

  const buildSummary = () =>
    [
      `NIGERIA TAX ESTIMATE — ${activeOrg?.name || ""}`,
      `Tax year: ${period} (Nigeria — 2026 Tax Rules)`,
      `Annual income: ${formatCurrency(estimate.income, cur)} (${estimate.incomeCount} records)`,
      `Less business expenses: ${formatCurrency(estimate.expenses, cur)} (${estimate.expenseCount} records)`,
      estimate.rentRelief > 0 ? `Less rent relief: ${formatCurrency(estimate.rentRelief, cur)}` : null,
      `Estimated chargeable income: ${formatCurrency(estimate.chargeableIncome, cur)}`,
      estimate.estimatedTaxStatus === "available"
        ? `Estimated Personal Income Tax: ${formatCurrency(estimate.estimatedTax, cur)} (≈ ${formatCurrency(estimate.monthlyEquivalent, cur)}/month)`
        : `Estimated tax: ${estimate.estimatedTaxNote}`,
      estimate.estimatedTaxStatus === "available"
        ? estimate.bandBreakdown.filter((b) => b.taxable > 0).map((b) =>
            `  ${(b.rate * 100).toFixed(0)}% on ${formatCurrency(b.taxable, cur)} = ${formatCurrency(b.tax, cur)}`
          ).join("\n")
        : null,
      `VAT net: ${formatCurrency(estimate.vatNet, cur)}`,
      `Readiness: ${estimate.readiness}%`,
      NIGERIA_2026_ESTIMATE_DISCLAIMER,
      `Generated: ${new Date().toLocaleString()}`,
    ].filter(Boolean).join("\n");

  const handleSave = async () => {
    setSaving(true);
    try {
      const summary = buildSummary();
      if (profile?.id) {
        const existing = profile.notes ? `${profile.notes}\n\n---\n` : "";
        await saveProfile({ notes: existing + summary });
        toast({ title: "Estimate saved", description: "Saved to your Nigeria Tax Profile notes." });
      } else {
        try { await navigator.clipboard?.writeText(summary); } catch {}
        toast({
          title: "Estimate copied",
          description: "No Tax Profile yet — summary copied to clipboard. Set up a Nigeria Tax Profile to save estimates here.",
        });
      }
      setSaved(true);
    } catch (e) {
      toast({ title: "Could not save estimate", description: e?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🧮 Estimate My Tax (Nigeria)</DialogTitle>
          <DialogDescription>Uses your existing Finance records — no re-entry needed.</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-teal" : "bg-muted"}`} />
              <p className={`text-[10px] mt-1 ${i === step ? "text-brand-navy font-medium" : "text-muted-foreground"}`}>{s}</p>
            </div>
          ))}
        </div>

        {/* Step 0: Period */}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose the tax period you want to estimate.</p>
            <ResponsiveSelect
              value={period}
              onValueChange={setPeriod}
              options={periods.map((p) => ({ value: p.key, label: p.label }))}
              triggerClassName="h-11 w-full"
            />
            <Button className="w-full h-11" onClick={() => setStep(1)}>Continue</Button>
          </div>
        )}

        {/* Step 1: Review */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Here's the income and expenses FADS has recorded for {period}.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-3">
                <ArrowDownLeft className="w-4 h-4 text-status-ok" />
                <p className="text-xs text-muted-foreground mt-1">Income</p>
                <p className="font-semibold text-brand-navy">{formatCurrency(estimate.income, cur)}</p>
                <p className="text-xs text-muted-foreground">{estimate.incomeCount} records</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-3">
                <ArrowUpRight className="w-4 h-4 text-status-bad" />
                <p className="text-xs text-muted-foreground mt-1">Expenses</p>
                <p className="font-semibold text-brand-navy">{formatCurrency(estimate.expenses, cur)}</p>
                <p className="text-xs text-muted-foreground">{estimate.expenseCount} records</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {estimate.transactionCount} cleared transaction{estimate.transactionCount === 1 ? "" : "s"} in {period}. Review your records in Finance before estimating.
            </p>
            <div className="bg-card rounded-xl border border-border p-3 space-y-1.5">
              <Label htmlFor="rent-paid" className="text-xs text-muted-foreground">
                Annual rent paid (optional)
              </Label>
              <Input
                id="rent-paid"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 600000"
                value={rentPaid}
                onChange={(e) => setRentPaid(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Rent relief = lower of 20% of annual rent or ₦500,000. Only enter rent you actually paid.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button className="h-11 flex-1" onClick={() => setStep(2)}>Calculate estimate</Button>
            </div>
          </div>
        )}

        {/* Step 2: Result + explain */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" /> Nigeria — 2026 Tax Rules
            </div>
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
              <Row label="Annual income" value={formatCurrency(estimate.income, cur)} />
              <Row label="Less business expenses" value={`− ${formatCurrency(estimate.expenses, cur)}`} />
              {estimate.rentRelief > 0 && (
                <Row label="Less rent relief" value={`− ${formatCurrency(estimate.rentRelief, cur)}`} />
              )}
              <Row label="Estimated chargeable income" value={formatCurrency(estimate.chargeableIncome, cur)} bold />
            </div>

            {estimate.estimatedTaxStatus === "available" ? (
              <>
                <div className="rounded-xl border border-brand-teal/30 bg-brand-mint/40 p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-status-ok shrink-0 mt-0.5" />
                    <div className="text-sm min-w-0">
                      <p className="font-medium text-brand-navy">Estimated Personal Income Tax</p>
                      <p className="text-lg font-bold text-brand-navy">{formatCurrency(estimate.estimatedTax, cur)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ≈ {formatCurrency(estimate.monthlyEquivalent, cur)} per month
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-3">
                  <p className="text-xs font-medium text-brand-navy mb-2">Tax calculation by band</p>
                  <div className="space-y-1">
                    {estimate.bandBreakdown.filter((b) => b.taxable > 0).map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatCurrency(b.from, cur)} – {b.to === Infinity ? "above" : formatCurrency(b.to, cur)} ({(b.rate * 100).toFixed(0)}%)
                        </span>
                        <span className="font-medium text-brand-navy">{formatCurrency(b.tax, cur)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-status-warn/30 bg-status-warn/10 p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-status-warn shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-navy">{estimate.estimatedTaxNote}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">{NIGERIA_2026_ESTIMATE_DISCLAIMER}</p>

            <div className="flex gap-2">
              <Button variant="outline" className="h-11" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button className="h-11 flex-1" onClick={() => setStep(3)}>Continue to save</Button>
            </div>
          </div>
        )}

        {/* Step 3: Save */}
        {step === 3 && (
          <div className="space-y-3">
            {saved ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-10 h-10 text-status-ok mx-auto" />
                <p className="font-medium text-brand-navy">Estimate ready</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.id ? "Saved to your Nigeria Tax Profile notes." : "Summary copied to clipboard."}
                </p>
                <Button className="h-11 w-full" onClick={close}>Done</Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Save a snapshot of this estimate so you can review it later.
                </p>
                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">{NIGERIA_TAX_DISCLAIMER}</div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-11" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /> Back</Button>
                  <Button className="h-11 flex-1" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                    {saving ? "Saving…" : "Save estimate"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-medium text-brand-navy" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm ${bold ? "text-lg font-bold text-brand-navy" : "font-semibold text-brand-navy"}`}>{value}</span>
    </div>
  );
}