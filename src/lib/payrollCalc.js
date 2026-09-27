// Client-side Payroll V1 calculations. Mirrors the server computeRunTotals
// in base44/shared/payroll.ts so the run editor can show live previews. The
// backend recomputes on post, so these are for display only.

const round2 = (n) => Math.round(n * 100) / 100;

export const PAY_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "bi_weekly", label: "Bi-Weekly" },
  { value: "weekly", label: "Weekly" },
];

// Build a payslip item from an employee record (with pay_basic,
// pay_allowances, pay_deductions).
export function computeItem(employee) {
  const basic = Number(employee.pay_basic) || 0;
  const allowances = (employee.pay_allowances || []).map((a) => ({
    label: a.label || "Allowance",
    amount: Number(a.amount) || 0,
  }));
  const deductions = (employee.pay_deductions || []).map((d) => ({
    label: d.label || "Deduction",
    amount: Number(d.amount) || 0,
  }));
  const allowancesTotal = allowances.reduce((s, a) => s + a.amount, 0);
  const deductionsTotal = deductions.reduce((s, d) => s + d.amount, 0);
  const gross = basic + allowancesTotal;
  const net = gross - deductionsTotal;
  return {
    employee_id: employee.id,
    employee_name:
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
      employee.employee_name ||
      "—",
    employee_phone: employee.phone || null,
    basic_pay: round2(basic),
    allowances,
    deductions,
    gross: round2(gross),
    deductions_total: round2(deductionsTotal),
    net: round2(net),
  };
}

export function computeRunTotals(items) {
  const safe = Array.isArray(items) ? items : [];
  const total_gross = safe.reduce((s, i) => s + (Number(i.gross) || 0), 0);
  const total_allowances = safe.reduce(
    (s, i) => s + (i.allowances || []).reduce((a, x) => a + (Number(x.amount) || 0), 0),
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