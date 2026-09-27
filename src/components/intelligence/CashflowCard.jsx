import React, { useState } from "react";
import { Droplets, ArrowDownLeft, ArrowUpRight, AlertTriangle, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/currencyFormat";
import ExplainSimply from "@/components/intelligence/ExplainSimply";
import FixThisWithFads from "@/components/intelligence/FixThisWithFads";

// Cash-flow & Survival Predictor — redesigned as a compact FADS Cash-flow
// Player with the same Y2K digital language as the Business Health Player.
// All calculations, projections, and recommendations are unchanged; only the
// presentation is new.

const STATUS_STYLE = {
  OK: { label: "OK", cls: "text-status-ok bg-status-ok/10" },
  STABLE: { label: "Stable", cls: "text-status-ok bg-status-ok/10" },
  WATCH: { label: "Watch", cls: "text-status-warn bg-status-warn/10" },
  CAUTION: { label: "Caution", cls: "text-status-warn bg-status-warn/10" },
  TIGHT: { label: "Tight", cls: "text-status-bad bg-status-bad/10" },
};

function Metric({ label, value, icon: Icon, tone, emphasis }) {
  const cls = tone === "bad" ? "text-status-bad" : tone === "ok" ? "text-status-ok" : "text-white";
  return (
    <div
      className={`rounded-xl p-2.5 ${
        emphasis ? "bg-brand-teal/10 border border-brand-teal/25" : "bg-white/5"
      } min-w-0`}
    >
      <Icon className="w-3.5 h-3.5 text-brand-teal" />
      <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{label}</p>
      <p className={`font-semibold ${cls} break-words ${emphasis ? "text-base" : "text-sm"} font-mono`}>
        {value}
      </p>
    </div>
  );
}

export default function CashflowCard({ cashflow, currency }) {
  const [showMath, setShowMath] = useState(false);

  if (!cashflow?.hasData) {
    return (
      <div className="bg-brand-navy rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="w-5 h-5 text-brand-teal" />
          <h2 className="font-semibold">Cash-flow Player</h2>
        </div>
        <p className="text-sm text-white/60">
          Not enough recorded data to project cash flow. Record income and expenses to see a cash-flow
          outlook.
        </p>
      </div>
    );
  }

  const s = STATUS_STYLE[cashflow.status] || STATUS_STYLE.STABLE;

  return (
    <div className="bg-brand-navy rounded-2xl p-5 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Droplets className="w-5 h-5 text-brand-teal shrink-0" />
          <h2 className="font-semibold text-white tracking-wide truncate">FADS CASH-FLOW PLAYER</h2>
        </div>
        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${s.cls}`}>
          {s.label}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Cash now" value={formatCurrency(cashflow.cashNow, currency)} icon={Droplets} />
        <Metric label="Expected in" value={formatCurrency(cashflow.expectedIn, currency)} icon={ArrowDownLeft} tone="ok" />
        <Metric label="Expected out" value={formatCurrency(cashflow.expectedOut, currency)} icon={ArrowUpRight} tone="bad" />
        <Metric
          label="30-day estimate"
          value={formatCurrency(cashflow.projected30, currency)}
          icon={Droplets}
          tone={cashflow.projected30 < 0 ? "bad" : "ok"}
          emphasis
        />
      </div>

      {/* Equation */}
      <div className="bg-white/5 rounded-xl p-3">
        <div className="font-mono text-sm space-y-0.5">
          <div className="flex justify-between text-white/80">
            <span>Cash now</span>
            <span className="break-all text-right">{formatCurrency(cashflow.cashNow, currency)}</span>
          </div>
          <div className="flex justify-between text-status-ok">
            <span>+ Expected in</span>
            <span className="break-all text-right">{formatCurrency(cashflow.expectedIn, currency)}</span>
          </div>
          <div className="flex justify-between text-status-bad">
            <span>− Expected out</span>
            <span className="break-all text-right">{formatCurrency(cashflow.expectedOut, currency)}</span>
          </div>
          <div className="border-t border-white/15 my-1" />
          <div className="flex justify-between text-white font-semibold">
            <span>= 30-day estimate</span>
            <span className="break-all text-right">{formatCurrency(cashflow.projected30, currency)}</span>
          </div>
        </div>
        <p className="text-[11px] text-white/40 mt-2">Estimated balance in 30 days</p>
      </div>

      {/* How did FADS work this out? */}
      <button
        onClick={() => setShowMath(!showMath)}
        className="text-xs font-medium text-brand-teal hover:underline flex items-center gap-1 min-h-touch"
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${showMath ? "rotate-180" : ""}`}
        />
        How did FADS work this out?
      </button>

      {showMath && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
          <p className="text-xs text-white/70 leading-relaxed">
            <strong className="text-white">Cash now:</strong> Based on the current balance available in your
            FADS records.
          </p>
          <p className="text-xs text-white/70 leading-relaxed">
            <strong className="text-white">Expected in:</strong> Based on recorded invoices/incoming payments
            due.
          </p>
          <p className="text-xs text-white/70 leading-relaxed">
            <strong className="text-white">Expected out:</strong> Based on recorded upcoming/recurring
            business costs available to FADS.
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed pt-1 border-t border-white/10">
            This is a forecast, not a guaranteed future bank balance. Keep your income, expenses and invoices
            up to date so FADS can give you a better estimate.
          </p>
        </div>
      )}

      {/* Days-to-tight warning */}
      {cashflow.daysToTight !== null && cashflow.netBurnPerDay > 0 && (
        <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
          <p className="text-sm text-white/90">
            At your current recorded spending rate, available cash may become tight in approximately{" "}
            <strong>{cashflow.daysToTight} day(s)</strong>.
          </p>
        </div>
      )}

      {/* Major risk */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40">Major risk</p>
        <p className="text-sm text-white mt-0.5">{cashflow.majorRisk}</p>
      </div>

      {/* FADS recommends */}
      <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-3">
        <p className="text-xs font-medium text-brand-teal">FADS RECOMMENDS</p>
        <p className="text-sm text-white mt-0.5">{cashflow.recommendedAction}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <ExplainSimply
          topic="Cash-flow forecast"
          figure={formatCurrency(cashflow.projected30, currency)}
          label="Ask FADS to explain"
          dark
        />
        <div className="flex-1">
          <FixThisWithFads
            to={cashflow.status === "TIGHT" || cashflow.status === "CAUTION" ? "/finance/invoices" : "/finance/transactions"}
            label="Show me what to do"
            dark
          />
        </div>
      </div>

      <p className="text-[11px] text-white/40">
        Based on the records currently available in FADS. This is an estimate, not a guaranteed outcome.
      </p>
    </div>
  );
}