import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/currencyFormat";
import { buildTaxPrepReportData } from "@/lib/taxPrepReport";
import { generateTaxPrepReportPDF } from "@/lib/taxPrepPdf";
import { getTaxPack } from "@/lib/taxRules";
import AccountantPackButton from "@/components/tax/AccountantPackButton";
import {
  ArrowDownLeft, ArrowUpRight, Wallet, ClipboardCheck, FileDown,
  CheckCircle, AlertCircle, ChevronRight, Sparkles, FileText, ShieldCheck, ExternalLink,
} from "lucide-react";

// DIY Tax Preparation Journey for Taxi Driver / Self-Employed users.
// Extends the EXISTING Tax Centre (rendered as a view inside it) — no new Tax
// Centre, no new engine. Guided steps:
//   Income → Expenses → Records → Profit → Tax Readiness → Prepare → Review → Submit/Export/Handoff
// Each step shows: What FADS checked · What is complete · What still needs
// attention · What to do next. FADS rule: checks → notices → explains →
// recommends → prepares → owner approves. Reuses Finance, Tax Profile, FADS
// Tax Check, Accountant Pack and the Year-End Tax Preparation Report.

const STEPS = [
  { key: "income", label: "Income", icon: ArrowDownLeft },
  { key: "expenses", label: "Expenses", icon: ArrowUpRight },
  { key: "records", label: "Records", icon: ClipboardCheck },
  { key: "profit", label: "Profit", icon: Wallet },
  { key: "readiness", label: "Tax Readiness", icon: ShieldCheck },
  { key: "prepare", label: "Prepare", icon: FileText },
  { key: "review", label: "Review", icon: CheckCircle },
  { key: "handoff", label: "Submit / Export", icon: FileDown },
];

export default function TaxJourney({ org, taxProfile, finance, taxCheck, country, onBack }) {
  const { toast } = useToast();
  const [step, setStep] = useState("income");
  const [building, setBuilding] = useState(false);

  const cur = org?.currency || "";
  const pack = getTaxPack(country);
  const report = buildTaxPrepReportData(org, taxProfile, finance, taxCheck);
  const authorityLabel = pack?.authorityLabel || "your tax authority";

  const buildReport = async () => {
    if (building) return;
    setBuilding(true);
    const t = toast({ title: "Preparing Year-End Tax Preparation Report…" });
    try {
      await generateTaxPrepReportPDF(report);
      t.dismiss();
      toast({ title: "Year-End Report downloaded.", description: "Review it, then share or hand off." });
    } catch (e) {
      t.dismiss();
      toast({ title: "Could not build the report.", description: e?.message, variant: "destructive" });
    } finally {
      setBuilding(false);
    }
  };

  const stepState = (done, attention, checked, next, link) => ({ done, attention, checked, next, link });

  const incomeState = stepState(
    report.income > 0,
    report.income === 0,
    "FADS checked your recorded income for the tax year.",
    report.income > 0 ? "Income recorded — move on to expenses." : "Record your income for the year so FADS can include it.",
    "/finance/money-in"
  );
  const expensesState = stepState(
    report.expenses > 0,
    report.expenses === 0,
    "FADS checked your recorded expenses, including driver running costs where applicable.",
    report.expenses > 0 ? "Expenses recorded — check your records next." : "Record your expenses (fuel, insurance, servicing, cleaning, etc.).",
    "/finance/money-out"
  );
  const recordsState = stepState(
    report.missingReceipts.length === 0 && report.needsReview.length === 0 && report.reviewFindings.length === 0,
    report.missingReceipts.length > 0 || report.needsReview.length > 0 || report.reviewFindings.length > 0,
    "FADS checked for missing receipts, pending records and items flagged in the Tax Check.",
    report.missingReceipts.length === 0 && report.needsReview.length === 0
      ? "Records look clean — continue."
      : "Add missing receipts and clear pending records.",
    "/finance/transactions"
  );
  const profitState = stepState(
    report.income > 0 || report.expenses > 0,
    false,
    "FADS calculated an estimated business profit (income minus expenses).",
    "This is an estimate — review with your accountant before filing.",
    "/finance/reports"
  );
  const readinessState = stepState(
    (report.taxReadiness ?? 0) >= 80,
    (report.taxReadiness ?? 0) < 80,
    `FADS scored your Tax Readiness at ${report.taxReadiness ?? 0}%.`,
    (report.taxReadiness ?? 0) >= 80 ? "Readiness looks good — prepare your report." : "Improve readiness by resolving the flagged items.",
    "/finance/tax-centre"
  );
  const prepareState = stepState(
    false,
    false,
    "FADS can prepare your Year-End Tax Preparation Report and Accountant Pack from your records.",
    "Prepare the report, then review it.",
    null
  );
  const reviewState = stepState(
    report.outstanding.length === 0,
    report.outstanding.length > 0,
    "FADS listed what's complete and what's still outstanding.",
    report.outstanding.length === 0 ? "Nothing outstanding — ready to submit or hand off." : "Resolve the outstanding items before treating this as final.",
    null
  );
  const handoffState = stepState(
    false,
    false,
    "FADS can prepare your information for export or your accountant. It does not file directly with " + authorityLabel + ".",
    "Download your Tax Pack, share with your accountant, or continue to the official tax system.",
    null
  );

  const states = {
    income: incomeState,
    expenses: expensesState,
    records: recordsState,
    profit: profitState,
    readiness: readinessState,
    prepare: prepareState,
    review: reviewState,
    handoff: handoffState,
  };
  const current = states[step];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="h-9 px-2">← Back</Button>
        <h2 className="font-semibold text-brand-navy">Tax Preparation Journey</h2>
      </div>

      <div className="bg-brand-mint/40 rounded-xl p-3 text-sm text-brand-navy">
        FADS checks your records, notices what needs attention, explains it in plain language, recommends a next step,
        and prepares your information — you approve every action.
      </div>

      {/* Step rail */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {STEPS.map((s) => {
          const st = states[s.key];
          const active = step === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium min-h-touch transition-colors ${
                active ? "bg-brand-teal text-brand-navy" : st.done ? "bg-status-ok/10 text-status-ok" : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {st.done && !active && <CheckCircle className="w-3.5 h-3.5" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step body */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-teal" />
          <h3 className="font-semibold text-brand-navy">{STEPS[stepIndex].label}</h3>
          {current.done && <span className="text-[10px] font-semibold uppercase text-status-ok bg-status-ok/10 px-2 py-0.5 rounded-full">Complete</span>}
          {current.attention && <span className="text-[10px] font-semibold uppercase text-status-warn bg-status-warn/10 px-2 py-0.5 rounded-full">Needs attention</span>}
        </div>

        {/* What FADS checked */}
        <div className="rounded-xl border border-border p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">What FADS checked</p>
          <p className="text-sm text-brand-navy">{current.checked}</p>
        </div>

        {/* Step-specific figures */}
        {step === "income" && (
          <div className="grid grid-cols-2 gap-3">
            <FigCard label="Recorded Income" value={formatCurrency(report.income, cur)} />
            <FigCard label="Income Transactions" value={String(report.incomeByCategory.length)} />
          </div>
        )}
        {step === "expenses" && (
          <div className="grid grid-cols-2 gap-3">
            <FigCard label="Recorded Expenses" value={formatCurrency(report.expenses, cur)} />
            <FigCard label="Expense Categories" value={String(report.expenseByCategory.length)} />
          </div>
        )}
        {step === "records" && (
          <div className="grid grid-cols-3 gap-3">
            <FigCard label="Missing Receipts" value={String(report.missingReceipts.length)} tone={report.missingReceipts.length > 0 ? "warn" : "ok"} />
            <FigCard label="Needs Review" value={String(report.needsReview.length)} tone={report.needsReview.length > 0 ? "warn" : "ok"} />
            <FigCard label="Tax Check Items" value={String(report.taxFindings.length)} tone={report.taxFindings.length > 0 ? "warn" : "ok"} />
          </div>
        )}
        {step === "profit" && (
          <div className="grid grid-cols-2 gap-3">
            <FigCard label="Estimated Profit" value={formatCurrency(report.profit, cur)} tone={report.profit >= 0 ? "ok" : "warn"} />
            <FigCard label="Transactions" value={String(report.transactionCount)} />
          </div>
        )}
        {step === "readiness" && (
          <FigCard label="Tax Readiness" value={`${report.taxReadiness ?? 0}%`} tone={(report.taxReadiness ?? 0) >= 80 ? "ok" : "warn"} />
        )}

        {/* What is complete / needs attention */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] uppercase tracking-wide text-status-ok mb-1">What is complete</p>
            <p className="text-sm text-brand-navy">{current.done ? "This step is complete." : "Not yet complete."}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] uppercase tracking-wide text-status-warn mb-1">What still needs attention</p>
            <p className="text-sm text-brand-navy">{current.attention ? "See the next action below." : "Nothing here needs attention."}</p>
          </div>
        </div>

        {/* What to do next */}
        <div className="rounded-xl bg-brand-teal/10 border border-brand-teal/25 p-3.5">
          <p className="text-[10px] uppercase tracking-wide text-brand-teal mb-1">What to do next</p>
          <p className="text-sm text-brand-navy">{current.next}</p>
          {current.link && (
            <Link to={current.link} className="inline-flex items-center gap-1.5 mt-2 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-lg px-3 py-2 text-xs font-semibold min-h-touch transition-colors">
              Go to {STEPS[stepIndex].label} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Prepare step — report + pack */}
        {step === "prepare" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-medium text-brand-navy">Year-End Tax Preparation Report</p>
              <p className="text-xs text-muted-foreground">A full preparation report: business info, income, expenses, profit, breakdown, missing receipts, review items, tax readiness and a checklist.</p>
              <Button onClick={buildReport} disabled={building} className="h-11 min-h-touch bg-brand-navy hover:bg-brand-navy/90 gap-2">
                {building ? "Preparing…" : "Prepare Year-End Report"}
              </Button>
            </div>
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-medium text-brand-navy">Accountant / Tax Adviser Pack</p>
              <p className="text-xs text-muted-foreground">A structured summary of your records for your accountant or tax adviser.</p>
              <AccountantPackButton org={org} taxProfile={taxProfile} finance={finance} taxCheck={taxCheck} variant="outline" />
            </div>
          </div>
        )}

        {/* Review step — outstanding + checklist */}
        {step === "review" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Outstanding Information</p>
              {report.outstanding.length === 0 ? (
                <p className="text-sm text-status-ok flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Nothing outstanding — your records look complete.</p>
              ) : (
                <ul className="space-y-1">
                  {report.outstanding.map((o, i) => (
                    <li key={i} className="text-sm text-brand-navy flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-status-warn shrink-0 mt-0.5" /> {o}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Preparation Checklist</p>
              <ul className="space-y-1.5">
                {report.checklist.map((c, i) => (
                  <li key={i} className="text-sm text-brand-navy flex items-center gap-2">
                    {c.done ? <CheckCircle className="w-4 h-4 text-status-ok" /> : <span className="w-4 h-4 rounded border border-border inline-block" />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Handoff step — official filing safety */}
        {step === "handoff" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-medium text-brand-navy">Prepare My Tax Information</p>
              <p className="text-xs text-muted-foreground">Download your Year-End Tax Preparation Report and Accountant Pack.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={buildReport} disabled={building} variant="outline" className="h-11 min-h-touch gap-2">
                  <FileDown className="w-4 h-4" /> Download Tax Pack
                </Button>
                <AccountantPackButton org={org} taxProfile={taxProfile} finance={finance} taxCheck={taxCheck} variant="outline" />
              </div>
            </div>
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-medium text-brand-navy">Share with Accountant</p>
              <p className="text-xs text-muted-foreground">Hand the downloaded pack to your accountant or tax adviser. Where professional judgement may be needed, FADS will explain calmly rather than decide for you.</p>
            </div>
            <div className="rounded-xl bg-status-warn/10 border border-status-warn/30 p-3 space-y-2">
              <p className="text-sm font-medium text-status-warn flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Official Filing Safety</p>
              <p className="text-xs text-brand-navy">
                FADS will never show "Filed with {authorityLabel}" unless an authorised tax-authority integration genuinely completes a successful submission.
                No such integration is connected, so nothing here is a filed return. Use these prepared materials to submit yourself or hand to a professional.
              </p>
              <p className="text-xs text-brand-navy">
                <strong>Continue to Official Tax System:</strong> when you're ready, go to {authorityLabel}'s own portal to file. FADS does not redirect you automatically —
                your official filing happens on the tax authority's system, not here.
              </p>
            </div>
          </div>
        )}

        {/* Nav between steps */}
        <div className="flex justify-between pt-1">
          <Button
            variant="ghost"
            disabled={stepIndex === 0}
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].key)}
            className="h-9 px-2"
          >
            ← Previous
          </Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(STEPS[stepIndex + 1].key)}
              className="h-9 px-2 text-brand-teal"
            >
              Next →
            </Button>
          ) : (
            <Button variant="ghost" onClick={onBack} className="h-9 px-2 text-brand-teal">Done</Button>
          )}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
        FADS helps organise financial records and prepare tax information. Estimates are based on information currently
        recorded in FADS and the configured rules for the selected jurisdiction and tax year. Review your information
        before filing. Official tax authority requirements and professional advice take precedence.
      </div>
    </div>
  );
}

function FigCard({ label, value, tone }) {
  const toneClass = tone === "ok" ? "text-status-ok" : tone === "warn" ? "text-status-warn" : "text-brand-navy";
  return (
    <div className="bg-card rounded-xl border border-border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${toneClass} break-words`}>{value}</p>
    </div>
  );
}