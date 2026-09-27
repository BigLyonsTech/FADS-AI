// Workspace-aware terminology for the CRM module.
// One shared CRM system — labels adapt to the selected workspace type.

import { resolveTerminology, singular } from "@/lib/faithTerminology";

export const CRM_WORKSPACE_CONFIG = {
  small_business: {
    contactsLabel: "People & Contacts",
    leadsLabel: "Leads",
    pipelineLabel: "Sales Pipeline",
    contactTypeLabel: "Contact Type",
    contactTypes: [
      { value: "lead", label: "Lead" },
      { value: "prospect", label: "Prospect" },
      { value: "customer", label: "Customer" },
      { value: "supplier", label: "Supplier" },
      { value: "employee", label: "Employee" },
      { value: "partner", label: "Partner" },
    ],
    finalStageLabel: "Converted",
    sourceOptions: ["Website", "Referral", "Walk-in", "Event", "Social Media", "Cold Call", "Other"],
    dashboardTitle: "CRM Dashboard",
    newContactLabel: "New Contact",
    newLeadLabel: "New Lead",
  },
  school: {
    contactsLabel: "Contacts",
    leadsLabel: "Enquiries",
    pipelineLabel: "Enquiries Pipeline",
    contactTypeLabel: "Contact Type",
    contactTypes: [
      { value: "parent", label: "Parent" },
      { value: "enquiry", label: "Enquiry" },
      { value: "prospective_family", label: "Prospective Family" },
      { value: "student", label: "Student" },
      { value: "supplier", label: "Supplier" },
      { value: "staff", label: "Staff (HR)" },
      { value: "partner", label: "Partner" },
    ],
    finalStageLabel: "Enrolled",
    sourceOptions: ["Website", "Referral", "Open Day", "Walk-in", "Phone Enquiry", "Event", "Other"],
    dashboardTitle: "CRM Dashboard",
    newContactLabel: "New Contact",
    newLeadLabel: "New Enquiry",
  },
  university: {
    contactsLabel: "Contacts",
    leadsLabel: "Applicants",
    pipelineLabel: "Applicant Pipeline",
    contactTypeLabel: "Contact Type",
    contactTypes: [
      { value: "applicant", label: "Applicant" },
      { value: "prospective_student", label: "Prospective Student" },
      { value: "student", label: "Student" },
      { value: "alumni", label: "Alumni" },
      { value: "supplier", label: "Supplier" },
      { value: "staff", label: "Staff (HR)" },
      { value: "partner", label: "Partner" },
    ],
    finalStageLabel: "Enrolled",
    sourceOptions: ["Website", "Referral", "Open Day", "UCAS", "Event", "Social Media", "Other"],
    dashboardTitle: "CRM Dashboard",
    newContactLabel: "New Contact",
    newLeadLabel: "New Application",
  },
  church: {
    contactsLabel: "Contacts",
    leadsLabel: "Connections",
    pipelineLabel: "Connections Pipeline",
    contactTypeLabel: "Contact Type",
    contactTypes: [
      { value: "member", label: "Member" },
      { value: "visitor", label: "Visitor" },
      { value: "donor", label: "Donor" },
      { value: "volunteer", label: "Volunteer" },
      { value: "family", label: "Family / Household" },
      { value: "supplier", label: "Supplier" },
      { value: "staff", label: "Staff (HR)" },
    ],
    finalStageLabel: "Member",
    sourceOptions: ["Sunday Service", "Referral", "Website", "Event", "Outreach", "Social Media", "Other"],
    dashboardTitle: "CRM Dashboard",
    newContactLabel: "New Contact",
    newLeadLabel: "New Connection",
  },
};

// ── Workspace-specific Pipeline Configuration ──────────────────────────
// One shared pipeline engine — visible stage names, helper text, FADS
// guidance, intelligence indicators and empty states adapt per workspace.
// A safe internal mapping connects workspace-specific visible stages to
// the existing CRM status/pipeline values stored in the database.
export const PIPELINE_CONFIG = {
  small_business: {
    crmExplanation: "Your customers, potential customers and business relationships in one place.",
    pipelineTitle: "FADS PIPELINE",
    pipelineHelper: "Here's where your potential customers are.",
    pipelineDescription:
      "Move someone along as the relationship progresses. I'll help you remember who needs attention.",
    askFadsLabel: "Ask FADS: Who should I follow up with?",
    askFadsQuery: "Who should I follow up with?",
    introWhatIs:
      "This is your sales pipeline — where you track people who might become customers and see how close they are to saying yes.",
    introWhatYouCanDo:
      "Add a potential customer, move them along as things progress, and see the value of everyone who's interested.",
    emptyMessage:
      "No potential customers here yet. Add someone or import your existing contacts.",
    stages: [
      { name: "New", order: 0, color: "#64748b" },
      { name: "Contacted", order: 1, color: "#3b82f6" },
      { name: "Appointment Booked", order: 2, color: "#8b5cf6" },
      { name: "Follow-up", order: 3, color: "#f59e0b" },
      { name: "Customer", order: 4, color: "#10b981" },
      { name: "Completed", order: 5, color: "#94a3b8" },
    ],
    stageMap: {
      New: "New", NEW: "New",
      Contacted: "Contacted", CONTACTED: "Contacted",
      Engaged: "Appointment Booked", INTERESTED: "Appointment Booked", "Appointment Booked": "Appointment Booked",
      "Follow-up": "Follow-up", Qualified: "Follow-up", "PROPOSAL SENT": "Follow-up",
      Active: "Customer", Converted: "Customer", CUSTOMER: "Customer", Customer: "Customer",
      Inactive: "Completed", "NOT NOW": "Completed", Completed: "Completed",
    },
    indicators: {
      followUpToday: "Follow up today",
      noContact: (days) => `No contact for ${days}d`,
      waitingReply: "Waiting on reply",
      proposalWaiting: "Proposal waiting",
      invoiceOverdue: "Invoice overdue",
    },
  },
  school: {
    crmExplanation: "Keep your students, parents and new enquiries organised in one place.",
    pipelineTitle: "FADS PIPELINE",
    pipelineHelper: "Here's where your enquiries and prospective families are.",
    pipelineDescription:
      "Move someone along as they progress from enquiry to enrolment. I'll help you remember who needs attention.",
    askFadsLabel: "Ask FADS: Which enquiries need attention?",
    askFadsQuery: "Which enquiries need attention?",
    introWhatIs:
      "This is your admissions journey — where you track families from first enquiry to enrolment.",
    introWhatYouCanDo:
      "Add an enquiry, move them along as things progress, and see who's close to enrolling.",
    emptyMessage:
      "No enquiries here yet. Add an enquiry or import your existing records.",
    stages: [
      { name: "New Enquiry", order: 0, color: "#64748b" },
      { name: "Contacted", order: 1, color: "#3b82f6" },
      { name: "Meeting / Visit Booked", order: 2, color: "#8b5cf6" },
      { name: "Follow-up", order: 3, color: "#f59e0b" },
      { name: "Enrolled / Resolved", order: 4, color: "#10b981" },
      { name: "Completed", order: 5, color: "#94a3b8" },
    ],
    stageMap: {
      New: "New Enquiry", "NEW ENQUIRY": "New Enquiry", "New Enquiry": "New Enquiry",
      Contacted: "Contacted", CONTACTED: "Contacted",
      Engaged: "Meeting / Visit Booked", INTERESTED: "Meeting / Visit Booked", "Meeting / Visit Booked": "Meeting / Visit Booked",
      "Follow-up": "Follow-up", Qualified: "Follow-up", APPLICATION: "Follow-up",
      Active: "Enrolled / Resolved", Converted: "Enrolled / Resolved", ENROLLED: "Enrolled / Resolved", "Enrolled / Resolved": "Enrolled / Resolved",
      Inactive: "Completed", "NOT PROCEEDING": "Completed", Completed: "Completed",
    },
    indicators: {
      followUpToday: "Follow up today",
      noContact: (days) => `No contact for ${days}d`,
      enquiryWaiting: "Enquiry waiting",
      parentNeedsReply: "Parent needs reply",
      applicationNeedsAttention: "Application needs attention",
    },
  },
  university: {
    crmExplanation: "Keep your applicants, students and alumni organised in one place.",
    pipelineTitle: "FADS PIPELINE",
    pipelineHelper: "Here's where your applicants are.",
    pipelineDescription:
      "Move someone along from application to enrolment. I'll help you remember who needs attention.",
    askFadsLabel: "Ask FADS: Which applications need attention?",
    askFadsQuery: "Which applications need attention?",
    introWhatIs:
      "This is your applicant pipeline — where you track people from application to enrolment.",
    introWhatYouCanDo:
      "Add an applicant, move them along as things progress, and see who's close to enrolling.",
    emptyMessage:
      "No applicants here yet. Add an applicant or import your existing records.",
    stages: [
      { name: "NEW APPLICATION", order: 0, color: "#64748b" },
      { name: "CONTACTED", order: 1, color: "#3b82f6" },
      { name: "INTERESTED", order: 2, color: "#8b5cf6" },
      { name: "INTERVIEW", order: 3, color: "#f59e0b" },
      { name: "ENROLLED", order: 4, color: "#10b981" },
      { name: "NOT PROCEEDING", order: 5, color: "#94a3b8" },
    ],
    stageMap: {
      New: "NEW APPLICATION", Contacted: "CONTACTED", Engaged: "INTERESTED",
      "Follow-up": "INTERVIEW", Qualified: "INTERVIEW",
      Active: "ENROLLED", Converted: "ENROLLED", Inactive: "NOT PROCEEDING",
      "NEW APPLICATION": "NEW APPLICATION", INTERVIEW: "INTERVIEW",
      ENROLLED: "ENROLLED", "NOT PROCEEDING": "NOT PROCEEDING",
    },
    indicators: {
      followUpToday: "Follow up today",
      noContact: (days) => `No contact for ${days}d`,
      applicationWaiting: "Application waiting",
    },
  },
  church: {
    crmExplanation: "Keep your members, visitors and community relationships organised in one place.",
    pipelineTitle: "FADS PIPELINE",
    pipelineHelper: "Here's where your visitors and new contacts are.",
    pipelineDescription:
      "Move someone along as they connect with your community. I'll help you remember who needs a welcome.",
    askFadsLabel: "Ask FADS: Who might appreciate a follow-up?",
    askFadsQuery: "Who might appreciate a follow-up?",
    introWhatIs:
      "This is your connection journey — where you track people from first visit to becoming part of your community.",
    introWhatYouCanDo:
      "Add a new contact, move them along as they connect, and see who needs a follow-up.",
    emptyMessage:
      "No new contacts here yet. Add someone or import your existing contacts.",
    stages: [
      { name: "New Contact", order: 0, color: "#64748b" },
      { name: "Contacted", order: 1, color: "#3b82f6" },
      { name: "Meeting / Visit", order: 2, color: "#8b5cf6" },
      { name: "Follow-up", order: 3, color: "#f59e0b" },
      { name: "Connected", order: 4, color: "#10b981" },
      { name: "Completed", order: 5, color: "#94a3b8" },
    ],
    stageMap: {
      New: "New Contact", "NEW VISITOR": "New Contact", "New Contact": "New Contact",
      Contacted: "Contacted", WELCOMED: "Contacted",
      Engaged: "Meeting / Visit", "FOLLOW-UP": "Meeting / Visit", "Meeting / Visit": "Meeting / Visit",
      "Follow-up": "Follow-up", Qualified: "Follow-up", CONNECTED: "Follow-up",
      Active: "Connected", Converted: "Connected", MEMBER: "Connected", Connected: "Connected",
      Inactive: "Completed", "KEEP IN TOUCH": "Completed", Completed: "Completed",
    },
    indicators: {
      followUpToday: "Follow-up due",
      noContact: (days) => `Not contacted for ${days}d`,
      newVisitor: "New visitor",
      notContactedYet: "Not contacted yet",
    },
  },
};

export function getPipelineConfig(orgOrType) {
  const isOrg = typeof orgOrType === "object" && orgOrType !== null;
  const orgType = isOrg ? orgOrType.type : orgOrType;
  return PIPELINE_CONFIG[orgType] || PIPELINE_CONFIG.small_business;
}

// Map any internal stage name (old or new) to the workspace-specific
// display name. Falls back to the original name if no mapping exists.
export function getStageDisplayName(stageName, orgOrType) {
  if (!stageName) return "";
  const config = getPipelineConfig(orgOrType);
  return config.stageMap[stageName] || stageName;
}

// ── One Source of Truth: Pipeline stage ↔ Contact status mapping ───────
// When a lead moves on the Pipeline, the linked contact's status is synced.
// When a contact's status changes, linked leads' stages are synced.
// This ensures People & Contacts and Pipeline always reflect the same journey.
export const STAGE_TO_STATUS = {
  "New": "new", "New Enquiry": "new", "New Contact": "new",
  "NEW": "new", "NEW ENQUIRY": "new", "NEW APPLICATION": "new", "NEW VISITOR": "new",
  "Contacted": "contacted", "CONTACTED": "contacted", "WELCOMED": "contacted",
  "Appointment Booked": "engaged", "Meeting / Visit Booked": "engaged", "Meeting / Visit": "engaged",
  "INTERESTED": "engaged", "FOLLOW-UP": "engaged",
  "Follow-up": "qualified", "PROPOSAL SENT": "qualified", "APPLICATION": "qualified", "INTERVIEW": "qualified", "CONNECTED": "qualified",
  "Customer": "active", "Enrolled / Resolved": "active", "Connected": "active",
  "CUSTOMER": "active", "ENROLLED": "active", "MEMBER": "active",
  "Completed": "inactive", "NOT NOW": "inactive", "NOT PROCEEDING": "inactive", "KEEP IN TOUCH": "inactive",
};

export function getContactStatusForStage(stageName, orgType) {
  const display = getStageDisplayName(stageName, orgType);
  return STAGE_TO_STATUS[display] || "new";
}

export function getStageForContactStatus(status, orgType) {
  const config = getPipelineConfig(orgType);
  const statusToStage = {
    new: config.stages[0]?.name,
    contacted: config.stages[1]?.name,
    engaged: config.stages[2]?.name,
    qualified: config.stages[3]?.name,
    active: config.stages[4]?.name,
    converted: config.stages[4]?.name,
    inactive: config.stages[5]?.name,
  };
  return statusToStage[status] || null;
}

// Build a church/faith CRM config using the organisation's terminology.
// Contact type values (member, donor, visitor, volunteer) stay the same —
// only the display labels adapt. This keeps existing records compatible.
function buildChurchCrmConfig(org) {
  const term = resolveTerminology(org);
  const peopleSingular = singular(term.people) || "Member";
  const volunteerSingular = singular(term.volunteers) || "Volunteer";
  return {
    ...CRM_WORKSPACE_CONFIG.church,
    contactTypes: [
      { value: "member", label: peopleSingular },
      { value: "visitor", label: "Visitor" },
      { value: "donor", label: "Donor" },
      { value: "volunteer", label: volunteerSingular },
      { value: "family", label: "Family / Household" },
      { value: "supplier", label: "Supplier" },
      { value: "staff", label: "Staff (HR)" },
    ],
    finalStageLabel: "Active",
  };
}

export function getCrmConfig(orgOrType) {
  const isOrg = typeof orgOrType === "object" && orgOrType !== null;
  const orgType = isOrg ? orgOrType.type : orgOrType;
  if (orgType === "church" && isOrg) {
    return buildChurchCrmConfig(orgOrType);
  }
  return CRM_WORKSPACE_CONFIG[orgType] || CRM_WORKSPACE_CONFIG.small_business;
}

export function getContactTypeLabel(orgOrType, value) {
  const config = getCrmConfig(orgOrType);
  return config.contactTypes.find((t) => t.value === value)?.label || value || "—";
}

// Plain-English description shown for each contact type in the type-first
// "What type of contact is this?" selector.
export const CONTACT_TYPE_DESCRIPTIONS = {
  customer: "Someone who buys from you. Connects to their sales and payment history.",
  supplier: "A business you buy from. Connects to your supplier bills and payments.",
  employee: "A member of staff. Managed in the HR module with full employment details.",
  parent: "A parent or guardian of a student. Connects to fee payments.",
  student: "A student enrolled at the school.",
  member: "A member of your community.",
  donor: "Someone who gives donations or contributions.",
  visitor: "Someone who has visited and is being followed up.",
  volunteer: "Someone who volunteers with your organisation.",
  family: "A family or household group within your community.",
  staff: "A member of staff. Managed in the HR module with full employment details.",
  lead: "A potential customer who has shown interest.",
  prospect: "A contact you're actively qualifying.",
  applicant: "Someone applying to study at the institution.",
  alumni: "A former student of the institution.",
  partner: "A partner organisation.",
  enquiry: "An enquiry about enrolment.",
  prospective_family: "A family exploring enrolment.",
  prospective_student: "Someone considering applying.",
};

export function getContactTypeDescription(value) {
  return CONTACT_TYPE_DESCRIPTIONS[value] || "";
}

// Whether this contact type represents an employee/staff member who should
// be managed in HR rather than duplicated as a generic contact.
export function isEmployeeContactType(orgType, value) {
  if (orgType === "small_business") return value === "employee";
  return value === "staff";
}

// Quick filter chips shown above the contacts list, adapted per workspace.
// Each group maps to the contact_type values it includes. "Other" catches
// everything not in the named groups.
export const CONTACT_FILTER_GROUPS = {
  small_business: [
    { label: "All", value: "" },
    { label: "Customers", types: ["customer"] },
    { label: "Leads", types: ["lead", "prospect"] },
    { label: "Suppliers", types: ["supplier"] },
    { label: "Employees", types: ["employee"] },
    { label: "Other", types: [], other: true },
  ],
  school: [
    { label: "All", value: "" },
    { label: "Students", types: ["student"] },
    { label: "Parents", types: ["parent"] },
    { label: "Enquiries", types: ["enquiry", "prospective_family"] },
    { label: "Staff", types: ["staff"] },
    { label: "Other", types: [], other: true },
  ],
  university: [
    { label: "All", value: "" },
    { label: "Students", types: ["applicant", "prospective_student", "student"] },
    { label: "Alumni", types: ["alumni"] },
    { label: "Suppliers", types: ["supplier"] },
    { label: "Staff", types: ["staff"] },
    { label: "Other", types: [], other: true },
  ],
  church: [
    { label: "All", value: "" },
    { label: "Members", types: ["member"] },
    { label: "Donors", types: ["donor"] },
    { label: "Suppliers", types: ["supplier"] },
    { label: "Staff", types: ["staff"] },
    { label: "Other", types: [], other: true },
  ],
};

export function getContactFilterGroups(orgOrType) {
  const isOrg = typeof orgOrType === "object" && orgOrType !== null;
  const orgType = isOrg ? orgOrType.type : orgOrType;
  const groups = CONTACT_FILTER_GROUPS[orgType] || CONTACT_FILTER_GROUPS.small_business;
  if (orgType === "church" && isOrg) {
    const term = resolveTerminology(orgOrType);
    return groups.map((g) => (g.label === "Members" ? { ...g, label: term.people } : g));
  }
  return groups;
}

// Default pipeline stages — workspace-specific names and colours.
// Used when seeding demo data for a new workspace. Each workspace type
// gets its own 6-stage journey with appropriate terminology.
export function getDefaultStages(orgType) {
  const config = getPipelineConfig(orgType);
  return config.stages.map((s) => ({ ...s }));
}

export const CONTACT_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "engaged", label: "Engaged" },
  { value: "qualified", label: "Qualified" },
  { value: "active", label: "Active" },
  { value: "converted", label: "Converted" },
  { value: "inactive", label: "Inactive" },
];

export const TASK_TYPE_OPTIONS = [
  { value: "task", label: "Task" },
  { value: "follow_up", label: "Follow-up" },
  { value: "appointment", label: "Appointment" },
  { value: "reminder", label: "Reminder" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
];

export const ACTIVITY_TYPE_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other" },
];