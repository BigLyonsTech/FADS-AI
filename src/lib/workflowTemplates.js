// FADS Workflow Template Library — curated, ready-made workflows for
// non-technical users. Each template maps to existing FADS pages and actions.
// "Activating" a template opts the user in; "running" navigates to the relevant
// existing page where FADS already surfaces the data. No new automation engine,
// no Zapier clone, no visual editor. FADS prepares → owner approves → FADS acts
// where supported.
//
// Each template carries:
//   checks      — what FADS will check (plain language, shown in Preview)
//   actions     — what FADS can prepare (shown on the card and in Preview)
//   approval    — what the owner must approve before FADS acts (null = none)
//   runTo       — the existing FADS page the workflow leads into
//   runLabel    — the action button label
//   askFadsQuestion — a prompt handed to the existing FADS Assistant
//
// The set is intentionally small: ~2 useful templates per relevant category,
// with FADS Daily Check as the signature workflow. Demo Mode previews show
// real findings from the existing Demo dataset (see demoWorkflowPreview.js).

export const WORKFLOW_CATEGORIES = [
  { id: "Daily", label: "Daily" },
  { id: "Money", label: "Money" },
  { id: "Customers", label: "Customers" },
  { id: "HR", label: "HR" },
  { id: "Inventory", label: "Inventory" },
  { id: "Meetings", label: "Meetings" },
  { id: "Tax", label: "Tax" },
  { id: "School", label: "School" },
  { id: "Church", label: "Church" },
];

export const WORKFLOW_TEMPLATES = [
  // ── Daily ──────────────────────────────────────────────────────────────
  {
    id: "fads_daily_check",
    category: "Daily",
    name: "FADS Daily Check",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "FADS checks what needs your attention and helps you decide what to do next.",
    checks: [
      "Money, customers and tasks",
      "Anything overdue or waiting on you",
      "Your #1 priority for today",
    ],
    actions: [
      "Bring together everything that needs your attention",
      "Help you decide what to do next",
    ],
    approval: null,
    isSignature: true,
    runTo: "/intelligence",
    runLabel: "Start My Actions",
    askFadsQuestion: "What needs my attention today?",
  },
  {
    id: "morning_business_check",
    category: "Daily",
    name: "Morning Business Check",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "You start your day and want a quick picture of what matters.",
    checks: [
      "Money in and money owed",
      "Customers and leads waiting on you",
      "Tasks due today",
    ],
    actions: [
      "Show what needs your attention this morning",
      "Suggest where to start",
    ],
    approval: null,
    runTo: "/intelligence",
    runLabel: "Start My Actions",
    askFadsQuestion: "What should I focus on this morning?",
  },
  {
    id: "end_of_day_check",
    category: "Daily",
    name: "End of Day Check",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "You wrap up and want to see what was done and what carries over.",
    checks: [
      "Tasks completed today",
      "Anything still open or overdue",
      "What should carry into tomorrow",
    ],
    actions: [
      "Summarise what was completed",
      "Carry anything open into tomorrow",
    ],
    approval: null,
    runTo: "/crm/tasks",
    runLabel: "Start My Actions",
    askFadsQuestion: "What did I finish today and what's left?",
  },

  // ── Money ──────────────────────────────────────────────────────────────
  {
    id: "collect_overdue_money",
    category: "Money",
    name: "Collect Overdue Money",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "Customers have balances past their due date.",
    checks: [
      "Outstanding invoices",
      "Overdue dates",
      "Customer contact information",
    ],
    actions: [
      "Find customers with overdue balances",
      "Prepare friendly reminders",
    ],
    approval: "Each reminder before it is sent.",
    runTo: "/finance/money-owed",
    runLabel: "Review Customers",
    askFadsQuestion: "Who owes me money and how do I follow up?",
  },
  {
    id: "invoice_follow_up",
    category: "Money",
    name: "Invoice Follow-Up",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "Unpaid invoices are waiting and may need a nudge.",
    checks: [
      "Unpaid invoices",
      "How long each has been waiting",
      "The right follow-up for each customer",
    ],
    actions: [
      "Check unpaid invoices",
      "Prepare the appropriate follow-up",
    ],
    approval: "Each message before it is sent.",
    runTo: "/finance/invoices",
    runLabel: "Review Invoices",
    askFadsQuestion: "Which invoices need following up?",
  },
  {
    id: "missing_receipt_check",
    category: "Money",
    name: "Missing Receipt Check",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "Expenses may be missing receipts or supporting information.",
    checks: [
      "Recent expense transactions",
      "Whether a receipt is attached",
      "Anything that may need more information",
    ],
    actions: [
      "Find expenses that may need receipts",
      "Add them to your review list",
    ],
    approval: null,
    runTo: "/finance/receipts",
    runLabel: "Review Receipts",
    askFadsQuestion: "Which expenses need receipts?",
  },

  // ── Customers ──────────────────────────────────────────────────────────
  {
    id: "follow_up_today_leads",
    category: "Customers",
    name: "Follow Up Today's Leads",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "People are waiting on a response from you.",
    checks: [
      "New and contacted relationships",
      "Follow-up dates due today",
      "The best message for each person",
    ],
    actions: [
      "Find people who need a response",
      "Prepare follow-up messages",
    ],
    approval: "Each message before it is sent.",
    runTo: "/crm/contacts",
    runLabel: "Review Follow-Ups",
    askFadsQuestion: "Who should I follow up with today?",
  },
  {
    id: "proposal_follow_up",
    category: "Customers",
    name: "Proposal Follow-Up",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "Proposals or quotations are waiting for a reply.",
    checks: [
      "Open proposals and quotations",
      "How long each has been waiting",
      "The right next message",
    ],
    actions: [
      "Find proposals waiting for a response",
      "Help prepare the next message",
    ],
    approval: "Each message before it is sent.",
    runTo: "/finance/invoices",
    runLabel: "Review Proposals",
    askFadsQuestion: "Which proposals need a follow-up?",
  },
  {
    id: "welcome_new_customer",
    category: "Customers",
    name: "Welcome New Customer",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "Someone becomes a customer.",
    checks: [
      "Newly converted customers",
      "Their name and how they found you",
    ],
    actions: [
      "Prepare a friendly welcome message",
      "Suggest a first check-in date",
    ],
    approval: "The message before it is sent.",
    runTo: "/crm/contacts",
    runLabel: "Review New Customers",
    askFadsQuestion: "Welcome my new customers.",
  },

  // ── HR ─────────────────────────────────────────────────────────────────
  {
    id: "people_check",
    category: "HR",
    name: "People Check",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "Team actions may need your attention.",
    checks: [
      "Upcoming leave",
      "Missing employee documents",
      "Employee actions needing attention",
    ],
    actions: [
      "Review what needs attention across your people",
      "Flag anything urgent",
    ],
    approval: null,
    runTo: "/hr",
    runLabel: "Review People",
    askFadsQuestion: "What needs my attention in HR?",
    hrOnly: true,
  },
  {
    id: "new_employee_welcome",
    category: "HR",
    name: "New Employee Welcome",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "A new team member is added.",
    checks: [
      "The new employee's role and start date",
      "Onboarding steps still to complete",
    ],
    actions: [
      "Help prepare the onboarding steps",
      "Create a welcome checklist",
    ],
    approval: "Permission changes require authorised confirmation.",
    runTo: "/hr/employees",
    runLabel: "Review Onboarding",
    askFadsQuestion: "Onboard my new employee.",
    hrOnly: true,
  },

  // ── Inventory ──────────────────────────────────────────────────────────
  {
    id: "low_stock_check",
    category: "Inventory",
    name: "Low Stock Check",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "Items may be running low.",
    checks: [
      "Current stock levels",
      "Reorder thresholds",
      "Suppliers where available",
    ],
    actions: [
      "Find items running low",
      "Show what may need attention",
    ],
    approval: null,
    runTo: "/inventory",
    runLabel: "Review Stock",
    askFadsQuestion: "Check my stock.",
  },

  // ── Meetings ──────────────────────────────────────────────────────────
  {
    id: "turn_meeting_into_actions",
    category: "Meetings",
    name: "Turn Meeting Into Actions",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "You have a FADS transcription ready to act on.",
    checks: [
      "Existing FADS transcriptions",
      "Decisions and action points inside each",
      "Who is responsible and when it's due",
    ],
    actions: [
      "Take an existing transcription",
      "Turn the important points into tasks and follow-ups",
    ],
    approval: "Action items are reviewed before tasks are created.",
    runTo: "/transcribe",
    runLabel: "Review Meetings",
    askFadsQuestion: "Turn my last meeting into tasks.",
  },

  // ── Tax ────────────────────────────────────────────────────────────────
  {
    id: "tax_readiness_check",
    category: "Tax",
    name: "Tax Readiness Check",
    workspace_types: ["small_business", "school", "university", "church"],
    trigger: "You want to be ready before tax time.",
    checks: [
      "Missing receipts",
      "Uncategorised transactions",
      "Incomplete tax profile",
    ],
    actions: [
      "Review existing Finance records",
      "Show what may be missing before tax preparation",
    ],
    approval: null,
    runTo: "/finance/tax-centre",
    runLabel: "Fix This With FADS",
    askFadsQuestion: "Get me tax ready.",
  },

  // ── School ─────────────────────────────────────────────────────────────
  {
    id: "school_fees_check",
    category: "School",
    name: "School Fees Check",
    workspace_types: ["school"],
    trigger: "School fees are overdue and Parents may need a friendly reminder.",
    checks: [
      "Outstanding fee invoices",
      "Overdue dates",
      "Parent contact information",
    ],
    actions: [
      "See outstanding school fees",
      "Prepare friendly Parent reminders",
    ],
    approval: "Each reminder before it is sent.",
    runTo: "/finance/money-owed",
    runLabel: "Review Fees",
    askFadsQuestion: "Which Parents have overdue fees?",
  },
  {
    id: "new_enquiry_follow_up",
    category: "School",
    name: "New Enquiry Follow-Up",
    workspace_types: ["school"],
    trigger: "New admissions enquiries are waiting for a response.",
    checks: [
      "New enquiries",
      "How long each has been waiting",
      "The right message for each Parent",
    ],
    actions: [
      "Find new admissions enquiries that need a response",
      "Prepare follow-up messages",
    ],
    approval: "Each message before it is sent.",
    runTo: "/crm/contacts",
    runLabel: "Review Enquiries",
    askFadsQuestion: "Follow up new admissions enquiries.",
  },
  {
    id: "parent_announcement",
    category: "School",
    name: "Parent Announcement",
    workspace_types: ["school"],
    trigger: "You need to get a message to a group of Parents.",
    checks: [
      "Parent groups and classes",
      "The right channel for each group",
    ],
    actions: [
      "Prepare an announcement for a selected Parent group",
      "Personalise it for each recipient",
    ],
    approval: "The announcement before it is sent.",
    runTo: "/crm/contacts",
    runLabel: "Prepare Announcement",
    askFadsQuestion: "Prepare a Parent announcement.",
  },
  {
    id: "staff_check",
    category: "School",
    name: "Staff Check",
    workspace_types: ["school"],
    trigger: "Staff actions may need your attention.",
    checks: [
      "Upcoming leave",
      "Missing staff documents",
      "Actions needing attention",
    ],
    actions: [
      "Review staff actions, leave and documents needing attention",
    ],
    approval: null,
    runTo: "/hr",
    runLabel: "Review Staff",
    askFadsQuestion: "What needs my attention for staff?",
    hrOnly: true,
  },

  // ── Church ─────────────────────────────────────────────────────────────
  {
    id: "new_visitor_follow_up",
    category: "Church",
    name: "New Visitor Follow-Up",
    workspace_types: ["church"],
    trigger: "Someone new visited and may appreciate a welcome.",
    checks: [
      "Recent visitors",
      "How they found you",
      "A friendly welcome message",
    ],
    actions: [
      "Find new visitors",
      "Prepare a warm follow-up message",
    ],
    approval: "The message before it is sent.",
    runTo: "/crm/contacts",
    runLabel: "Review Visitors",
    askFadsQuestion: "Follow up new visitors.",
  },
  {
    id: "volunteer_check",
    category: "Church",
    name: "Volunteer Check",
    workspace_types: ["church"],
    trigger: "Volunteers may have upcoming roles or need a reminder.",
    checks: [
      "Volunteers and their roles",
      "Anything coming up that needs them",
    ],
    actions: [
      "Find volunteers who may need a reminder",
      "Prepare a friendly message",
    ],
    approval: "The message before it is sent.",
    runTo: "/crm/contacts",
    runLabel: "Review Volunteers",
    askFadsQuestion: "Who is volunteering soon?",
  },
  {
    id: "community_announcement",
    category: "Church",
    name: "Community Announcement",
    workspace_types: ["church"],
    trigger: "You need to share news with your community.",
    checks: [
      "Members and groups",
      "The right channel for the news",
    ],
    actions: [
      "Prepare a community announcement",
      "Personalise it for each recipient",
    ],
    approval: "The announcement before it is sent.",
    runTo: "/crm/contacts",
    runLabel: "Prepare Announcement",
    askFadsQuestion: "Prepare a community announcement.",
  },
  {
    id: "upcoming_event_check",
    category: "Church",
    name: "Upcoming Event Check",
    workspace_types: ["church"],
    trigger: "An event is coming up and may need promotion or preparation.",
    checks: [
      "Upcoming events",
      "Who should know about each",
    ],
    actions: [
      "Find upcoming events",
      "Prepare communication to help people attend",
    ],
    approval: "The message before it is sent.",
    runTo: "/church/reports",
    runLabel: "Review Events",
    askFadsQuestion: "What events are coming up?",
  },
];

export function getTemplatesForWorkspace(orgType, canAccessHrFlag = true) {
  return WORKFLOW_TEMPLATES.filter(
    (t) => t.workspace_types.includes(orgType) && (!t.hrOnly || canAccessHrFlag)
  );
}

export function getTemplateById(id) {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}