// FADS Business Intelligence — pure computation from existing Finance + Invoice
// data. No new entities, no backend calls. Reuses FinanceTransaction, Invoice,
// FinanceCategory, FinanceAccount and Organisation records already loaded by
// useFinance / useInvoices. Every function returns structured data; the UI
// layers formatting on top. All predictions are labelled as estimates based on
// the records currently available in FADS — never presented as guaranteed.

const DAY = 86400000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function prevMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}
function parseDate(s) {
  if (!s) return null;
  const d = s.length === 10 ? new Date(s + "T00:00:00") : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function num(n) {
  return Number(n) || 0;
}
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + num(v), 0) / arr.length;
}

// ---- Cash now (mirrors useFinance totalBalance logic) ----
function cashNow(finance) {
  const cleared = finance.transactions.filter(
    (t) => t.status === "cleared" || t.status === "completed"
  );
  const net = cleared.reduce(
    (s, t) => s + (t.direction === "in" ? num(t.amount) : -num(t.amount)),
    0
  );
  const opening = (finance.accounts || []).reduce(
    (s, a) => s + num(a.opening_balance),
    0
  );
  return opening + net;
}

// ============================================================
// 1. CASHFLOW & SURVIVAL PREDICTOR
// ============================================================
export function computeCashflow(finance, invoices, org) {
  const cur = org?.currency || "";
  const cleared = finance.transactions.filter(
    (t) => t.status === "cleared" || t.status === "completed"
  );
  const now = Date.now();
  const window90 = cleared.filter((t) => {
    const d = parseDate(t.date);
    return d && now - d.getTime() <= 90 * DAY;
  });
  const out90 = window90.filter((t) => t.direction === "out");
  const in90 = window90.filter((t) => t.direction === "in");
  const totalOut90 = out90.reduce((s, t) => s + num(t.amount), 0);
  const totalIn90 = in90.reduce((s, t) => s + num(t.amount), 0);
  const avgDailyOut = totalOut90 / 90;
  const avgDailyIn = totalIn90 / 90;
  const netBurnPerDay = avgDailyOut - avgDailyIn;

  const cash = cashNow(finance);

  // Expected money in = outstanding invoice balances (not cancelled/paid)
  const outstandingInv = (invoices || []).filter(
    (inv) => num(inv.balance) > 0 && inv.status !== "paid" && inv.status !== "cancelled"
  );
  const expectedIn = outstandingInv.reduce((s, inv) => s + num(inv.balance), 0);

  // Expected money out next 30d = average daily outflow × 30 (recurring estimate)
  const expectedOut = avgDailyOut * 30;

  const projected30 = cash + expectedIn - expectedOut;

  let daysToTight = null;
  let status = "STABLE";
  if (netBurnPerDay > 0) {
    daysToTight = Math.floor(cash / netBurnPerDay);
    if (cash <= 0) status = "TIGHT";
    else if (daysToTight < 15) status = "TIGHT";
    else if (daysToTight < 30) status = "CAUTION";
    else if (daysToTight < 60) status = "WATCH";
    else status = "OK";
  } else if (cash <= 0) {
    status = "TIGHT";
  }

  const hasData = cleared.length >= 3;
  const majorRisk =
    status === "TIGHT"
      ? "Available cash may become tight very soon based on your current recorded spending rate."
      : status === "CAUTION"
      ? "Cash is projected to decline over the next month if expected receipts are delayed."
      : status === "WATCH"
      ? "Spending is currently outpacing income based on recent records."
      : "No immediate cash-flow risk detected from available records.";

  const recommendedAction =
    status === "TIGHT"
      ? "Prioritise collecting overdue invoices and delay non-essential spending this week."
      : status === "CAUTION"
      ? "Follow up on outstanding invoices and review recurring expenses."
      : status === "WATCH"
      ? "Monitor spending and accelerate invoice collection."
      : "Keep recording income and expenses to keep this outlook accurate.";

  return {
    hasData,
    currency: cur,
    cashNow: cash,
    expectedIn,
    expectedOut,
    projected30,
    avgDailyOut,
    avgDailyIn,
    netBurnPerDay,
    daysToTight,
    status,
    majorRisk,
    recommendedAction,
    outstandingInvoiceCount: outstandingInv.length,
  };
}

// ============================================================
// 2. DEBT & PAYMENT RECOVERY (ageing)
// ============================================================
export function computeDebtAgeing(invoices, org) {
  const cur = org?.currency || "";
  const today = parseDate(todayStr());
  const outstanding = (invoices || []).filter(
    (inv) => num(inv.balance) > 0 && inv.status !== "paid" && inv.status !== "cancelled"
  );
  const rows = outstanding.map((inv) => {
    const due = parseDate(inv.due_date);
    const daysOverdue = due ? Math.floor((today - due) / DAY) : 0;
    let bucket = "current";
    if (daysOverdue > 0) {
      if (daysOverdue <= 30) bucket = "1-30";
      else if (daysOverdue <= 60) bucket = "31-60";
      else if (daysOverdue <= 90) bucket = "61-90";
      else bucket = "90+";
    }
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name || "Unknown",
      balance: num(inv.balance),
      due_date: inv.due_date,
      issue_date: inv.issue_date,
      daysOverdue,
      bucket,
      url: `/finance/invoices/${inv.id}`,
    };
  });
  const buckets = {
    current: rows.filter((r) => r.bucket === "current"),
    "1-30": rows.filter((r) => r.bucket === "1-30"),
    "31-60": rows.filter((r) => r.bucket === "31-60"),
    "61-90": rows.filter((r) => r.bucket === "61-90"),
    "90+": rows.filter((r) => r.bucket === "90+"),
  };
  const totals = {
    current: buckets.current.reduce((s, r) => s + r.balance, 0),
    "1-30": buckets["1-30"].reduce((s, r) => s + r.balance, 0),
    "31-60": buckets["31-60"].reduce((s, r) => s + r.balance, 0),
    "61-90": buckets["61-90"].reduce((s, r) => s + r.balance, 0),
    "90+": buckets["90+"].reduce((s, r) => s + r.balance, 0),
  };
  const overdueRows = rows
    .filter((r) => r.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  const totalOverdue = overdueRows.reduce((s, r) => s + r.balance, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.balance, 0);
  return {
    currency: cur,
    rows,
    buckets,
    totals,
    overdueRows,
    totalOverdue,
    totalOutstanding,
    overdueCount: overdueRows.length,
    hasData: rows.length > 0,
  };
}

// ============================================================
// 3. BUSINESS GUARDIAN (anomaly detection)
// ============================================================
function catName(finance, catId) {
  const c = (finance.categories || []).find((x) => x.id === catId);
  return c ? c.name : "Uncategorised";
}
function contactName(finance, contactId) {
  const c = (finance.contacts || []).find((x) => x.id === contactId);
  return c ? c.name : "";
}

export function computeGuardian(finance, org) {
  const cur = org?.currency || "";
  const cleared = finance.transactions.filter(
    (t) => t.status === "cleared" || t.status === "completed"
  );
  const out = cleared.filter((t) => t.direction === "out");
  const anomalies = [];

  // --- Duplicate expenses (same amount + similar description, within 7 days) ---
  const seen = new Map();
  out.forEach((t) => {
    const d = parseDate(t.date);
    if (!d) return;
    const key = `${num(t.amount).toFixed(2)}|${(t.description || "").toLowerCase().trim().slice(0, 40)}`;
    const prev = seen.get(key);
    if (prev) {
      const gap = Math.abs(d - prev.d) / DAY;
      if (gap <= 7) {
        anomalies.push({
          type: "duplicate_expense",
          severity: "warn",
          title: "Possible duplicate expense",
          detail: `Two similar payments of ${cur} ${num(t.amount).toFixed(2)} — "${(t.description || "").slice(0, 50)}" — within ${Math.round(gap)} day(s). Worth reviewing.`,
          amount: num(t.amount),
          url: `/finance/transactions/${t.id}`,
          ids: [prev.t.id, t.id],
        });
      }
    } else {
      seen.set(key, { t, d });
    }
  });

  // --- Duplicate invoices (same number, or same customer + same total) ---
  const invSeen = new Map();
  (finance.invoices || []).forEach((inv) => {
    if (!inv.invoice_number) return;
    const keyNum = `num|${inv.invoice_number}`;
    const keyCust = `cust|${inv.customer_name || ""}|${num(inv.total).toFixed(2)}`;
    [keyNum, keyCust].forEach((k) => {
      const prev = invSeen.get(k);
      if (prev && prev.id !== inv.id) {
        anomalies.push({
          type: "duplicate_invoice",
          severity: "warn",
          title: "Possible duplicate invoice",
          detail: `Invoice ${inv.invoice_number} for ${inv.customer_name || "unknown"} (${cur} ${num(inv.total).toFixed(2)}) matches another record. Worth reviewing.`,
          amount: num(inv.total),
          url: `/finance/invoices/${inv.id}`,
          ids: [prev.id, inv.id],
        });
      } else {
        invSeen.set(k, inv);
      }
    });
  });

  // --- Unusually large transaction (> 3× average out) ---
  const avgOut = avg(out.map((t) => num(t.amount)));
  if (avgOut > 0) {
    out.forEach((t) => {
      if (num(t.amount) > avgOut * 3 && num(t.amount) > 0) {
        anomalies.push({
          type: "large_transaction",
          severity: "info",
          title: "Unusually large expense",
          detail: `Payment of ${cur} ${num(t.amount).toFixed(2)} to "${(t.description || "").slice(0, 50)}" is significantly larger than your average expense (${cur} ${avgOut.toFixed(2)}). Worth reviewing.`,
          amount: num(t.amount),
          url: `/finance/transactions/${t.id}`,
          ids: [t.id],
        });
      }
    });
  }

  // --- Category spike (this month > 1.5× previous 3-month average) ---
  const thisMk = monthKey();
  const prev3 = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    prev3.push(monthKey(d));
  }
  const outByCatMonth = {};
  out.forEach((t) => {
    const mk = (t.date || "").slice(0, 7);
    const key = `${t.category_id || "none"}|${mk}`;
    outByCatMonth[key] = (outByCatMonth[key] || 0) + num(t.amount);
  });
  (finance.categories || [])
    .filter((c) => c.kind === "expense" || c.account_class === "expense")
    .forEach((c) => {
      const thisMonth = outByCatMonth[`${c.id}|${thisMk}`] || 0;
      const prevAvg = avg(prev3.map((mk) => outByCatMonth[`${c.id}|${mk}`] || 0));
      if (prevAvg > 0 && thisMonth > prevAvg * 1.5) {
        anomalies.push({
          type: "category_spike",
          severity: "warn",
          title: "Expense category above recent average",
          detail: `${c.name} expenses are ${cur} ${thisMonth.toFixed(2)} this month, significantly higher than the recent monthly average of ${cur} ${prevAvg.toFixed(2)}.`,
          amount: thisMonth,
          url: "/finance/transactions",
          ids: [],
        });
      }
    });

  // --- Supplier cost increase (same supplier, this month avg > 1.2× prev 3mo avg) ---
  const outByContactMonth = {};
  out.forEach((t) => {
    if (!t.contact_id) return;
    const mk = (t.date || "").slice(0, 7);
    const key = `${t.contact_id}|${mk}`;
    outByContactMonth[key] = (outByContactMonth[key] || 0) + num(t.amount);
  });
  const supplierIds = [...new Set(out.map((t) => t.contact_id).filter(Boolean))];
  supplierIds.forEach((sid) => {
    const thisMonth = outByContactMonth[`${sid}|${thisMk}`] || 0;
    const prevAvg = avg(prev3.map((mk) => outByContactMonth[`${sid}|${mk}`] || 0));
    if (prevAvg > 0 && thisMonth > prevAvg * 1.2) {
      anomalies.push({
        type: "supplier_increase",
        severity: "info",
        title: "Supplier cost increase",
        detail: `Payments to ${contactName(finance, sid) || "a supplier"} are ${cur} ${thisMonth.toFixed(2)} this month, up from a recent average of ${cur} ${prevAvg.toFixed(2)}.`,
        amount: thisMonth,
        url: "/finance/contacts",
        ids: [],
      });
    }
  });

  // --- Spending spike (this month total out > 1.3× prev 3mo average) ---
  const thisMonthTotal = out
    .filter((t) => (t.date || "").slice(0, 7) === thisMk)
    .reduce((s, t) => s + num(t.amount), 0);
  const prevMonthAvg = avg(
    prev3.map((mk) => out.filter((t) => (t.date || "").slice(0, 7) === mk).reduce((s, t) => s + num(t.amount), 0))
  );
  if (prevMonthAvg > 0 && thisMonthTotal > prevMonthAvg * 1.3) {
    anomalies.push({
      type: "spending_spike",
      severity: "warn",
      title: "Unexpected spending spike",
      detail: `Total expenses this month are ${cur} ${thisMonthTotal.toFixed(2)}, significantly higher than the recent monthly average of ${cur} ${prevMonthAvg.toFixed(2)}.`,
      amount: thisMonthTotal,
      url: "/finance/transactions",
      ids: [],
    });
  }

  // De-duplicate by type+ids signature to avoid noise
  const dedup = [];
  const sigs = new Set();
  anomalies.forEach((a) => {
    const sig = `${a.type}|${(a.ids || []).sort().join(",")}|${(a.detail || "").slice(0, 30)}`;
    if (!sigs.has(sig)) {
      sigs.add(sig);
      dedup.push(a);
    }
  });

  return {
    currency: cur,
    anomalies: dedup,
    count: dedup.length,
    hasData: cleared.length >= 3,
  };
}

// ============================================================
// 4. BUSINESS HEALTH (0–100)
// ============================================================
export function computeBusinessHealth(finance, invoices, org) {
  const cleared = finance.transactions.filter(
    (t) => t.status === "cleared" || t.status === "completed"
  );
  const hasData = cleared.length >= 5;
  const cashflow = computeCashflow(finance, invoices, org);
  const debt = computeDebtAgeing(invoices, org);
  const guardian = computeGuardian(finance, org);

  // Cashflow (25)
  let cashflowScore = 25;
  if (cashflow.status === "TIGHT") cashflowScore = 5;
  else if (cashflow.status === "CAUTION") cashflowScore = 12;
  else if (cashflow.status === "WATCH") cashflowScore = 18;
  else if (cashflow.status === "OK") cashflowScore = 25;
  else if (cashflow.status === "STABLE") cashflowScore = 25;

  // Profitability (20) — based on net margin of cleared transactions
  const totalIn = cleared.filter((t) => t.direction === "in").reduce((s, t) => s + num(t.amount), 0);
  const totalOut = cleared.filter((t) => t.direction === "out").reduce((s, t) => s + num(t.amount), 0);
  const net = totalIn - totalOut;
  const margin = totalIn > 0 ? net / totalIn : 0;
  let profitScore = 6;
  if (totalIn === 0) profitScore = 6;
  else if (margin >= 0.2) profitScore = 20;
  else if (margin >= 0) profitScore = 14;
  else profitScore = 4;

  // Debt collection (20)
  let debtScore = 20;
  if (debt.totalOutstanding > 0) {
    const ratio = debt.totalOverdue / debt.totalOutstanding;
    debtScore = Math.round(20 * (1 - Math.min(1, ratio)));
  }

  // Expense control (15) — penalise spending spikes
  const spike = guardian.anomalies.find((a) => a.type === "spending_spike");
  let expenseScore = 15;
  if (spike) expenseScore = 8;
  const catSpike = guardian.anomalies.filter((a) => a.type === "category_spike").length;
  if (catSpike > 0) expenseScore = Math.max(4, expenseScore - catSpike * 2);

  // Record completeness (10) — % of cleared transactions categorised
  const categorised = cleared.filter((t) => t.category_id).length;
  const completeness = cleared.length > 0 ? categorised / cleared.length : 0;
  const recordScore = Math.round(completeness * 10);

  const areas = [
    { name: "Cash flow", score: cashflowScore, max: 25 },
    { name: "Profitability", score: profitScore, max: 20 },
    { name: "Debt collection", score: debtScore, max: 20 },
    { name: "Expense control", score: expenseScore, max: 15 },
    { name: "Record completeness", score: recordScore, max: 10 },
  ];
  const score = areas.reduce((s, a) => s + a.score, 0);
  const strongest = [...areas].sort((a, b) => b.score / b.max - a.score / a.max)[0];
  const weakest = [...areas].sort((a, b) => a.score / a.max - b.score / b.max)[0];
  const topAction =
    weakest.name === "Cash flow"
      ? "Prioritise collecting overdue invoices and review recurring expenses."
      : weakest.name === "Debt collection"
      ? "Follow up with overdue customers — see Debt Recovery below."
      : weakest.name === "Record completeness"
      ? "Categorise uncategorised transactions to improve your insights."
      : `Focus on improving ${weakest.name.toLowerCase()}.`;

  return {
    hasData,
    score,
    maxScore: areas.reduce((s, a) => s + a.max, 0),
    areas,
    strongest,
    weakest,
    topAction,
  };
}

// ============================================================
// 5. FUNDING READINESS (0–100) — record readiness, NOT a credit score
// ============================================================
export function computeFundingReadiness(finance, invoices, org) {
  const cleared = finance.transactions.filter(
    (t) => t.status === "cleared" || t.status === "completed"
  );
  const hasData = cleared.length >= 10;
  const cashflow = computeCashflow(finance, invoices, org);
  const debt = computeDebtAgeing(invoices, org);

  // Revenue consistency (25) — coefficient of variation of last 6 months income
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d));
  }
  const inByMonth = months.map((mk) =>
    cleared
      .filter((t) => t.direction === "in" && (t.date || "").slice(0, 7) === mk)
      .reduce((s, t) => s + num(t.amount), 0)
  );
  const nonZero = inByMonth.filter((v) => v > 0);
  let revScore = 8;
  if (nonZero.length >= 3) {
    const mean = avg(nonZero);
    const sd = Math.sqrt(avg(nonZero.map((v) => (v - mean) ** 2)));
    const cv = mean > 0 ? sd / mean : 1;
    if (cv < 0.3) revScore = 25;
    else if (cv < 0.6) revScore = 18;
    else revScore = 12;
  }

  // Record completeness (25) — categorisation + receipts
  const categorised = cleared.filter((t) => t.category_id).length;
  const completeness = cleared.length > 0 ? categorised / cleared.length : 0;
  const materialOut = cleared.filter((t) => t.direction === "out" && num(t.amount) >= 50);
  const withReceipt = materialOut.filter((t) => t.receipt_file_url).length;
  const receiptRate = materialOut.length > 0 ? withReceipt / materialOut.length : 0.5;
  const recordScore = Math.round((completeness * 0.6 + receiptRate * 0.4) * 25);

  // Cash-flow stability (20)
  const stableScore = cashflow.netBurnPerDay <= 0 ? 20 : cashflow.status === "OK" ? 16 : cashflow.status === "WATCH" ? 12 : 6;

  // Debt management (15)
  let debtScore = 15;
  if (debt.totalOutstanding > 0) {
    const ratio = debt.totalOverdue / debt.totalOutstanding;
    if (ratio < 0.2) debtScore = 12;
    else if (ratio < 0.5) debtScore = 8;
    else debtScore = 4;
  }

  const score = revScore + recordScore + stableScore + debtScore;
  const strong = [];
  const missing = [];
  const improve = [];
  if (revScore >= 20) strong.push("Revenue is consistent across recent months.");
  if (recordScore >= 18) strong.push("Records are well categorised and documented.");
  if (stableScore >= 16) strong.push("Cash flow is stable based on recent records.");
  if (debtScore >= 12) strong.push("Customer debt is well managed.");
  if (revScore < 15) improve.push("Record income more consistently to show revenue stability.");
  if (recordScore < 15) missing.push("Categorise more transactions and attach receipts to material expenses.");
  if (stableScore < 12) improve.push("Improve cash-flow stability by managing spending and collections.");
  if (debtScore < 10) improve.push("Reduce overdue customer debt to strengthen your profile.");

  return {
    hasData,
    score,
    maxScore: 85,
    strong,
    missing,
    improve,
    breakdown: {
      revenueConsistency: revScore,
      recordCompleteness: recordScore,
      cashflowStability: stableScore,
      debtManagement: debtScore,
    },
  };
}

// ============================================================
// 6. NIGERIA OPERATING / ENERGY COST INSIGHT (NG only)
// ============================================================
const ENERGY_KEYWORDS = [
  "electricity", "disco", "generator", "fuel", "diesel", "petrol",
  "solar", "inverter", "battery", "power", "energy", "prepaid", "meter",
];

export function computeEnergyInsight(finance, org) {
  const cur = org?.currency || "";
  if (org?.country !== "NG") {
    return { hasData: false, applicable: false, currency: cur };
  }
  const cleared = finance.transactions.filter(
    (t) => t.status === "cleared" || t.status === "completed"
  );
  const out = cleared.filter((t) => t.direction === "out");

  // Identify energy categories by name match
  const energyCatIds = new Set(
    (finance.categories || [])
      .filter((c) => {
        const name = (c.name || "").toLowerCase();
        return ENERGY_KEYWORDS.some((kw) => name.includes(kw));
      })
      .map((c) => c.id)
  );
  // Also match by description keyword if uncategorised
  const isEnergy = (t) => {
    if (t.category_id && energyCatIds.has(t.category_id)) return true;
    const desc = (t.description || "").toLowerCase();
    return ENERGY_KEYWORDS.some((kw) => desc.includes(kw));
  };

  const thisMk = monthKey();
  const lastMk = prevMonthKey();
  const energyThisMonth = out
    .filter((t) => isEnergy(t) && (t.date || "").slice(0, 7) === thisMk)
    .reduce((s, t) => s + num(t.amount), 0);
  const energyLastMonth = out
    .filter((t) => isEnergy(t) && (t.date || "").slice(0, 7) === lastMk)
    .reduce((s, t) => s + num(t.amount), 0);
  const totalExpensesThisMonth = out
    .filter((t) => (t.date || "").slice(0, 7) === thisMk)
    .reduce((s, t) => s + num(t.amount), 0);

  const share = totalExpensesThisMonth > 0 ? energyThisMonth / totalExpensesThisMonth : 0;
  const changePct = energyLastMonth > 0 ? ((energyThisMonth - energyLastMonth) / energyLastMonth) * 100 : null;

  // Scenario: 15% reduction
  const scenarioSavings = energyThisMonth * 0.15;

  // Top energy categories this month
  const byCat = {};
  out
    .filter((t) => isEnergy(t) && (t.date || "").slice(0, 7) === thisMk)
    .forEach((t) => {
      const name = catName(finance, t.category_id) || (t.description || "Energy");
      byCat[name] = (byCat[name] || 0) + num(t.amount);
    });
  const topCategories = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    hasData: energyThisMonth > 0,
    applicable: true,
    currency: cur,
    monthCost: energyThisMonth,
    shareOfExpenses: share,
    changePct,
    topCategories,
    scenarioSavings,
    lastMonthCost: energyLastMonth,
  };
}

// ============================================================
// Convenience: compute everything in one pass
// ============================================================
export function computeIntelligence(finance, invoices, org) {
  return {
    cashflow: computeCashflow(finance, invoices, org),
    debt: computeDebtAgeing(invoices, org),
    guardian: computeGuardian(finance, org),
    health: computeBusinessHealth(finance, invoices, org),
    funding: computeFundingReadiness(finance, invoices, org),
    energy: computeEnergyInsight(finance, org),
  };
}