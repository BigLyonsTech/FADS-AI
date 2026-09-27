// Shared HR lifecycle helpers used by the hrLifecycle backend function.
// Default onboarding/offboarding tasks, categories, and reason codes.

export const DEFAULT_ONBOARDING_TASKS = [
  { title: "Verify employee information", description: "Confirm personal details, contact information, and emergency contacts are accurate and complete.", category: "information", default_due_days: 1 },
  { title: "Upload required documents", description: "Collect and upload all required documents (identification, contracts, tax forms).", category: "documentation", default_due_days: 3 },
  { title: "Issue contract or offer letter", description: "Prepare, issue, and obtain signature on the employment contract or offer letter.", category: "contract", default_due_days: 2 },
  { title: "Assign manager, role and department", description: "Confirm reporting manager, job role, and department assignment in the system.", category: "assignment", default_due_days: 0 },
  { title: "Confirm policy acknowledgements", description: "Ensure the employee has read and signed all required policy acknowledgements.", category: "policy", default_due_days: 3 },
  { title: "Prepare equipment and system access", description: "Provision laptop, accounts, email, and system access needed for the role.", category: "equipment", default_due_days: 2 },
  { title: "Complete induction", description: "Complete the orientation and induction programme with HR and the team.", category: "induction", default_due_days: 5 },
  { title: "Confirm start-date completion", description: "Confirm the employee has started on their agreed start date and is fully set up.", category: "start_date", default_due_days: 0 },
];

export const DEFAULT_OFFBOARDING_TASKS = [
  { title: "Record final working date and reason", description: "Document the employee's final working date and the reason for departure.", category: "final_date", default_due_days: 0 },
  { title: "Return equipment", description: "Collect all company equipment (laptop, phone, keys, access badges).", category: "equipment_return", default_due_days: 0 },
  { title: "Revoke system access", description: "Revoke all system access, email accounts, and application permissions. Requires explicit confirmation.", category: "access_revocation", default_due_days: 0, requires_confirmation: true },
  { title: "Complete document handover", description: "Ensure all work documents, files, and materials are handed over to the manager or successor.", category: "document_handover", default_due_days: 2 },
  { title: "Record final HR actions", description: "Process final paperwork, exit interview notes, and any remaining HR actions.", category: "hr_actions", default_due_days: 3 },
  { title: "Archive employee record safely", description: "Safely archive the employee record without deleting historical data.", category: "archival", default_due_days: 3 },
];

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

// Build checklist tasks from a template, computing due dates from the
// employee's start date (onboarding) or the offboarding start date.
export function buildTasksFromTemplate(templateTasks, baseDate) {
  const base = baseDate ? new Date(baseDate) : new Date();
  return (templateTasks || []).map((t) => {
    const due = new Date(base);
    due.setDate(due.getDate() + (t.default_due_days || 0));
    return {
      title: t.title,
      description: t.description || "",
      category: t.category,
      owner_id: null,
      owner_name: null,
      due_date: due.toISOString().slice(0, 10),
      is_completed: false,
      completed_date: null,
      completed_by: null,
      completed_by_name: null,
      evidence_notes: null,
      evidence_file_uri: null,
      requires_confirmation: t.requires_confirmation || false,
      confirmation_recorded: false,
    };
  });
}