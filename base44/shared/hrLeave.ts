// Shared helpers for the Phase 2C Leave backend function.
// All functions here run with the service-role client (svc) passed in by
// callers, so they bypass RLS to manage leave records and write audit logs.

// Default leave types seeded for new organisations (Demo mode).
export const DEFAULT_LEAVE_TYPES = [
  {
    name: "Annual Leave",
    description: "Paid holiday leave for rest and recreation.",
    is_paid: true,
    default_annual_allowance: 25,
    carry_over_allowed: true,
    carry_over_limit: 5,
    requires_approval: true,
    requires_documentation_after_days: 0,
    colour: "#3b82f6",
  },
  {
    name: "Sick Leave",
    description: "Paid leave for illness or injury. No medical details required.",
    is_paid: true,
    default_annual_allowance: 10,
    carry_over_allowed: false,
    carry_over_limit: 0,
    requires_approval: false,
    requires_documentation_after_days: 3,
    colour: "#ef4444",
  },
  {
    name: "Compassionate Leave",
    description: "Leave for bereavement or family emergency.",
    is_paid: true,
    default_annual_allowance: 5,
    carry_over_allowed: false,
    carry_over_limit: 0,
    requires_approval: true,
    requires_documentation_after_days: 0,
    colour: "#a855f7",
  },
  {
    name: "Unpaid Leave",
    description: "Leave without pay for personal reasons.",
    is_paid: false,
    default_annual_allowance: 0,
    carry_over_allowed: false,
    carry_over_limit: 0,
    requires_approval: true,
    requires_documentation_after_days: 0,
    colour: "#6b7280",
  },
];

// Compute the number of working days between two dates (inclusive),
// excluding weekends (Saturday=6, Sunday=0) and public holidays.
export function computeWorkingDays(startDate, endDate, holidays = []) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (end < start) return 0;

  const holidaySet = new Set(holidays.map((h) => h.date || h));
  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const dow = cursor.getDay();
    const dateStr = cursor.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(dateStr)) {
      count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

// Check if a date range overlaps with any existing approved/pending requests.
export function findOverlappingRequests(startDate, endDate, existingRequests) {
  return (existingRequests || []).filter((r) => {
    if (r.status === "rejected" || r.status === "cancelled") return false;
    return (
      (startDate <= r.end_date && endDate >= r.start_date)
    );
  });
}

// Compute remaining balance: allowance + carried_over - used - pending.
export function computeRemainingBalance(balance) {
  if (!balance) return 0;
  return (
    (balance.annual_allowance || 0) +
    (balance.carried_over || 0) -
    (balance.used_days || 0) -
    (balance.pending_days || 0)
  );
}

// Determine the annual allowance for an employee from policy or leave type default.
export function resolveAllowance(leaveType, policies, employee) {
  if (!leaveType) return 0;
  if (policies && policies.length > 0 && employee) {
    const matchingPolicy = policies.find(
      (p) =>
        p.is_active &&
        (!p.applicable_contract_types ||
          p.applicable_contract_types.length === 0 ||
          p.applicable_contract_types.includes(employee.contract_type))
    );
    if (matchingPolicy) {
      const allowance = (matchingPolicy.allowances || []).find(
        (a) => a.leave_type_id === leaveType.id
      );
      if (allowance) return allowance.annual_allowance;
    }
  }
  return leaveType.default_annual_allowance || 0;
}

// Get or create a leave balance for an employee + leave type + year.
export async function getOrCreateBalance(
  svc,
  organisationId,
  employee,
  leaveType,
  year,
  policies,
  dataMode
) {
  const existing = await svc.entities.LeaveBalance.filter({
    organisation_id: organisationId,
    employee_id: employee.id,
    leave_type_id: leaveType.id,
    year,
  });
  if (existing.length > 0) return existing[0];

  const allowance = resolveAllowance(leaveType, policies, employee);
  const rec = await svc.entities.LeaveBalance.create({
    organisation_id: organisationId,
    employee_id: employee.id,
    employee_name: [employee.first_name, employee.last_name].filter(Boolean).join(" "),
    leave_type_id: leaveType.id,
    leave_type_name: leaveType.name,
    year,
    annual_allowance: allowance,
    carried_over: 0,
    used_days: 0,
    pending_days: 0,
    data_mode: dataMode,
  });
  return rec;
}

// Update pending/used days on a balance after a status change.
export async function recalculateBalance(svc, balanceId, requests) {
  const requestsForType = requests.filter(
    (r) => r.leave_type_id === requests[0]?.leave_type_id
  );
  // Actually, we need to filter by the balance's leave_type_id and year.
  // This is called with pre-filtered requests.
  let usedDays = 0;
  let pendingDays = 0;
  for (const r of requests) {
    if (r.status === "approved") usedDays += r.total_days || 0;
    else if (r.status === "pending") pendingDays += r.total_days || 0;
  }
  await svc.entities.LeaveBalance.update(balanceId, {
    used_days: usedDays,
    pending_days: pendingDays,
  });
}