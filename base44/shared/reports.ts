// Shared report-computation helpers for the Phase 1E Reports Centre.
// All functions are pure: they take already-loaded org data and return
// computed aggregates. The backend function loads the data (RLS-enforced)
// and passes it here so figures are verified against source transactions.

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  account_id?: string;
  category_id?: string;
  contact_id?: string;
  currency?: string;
  status?: string;
}

// Apply user filters to a transaction list. Date comparison is string-based
// (ISO yyyy-mm-dd) which sorts correctly.
export function applyFilters(transactions: any[], f: ReportFilters): any[] {
  return transactions.filter((t) => {
    if (f.date_from && (!t.date || t.date < f.date_from)) return false;
    if (f.date_to && (!t.date || t.date > f.date_to)) return false;
    if (f.account_id && t.account_id !== f.account_id) return false;
    if (f.category_id && t.category_id !== f.category_id) return false;
    if (f.contact_id && t.contact_id !== f.contact_id) return false;
    if (f.currency && t.currency !== f.currency) return false;
    if (f.status && t.status !== f.status) return false;
    return true;
  });
}

// Only cleared transactions count toward financial report totals.
// "completed" is kept for back-compat with pre-Phase-1B records.
export function clearedOnly(transactions: any[]): any[] {
  return transactions.filter((t) => t.status === "cleared" || t.status === "completed");
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// 1. Income and Expense report
export function computeIncomeExpense(transactions: any[], f: ReportFilters) {
  const txns = clearedOnly(applyFilters(transactions, f));
  const totalIncome = txns.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txns.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);
  const byMonth: Record<string, { month: string; income: number; expense: number }> = {};
  txns.forEach((t) => {
    const m = t.date?.slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { month: m, income: 0, expense: 0 };
    if (t.direction === "in") byMonth[m].income += Number(t.amount);
    else byMonth[m].expense += Number(t.amount);
  });
  return {
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    net: round2(totalIncome - totalExpense),
    transactionCount: txns.length,
    byMonth: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
      month: m.month,
      income: round2(m.income),
      expense: round2(m.expense),
      net: round2(m.income - m.expense),
    })),
  };
}

// 2. Cash-flow summary
export function computeCashFlow(transactions: any[], accounts: any[], f: ReportFilters) {
  const txns = clearedOnly(applyFilters(transactions, f));
  const totalInflow = txns.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
  const totalOutflow = txns.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);
  const openingBalance = accounts.reduce((s, a) => s + (Number(a.opening_balance) || 0), 0);
  return {
    openingBalance: round2(openingBalance),
    totalInflow: round2(totalInflow),
    totalOutflow: round2(totalOutflow),
    netFlow: round2(totalInflow - totalOutflow),
    closingBalance: round2(openingBalance + totalInflow - totalOutflow),
    transactionCount: txns.length,
  };
}

// 3. Account balance summary
export function computeAccountBalances(accounts: any[], transactions: any[], f: ReportFilters) {
  const txns = clearedOnly(applyFilters(transactions, f));
  return accounts.map((a) => {
    const acctTxns = txns.filter((t) => t.account_id === a.id);
    const inflow = acctTxns.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
    const outflow = acctTxns.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);
    const opening = Number(a.opening_balance) || 0;
    return {
      account_id: a.id,
      name: a.name,
      account_type: a.account_type,
      is_active: a.is_active,
      opening_balance: round2(opening),
      inflow: round2(inflow),
      outflow: round2(outflow),
      current_balance: round2(opening + inflow - outflow),
      transaction_count: acctTxns.length,
    };
  });
}

// 4. Outstanding invoices
export function computeOutstandingInvoices(invoices: any[], asOfDate?: string) {
  const today = asOfDate || new Date().toISOString().slice(0, 10);
  const outstanding = invoices
    .filter((i) => i.status !== "draft" && i.status !== "cancelled" && i.status !== "paid")
    .filter((i) => Number(i.balance) > 0)
    .map((i) => ({
      ...i,
      is_overdue: i.due_date && i.due_date < today,
      days_overdue: i.due_date ? Math.max(0, Math.floor((new Date(today).getTime() - new Date(i.due_date).getTime()) / 86400000)) : 0,
    }))
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
  return {
    invoices: outstanding,
    count: outstanding.length,
    totalOutstanding: round2(outstanding.reduce((s, i) => s + Number(i.balance), 0)),
    totalOverdue: round2(outstanding.filter((i) => i.is_overdue).reduce((s, i) => s + Number(i.balance), 0)),
  };
}

// 5. Aged receivables
export function computeAgedReceivables(invoices: any[], asOfDate?: string) {
  const today = asOfDate ? new Date(asOfDate) : new Date();
  const todayStr = asOfDate || new Date().toISOString().slice(0, 10);
  const outstanding = invoices
    .filter((i) => i.status !== "draft" && i.status !== "cancelled" && i.status !== "paid")
    .filter((i) => Number(i.balance) > 0);

  const buckets = [
    { label: "Current", min: -1, max: 0, amount: 0, count: 0 },
    { label: "1–30 days", min: 0, max: 30, amount: 0, count: 0 },
    { label: "31–60 days", min: 30, max: 60, amount: 0, count: 0 },
    { label: "61–90 days", min: 60, max: 90, amount: 0, count: 0 },
    { label: "90+ days", min: 90, max: Infinity, amount: 0, count: 0 },
  ];

  outstanding.forEach((i) => {
    const days = i.due_date
      ? Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000)
      : 0;
    const bucket = days <= 0
      ? buckets[0]
      : buckets.find((b) => days > b.min && days <= b.max) || buckets[4];
    bucket.amount += Number(i.balance);
    bucket.count += 1;
  });

  return {
    buckets: buckets.map((b) => ({ ...b, amount: round2(b.amount) })),
    totalOutstanding: round2(outstanding.reduce((s, i) => s + Number(i.balance), 0)),
    count: outstanding.length,
    asOf: todayStr,
  };
}

// 6. Income and expenses by category
export function computeCategoryBreakdown(transactions: any[], categories: any[], f: ReportFilters) {
  const txns = clearedOnly(applyFilters(transactions, f));
  const incomeCats = categories.filter((c) => c.kind === "income");
  const expenseCats = categories.filter((c) => c.kind === "expense");

  const sumByCat = (catList, direction) => {
    const total = txns.filter((t) => t.direction === direction).reduce((s, t) => s + Number(t.amount), 0);
    return catList.map((c) => {
      const amount = txns
        .filter((t) => t.category_id === c.id && t.direction === direction)
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        category_id: c.id,
        name: c.name,
        kind: c.kind,
        amount: round2(amount),
        transaction_count: txns.filter((t) => t.category_id === c.id && t.direction === direction).length,
        percentage: total > 0 ? round2((amount / total) * 100) : 0,
      };
    }).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  };

  const income = sumByCat(incomeCats, "in");
  const expense = sumByCat(expenseCats, "out");
  const uncategorisedIncome = txns.filter((t) => t.direction === "in" && !t.category_id).reduce((s, t) => s + Number(t.amount), 0);
  const uncategorisedExpense = txns.filter((t) => t.direction === "out" && !t.category_id).reduce((s, t) => s + Number(t.amount), 0);

  return {
    income,
    expense,
    uncategorisedIncome: round2(uncategorisedIncome),
    uncategorisedExpense: round2(uncategorisedExpense),
    totalIncome: round2(income.reduce((s, c) => s + c.amount, 0) + uncategorisedIncome),
    totalExpense: round2(expense.reduce((s, c) => s + c.amount, 0) + uncategorisedExpense),
  };
}

// 7. Monthly comparisons and trend charts
export function computeMonthlyTrends(transactions: any[], f: ReportFilters, months = 12) {
  const txns = clearedOnly(applyFilters(transactions, f));
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const byMonth: Record<string, { income: number; expense: number }> = {};
  monthKeys.forEach((m) => (byMonth[m] = { income: 0, expense: 0 }));
  txns.forEach((t) => {
    const m = t.date?.slice(0, 7);
    if (m && byMonth[m]) {
      if (t.direction === "in") byMonth[m].income += Number(t.amount);
      else byMonth[m].expense += Number(t.amount);
    }
  });
  let cumIncome = 0, cumExpense = 0;
  return monthKeys.map((m) => {
    cumIncome += byMonth[m].income;
    cumExpense += byMonth[m].expense;
    return {
      month: m,
      income: round2(byMonth[m].income),
      expense: round2(byMonth[m].expense),
      net: round2(byMonth[m].income - byMonth[m].expense),
      cumulativeIncome: round2(cumIncome),
      cumulativeExpense: round2(cumExpense),
    };
  });
}

// 8. Tax-record summary
export function computeTaxSummary(transactions: any[], f: ReportFilters) {
  const txns = clearedOnly(applyFilters(transactions, f));
  const taxCollected = txns.filter((t) => t.direction === "in").reduce((s, t) => s + (Number(t.tax_amount) || 0), 0);
  const taxPaid = txns.filter((t) => t.direction === "out").reduce((s, t) => s + (Number(t.tax_amount) || 0), 0);
  const byMonth: Record<string, { month: string; collected: number; paid: number }> = {};
  txns.forEach((t) => {
    const m = t.date?.slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { month: m, collected: 0, paid: 0 };
    if (t.direction === "in") byMonth[m].collected += Number(t.tax_amount) || 0;
    else byMonth[m].paid += Number(t.tax_amount) || 0;
  });
  return {
    taxCollected: round2(taxCollected),
    taxPaid: round2(taxPaid),
    netTax: round2(taxCollected - taxPaid),
    transactionCount: txns.length,
    byMonth: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
      ...m,
      collected: round2(m.collected),
      paid: round2(m.paid),
    })),
  };
}

// 9. Reconciliation status report
// "Reconciled" only when: status=completed AND difference=0 AND all lines
// matched or ignored with a recorded reason.
export function isReconciled(rec: any, lines: any[]): boolean {
  if (rec.status !== "completed") return false;
  if (Math.abs(Number(rec.difference) || 0) > 0.01) return false;
  return lines.every((l) => l.status === "matched" || (l.status === "ignored" && l.ignore_reason));
}

export function computeReconciliationStatus(reconciliations: any[], linesByRec: Record<string, any[]>) {
  const rows = reconciliations.map((rec) => {
    const lines = linesByRec[rec.id] || [];
    const matched = lines.filter((l) => l.status === "matched").length;
    const ignored = lines.filter((l) => l.status === "ignored").length;
    const ignoredWithReason = lines.filter((l) => l.status === "ignored" && l.ignore_reason).length;
    const unmatched = lines.filter((l) => l.status === "unmatched" || l.status === "suggested").length;
    const reconciled = isReconciled(rec, lines);
    return {
      id: rec.id,
      account_name: rec.account_name,
      period_start: rec.period_start,
      period_end: rec.period_end,
      status: rec.status,
      displayStatus: reconciled ? "reconciled" : rec.status === "completed" ? "unreconciled" : unmatched === 0 && ignored + matched === lines.length ? "ready" : "partial",
      imported_count: rec.imported_count || lines.length,
      matched_count: matched,
      ignored_count: ignored,
      ignored_with_reason: ignoredWithReason,
      unmatched_count: unmatched,
      difference: round2(Number(rec.difference) || 0),
      reconciled,
      completed_date: rec.completed_date,
    };
  });
  return {
    rows: rows.sort((a, b) => (b.period_start || "").localeCompare(a.period_start || "")),
    total: rows.length,
    reconciledCount: rows.filter((r) => r.reconciled).length,
    inProgressCount: rows.filter((r) => !r.reconciled).length,
  };
}

// CSV export for a specific report type.
export function reportToCSV(reportType: string, data: any, lookups: any): string {
  const { accounts = [], categories = [], contacts = [] } = lookups || {};
  const name = (list, id) => (id ? (list.find((x) => x.id === id)?.name || "") : "");
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const row = (cells) => cells.map(esc).join(",");

  if (reportType === "income_expense") {
    const header = ["Month", "Income", "Expense", "Net"];
    const rows = data.byMonth.map((m) => row([m.month, m.income, m.expense, m.net]));
    return [row(header), ...rows, "", row(["Total Income", data.totalIncome]), row(["Total Expense", data.totalExpense]), row(["Net", data.net])].join("\n");
  }
  if (reportType === "cash_flow") {
    return [
      row(["Opening Balance", data.openingBalance]),
      row(["Total Inflow", data.totalInflow]),
      row(["Total Outflow", data.totalOutflow]),
      row(["Net Flow", data.netFlow]),
      row(["Closing Balance", data.closingBalance]),
      row(["Transactions", data.transactionCount]),
    ].join("\n");
  }
  if (reportType === "account_balances") {
    const header = ["Account", "Type", "Opening Balance", "Inflow", "Outflow", "Current Balance", "Transactions"];
    const rows = data.map((a) => row([a.name, a.account_type, a.opening_balance, a.inflow, a.outflow, a.current_balance, a.transaction_count]));
    return [row(header), ...rows].join("\n");
  }
  if (reportType === "outstanding_invoices") {
    const header = ["Invoice", "Customer", "Issue Date", "Due Date", "Total", "Balance", "Overdue"];
    const rows = data.invoices.map((i) => row([i.invoice_number, i.customer_name, i.issue_date, i.due_date, i.total, i.balance, i.is_overdue ? "Yes" : "No"]));
    return [row(header), ...rows, "", row(["Total Outstanding", data.totalOutstanding]), row(["Total Overdue", data.totalOverdue])].join("\n");
  }
  if (reportType === "aged_receivables") {
    const header = ["Age Bucket", "Amount", "Count"];
    const rows = data.buckets.map((b) => row([b.label, b.amount, b.count]));
    return [row(header), ...rows, "", row(["Total Outstanding", data.totalOutstanding]), row(["Count", data.count])].join("\n");
  }
  if (reportType === "category_breakdown") {
    const header = ["Category", "Kind", "Amount", "Transactions", "Percentage"];
    const rows = [
      ...data.income.map((c) => row([c.name, "Income", c.amount, c.transaction_count, c.percentage + "%"])),
      ...data.expense.map((c) => row([c.name, "Expense", c.amount, c.transaction_count, c.percentage + "%"])),
    ];
    return [row(header), ...rows].join("\n");
  }
  if (reportType === "monthly_trends") {
    const header = ["Month", "Income", "Expense", "Net", "Cumulative Income", "Cumulative Expense"];
    const rows = data.map((m) => row([m.month, m.income, m.expense, m.net, m.cumulativeIncome, m.cumulativeExpense]));
    return [row(header), ...rows].join("\n");
  }
  if (reportType === "tax_summary") {
    const header = ["Month", "Tax Collected", "Tax Paid", "Net Tax"];
    const rows = data.byMonth.map((m) => row([m.month, m.collected, m.paid, round2(m.collected - m.paid)]));
    return [row(header), ...rows, "", row(["Total Collected", data.taxCollected]), row(["Total Paid", data.taxPaid]), row(["Net Tax", data.netTax])].join("\n");
  }
  if (reportType === "reconciliation_status") {
    const header = ["Account", "Period Start", "Period End", "Status", "Matched", "Ignored", "Unmatched", "Difference", "Reconciled"];
    const rows = data.rows.map((r) => row([r.account_name, r.period_start, r.period_end, r.displayStatus, r.matched_count, r.ignored_count, r.unmatched_count, r.difference, r.reconciled ? "Yes" : "No"]));
    return [row(header), ...rows].join("\n");
  }
  if (reportType === "church_summary") {
    const rows = [
      row(["Total Members", data.membership.totalMembers]),
      row(["Active Members", data.membership.activeMembers]),
      row(["New Members", data.membership.newMembers]),
      row(["Total Visitors", data.membership.totalVisitors]),
      row(["New Visitors", data.membership.newVisitors]),
      row(["Total Tithes", data.giving.totalTithes]),
      row(["Total Offerings", data.giving.totalOfferings]),
      row(["Total Donations", data.giving.totalDonations]),
      row(["Total Giving", data.giving.totalGiving]),
      row(["Total Income", data.totalIncome]),
      row(["Total Expense", data.totalExpense]),
      row(["Contacts Needing Follow-up", data.followUps.contactsNeedingFollowUp]),
      row(["Open Tasks", data.followUps.openTasks]),
      row(["Overdue Tasks", data.followUps.overdueTasks]),
    ];
    return rows.join("\n");
  }
  if (reportType === "payroll_summary") {
    const header = ["Period Start", "Period End", "Status", "Employees", "Gross", "Allowances", "Deductions", "Net"];
    const rows = data.runs.map((r) => row([r.pay_period_start, r.pay_period_end, r.status, r.employee_count, r.total_gross, r.total_allowances, r.total_deductions, r.total_net]));
    return [row(header), ...rows, "", row(["Total Gross", data.total_gross]), row(["Total Allowances", data.total_allowances]), row(["Total Deductions", data.total_deductions]), row(["Total Net", data.total_net]), row(["Employees Paid", data.employee_count]), row(["Runs", data.run_count])].join("\n");
  }
  if (reportType === "inventory_summary") {
    const header = ["Item", "SKU", "Category", "Quantity", "Low-Stock Level", "Cost Price", "Selling Price", "Cost Value", "Selling Value", "Status"];
    const rows = data.rows.map((r) => row([r.name, r.sku, r.category, r.quantity, r.low_stock_level, r.cost_price, r.selling_price, r.cost_value, r.selling_value, r.status]));
    return [row(header), ...rows, "", row(["Total Items", data.totalItems]), row(["In Stock", data.inStockCount]), row(["Low Stock", data.lowStockCount]), row(["Out of Stock", data.outOfStockCount]), row(["Total Cost Value", data.costValue]), row(["Total Selling Value", data.sellingValue])].join("\n");
  }
  if (reportType === "giving_summary") {
    const rows = [
      row(["Total Giving", data.totalGiving]),
      row(["Tithes", data.tithes]),
      row(["Offerings", data.offerings]),
      row(["Donations", data.donations]),
      row(["Outstanding Pledges (count)", data.outstandingPledges]),
      row(["Total Outstanding Pledges", data.totalOutstanding]),
    ];
    if (data.byFund && data.byFund.length) {
      rows.push("", row(["Fund", "Amount", "Transactions"]));
      data.byFund.forEach((f) => rows.push(row([f.fund, f.amount, f.count])));
    }
    if (data.pledgesNeedingFollowUp && data.pledgesNeedingFollowUp.length) {
      rows.push("", row(["Pledges Needing Follow-up", ""]), );
      data.pledgesNeedingFollowUp.forEach((p) => rows.push(row([p.fund, p.contact_name || "General", p.outstanding, p.target_date || ""])));
    }
    return rows.join("\n");
  }
  return "";
}

// 10. Church management summary — membership, giving, follow-ups.
export function computeChurchSummary(transactions: any[], receipts: any[], contacts: any[], tasks: any[], activities: any[], f: ReportFilters) {
  const txns = clearedOnly(applyFilters(transactions, f));
  const members = contacts.filter((c) => c.contact_type === "member");
  const visitors = contacts.filter((c) => c.contact_type === "visitor");
  const sumKind = (kind) => receipts.filter((r) => r.kind === kind).reduce((s, r) => s + Number(r.amount), 0);
  const totalTithes = round2(sumKind("tithe"));
  const totalOfferings = round2(sumKind("offering"));
  const totalDonations = round2(sumKind("donation"));
  const byMonth: Record<string, number> = {};
  txns.filter((t) => t.direction === "in").forEach((t) => {
    const m = t.date?.slice(0, 7);
    if (!m) return;
    byMonth[m] = (byMonth[m] || 0) + Number(t.amount);
  });
  const today = new Date().toISOString().slice(0, 10);
  const followUpContacts = contacts.filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today && c.status !== "inactive");
  const openTasks = tasks.filter((t) => t.status === "open");
  return {
    membership: {
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.status === "active" || m.status === "converted").length,
      newMembers: members.filter((m) => m.status === "new").length,
      totalVisitors: visitors.length,
      newVisitors: visitors.filter((v) => v.status === "new").length,
    },
    giving: {
      totalTithes,
      totalOfferings,
      totalDonations,
      totalGiving: round2(totalTithes + totalOfferings + totalDonations),
      givingByMonth: Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, amount]) => ({ month, amount: round2(amount) })),
    },
    followUps: {
      contactsNeedingFollowUp: followUpContacts.length,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter((t) => t.due_date && t.due_date < today).length,
      contacts: followUpContacts.slice(0, 10).map((c) => ({ id: c.id, name: [c.first_name, c.last_name].filter(Boolean).join(" "), next_follow_up_date: c.next_follow_up_date })),
    },
    totalIncome: round2(txns.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0)),
    totalExpense: round2(txns.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0)),
  };
}

// 11. Church Giving & Pledges summary. Giving is derived from FinanceTransactions
// (direction "in") whose category is a church giving fund — Finance remains the
// source of truth, so giving is never double-counted. Pledges are a separate
// commitment layer (GivingPledge). Outstanding = pledged - contributed.
export const GIVING_FUNDS = ["Tithes", "Offerings", "Donations", "Building Fund", "Missions", "Youth", "Welfare"];

export function computeGivingSummary(transactions: any[], categories: any[], pledges: any[], financeContacts: any[], f: ReportFilters) {
  const txns = clearedOnly(applyFilters(transactions, f));
  const isFund = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return !!cat && cat.kind === "income" && GIVING_FUNDS.some((fn) => fn.toLowerCase() === String(cat.name).toLowerCase());
  };
  const fundName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : "Uncategorised";
  };
  const giving = txns.filter((t) => t.direction === "in" && isFund(t.category_id));
  const totalGiving = round2(giving.reduce((s, t) => s + Number(t.amount), 0));
  const typeTotal = (name: string) => round2(giving.filter((t) => fundName(t.category_id).toLowerCase() === name.toLowerCase()).reduce((s, t) => s + Number(t.amount), 0));

  const byFundMap: Record<string, { amount: number; count: number }> = {};
  giving.forEach((t) => {
    const fn = fundName(t.category_id);
    if (!byFundMap[fn]) byFundMap[fn] = { amount: 0, count: 0 };
    byFundMap[fn].amount += Number(t.amount);
    byFundMap[fn].count += 1;
  });
  const byFund = Object.entries(byFundMap).map(([fund, v]) => ({ fund, amount: round2(v.amount), count: v.count })).sort((a, b) => b.amount - a.amount);

  const openPledges = pledges.filter((p) => p.status === "open");
  const outstanding = openPledges.map((p) => ({ ...p, outstanding: Math.max(0, Number(p.pledged_amount) - Number(p.contributed_amount || 0)) }));
  const totalOutstanding = round2(outstanding.reduce((s, p) => s + p.outstanding, 0));

  const today = new Date().toISOString().slice(0, 10);
  const pledgesNeedingFollowUp = outstanding
    .filter((p) => p.outstanding > 0 && p.target_date && p.target_date <= today)
    .sort((a, b) => (a.target_date || "").localeCompare(b.target_date || ""))
    .slice(0, 20)
    .map((p) => ({ id: p.id, fund: p.fund, contact_name: p.contact_name || "", outstanding: round2(p.outstanding), target_date: p.target_date }));

  // Top donors by giving amount (linked via FinanceContact).
  const donorMap: Record<string, number> = {};
  giving.forEach((t) => {
    if (!t.contact_id) return;
    const fc = financeContacts.find((c) => c.id === t.contact_id);
    const name = fc ? fc.name : "Unknown";
    donorMap[name] = (donorMap[name] || 0) + Number(t.amount);
  });
  const topDonors = Object.entries(donorMap).map(([name, amount]) => ({ name, amount: round2(amount) })).sort((a, b) => b.amount - a.amount).slice(0, 10);

  return {
    totalGiving,
    tithes: typeTotal("Tithes"),
    offerings: typeTotal("Offerings"),
    donations: typeTotal("Donations"),
    byFund,
    outstandingPledges: outstanding.length,
    totalOutstanding,
    pledgesNeedingFollowUp,
    topDonors,
  };
}