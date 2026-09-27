import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight, Activity } from "lucide-react";
import { useIntelligence } from "@/lib/useIntelligence";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";

// FADS Business Intelligence — compact Home presentation of the EXISTING
// intelligence system. Reuses useIntelligence() (same hook as Mini FADS TV and
// the Intelligence page) for the real Business Health score, and reuses the
// same circular Y2K player visual as HealthCard. The "FADS' Pick" is the
// existing most-important recommendation already computed on Home (passed in
// as `pick`). No new calculations, no new data, no new engines — purely a
// visible Home entry point into the existing Intelligence feature.

const FIX_URLS = {
  "Cash flow": "/finance/invoices",
  "Profitability": "/finance/transactions",
  "Debt collection": "/finance/money-owed",
  "Expense control": "/finance/transactions",
  "Record completeness": "/finance/transactions",
};

export default function BusinessIntelligenceCard({ pick, orgType, title, intro }) {
  const { intelligence, loading } = useIntelligence();
  const health = intelligence?.health;

  const noun =
    orgType === "church"
      ? "community"
      : orgType === "school" || orgType === "university"
      ? "school"
      : "business";

  // No data yet — compact, friendly prompt to record more (mirrors HealthCard)
  if (loading || !intelligence) {
    return (
      <section className="bg-brand-navy rounded-2xl p-5 text-white">
        <Header noun={noun} title={title} intro={intro} />
        <div className="flex items-center justify-center py-6">
          <div className="w-7 h-7 border-2 border-white/20 border-t-brand-teal rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  if (!health?.hasData) {
    return (
      <section className="bg-brand-navy rounded-2xl p-5 text-white space-y-3">
        <Header noun={noun} title={title} intro={intro} />
        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
          <FadsRobotAvatar size="sm" className="shrink-0" />
          <p className="text-sm text-white/70 leading-relaxed">
            Not enough recorded data yet to calculate a health score. Record at least 5 transactions to see how your {noun} is doing.
          </p>
        </div>
        <OpenIntelligenceButton />
      </section>
    );
  }

  const pct = Math.round((health.score / health.maxScore) * 100);
  const statusLabel = pct >= 75 ? "HEALTHY" : pct >= 50 ? "NEEDS ATTENTION" : "AT RISK";
  const statusColor = pct >= 75 ? "text-status-ok" : pct >= 50 ? "text-status-warn" : "text-status-bad";
  const dotColor = pct >= 75 ? "bg-status-ok" : pct >= 50 ? "bg-status-warn" : "bg-status-bad";
  const gaugeStroke = pct >= 75 ? "hsl(var(--status-ok))" : pct >= 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-bad))";

  const fadsSays = pct >= 75
    ? `Your ${noun} looks healthy overall. ${health.weakest.name} is the first thing I'd work on.`
    : pct >= 50
    ? `Your ${noun} needs some attention. ${health.weakest.name} is the most pressing area.`
    : `Your ${noun} needs urgent attention. ${health.weakest.name} is the most critical area.`;

  // Deep-link for "Do this with FADS" — prefer the existing Home pick (broad:
  // covers invoices, CRM follow-ups, tasks), fall back to the health area fix.
  const pickText = pick?.text || health.topAction;
  const pickUrl = pick?.link || FIX_URLS[health.weakest.name] || "/finance";

  const circumference = 2 * Math.PI * 60;

  return (
    <section className="bg-brand-navy rounded-2xl p-5 text-white space-y-4">
      <Header noun={noun} title={title} intro={intro} />

      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        {/* ── Business Health Player — circular Y2K ring (reuses HealthCard visual) ── */}
        <div className="flex flex-col items-center shrink-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono mb-2 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
            ANALYSIS COMPLETE
          </p>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute w-16 h-16 rounded-full bg-brand-teal/20 blur-2xl animate-pulse" />
            <svg className="absolute inset-0 w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <circle
                cx="64" cy="64" r="60" fill="none" strokeWidth="4"
                stroke={gaugeStroke} strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
              />
            </svg>
            <div className="absolute w-20 h-20 rounded-full bg-white/5" />
            <div className="relative z-10">
              <FadsRobotAvatar size="md" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold font-mono leading-none">{health.score}</span>
            <span className="text-sm text-white/40 font-mono">/ {health.maxScore}</span>
          </div>
          <span className={`mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wider ${statusColor} bg-white/5`}>
            {statusLabel}
          </span>
        </div>

        {/* ── FADS Says + FADS' Pick + actions ── */}
        <div className="flex-1 w-full space-y-3">
          {/* FADS SAYS */}
          <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
            <FadsRobotAvatar size="sm" className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium mb-0.5">FADS says</p>
              <p className="text-sm text-white/85 leading-relaxed">“{fadsSays}”</p>
            </div>
          </div>

          {/* FADS' PICK */}
          <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-brand-teal font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> FADS' PICK
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">What I'd do next</p>
            <p className="text-sm text-white mt-1 leading-snug">{pickText}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Link to={pickUrl} className="w-full">
              <button className="w-full inline-flex items-center justify-center gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-lg px-3 py-2.5 text-xs font-bold min-h-touch transition-colors shadow-[0_0_16px_rgba(20,184,166,0.25)]">
                Do this with FADS <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
            <OpenIntelligenceButton />
          </div>
        </div>
      </div>
    </section>
  );
}

function Header({ noun, title, intro }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-brand-teal" />
        <h2 className="font-semibold text-white tracking-wide">{title || "FADS BUSINESS INTELLIGENCE"}</h2>
      </div>
      <p className="text-xs text-white/50 mt-1 leading-relaxed">
        {intro || `FADS looks across your ${noun}, spots what matters and helps you decide what to do next.`}
      </p>
    </div>
  );
}

function OpenIntelligenceButton() {
  return (
    <Link to="/intelligence" className="w-full">
      <button className="w-full inline-flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 rounded-lg px-3 py-2.5 text-xs font-medium min-h-touch transition-colors">
        Open Intelligence <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </Link>
  );
}