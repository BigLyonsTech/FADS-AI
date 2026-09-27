// FADS Year-End Tax Preparation Report — data builder.
// Reuses the EXISTING Finance records, Tax Profile, and FADS Tax Check
// (runTaxCheck / buildAccountantPackData). No new predictions, no new data
// source. Clearly labels estimates and incomplete information. Pure function.

import { buildAccountantPackData, entityTypeLabel, getObligations, OBLIGATION_LABELS } from "@/lib/taxRules";

// Driver running-cost categories grouped for the Taxi/Self-Employed expense
// breakdown. Matched case-insensitively against recorded category names.
const DRIVER_RUNNING_COST_KEYWORDS = [
  "fuel", "diesel", "petrol", "servicing", "service", "repair", "repairs",
  "tyre", "tyres", "tire", "tires", "cleaning", "clean", "park", "parking",
  "toll", "tolls", "insurance", "moto tax", "licens", "licence", "license",
  "phone", "data",
];

function isDriverRunningCost(name) {
  const n = String(name || "").toLowerCase();
  return DRIVER_RUNNING_COST_KEYWORDS.some((k) => n.includes(k));
}

// Build the structured report data used by the Year-End Tax Preparation Report
// PDF and the DIY Tax Preparation Journey.
export function buildTaxPrepReportData(org, taxProfile, finance, taxCheck) {
  const pack = buildAccountantPackData(org, taxProfile, finance, taxCheck);
  const cur = org?.currency || "";
  const isDriver = org?.type === "taxi_driver" || org?.type === "self_employed";

  // Expense breakdown by category (expenses only), sorted high to low.
  const expenseByCategory = (pack.byCategory || [])
    .map((c) => ({ name: c.name, amount: Number(c.expense || 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Income breakdown by category (income only).
  const incomeByCategory = (pack.byCategory || [])
    .map((c) => ({ name: c.name, amount: Number(c.income || 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Driver running-cost subtotal (where applicable).
  let driverRunningCosts = null;
  if (isDriver) {
    const running = expenseByCategory.filter((c) => isDriverRunningCost(c.name));
    const runningTotal = running.reduce((s, c) => s + c.amount, 0);
    driverRunningCosts = { items: running, total: runningTotal };
  }

  // Missing receipts (from tax check findings if present, else recompute).
  const cleared = (finance.transactions || []).filter((t) => t.status === "cleared");
  const missingReceipts = cleared.filter(
    (t) => t.direction === "out" && Number(t.amount) >= 50 && !t.receipt_file_url
  );

  // Transactions requiring review (pending + flagged findings).
  const needsReview = (finance.transactions || []).filter((t) => t.status === "pending");
  const reviewFindings = (taxCheck?.findings || []).filter(
    (f) => f.type === "uncategorized" || f.type === "duplicates" || f.type === "needs_review" || f.type === "incomplete"
  );

  // Outstanding information — what's still missing before this report is final.
  const outstanding = [];
  if (!taxProfile) outstanding.push("No Tax Profile set up — jurisdiction, entity type and tax year are not confirmed.");
  if (missingReceipts.length > 0) outstanding.push(`${missingReceipts.length} expense${missingReceipts.length === 1 ? "" : "s"} of ${cur} 50+ with no receipt attached.`);
  if (needsReview.length > 0) outstanding.push(`${needsReview.length} pending record${needsReview.length === 1 ? "" : "s"} not yet cleared.`);
  if (reviewFindings.length > 0) outstanding.push(`${reviewFindings.length} FADS Tax Check item${reviewFindings.length === 1 ? "" : "s"} still flagged for review.`);
  const uncategorized = cleared.filter((t) => !t.category_id);
  if (uncategorized.length > 0) outstanding.push(`${uncategorized.length} uncategorised transaction${uncategorized.length === 1 ? "" : "s"}.`);

  // Preparation checklist — derived from the data above.
  const checklist = [
    { label: "Tax Profile set up (jurisdiction, entity type, tax year)", done: !!taxProfile },
    { label: "All income recorded", done: pack.income > 0 },
    { label: "All expenses recorded and categorised", done: uncategorized.length === 0 },
    { label: "All receipts attached", done: missingReceipts.length === 0 },
    { label: "All records reviewed and cleared", done: needsReview.length === 0 && reviewFindings.length === 0 },
    { label: "FADS Tax Check passed (no open findings)", done: (taxCheck?.findings || []).length === 0 },
  ];

  const obligations = taxProfile ? getObligations(org?.country, taxProfile.entity_type) : [];

  return {
    org,
    taxProfile,
    cur,
    isDriver,
    income: pack.income,
    expenses: pack.expenses,
    profit: pack.net,
    transactionCount: pack.transactionCount,
    incomeByCategory,
    expenseByCategory,
    driverRunningCosts,
    vatCollected: pack.vatCollected,
    vatPaid: pack.vatPaid,
    vatNet: pack.vatNet,
    missingReceipts,
    needsReview,
    reviewFindings,
    taxReadiness: taxCheck?.readiness ?? null,
    taxFindings: taxCheck?.findings || [],
    outstanding,
    checklist,
    obligations,
    obligationsLabels: obligations.map((o) => OBLIGATION_LABELS[o] || o),
    entityTypeLabel: taxProfile ? entityTypeLabel(org?.country, taxProfile.entity_type) : "Not set up",
    generatedAt: new Date().toISOString(),
    dataModeLabel: org?.data_mode === "demo" ? "Demo" : "Live",
  };
}