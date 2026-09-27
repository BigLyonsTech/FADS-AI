// Shared Payroll V1 helpers for the backend payroll + reports functions.
// Pure computation runs server-side so posted figures are verified against
// the stored run items (the client may compute previews, but the backend
// recomputes on post).

const round2 = (n: number) => Math.round(n * 100) / 100;

// Recompute run totals from stored items. Used on post to verify the client
// did not tamper with totals.
export function computeRunTotals(items: any[]) {
  const safe = Array.isArray(items) ? items : [];
  const total_gross = safe.reduce((s, i) => s + (Number(i.gross) || 0), 0);
  const total_allowances = safe.reduce(
    (s, i) => s + (Array.isArray(i.allowances) ? i.allowances.reduce((a, x) => a + (Number(x.amount) || 0), 0) : 0),
    0
  );
  const total_deductions = safe.reduce((s, i) => s + (Number(i.deductions_total) || 0), 0);
  const total_net = safe.reduce((s, i) => s + (Number(i.net) || 0), 0);
  return {
    total_gross: round2(total_gross),
    total_allowances: round2(total_allowances),
    total_deductions: round2(total_deductions),
    total_net: round2(total_net),
    employee_count: safe.length,
  };
}

// Find the org's "Salaries" expense category, or create it if missing. The
// default category set already includes Salaries, but live orgs that never
// seeded finance data may not have it yet.
export async function findOrCreateSalariesCategory(svc, organisation_id, dataMode) {
  const cats = await svc.entities.FinanceCategory.filter({ organisation_id });
  const existing = cats.find(
    (c) => (c.name || "").toLowerCase() === "salaries" && c.kind === "expense"
  );
  if (existing) return existing.id;
  const rec = await svc.entities.FinanceCategory.create({
    organisation_id,
    name: "Salaries",
    kind: "expense",
    description: "Staff salaries and payroll",
    color: null,
    data_mode: dataMode || "live",
  });
  return rec.id;
}

// Payroll summary for the Reports Centre. Only approved/paid runs count.
export function computePayrollSummary(runs: any[], f: any) {
  const posted = (runs || []).filter(
    (r) => r.status === "approved" || r.status === "paid"
  );
  const inRange = posted.filter((r) => {
    if (f.date_from && (!r.pay_period_end || r.pay_period_end < f.date_from)) return false;
    if (f.date_to && (!r.pay_period_end || r.pay_period_end > f.date_to)) return false;
    return true;
  });
  const total_gross = inRange.reduce((s, r) => s + (Number(r.total_gross) || 0), 0);
  const total_allowances = inRange.reduce((s, r) => s + (Number(r.total_allowances) || 0), 0);
  const total_deductions = inRange.reduce((s, r) => s + (Number(r.total_deductions) || 0), 0);
  const total_net = inRange.reduce((s, r) => s + (Number(r.total_net) || 0), 0);
  const employee_count = inRange.reduce((s, r) => s + (Number(r.employee_count) || 0), 0);
  return {
    run_count: inRange.length,
    employee_count,
    total_gross: round2(total_gross),
    total_allowances: round2(total_allowances),
    total_deductions: round2(total_deductions),
    total_net: round2(total_net),
    runs: inRange
      .map((r) => ({
        id: r.id,
        pay_period_start: r.pay_period_start,
        pay_period_end: r.pay_period_end,
        status: r.status,
        employee_count: r.employee_count,
        total_gross: round2(Number(r.total_gross) || 0),
        total_allowances: round2(Number(r.total_allowances) || 0),
        total_deductions: round2(Number(r.total_deductions) || 0),
        total_net: round2(Number(r.total_net) || 0),
      }))
      .sort((a, b) => (b.pay_period_end || "").localeCompare(a.pay_period_end || "")),
  };
}