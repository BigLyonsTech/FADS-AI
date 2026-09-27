// Shared helpers for the Phase 2C Compliance backend function.

export const COMPLIANCE_CATEGORIES = [
  { value: "tax", label: "Tax", colour: "bg-blue-100 text-blue-700" },
  { value: "employment_law", label: "Employment Law", colour: "bg-purple-100 text-purple-700" },
  { value: "health_safety", label: "Health & Safety", colour: "bg-red-100 text-red-700" },
  { value: "data_protection", label: "Data Protection", colour: "bg-teal-100 text-teal-700" },
  { value: "licensing", label: "Licensing", colour: "bg-amber-100 text-amber-700" },
  { value: "insurance", label: "Insurance", colour: "bg-green-100 text-green-700" },
  { value: "other", label: "Other", colour: "bg-gray-100 text-gray-600" },
];

export function categoryLabel(value) {
  return COMPLIANCE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function categoryColour(value) {
  return COMPLIANCE_CATEGORIES.find((c) => c.value === value)?.colour || "bg-gray-100 text-gray-600";
}

export const COMPLIANCE_STATUSES = [
  { value: "pending", label: "Pending", colour: "bg-amber-100 text-amber-700" },
  { value: "in_progress", label: "In Progress", colour: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "Completed", colour: "bg-green-100 text-green-700" },
  { value: "overdue", label: "Overdue", colour: "bg-red-100 text-red-700" },
];

export function complianceStatusLabel(value) {
  return COMPLIANCE_STATUSES.find((s) => s.value === value)?.label || value;
}

export function complianceStatusColour(value) {
  return COMPLIANCE_STATUSES.find((s) => s.value === value)?.colour || "bg-gray-100 text-gray-600";
}

// Default compliance items seeded for new organisations.
// These are operational guidance items, NOT legal advice.
export const DEFAULT_COMPLIANCE_ITEMS = [
  {
    title: "Annual Tax Return Filing",
    description: "File the annual tax return with the revenue commissioners. Consult a qualified accountant for your specific obligations.",
    category: "tax",
    deadline_months_ahead: 6,
    reminder_days: 30,
    recurrence: "annual",
  },
  {
    title: "Employer PAYE Filing",
    description: "Monthly employer PAYE/PRSI returns. Verify your filing schedule with revenue.",
    category: "tax",
    deadline_months_ahead: 1,
    reminder_days: 7,
    recurrence: "monthly",
  },
  {
    title: "Health & Safety Risk Assessment",
    description: "Review workplace risk assessment annually. Consult a qualified safety professional.",
    category: "health_safety",
    deadline_months_ahead: 12,
    reminder_days: 30,
    recurrence: "annual",
  },
  {
    title: "Data Protection Registration Review",
    description: "Review your data protection registration and privacy policy. Consult a data protection advisor for your obligations.",
    category: "data_protection",
    deadline_months_ahead: 6,
    reminder_days: 21,
    recurrence: "annual",
  },
  {
    title: "Employer Liability Insurance Renewal",
    description: "Renew employer liability insurance before expiry. Verify coverage with your insurer.",
    category: "insurance",
    deadline_months_ahead: 10,
    reminder_days: 30,
    recurrence: "annual",
  },
];

// Compute the effective status of a compliance item, marking it overdue
// if the deadline has passed and it's not completed.
export function computeEffectiveStatus(item, today) {
  if (item.status === "completed") return "completed";
  if (item.deadline_date && item.deadline_date < today) return "overdue";
  return item.status || "pending";
}

// Check if a compliance item is due soon (within reminder_days).
export function isDueSoon(item, today) {
  if (item.status === "completed") return false;
  if (!item.deadline_date) return false;
  const deadline = new Date(item.deadline_date + "T00:00:00");
  const todayDate = new Date(today + "T00:00:00");
  const diffDays = Math.ceil((deadline - todayDate) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= (item.reminder_days || 7);
}