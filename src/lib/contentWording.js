// Workspace-adaptive wording and configuration for the FADS Content Centre.
// Keeps language simple and jargon-free for busy owners.

export const TEMPLATE_CATEGORIES = [
  "Social Post",
  "Story",
  "Reel/Video",
  "Flyer/Poster",
  "Sale/Offer",
  "Event",
  "Announcement",
  "Education",
  "Affiliate/Promotion",
];

export const TEMPLATE_WORKSPACES = [
  { value: "all", label: "All" },
  { value: "small_business", label: "Business" },
  { value: "school", label: "School" },
  { value: "university", label: "University" },
  { value: "church", label: "Church" },
];

export function isValidCanvaTemplateUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      /(^|\.)canva\.com$/i.test(parsed.hostname) &&
      !/\/edit\/?$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

// Map content type keys to template categories for recommendations.
export const CONTENT_TYPE_TO_CATEGORY = {
  social_post: ["Social Post", "Story", "Announcement", "Education"],
  reel_idea: ["Reel/Video", "Story"],
  caption: ["Social Post"],
  hashtags: ["Social Post"],
  email: ["Announcement", "Education", "Sale/Offer"],
  whatsapp: ["Announcement", "Event"],
  direct_message: ["Announcement", "Event"],
  short_message: ["Social Post", "Announcement"],
  flyer: ["Flyer/Poster", "Event", "Sale/Offer", "Announcement"],
};

// Detect relevant template categories from a content pack topic + workspace.
export function recommendCategories(topic, orgType, contentTypes = []) {
  const cats = new Set();
  // From content types
  contentTypes.forEach((ct) => {
    (CONTENT_TYPE_TO_CATEGORY[ct] || []).forEach((c) => cats.add(c));
  });
  // From topic keywords
  const t = (topic || "").toLowerCase();
  if (/\bsale|offer|discount|deal\b/.test(t)) { cats.add("Sale/Offer"); cats.add("Flyer/Poster"); }
  if (/\bevent|bake sale|fundraiser|concert|festival|fair\b/.test(t)) { cats.add("Event"); cats.add("Flyer/Poster"); }
  if (/\benrol|enroll|admission|open day|registration\b/.test(t)) { cats.add("Education"); cats.add("Announcement"); }
  if (/\bannounce|reminder|notice|update\b/.test(t)) { cats.add("Announcement"); }
  if (/\breel|video|tiktok|short\b/.test(t)) { cats.add("Reel/Video"); }
  return [...cats];
}

// Workspace-adaptive audit guidance
export function getAuditIntro(orgType) {
  switch (orgType) {
    case "school":
      return "A simple review of your school's social media — is it clear to parents and your school community?";
    case "church":
      return "A simple review of your church's social media — is it welcoming to your community and visitors?";
    case "university":
      return "A simple review of your university's social media — is it clear to applicants, students and staff?";
    default:
      return "A simple review of your business's social media — is it clear to customers what you do?";
  }
}

// Workspace-adaptive example topics
export function getExampleTopic(orgType) {
  switch (orgType) {
    case "school": return "Our school bake sale is this Friday at 2pm.";
    case "church": return "We're holding a community event this Sunday.";
    case "university": return "Enrolment is open for the new semester.";
    default: return "We're launching our new service Friday.";
  }
}