// Client-side HR lifecycle constants. Mirrors the server-side defaults in
// base44/shared/hrLifecycle.ts.

export const ONBOARDING_TASK_CATEGORIES = [
  { value: "information", label: "Information" },
  { value: "documentation", label: "Documentation" },
  { value: "contract", label: "Contract" },
  { value: "assignment", label: "Assignment" },
  { value: "policy", label: "Policy" },
  { value: "equipment", label: "Equipment" },
  { value: "induction", label: "Induction" },
  { value: "start_date", label: "Start Date" },
  { value: "other", label: "Other" },
];

export const OFFBOARDING_TASK_CATEGORIES = [
  { value: "final_date", label: "Final Date" },
  { value: "equipment_return", label: "Equipment Return" },
  { value: "access_revocation", label: "Access Revocation" },
  { value: "document_handover", label: "Document Handover" },
  { value: "hr_actions", label: "HR Actions" },
  { value: "archival", label: "Archival" },
  { value: "other", label: "Other" },
];

export const OFFBOARDING_REASONS = [
  { value: "resignation", label: "Resignation" },
  { value: "retirement", label: "Retirement" },
  { value: "termination", label: "Termination" },
  { value: "contract_end", label: "Contract End" },
  { value: "redundancy", label: "Redundancy" },
  { value: "other", label: "Other" },
];

export const CHECKLIST_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

export function taskCategoryLabel(categories, value) {
  return categories.find((c) => c.value === value)?.label || value;
}

export function checklistProgress(tasks) {
  const total = tasks?.length || 0;
  const completed = (tasks || []).filter((t) => t.is_completed).length;
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}