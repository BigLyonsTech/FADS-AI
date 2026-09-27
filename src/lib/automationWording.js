// Workspace-adaptive language for the Pipeline Automations layer.
// One shared automation engine — visible trigger/action labels, example
// rules, FADS suggestions and default message templates adapt per workspace.
// Never shows sales language where it is inappropriate (e.g. church).

import { getPipelineConfig, getCrmConfig } from "@/lib/crmWording";

// ── Trigger labels (plain language) ──────────────────────────────────
export const TRIGGER_OPTIONS = [
  { value: "stage_entered", label: "A person moves to a pipeline stage" },
  { value: "appointment_booked", label: "An appointment is booked" },
  { value: "appointment_completed", label: "An appointment is completed" },
  { value: "follow_up_due", label: "A reminder or follow-up becomes due" },
];

export const ACTION_OPTIONS = [
  { value: "create_reminder", label: "Remind me to follow up" },
  { value: "create_followup", label: "Create a follow-up" },
  { value: "create_task", label: "Create an internal task" },
  { value: "prepare_whatsapp", label: "Prepare a WhatsApp draft" },
  { value: "prepare_message", label: "Prepare an internal message" },
  { value: "prepare_email", label: "Prepare an email" },
];

export const TIMING_OPTIONS = [
  { value: "now", label: "Now" },
  { value: "later_today", label: "Later Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "custom", label: "Custom" },
];

// Workspace-adaptive trigger phrasing
export function triggerLabel(triggerType, orgType) {
  if (triggerType === "audience_broadcast") return "I want to message a group of people";
  const labels = {
    small_business: {
      stage_entered: "a prospect enters a stage",
      no_contact_days: "a prospect hasn't been contacted",
      appointment_booked: "an appointment is booked",
      appointment_completed: "an appointment is completed",
      follow_up_due: "a reminder or follow-up is due",
      new_person: "a new lead is added",
      becomes_customer: "someone becomes a customer",
    },
    school: {
      stage_entered: "an enquiry enters a stage",
      no_contact_days: "a family hasn't been contacted",
      appointment_booked: "a meeting or visit is booked",
      appointment_completed: "a meeting or visit is completed",
      follow_up_due: "a reminder or follow-up is due",
      new_person: "a new enquiry is added",
      becomes_customer: "a student is enrolled",
    },
    university: {
      stage_entered: "an applicant enters a stage",
      no_contact_days: "an applicant hasn't been contacted",
      follow_up_due: "a follow-up is due",
      new_person: "a new application is added",
      becomes_customer: "an applicant is enrolled",
    },
    church: {
      stage_entered: "a contact enters a stage",
      no_contact_days: "someone hasn't been contacted",
      appointment_booked: "a meeting or visit is booked",
      appointment_completed: "a meeting or visit is completed",
      follow_up_due: "a reminder or follow-up is due",
      new_person: "a new visitor is added",
      becomes_customer: "someone becomes a member",
    },
  };
  const set = labels[orgType] || labels.small_business;
  return set[triggerType] || triggerType;
}

// Workspace-adaptive action phrasing
export function actionLabel(actionType, orgType) {
  if (actionType === "send_to_audience") return "send or prepare a message to a group";
  const labels = {
    small_business: {
      create_reminder: "remind me to follow up",
      create_followup: "create a follow-up",
      prepare_whatsapp: "prepare a WhatsApp draft",
      prepare_message: "prepare a message",
      prepare_email: "prepare an email",
      add_label: "add a label",
      move_stage: "move to another stage",
      create_task: "create a task",
    },
    school: {
      create_reminder: "remind me to follow up with the parent / guardian",
      create_followup: "create a follow-up",
      prepare_whatsapp: "prepare a WhatsApp draft",
      prepare_message: "prepare a message",
      prepare_email: "prepare an email",
      add_label: "add a label",
      move_stage: "move to another stage",
      create_task: "create a task",
    },
    church: {
      create_reminder: "remind me to follow up with the contact / member",
      create_followup: "create a follow-up",
      prepare_whatsapp: "prepare a WhatsApp draft",
      prepare_message: "prepare a message",
      prepare_email: "prepare an email",
      add_label: "add a label",
      move_stage: "move to another stage",
      create_task: "create a task",
    },
  };
  const set = labels[orgType] || labels.small_business;
  return set[actionType] || actionType;
}

// ── Suggested rules (FADS recommendations shown in the builder) ──────
export function getSuggestedRules(orgType) {
  const pipe = getPipelineConfig(orgType);
  const stages = pipe.stages.map((s) => s.name);
  const followUpStage = stages[3] || stages[0];

  return [
    {
      name: orgType === "school"
        ? "Follow up after a meeting or visit"
        : orgType === "church"
          ? "Follow up after a meeting or visit"
          : "Follow up after an appointment",
      trigger_type: "appointment_completed",
      trigger_config: {},
      action_type: "create_reminder",
      action_config: { timing: "tomorrow" },
    },
    {
      name: orgType === "school"
        ? "Prepare a parent / guardian follow-up"
        : orgType === "church"
          ? "Prepare a contact / member follow-up"
          : "Prepare a customer follow-up",
      trigger_type: "stage_entered",
      trigger_config: { stage: followUpStage },
      action_type: "prepare_whatsapp",
      action_config: { template_category: "follow_up" },
    },
    {
      name: "Create a task when a follow-up is due",
      trigger_type: "follow_up_due",
      trigger_config: {},
      action_type: "create_task",
      action_config: { timing: "now", task_title: "Follow up today" },
    },
  ];
}

// ── Default message templates (adapted per workspace) ────────────────
export function getDefaultTemplates(orgType) {
  const config = getCrmConfig(orgType);
  const peopleWord = orgType === "church" ? "member" : orgType === "school" ? "family" : "customer";
  const orgWord = orgType === "church" ? "community" : orgType === "school" ? "school" : "business";

  const templates = [
    {
      category: "first_contact",
      name: "First contact",
      channel: "whatsapp",
      body: `Hi {name}, thank you for your interest in our ${orgWord}. I'd love to find out how we can help — would this be a good time for a quick chat?`,
    },
    {
      category: "follow_up",
      name: "General follow-up",
      channel: "whatsapp",
      body: `Hi {name}, just following up on my last message. Is there anything I can help with? Happy to answer any questions you have.`,
    },
    {
      category: "proposal_follow_up",
      name: "Proposal follow-up",
      channel: "whatsapp",
      body: `Hi {name}, I sent over some details recently and wanted to check if you had any questions. I'm happy to walk through anything whenever suits you.`,
    },
    {
      category: "thank_you",
      name: "Thank you / welcome",
      channel: "whatsapp",
      body: `Hi {name}, thank you so much for joining us! We're delighted to have you. If there's anything you need, just let me know.`,
    },
    {
      category: "customer_check_in",
      name: "Customer check-in",
      channel: "whatsapp",
      body: `Hi {name}, just checking in to see how things are going. Is there anything I can help with?`,
    },
    {
      category: "payment_reminder",
      name: "Payment reminder",
      channel: "whatsapp",
      body: `Hi {name}, a gentle reminder that a payment is due. Let me know if you have any questions — happy to help.`,
    },
  ];

  // Adapt wording for church/school
  if (orgType === "church") {
    templates[0].body = `Hi {name}, it was lovely to see you at our service. We'd love to welcome you properly — is there anything we can help with?`;
    templates[2].body = `Hi {name}, I wanted to follow up and see if you have any questions about our community. We'd love to stay in touch.`;
    templates[3].body = `Hi {name}, welcome to our community! We're so glad you're here. Please let me know if there's anything I can help with.`;
  }
  if (orgType === "school") {
    templates[0].body = `Hi {name}, thank you for your enquiry about our school. I'd be happy to answer any questions you have — would a quick call suit?`;
    templates[2].body = `Hi {name}, I sent over some information about enrolment recently and wanted to check if you had any questions.`;
    templates[3].body = `Hi {name}, welcome to our school! We're delighted to have your family join us. Please let me know if you have any questions.`;
  }

  return templates.map((t) => ({ ...t, is_builtin: true }));
}

export const TEMPLATE_CATEGORY_LABELS = {
  first_contact: "First Contact",
  follow_up: "Follow-Up",
  proposal_follow_up: "Proposal Follow-Up",
  thank_you: "Thank You",
  customer_check_in: "Customer Check-In",
  payment_reminder: "Payment Reminder",
  custom: "Custom",
};

// ── FADS suggestions computed from live CRM data ─────────────────────
// Returns a list of recommendation objects: { id, message, count, action }
export function getFadsSuggestions(crm) {
  const { contacts, leads, tasks, orgType } = crm;
  if (!contacts || !contacts.length) return [];

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const days = (dateStr) => {
    if (!dateStr) return 9999;
    const d = new Date(dateStr);
    return Math.floor((today - d) / (1000 * 60 * 60 * 24));
  };

  const noContact = contacts.filter(
    (c) => c.status !== "inactive" && days(c.last_contact_date) >= 7
  );
  const proposalsWaiting = leads.filter(
    (l) => {
      const display = l.stage || "";
      return display.includes("PROPOSAL") || display.includes("APPLICATION") || display.includes("INTERVIEW") || display.includes("CONNECT");
    }
  );
  const newEnquiries = contacts.filter(
    (c) => c.status === "new" && days(c.created_date) <= 7
  );
  const overdueTasks = tasks.filter(
    (t) => t.status === "open" && t.due_date && new Date(t.due_date) < new Date(todayStr)
  );

  const suggestions = [];
  if (noContact.length > 0) {
    suggestions.push({
      id: "no_contact",
      message: `${noContact.length} ${noContact.length === 1 ? "person has" : "people have"}n't been contacted recently. Would you like me to prepare a follow-up?`,
      count: noContact.length,
      contacts: noContact,
      action_type: "prepare_whatsapp",
      action_config: { template_category: "follow_up" },
    });
  }
  if (proposalsWaiting.length > 0) {
    suggestions.push({
      id: "proposals",
      message: `${proposalsWaiting.length} ${proposalsWaiting.length === 1 ? "proposal is" : "proposals are"} waiting for a response.`,
      count: proposalsWaiting.length,
      leads: proposalsWaiting,
      action_type: "prepare_whatsapp",
      action_config: { template_category: "proposal_follow_up" },
    });
  }
  if (newEnquiries.length > 0) {
    suggestions.push({
      id: "new_enquiries",
      message: `${newEnquiries.length} new ${newEnquiries.length === 1 ? "enquiry needs" : "enquiries need"} attention.`,
      count: newEnquiries.length,
      contacts: newEnquiries,
      action_type: "prepare_whatsapp",
      action_config: { template_category: "first_contact" },
    });
  }
  if (overdueTasks.length > 0) {
    suggestions.push({
      id: "overdue_tasks",
      message: `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? "task needs" : "tasks need"} your attention.`,
      count: overdueTasks.length,
      tasks: overdueTasks,
      action_type: "create_followup",
      action_config: { days_ahead: 0 },
    });
  }
  return suggestions;
}

// ── Announcement examples (workspace-adaptive Quick Start chips) ─────
// Shown in the Announcement wizard step 1 to help users get started.
export const ANNOUNCEMENT_EXAMPLES = {
  small_business: [
    "Sale / special offer",
    "New product",
    "New service",
    "Event invitation",
    "Customer update",
    "Holiday opening hours",
    "Appointment reminder",
  ],
  school: [
    "School announcement",
    "Bake sale this Friday",
    "Sports day",
    "School closure",
    "Parent meeting",
    "Event reminder",
    "Enrolment announcement",
  ],
  university: [
    "University announcement",
    "Open day",
    "Exam schedule update",
    "Campus closure",
    "Event reminder",
    "Enrolment announcement",
  ],
  church: [
    "Community announcement",
    "Service reminder",
    "Upcoming event",
    "Volunteer request",
    "Fundraiser",
    "Schedule change",
  ],
};

export function getAnnouncementExamples(orgType) {
  return ANNOUNCEMENT_EXAMPLES[orgType] || ANNOUNCEMENT_EXAMPLES.small_business;
}

// ── Audience broadcast helpers ───────────────────────────────────────
// Audience type options for the broadcast action in the automation builder.
export const AUDIENCE_TYPE_OPTIONS = [
  { value: "contact_type", label: "By contact type" },
  { value: "group", label: "By group" },
  { value: "pipeline_stage", label: "By pipeline stage" },
  { value: "individual", label: "Individual contacts" },
  { value: "filtered", label: "Everyone in my CRM" },
];

// Resolve an audience config to a deduplicated list of CRM contacts.
// Used by the BroadcastReviewDialog to show who will receive the message.
export function resolveAudienceContacts(actionConfig, contacts, leads) {
  const { audience_type, audience_values } = actionConfig;
  if (!audience_type) return [];

  if (audience_type === "filtered") return [...contacts];
  if (!audience_values || audience_values.length === 0) return [];

  let resolved = [];
  if (audience_type === "group") {
    resolved = contacts.filter((c) => audience_values.includes(c.crm_organisation_id));
  } else if (audience_type === "contact_type") {
    resolved = contacts.filter((c) => audience_values.includes(c.contact_type));
  } else if (audience_type === "pipeline_stage") {
    const contactIds = leads
      .filter((l) => audience_values.includes(l.stage))
      .map((l) => l.contact_id)
      .filter(Boolean);
    resolved = contacts.filter((c) => contactIds.includes(c.id));
  } else if (audience_type === "individual") {
    resolved = contacts.filter((c) => audience_values.includes(c.id));
  }

  // Deduplicate by contact ID
  const seen = new Set();
  return resolved.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}