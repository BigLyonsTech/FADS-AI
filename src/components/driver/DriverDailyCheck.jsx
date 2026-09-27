import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinance } from "@/lib/useFinance";
import { useWorkspace } from "@/lib/useWorkspace";
import { formatCurrency } from "@/lib/currencyFormat";
import {
  CheckCircle, AlertCircle, ChevronRight, Sparkles, RefreshCw,
} from "lucide-react";

// FADS Driver Daily Check — an extremely quick daily review for Taxi Driver /
// Self-Employed workspaces. Reuses the SAME Finance data (useFinance) and the
// SAME FADS Tax Check (runTaxCheck) as the rest of FADS. Pure client-side
// computation — no new data, no new backend. Ends with a simple FADS summary
// and one next action. When everything is complete: "You're all caught up
// for today."
const RECEIPT_THRESHOLD = 50;
const DRIVER_EXPENSE_KEYWORDS = ["fuel", "diesel", "petrol", "servicing", "service", "repair", "tyre", "tire", "cleaning", "park", "toll", "insurance", "moto tax"];

export default function DriverDailyCheck() {
  const { activeOrg } = useWorkspace();
  const fin = useFinance();

  const check = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cur = activeOrg?.currency || "";
    const cleared = (fin.transactions || []).filter((t) => t.status === "cleared" || t.status === "completed");
    const todayTxns = cleared.filter((t) => t.date === today);
    const todayIncome = todayTxns.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
    const todayExpenses = todayTxns.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);

    const missingReceipts = cleared.filter(
      (t) => t.direction === "out" && Number(t.amount) >= RECEIPT_THRESHOLD && !t.receipt_file_url
    );
    const needsReview = (fin.transactions || []).filter((t) => t.status === "pending");

    return { today, cur, todayIncome, todayExpenses, missingReceipts, needsReview };
  }, [fin.transactions, fin.categories, activeOrg]);

  const { today, cur, todayIncome, todayExpenses, missingReceipts, needsReview } = check;

  const steps = [
    {
      label: "Recorded today's income",
      done: todayIncome > 0,
      detail: todayIncome > 0 ? `${formatCurrency(todayIncome, cur)} recorded today` : "No income recorded yet today",
      link: "/finance/money-in",
      linkLabel: "Record income",
    },
    {
      label: "Recorded today's expenses",
      done: todayExpenses > 0,
      detail: todayExpenses > 0 ? `${formatCurrency(todayExpenses, cur)} in expenses today` : "No expenses recorded yet today",
      link: "/finance/money-out",
      linkLabel: "Record expense",
    },
    {
      label: "Receipts added",
      done: missingReceipts.length === 0,
      detail: missingReceipts.length === 0
        ? "All expense receipts are attached"
        : `${missingReceipts.length} expense${missingReceipts.length === 1 ? "" : "s"} of ${cur} ${RECEIPT_THRESHOLD}+ missing a receipt`,
      link: "/finance/transactions",
      linkLabel: missingReceipts.length === 0 ? null : "Add receipts",
    },
    {
      label: "Nothing needing review",
      done: needsReview.length === 0,
      detail: needsReview.length === 0
        ? "No records waiting for review"
        : `${needsReview.length} record${needsReview.length === 1 ? "" : "s"} awaiting review`,
      link: "/finance/transactions",
      linkLabel: needsReview.length === 0 ? null : "Review now",
    },
  ];

  const allDone = steps.every((s) => s.done);
  const incomplete = steps.filter((s) => !s.done);

  // Next action — the first incomplete step, or a "you're caught up" message.
  let summary;
  let nextAction = null;
  if (allDone) {
    summary = "You're all caught up for today. Your records are up to date.";
  } else {
    const first = incomplete[0];
    summary = `FADS checked your records for today. ${incomplete.length} thing${incomplete.length === 1 ? "" : "s"} still need${incomplete.length === 1 ? "s" : ""} attention.`;
    nextAction = { label: first.linkLabel, link: first.link };
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-brand-teal" />
        <h2 className="font-semibold text-brand-navy">FADS Driver Daily Check</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">{today}</span>
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border p-3">
            {s.done ? (
              <CheckCircle className="w-4 h-4 text-status-ok shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.done ? "text-brand-navy" : "text-brand-navy"}`}>{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </div>
            {s.linkLabel && (
              <Link
                to={s.link}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-brand-teal min-h-touch px-2 py-1"
              >
                {s.linkLabel} <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* FADS summary + next action */}
      <div className={`rounded-xl p-3.5 ${allDone ? "bg-status-ok/10 border border-status-ok/25" : "bg-brand-teal/10 border border-brand-teal/25"}`}>
        <div className="flex items-start gap-2">
          <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${allDone ? "text-status-ok" : "text-brand-teal"}`} />
          <div className="flex-1">
            <p className="text-sm text-brand-navy leading-relaxed">{summary}</p>
            {nextAction && (
              <Link
                to={nextAction.link}
                className="inline-flex items-center gap-1.5 mt-2 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-lg px-3 py-2 text-xs font-semibold min-h-touch transition-colors"
              >
                {nextAction.label} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Only review this when you're safely parked.
      </p>
    </div>
  );
}