// Dedicated Nigeria tax configuration for the FADS Finance Nigeria Tax Centre.
//
// SAFETY: This module NEVER invents tax rates, bands, thresholds or reliefs.
// Only structured, verifiable rule metadata lives here. Rate/band VALUES are
// intentionally left unconfigured until a verified source is supplied — the
// estimator then honestly reports "not yet available" rather than guessing.
//
// Nigerian tax rules are kept completely separate from Ireland, France, UK
// and other country packs. This module is the single source of truth for the
// Nigeria Tax experience inside Finance.

import { getTaxPack, getObligations, OBLIGATION_LABELS } from "@/lib/taxRules";

export const NIGERIA_TAX_DISCLAIMER =
  "Estimates are indicative only, based on records currently in FADS and the configured Nigerian tax rules. They are not a final tax liability. Review your figures and confirm with FIRS / your State IRS or a qualified tax adviser before filing or making any payment.";

// Records / documents typically needed for Nigerian tax preparation. This is
// a helpful checklist — not a filing requirement invented by FADS.
export const NIGERIA_RECORDS_NEEDED = [
  { key: "tin", label: "TIN (Taxpayer Identification Number)", detail: "Required for FIRS and State IRS filings." },
  { key: "income_records", label: "Income records", detail: "All sales and receipts recorded in FADS for the period." },
  { key: "expense_records", label: "Expense & deduction records", detail: "Expenses with receipts or invoices attached." },
  { key: "vat_records", label: "VAT records (if registered)", detail: "Output and input VAT from sales and purchases." },
  { key: "paye_records", label: "PAYE records (if employer)", detail: "Payroll and withholding for employees." },
  { key: "bank_statements", label: "Bank statements", detail: "To reconcile income and expenses." },
  { key: "asset_records", label: "Asset / capital purchase records", detail: "For capital allowance considerations." },
];

// Nigerian tax rate / band configuration placeholder.
// RATE RULES ARE NOT YET CONFIGURED. When verified values (PIT bands, CIT rate,
// VAT rate, withholding rates, etc.) are supplied from a verified source, set
// ratesConfigured: true and add them below — the estimator will then compute
// an estimated tax automatically. Until then it honestly reports that the
// estimated tax amount cannot yet be completed.
export const NIGERIA_RATE_CONFIG = {
  ratesConfigured: true,
  // Only years listed here have configured rate rules. The estimator will NOT
  // silently apply these rates to any other tax year.
  supportedYears: ["2026"],
  personalIncomeTax: {
    rulesYear: 2026,
    effectiveFrom: "1 January 2026",
    sourceAct: "Nigeria Tax Act 2025",
    // Progressive (marginal) bands applied to ANNUAL CHARGEABLE INCOME.
    // Each rate applies only to the slice of income that falls within that
    // band — the highest rate is never applied to the entire income.
    bands: [
      { from: 0, to: 800000, rate: 0 },
      { from: 800000, to: 3000000, rate: 0.15 },
      { from: 3000000, to: 12000000, rate: 0.18 },
      { from: 12000000, to: 25000000, rate: 0.21 },
      { from: 25000000, to: 50000000, rate: 0.23 },
      { from: 50000000, to: Infinity, rate: 0.25 },
    ],
    // Rent relief = the LOWER of 20% of eligible annual rent paid or ₦500,000.
    rentRelief: { rate: 0.2, cap: 500000 },
  },
};

// Disclaimer shown with the 2026 estimated Personal Income Tax result.
export const NIGERIA_2026_ESTIMATE_DISCLAIMER =
  "Estimate based on information recorded in FADS and the Nigeria Tax Act 2025 rates effective from 1 January 2026. Your final tax position may differ depending on allowable deductions, reliefs and individual circumstances. Confirm your final liability with the appropriate tax authority or a qualified tax professional.";

// Apply progressive (marginal) PIT bands to annual chargeable income.
// Returns { tax, breakdown } where breakdown lists each band's taxable slice
// and the tax charged within it.
export function applyNigeriaPitBands(chargeableIncome, bands) {
  let tax = 0;
  let remaining = Math.max(0, chargeableIncome);
  const breakdown = [];
  for (const band of bands) {
    const width = band.to - band.from;
    const slice = remaining <= 0 ? 0 : Math.min(remaining, width);
    const sliceTax = slice * band.rate;
    breakdown.push({ from: band.from, to: band.to, rate: band.rate, taxable: slice, tax: sliceTax });
    tax += sliceTax;
    remaining -= slice;
  }
  return { tax, breakdown };
}

// Rent relief = LOWER of 20% of eligible annual rent paid or the configured cap.
export function nigeriaRentRelief(rentPaid, reliefConfig) {
  const r = Number(rentPaid) || 0;
  if (r <= 0) return 0;
  const cfg = reliefConfig || NIGERIA_RATE_CONFIG.personalIncomeTax.rentRelief;
  return Math.min(r * cfg.rate, cfg.cap);
}

// Build the set of tax periods available from the org's transactions plus the
// current and previous year. Returns [{ key, label }] newest first.
// Nigerian tax year = calendar year (Jan 1 – Dec 31).
export function getNigeriaTaxPeriods(transactions) {
  const years = new Set();
  (transactions || []).forEach((t) => {
    if (t && t.date) years.add(String(t.date).slice(0, 4));
  });
  const cy = String(new Date().getFullYear());
  years.add(cy);
  years.add(String(Number(cy) - 1));
  return [...years]
    .sort((a, b) => Number(b) - Number(a))
    .map((y) => ({ key: y, label: `Tax year ${y}` }));
}

// Pure estimator. Uses existing Finance records only. Never invents rates.
//
// Returns:
//   income, expenses, taxablePosition (income − deductible expenses),
//   estimatedTax (null when rate rules are not configured),
//   estimatedTaxStatus ("available" | "unavailable"),
//   estimatedTaxNote (plain-English explanation),
//   vatCollected/vatPaid/vatNet, recordsNeeded (with done flags), readiness.
export function computeNigeriaEstimate({ transactions, categories, profile, periodKey, rentPaid }) {
  const cur = profile?._currency || "";
  const year = String(periodKey);
  const inPeriod = (t) => t.date && String(t.date).slice(0, 4) === year;
  const cleared = (transactions || []).filter((t) => t.status !== "cancelled" && inPeriod(t));

  const incomeTxns = cleared.filter((t) => t.direction === "in");
  const expenseTxns = cleared.filter((t) => t.direction === "out");
  const income = incomeTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenses = expenseTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
  const vatCollected = incomeTxns.reduce((s, t) => s + Number(t.tax_amount || 0), 0);
  const vatPaid = expenseTxns.reduce((s, t) => s + Number(t.tax_amount || 0), 0);

  // Estimated taxable position = income − deductible expenses. FADS treats all
  // recorded, cleared expenses as potentially deductible and flags them for
  // review — it does not make a final deductibility decision.
  const taxablePosition = income - expenses;

  // Estimated Personal Income Tax: requires configured rate rules for the
  // selected tax year. If the year is not supported, do NOT silently apply
  // 2026 rates — report it honestly.
  const pit = NIGERIA_RATE_CONFIG.personalIncomeTax;
  const yearSupported = (NIGERIA_RATE_CONFIG.supportedYears || []).includes(year);
  let estimatedTax = null;
  let estimatedTaxStatus = "unavailable";
  let estimatedTaxNote = "";
  let chargeableIncome = null;
  let rentRelief = 0;
  let bandBreakdown = [];
  let monthlyEquivalent = null;

  if (!yearSupported) {
    estimatedTaxStatus = "unsupported_year";
    estimatedTaxNote =
      `Nigeria tax rules for the year ${year} are not configured in FADS. Estimated tax is only available for ${NIGERIA_RATE_CONFIG.supportedYears.join(", ")}. Confirm your final liability with the appropriate tax authority or a qualified tax professional.`;
  } else if (pit) {
    rentRelief = nigeriaRentRelief(rentPaid, pit.rentRelief);
    chargeableIncome = Math.max(0, taxablePosition - rentRelief);
    const { tax, breakdown } = applyNigeriaPitBands(chargeableIncome, pit.bands);
    estimatedTax = tax;
    monthlyEquivalent = tax / 12;
    bandBreakdown = breakdown;
    estimatedTaxStatus = "available";
    estimatedTaxNote = "Estimated Personal Income Tax computed from the Nigeria Tax Act 2025 rates effective from 1 January 2026.";
  } else {
    estimatedTaxStatus = "unavailable";
    estimatedTaxNote =
      "Nigerian tax rate and band configuration is not yet available in FADS, so the estimated tax amount cannot be completed yet.";
  }

  // Records-needed checklist with current status.
  const recordsNeeded = NIGERIA_RECORDS_NEEDED.map((r) => {
    let done = false;
    if (r.key === "income_records") done = incomeTxns.length > 0;
    else if (r.key === "expense_records") done = expenseTxns.length > 0;
    else if (r.key === "vat_records") done = !!profile?.vat_registered && (vatCollected > 0 || vatPaid > 0);
    else if (r.key === "tin") done = !!(profile?.tax_ids && profile.tax_ids.tin);
    return { ...r, done };
  });

  const doneCount = recordsNeeded.filter((r) => r.done).length;
  const readiness = Math.round((doneCount / recordsNeeded.length) * 100);

  return {
    periodKey: year,
    currency: cur,
    income,
    expenses,
    taxablePosition,
    chargeableIncome,
    rentRelief,
    bandBreakdown,
    monthlyEquivalent,
    vatCollected,
    vatPaid,
    vatNet: vatCollected - vatPaid,
    estimatedTax,
    estimatedTaxStatus,
    estimatedTaxNote,
    ratesConfigured: NIGERIA_RATE_CONFIG.ratesConfigured === true,
    yearSupported,
    rulesYear: pit?.rulesYear || null,
    recordsNeeded,
    readiness,
    transactionCount: cleared.length,
    incomeCount: incomeTxns.length,
    expenseCount: expenseTxns.length,
  };
}

export function nigeriaEntityTypeLabel(value) {
  const pack = getTaxPack("NG");
  return pack?.entityTypes.find((e) => e.value === value)?.label || value || "";
}

export function nigeriaObligations(entityType) {
  return getObligations("NG", entityType).map((o) => OBLIGATION_LABELS[o] || o);
}