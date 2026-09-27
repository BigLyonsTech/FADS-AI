import React from "react";
import { Zap, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/currencyFormat";
import ExplainSimply from "@/components/intelligence/ExplainSimply";
import FixThisWithFads from "@/components/intelligence/FixThisWithFads";

// Nigeria Operating / Energy Cost Insight — shown only for Nigerian
// organisations. Derives recorded energy costs (electricity, generator fuel,
// diesel, solar, etc.) from existing expense categories/descriptions. No
// separate module. Scenario estimates are clearly labelled.
export default function EnergyCard({ energy, currency }) {
  if (!energy?.applicable) return null;
  if (!energy?.hasData) {
    return (
      <div className="bg-card rounded-2xl border border-brand-teal/15 p-5">
        <Header />
        <p className="text-sm text-muted-foreground mt-3">
          No energy-related expenses recorded this month. Categorise electricity, fuel, diesel or generator costs to see your energy insight.
        </p>
      </div>
    );
  }
  const changeUp = energy.changePct !== null && energy.changePct > 0;
  const changeDown = energy.changePct !== null && energy.changePct < 0;
  return (
    <div className="bg-card rounded-2xl border border-brand-teal/15 p-5 space-y-4">
      <Header />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">True recorded energy cost this month</p>
          <p className="text-sm font-semibold text-brand-navy break-words">{formatCurrency(energy.monthCost, currency)}</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">Share of operating expenses</p>
          <p className="text-sm font-semibold text-brand-navy">{(energy.shareOfExpenses * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">Change from last month</p>
          <p className={`text-sm font-semibold flex items-center gap-1 ${changeUp ? "text-status-bad" : changeDown ? "text-status-ok" : "text-brand-navy"}`}>
            {changeUp && <TrendingUp className="w-3 h-3" />}
            {changeDown && <TrendingDown className="w-3 h-3" />}
            {energy.changePct !== null ? `${energy.changePct > 0 ? "+" : ""}${energy.changePct.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>
      {energy.topCategories.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Energy cost breakdown this month</p>
          {energy.topCategories.map(([name, amt]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="text-brand-navy truncate">{name}</span>
              <span className="text-brand-navy font-medium shrink-0 ml-2">{formatCurrency(amt, currency)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-xl p-3">
        <p className="text-xs font-medium text-brand-teal">Scenario estimate</p>
        <p className="text-sm text-brand-navy mt-0.5">
          If energy usage were reduced by 15%, based on your recorded average this could reduce monthly costs by approximately{" "}
          <strong>{formatCurrency(energy.scenarioSavings, currency)}</strong>.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ExplainSimply topic="Energy and operating costs" figure={formatCurrency(energy.monthCost, currency)} />
        <div className="flex-1">
          <FixThisWithFads to="/finance/transactions" label="Review energy expenses" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Based on the records currently available in FADS. Scenario figures are estimates, not guaranteed savings.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Zap className="w-5 h-5 text-brand-teal" />
      <h2 className="font-semibold text-brand-navy">Operating / Energy Cost Insight</h2>
    </div>
  );
}