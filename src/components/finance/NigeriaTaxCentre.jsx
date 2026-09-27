import React, { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { useWorkspace } from "@/lib/useWorkspace";
import { useTax } from "@/lib/useTax";
import { formatCurrency } from "@/lib/currencyFormat";
import {
  computeNigeriaEstimate, getNigeriaTaxPeriods, nigeriaEntityTypeLabel,
  nigeriaObligations, NIGERIA_TAX_DISCLAIMER,
} from "@/lib/nigeriaTaxRules";
import {
  ArrowDownLeft, ArrowUpRight, Calculator, FileText,
  CheckCircle2, Circle, Info,
} from "lucide-react";

// Nigeria Tax Centre — a focused tax overview for Nigerian organisations,
// shown as a dialog from the Finance dashboard. Uses the organisation's
// existing Finance records only; never invents tax rates.
export default function NigeriaTaxCentre({ open, onClose, onEstimate }) {
  const { activeOrg } = useWorkspace();
  const { profile, finance } = useTax("NG");
  const cur = activeOrg?.currency;
  const periods = useMemo(() => getNigeriaTaxPeriods(finance.transactions), [finance.transactions]);
  const [period, setPeriod] = useState(profile?.tax_year || String(new Date().getFullYear()));

  const estimate = useMemo(
    () =>
      computeNigeriaEstimate({
        transactions: finance.transactions,
        categories: finance.categories,
        profile: { ...profile, _currency: cur },
        periodKey: period,
      }),
    [finance.transactions, finance.categories, profile, cur, period]
  );

  const obligations = profile ? nigeriaObligations(profile.entity_type) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🇳🇬 Nigeria Tax Centre</DialogTitle>
          <DialogDescription>Tax overview for {activeOrg?.name} · {cur}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period + entity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tax period / year</label>
              <ResponsiveSelect
                value={period}
                onValueChange={setPeriod}
                options={periods.map((p) => ({ value: p.key, label: p.label }))}
                triggerClassName="h-10 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entity type</label>
              <p className="text-sm font-medium text-brand-navy h-10 flex items-center">
                {profile ? nigeriaEntityTypeLabel(profile.entity_type) : "Not set up"}
              </p>
            </div>
          </div>

          {/* Readiness + estimate CTA */}
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tax readiness</p>
              <p className={`text-2xl font-bold ${estimate.readiness >= 80 ? "text-status-ok" : estimate.readiness >= 50 ? "text-status-warn" : "text-status-bad"}`}>
                {estimate.readiness}%
              </p>
            </div>
            <Button variant="outline" className="h-10 gap-1.5" onClick={onEstimate}>
              <Calculator className="w-4 h-4" /> Estimate My Tax
            </Button>
          </div>

          {/* Income / expense summary */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard icon={ArrowDownLeft} label="Income" value={formatCurrency(estimate.income, cur)} tone="ok" sub={`${estimate.incomeCount} records`} />
            <SummaryCard icon={ArrowUpRight} label="Expenses" value={formatCurrency(estimate.expenses, cur)} tone="bad" sub={`${estimate.expenseCount} records`} />
          </div>

          {/* Estimated taxable position */}
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-brand-navy">Estimated taxable position</span>
            <span className="text-lg font-bold text-brand-navy">{formatCurrency(estimate.taxablePosition, cur)}</span>
          </div>

          {/* Estimated tax */}
          <div className={`rounded-xl border p-4 ${estimate.estimatedTaxStatus === "available" ? "bg-brand-mint/40 border-brand-teal/30" : "bg-status-warn/10 border-status-warn/30"}`}>
            <div className="flex items-start gap-2">
              {estimate.estimatedTaxStatus === "available" ? (
                <CheckCircle2 className="w-5 h-5 text-status-ok shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-status-warn shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-navy">Estimated tax</p>
                {estimate.estimatedTaxStatus === "available" ? (
                  <p className="text-xl font-bold text-brand-navy">{formatCurrency(estimate.estimatedTax, cur)}</p>
                ) : (
                  <p className="text-sm text-brand-navy mt-0.5">{estimate.estimatedTaxNote}</p>
                )}
              </div>
            </div>
          </div>

          {/* VAT summary if registered */}
          {profile?.vat_registered && (estimate.vatCollected > 0 || estimate.vatPaid > 0) && (
            <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
              <p className="font-medium text-brand-navy">VAT summary</p>
              <Row label="VAT collected (sales)" value={formatCurrency(estimate.vatCollected, cur)} />
              <Row label="VAT paid (purchases)" value={formatCurrency(estimate.vatPaid, cur)} />
              <Row label="Net VAT" value={formatCurrency(estimate.vatNet, cur)} bold />
            </div>
          )}

          {/* Obligations */}
          {obligations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-brand-navy mb-2">Tax obligations</p>
              <div className="space-y-1.5">
                {obligations.map((o) => (
                  <div key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 text-brand-teal shrink-0" /> {o}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Records needed */}
          <div>
            <p className="text-sm font-medium text-brand-navy mb-2">Records / documents needed</p>
            <div className="space-y-1.5">
              {estimate.recordsNeeded.map((r) => (
                <div key={r.key} className="flex items-start gap-2 text-sm">
                  {r.done ? (
                    <CheckCircle2 className="w-4 h-4 text-status-ok shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${r.done ? "text-brand-navy" : "text-muted-foreground"}`}>{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">{NIGERIA_TAX_DISCLAIMER}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ icon: Icon, label, value, tone, sub }) {
  const toneClass = tone === "ok" ? "text-status-ok" : tone === "bad" ? "text-status-bad" : "text-brand-navy";
  return (
    <div className="bg-card rounded-xl border border-border p-3">
      <Icon className={`w-4 h-4 ${toneClass}`} />
      <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
      <p className="text-sm font-semibold text-brand-navy break-words">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-medium text-brand-navy" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm ${bold ? "text-base font-bold text-brand-navy" : "font-semibold text-brand-navy"}`}>{value}</span>
    </div>
  );
}