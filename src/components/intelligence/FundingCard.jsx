import React from "react";
import { Link } from "react-router-dom";
import { Landmark, Check, X, ArrowUpRight } from "lucide-react";
import ExplainSimply from "@/components/intelligence/ExplainSimply";
import FixThisWithFads from "@/components/intelligence/FixThisWithFads";

// Funding Readiness — a lightweight record-readiness report. Explicitly NOT a
// credit score, not loan eligibility, and not a guaranteed/approved amount.
// Assesses how organised a business's records appear for a potential funding
// application. Lender integrations are out of scope for V1.
export default function FundingCard({ funding, currency }) {
  if (!funding?.hasData) {
    return (
      <div className="bg-card rounded-2xl border border-brand-teal/15 p-5">
        <Header />
        <p className="text-sm text-muted-foreground mt-3">
          Not enough recorded data to assess funding readiness. Record at least 10 transactions to see this report.
        </p>
      </div>
    );
  }
  const pct = Math.round((funding.score / funding.maxScore) * 100);
  const tone = pct >= 75 ? "text-status-ok" : pct >= 50 ? "text-status-warn" : "text-status-bad";
  return (
    <div className="bg-card rounded-2xl border border-brand-teal/15 p-5 space-y-4">
      <Header />
      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold text-brand-navy">
          <span className={tone}>{funding.score}</span>
          <span className="text-base font-medium text-muted-foreground">/{funding.maxScore}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-brand-navy">FADS Business Readiness</p>
          <p className="text-xs text-muted-foreground">
            {pct >= 75
              ? "Your records appear increasingly organised for a potential funding application."
              : pct >= 50
              ? "Your records are partially ready — some areas need improvement."
              : "Your records need more work before approaching a lender."}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {Object.entries(funding.breakdown).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-36 shrink-0 capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-brand-teal" style={{ width: `${(v / 25) * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-brand-navy w-8 text-right">{v}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
        <div>
          <p className="text-xs font-medium text-status-ok flex items-center gap-1"><Check className="w-3 h-3" /> What is strong</p>
          {funding.strong.length > 0 ? (
            <ul className="mt-1 space-y-1">{funding.strong.map((s, i) => <li key={i} className="text-xs text-brand-navy">• {s}</li>)}</ul>
          ) : <p className="text-xs text-muted-foreground mt-1">Not enough strengths yet.</p>}
        </div>
        <div>
          <p className="text-xs font-medium text-status-bad flex items-center gap-1"><X className="w-3 h-3" /> What is missing</p>
          {funding.missing.length > 0 ? (
            <ul className="mt-1 space-y-1">{funding.missing.map((s, i) => <li key={i} className="text-xs text-brand-navy">• {s}</li>)}</ul>
          ) : <p className="text-xs text-muted-foreground mt-1">Nothing critical missing.</p>}
        </div>
      </div>
      {funding.improve.length > 0 && (
        <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-xl p-3">
          <p className="text-xs font-medium text-brand-teal flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> What would improve my readiness</p>
          <ul className="mt-1 space-y-1">{funding.improve.map((s, i) => <li key={i} className="text-xs text-brand-navy">• {s}</li>)}</ul>
        </div>
      )}
      <div className="flex items-center gap-3">
        <ExplainSimply topic="Business Readiness score" figure={`${funding.score}/${funding.maxScore}`} />
        <Link to={`/assistant?q=${encodeURIComponent("What would improve my readiness?")}`} className="text-xs font-medium text-brand-teal hover:underline">
          Ask FADS: What would improve my readiness?
        </Link>
      </div>
      <FixThisWithFads to="/finance/transactions" label="Improve your records" />
      <p className="text-[11px] text-muted-foreground">
        An operational and financial readiness indicator based on records available in FADS. It does not represent lender approval or a regulated credit score.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Landmark className="w-5 h-5 text-brand-teal" />
      <h2 className="font-semibold text-brand-navy">Business Readiness</h2>
    </div>
  );
}