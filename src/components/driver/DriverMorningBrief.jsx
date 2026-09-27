import React from "react";
import { Link } from "react-router-dom";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import {
  ArrowRight, ArrowDownCircle, ArrowUpCircle, Sparkles,
} from "lucide-react";

// FADS Driver Morning Brief — a compact, conversational check-in for Taxi
// Driver / Self-Employed workspaces only. Reuses the SAME genuine Finance +
// Intelligence data as the rest of Driver Home (passed in as props). No new
// data, no backend, no email. Answers: How am I doing? What needs attention?
// Am I tax-ready? What should I do next? "View Full Brief" scrolls to the
// Driver Daily Check below it.
export default function DriverMorningBrief({
  firstName, fmt, todayIncome, todayExpenses, monthNet, pick,
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = firstName ? ` ${firstName}` : "";

  const moneyInsight =
    todayIncome > 0
      ? `${fmt(todayIncome)} earned today · ${fmt(monthNet)} net this month.`
      : `Nothing recorded today yet — log your fares when parked safely.`;
  const expenseInsight =
    todayExpenses > 0
      ? `${fmt(todayExpenses)} in running costs today.`
      : `No costs logged today yet.`;

  const scrollToFull = () => {
    const el = document.getElementById("driver-full-brief");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="rounded-2xl border border-brand-teal/25 bg-gradient-to-br from-brand-mint/60 to-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-teal" />
        <h2 className="text-[11px] font-bold tracking-wider text-brand-teal">
          FADS DRIVER MORNING BRIEF
        </h2>
      </div>

      <div className="flex gap-3 items-start">
        <div className="shrink-0 pt-1">
          <FadsRobotAvatar size="md" />
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          <p className="text-sm font-semibold text-brand-navy">
            {greeting}{name}. Here's your business check-in.
          </p>
          <BriefLine icon={ArrowDownCircle} color="text-status-ok" label="Money" insight={moneyInsight} />
          <BriefLine icon={ArrowUpCircle} color="text-status-warn" label="Expenses" insight={expenseInsight} />
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <Sparkles className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-teal">
                FADS' Pick
              </p>
              <p className="text-sm text-brand-navy">{pick.text}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <Link
          to={pick.link || "/finance"}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-lg px-3 py-2.5 text-sm font-semibold min-h-touch transition-colors"
        >
          Do this with FADS <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          onClick={scrollToFull}
          className="flex-1 inline-flex items-center justify-center gap-1.5 border border-border bg-card hover:bg-accent rounded-lg px-3 py-2.5 text-sm font-medium text-brand-navy min-h-touch transition-colors"
        >
          View Full Brief <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function BriefLine({ icon: Icon, color, label, insight }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
      <p className="text-sm text-brand-navy">
        <span className="font-semibold">{label} —</span> {insight}
      </p>
    </div>
  );
}