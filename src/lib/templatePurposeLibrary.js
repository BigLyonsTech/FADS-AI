import { TEMPLATES } from "@/lib/templateLibrary";

export const TEMPLATE_PURPOSES = [
  { key: "all", label: "Show All" },
  { key: "get_paid", label: "Get Paid" },
  { key: "follow_up", label: "Follow Up" },
  { key: "welcome", label: "Welcome Someone" },
  { key: "book_confirm", label: "Book / Confirm" },
  { key: "promote", label: "Promote Something" },
  { key: "thank_you", label: "Say Thank You" },
  { key: "announce", label: "Make an Announcement" },
];

const PURPOSE_LABELS = Object.fromEntries(TEMPLATE_PURPOSES.map((p) => [p.key, p.label]));

const existing = (id, purpose, overrides = {}) => {
  const source = TEMPLATES.find((t) => t.id === id);
  if (!source) return null;
  return {
    ...source,
    ...overrides,
    workspace: "small_business",
    purpose,
    purpose_label: PURPOSE_LABELS[purpose],
  };
};

const textTemplate = (id, workspace, purpose, title, description, body) => ({
  id,
  type: "text",
  workspace,
  purpose,
  purpose_label: PURPOSE_LABELS[purpose],
  title,
  description,
  body,
});

const BUSINESS_TEMPLATES = [
  existing("biz_3", "get_paid"),
  existing("biz_4", "get_paid"),
  textTemplate(
    "job_biz_quote",
    "small_business",
    "get_paid",
    "Quote / Estimate Message",
    "Send a clear quote or estimate and explain what happens next.",
    `Hi {customer_name},

Thank you for your enquiry. Your quote / estimate from {business_name} is {amount} for {product_service}.

The quote is valid until {valid_until}. If you would like to go ahead, reply here or contact us on {phone_number}.

Thank you,
{business_name}`
  ),
  textTemplate(
    "job_biz_appt_confirm",
    "small_business",
    "book_confirm",
    "Appointment Confirmation",
    "Confirm an appointment with the date and time clearly.",
    `Hi {customer_name},

Your appointment with {business_name} is confirmed for {date} at {time}.

Location: {location}

If you need to change the appointment, please let us know. We look forward to seeing you.`
  ),
  textTemplate(
    "job_biz_appt_follow",
    "small_business",
    "follow_up",
    "Appointment Follow-up",
    "Follow up after an appointment without starting from scratch.",
    `Hi {customer_name},

Thank you for meeting with us on {date}. It was lovely speaking with you.

I just wanted to follow up about {appointment_reason}. If you have any questions or would like to take the next step, reply here anytime.

Best,
{business_name}`
  ),
  existing("biz_1", "welcome"),
  existing("biz_2", "follow_up"),
  existing("prom_1", "promote", { title: "Special Offer" }),
  textTemplate(
    "job_biz_stock",
    "small_business",
    "announce",
    "Product / Stock Announcement",
    "Tell customers about a new product, service or stock arrival.",
    `New at {business_name}!

{product_name} is now available.

{short_description}

To order or ask a question, message us or call {phone_number}. {stock_note}`
  ),
  existing("biz_5", "thank_you"),
  existing("cc_4", "follow_up", {
    title: "Customer Testimonial Request",
    description: "Ask a happy customer for a short testimonial or review.",
  }),
  textTemplate(
    "job_biz_announcement",
    "small_business",
    "announce",
    "Business Announcement",
    "Share an important business update clearly.",
    `Important update from {business_name}

{announcement}

{date_or_details}

If you have any questions, please contact us on {phone_number}. Thank you for your continued support.`
  ),
].filter(Boolean);

const SCHOOL_TEMPLATES = [
  textTemplate(
    "job_school_welcome",
    "school",
    "welcome",
    "Parent / Guardian Welcome",
    "Welcome a parent or guardian to the school community.",
    `Dear {parent_guardian_name},

Welcome to {school_name}. We are delighted to welcome you and your family.

If you have any questions, please contact us on {phone_number}. We look forward to working together.

Warm regards,
{school_name}`
  ),
  textTemplate(
    "job_school_meeting_reminder",
    "school",
    "book_confirm",
    "Parent Meeting Reminder",
    "Remind a parent or guardian about an upcoming meeting.",
    `Hello {parent_guardian_name},

A friendly reminder about your meeting with {school_name} on {date} at {time}.

Location: {location}

Please let us know if you need to rearrange. Thank you.`
  ),
  textTemplate(
    "job_school_fee",
    "school",
    "get_paid",
    "School Fee Reminder",
    "Send a polite reminder about an outstanding school fee.",
    `Dear {parent_guardian_name},

This is a friendly reminder that {fee_description} of {amount} is due on {due_date}.

If payment has already been made, please disregard this message. If you have any questions, contact {school_name} on {phone_number}.

Thank you.`
  ),
  textTemplate(
    "job_school_follow",
    "school",
    "follow_up",
    "Parent Follow-up",
    "Follow up with a parent or guardian after a conversation or meeting.",
    `Hello {parent_guardian_name},

Thank you for speaking with us about {topic}. I wanted to follow up and check whether you have any questions or need anything else from us.

Please reply anytime.

Kind regards,
{school_name}`
  ),
  textTemplate(
    "job_school_meeting_confirm",
    "school",
    "book_confirm",
    "Meeting Confirmation",
    "Confirm a school meeting or visit.",
    `Hello {parent_guardian_name},

Your meeting / visit with {school_name} is confirmed for {date} at {time}.

Location: {location}

We look forward to seeing you.`
  ),
  textTemplate(
    "job_school_announcement",
    "school",
    "announce",
    "School Announcement",
    "Share an important school notice with families.",
    `School announcement from {school_name}

{announcement}

{date_or_details}

Please contact the school on {phone_number} if you have any questions.`
  ),
  textTemplate(
    "job_school_event",
    "school",
    "announce",
    "Event Reminder",
    "Remind families about an upcoming school event.",
    `Reminder: {event_name}

Date: {date}
Time: {time}
Location: {location}

We look forward to seeing our school community there. — {school_name}`
  ),
  textTemplate(
    "job_school_term",
    "school",
    "announce",
    "Term Announcement",
    "Share a new-term date or important term information.",
    `Dear parents and guardians,

{school_name} would like to share the following term update:

{term_information}

Important date: {date}

Thank you,
{school_name}`
  ),
];

const CHURCH_TEMPLATES = [
  textTemplate(
    "job_church_welcome",
    "church",
    "welcome",
    "New Member / Contact Welcome",
    "Warmly welcome a new member, visitor or contact.",
    `Hi {name},

It was lovely to welcome you to {church_name}. We are glad you connected with us.

If you have any questions or there is anything we can help with, please reply anytime.

Warmly,
{church_name}`
  ),
  textTemplate(
    "job_church_follow",
    "church",
    "follow_up",
    "Member / Contact Follow-up",
    "Follow up after a visit, conversation or connection.",
    `Hi {name},

It was lovely speaking with you. I just wanted to follow up and see how you are doing.

If you have any questions about {church_name}, an upcoming service or getting involved, please let us know.`
  ),
  textTemplate(
    "job_church_meeting",
    "church",
    "book_confirm",
    "Meeting Reminder",
    "Remind a member or contact about an upcoming meeting.",
    `Hi {name},

A friendly reminder about your meeting with {church_name} on {date} at {time}.

Location: {location}

We look forward to seeing you.`
  ),
  textTemplate(
    "job_church_service",
    "church",
    "announce",
    "Service Announcement",
    "Share service time, location or an important service update.",
    `Service announcement from {church_name}

{service_details}

Date: {date}
Time: {time}
Location: {location}

Everyone is welcome.`
  ),
  textTemplate(
    "job_church_event_invite",
    "church",
    "promote",
    "Event Invitation",
    "Invite members, contacts and visitors to a church event.",
    `You're invited to {event_name} at {church_name}.

Date: {date}
Time: {time}
Location: {location}

{event_details}

We would love to see you there.`
  ),
  textTemplate(
    "job_church_event_follow",
    "church",
    "follow_up",
    "Event Follow-up",
    "Follow up after a church or community event.",
    `Hi {name},

Thank you for joining us for {event_name}. We hope you enjoyed being with us.

If you have any questions or would like to stay connected with {church_name}, just reply here anytime.`
  ),
  textTemplate(
    "job_church_giving_thanks",
    "church",
    "thank_you",
    "Giving / Donation Thank You",
    "Thank someone warmly for their giving or donation.",
    `Dear {name},

Thank you for your generous giving to {church_name}. We truly appreciate your support and the difference it helps make in our community.

With gratitude,
{church_name}`
  ),
  textTemplate(
    "job_church_volunteer",
    "church",
    "book_confirm",
    "Volunteer Reminder",
    "Remind a volunteer about an upcoming role or serving time.",
    `Hi {name},

A quick reminder that you are helping with {volunteer_role} on {date} at {time}.

Please arrive at {arrival_time} at {location}. Thank you for serving — we really appreciate you.`
  ),
];

const GENERIC_FALLBACK = [
  existing("wa_2", "book_confirm"),
  existing("wa_5", "follow_up"),
  existing("em_5", "thank_you"),
  existing("prom_1", "promote"),
].filter(Boolean).map((t) => ({ ...t, workspace: "all" }));

export function getPurposeLabel(purpose) {
  return PURPOSE_LABELS[purpose] || "Template";
}

export function getTextTemplatesForWorkspace(workspace) {
  if (workspace === "school") return SCHOOL_TEMPLATES;
  if (workspace === "church") return CHURCH_TEMPLATES;
  if (workspace === "small_business") return BUSINESS_TEMPLATES;
  return GENERIC_FALLBACK;
}

export function inferCanvaPurpose(template) {
  const haystack = [
    template?.name,
    template?.category,
    template?.content_type,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/sale|offer|promotion|product|fundrais|event|open day/.test(haystack)) return "promote";
  if (/welcome/.test(haystack)) return "welcome";
  if (/thank|giving|donation/.test(haystack)) return "thank_you";
  if (/appointment|meeting|visit|reminder/.test(haystack)) return "book_confirm";
  if (/follow|testimonial|review/.test(haystack)) return "follow_up";
  if (/invoice|payment|fee|quote|estimate/.test(haystack)) return "get_paid";
  return "announce";
}
