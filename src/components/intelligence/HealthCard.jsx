import React, { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ChevronDown, Bot, Activity } from "lucide-react";
import ExplainSimply from "@/components/intelligence/ExplainSimply";
import FixThisWithFads from "@/components/intelligence/FixThisWithFads";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";

// ── Category metadata ──────────────────────────────────────────────────
// Plain-English explanations shown when a mini-score card is tapped, and
// the navigation target for fixing each category. Both are presentation
// only — the underlying scores and calculations are unchanged.

const CATEGORY_DESC = {
  "Cash flow": "Your recorded money coming in and going out currently looks manageable.",
  "Profitability": "Your recorded income is higher than your recorded costs.",
  "Debt collection": "Money owed to the business is being collected well.",
  "Expense control": "Your recorded spending is one of the areas FADS thinks deserves attention.",
  "Record completeness": "The records FADS needs to understand your business appear complete.",
};

const FIX_URLS = {
  "Cash flow": "/finance/invoices",
  "Profitability": "/finance/transactions",
  "Debt collection": "/finance/invoices",
  "Expense control": "/finance/transactions",
  "Record completeness": "/finance/transactions",
};

const FULL_LABELS = {
  "Cash flow": "Excellent",
  "Profitability": "Strong",
  "Debt collection": "Strong",
  "Expense control": "Controlled",
  "Record completeness": "Complete",
};

// ── Helpers ─────────────────────────────────────────────────────────────

function statusForArea(score, max) {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 1) return { label: "Complete", color: "text-status-ok", dot: "bg-status-ok" };
  if (ratio >= 0.8) return { label: "Strong", color: "text-status-ok", dot: "bg-status-ok" };
  if (ratio >= 0.5) return { label: "Fair", color: "text-status-warn", dot: "bg-status-warn" };
  if (ratio > 0) return { label: "Needs work", color: "text-status-warn", dot: "bg-status-warn" };
  return { label: "Start here", color: "text-status-bad", dot: "bg-status-bad" };
}

function ScoreDots({ score, max }) {
  const filled = max > 0 ? Math.round((score / max) * 5) : 0;
  const ratio = max > 0 ? score / max : 0;
  const onColor = ratio >= 0.5 ? "bg-status-ok" : ratio > 0 ? "bg-status-warn" : "bg-status-bad";
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < filled ? onColor : "bg-white/15"}`}
        />
      ))}
    </div>
  );
}

// ── Mini score card ─────────────────────────────────────────────────────
// Compact tappable card: category, score, 5-dot indicator, status label.
// Tapping reveals the plain-English explanation (no long paragraphs by default).

function MiniScore({ area }) {
  const [open, setOpen] = useState(false);
  const status = statusForArea(area.score, area.max);
  const fullLabel = FULL_LABELS[area.name];
  const label = area.score >= area.max && fullLabel ? fullLabel : status.label;

  return (
    <button
      onClick={() => setOpen(!open)}
      className="text-left bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-2.5 min-h-touch w-full"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
          {area.name}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-lg font-bold text-white font-mono leading-none">{area.score}</span>
        <span className="text-xs text-white/40 font-mono">/ {area.max}</span>
      </div>
      <div className="mt-1.5">
        <ScoreDots score={area.score} max={area.max} />
      </div>
      <span className={`text-[11px] font-medium mt-1 block ${status.color}`}>{label}</span>
      {open && CATEGORY_DESC[area.name] && (
        <p className="text-[11px] text-white/60 mt-2 leading-relaxed border-t border-white/10 pt-2">
          {CATEGORY_DESC[area.name]}
        </p>
      )}
    </button>
  );
}

// ── Main Health Player ──────────────────────────────────────────────────
// A compact Y2K-style digital control panel. The 81/100 score is the hero,
// surrounded by a digital gauge ring. Six category mini-players sit in a
// responsive grid below. A story strip (strongest / needs attention) and a
// FADS recommendation close it out. All scores, calculations, and
// recommendations are unchanged — only the presentation is new.

export default function HealthCard({ health, currency }) {
  const [whatMean, setWhatMean] = useState(false);

  if (!health?.hasData) {
    return (
      <div className="bg-brand-navy rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <FadsRobotAvatar size="sm" />
          <h2 className="font-semibold">Business Health</h2>
        </div>
        <p className="text-sm text-white/60">
          Not enough recorded data yet to calculate a health score. Record at least 5 transactions
          (income and expenses) to see your business health.
        </p>
      </div>
    );
  }

  const pct = Math.round((health.score / health.maxScore) * 100);
  const statusLabel = pct >= 75 ? "HEALTHY" : pct >= 50 ? "NEEDS ATTENTION" : "AT RISK";
  const statusColor =
    pct >= 75 ? "text-status-ok" : pct >= 50 ? "text-status-warn" : "text-status-bad";
  const gaugeStroke =
    pct >= 75 ? "hsl(var(--status-ok))" : pct >= 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-bad))";
  const summary = pct >= 75
    ? "Your business looks healthy based on the records currently available in FADS."
    : pct >= 50
    ? "Your business needs some attention based on the records currently available in FADS."
    : "Your business needs urgent attention based on the records currently available in FADS.";

  const robotStory = pct >= 75
    ? `Your business looks healthy overall. ${health.weakest.name} is the first thing I'd work on.`
    : pct >= 50
    ? `Your business needs some attention. ${health.weakest.name} is the most pressing area.`
    : `Your business needs urgent attention. ${health.weakest.name} is the most critical area.`;

  const fixUrl = FIX_URLS[health.weakest.name] || "/finance";
  const circumference = 2 * Math.PI * 64;

  return (
    <div className="bg-brand-navy rounded-2xl p-5 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FadsRobotAvatar size="sm" />
        <h2 className="font-semibold text-white tracking-wide">FADS BUSINESS HEALTH</h2>
      </div>

      {/* FADS Health Player — robot inside a digital health ring */}
      <div className="flex flex-col items-center py-1">
        {/* Digital status label */}
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono mb-2 flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              pct >= 75 ? "bg-status-ok" : pct >= 50 ? "bg-status-warn" : "bg-status-bad"
            }`}
          />
          ANALYSIS COMPLETE
        </p>

        {/* Robot + ring container */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Soft aqua glow behind robot */}
          <div className="absolute w-20 h-20 rounded-full bg-brand-teal/20 blur-2xl animate-pulse" />

          {/* Digital health ring */}
          <svg className="absolute inset-0 w-36 h-36 -rotate-90" viewBox="0 0 144 144">
            <circle cx="72" cy="72" r="64" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="72"
              cy="72"
              r="64"
              fill="none"
              strokeWidth="4"
              stroke={gaugeStroke}
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
            />
          </svg>

          {/* Inner glass panel */}
          <div className="absolute w-24 h-24 rounded-full bg-white/5" />

          {/* FADS robot centered inside the ring */}
          <div className="relative z-10">
            <FadsRobotAvatar size="lg" />
          </div>
        </div>

        {/* Score + status below the player */}
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-bold text-white font-mono leading-none">{health.score}</span>
          <span className="text-sm text-white/40 font-mono">/ {health.maxScore}</span>
        </div>
        <span
          className={`mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wider ${statusColor} bg-white/5`}
        >
          {statusLabel}
        </span>
      </div>

      {/* FADS says — insight spoken directly by FADS */}
      <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
        <FadsRobotAvatar size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium mb-0.5">FADS says</p>
          <p className="text-xs text-white/80 leading-relaxed">“{robotStory}”</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          to={`/assistant?q=${encodeURIComponent(`Explain my Business Health score of ${health.score}/${health.maxScore}`)}`}
          className="flex-1"
        >
          <button className="w-full inline-flex items-center justify-center gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-lg px-3 py-2 text-xs font-medium min-h-touch transition-colors">
            <Bot className="w-3.5 h-3.5" /> Ask FADS
          </button>
        </Link>
        <button
          onClick={() => setWhatMean(!whatMean)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg px-3 py-2 text-xs font-medium min-h-touch transition-colors"
        >
          <Activity className="w-3.5 h-3.5" /> Why {health.score}?
        </button>
      </div>

      {whatMean && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
          <p className="text-xs text-white/70 leading-relaxed">
            This score is a quick health check of the information currently recorded in FADS. It looks at
            areas such as cash flow, profitability, debt collection, expenses and record completeness.
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            This is a FADS operational/business health indicator. It is not a bank credit score, an official
            financial rating, or a guarantee of business performance.
          </p>
        </div>
      )}

      {/* Mini score grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {health.areas.map((a) => (
          <MiniScore key={a.name} area={a} />
        ))}
      </div>

      {/* Story strip */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-status-ok" /> Strongest
          </p>
          <p className="text-sm font-medium text-white mt-0.5">{health.strongest.name}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-status-warn" /> Needs attention
          </p>
          <p className="text-sm font-medium text-white mt-0.5">{health.weakest.name}</p>
        </div>
      </div>

      {/* FADS recommends */}
      <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-3">
        <p className="text-xs font-medium text-brand-teal">FADS RECOMMENDS</p>
        <p className="text-sm text-white mt-0.5">{health.topAction}</p>
      </div>

      {/* Fix + Explain */}
      <div className="flex items-center gap-3">
        <ExplainSimply
          topic="Business Health score"
          figure={`${health.score}/${health.maxScore}`}
          dark
        />
        <div className="flex-1">
          <FixThisWithFads to={fixUrl} label={`Fix ${health.weakest.name.toLowerCase()}`} dark />
        </div>
      </div>
    </div>
  );
}