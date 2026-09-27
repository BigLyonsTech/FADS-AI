// Shared CRM colour mappings — consistent with the FADS Pipeline palette.
// Light backgrounds with stronger readable text/borders for badges.
// Accent colours for subtle card edges.
//
// Colour families match the pipeline stages:
//   new       → blue/grey   (like NEW)
//   contacted → blue        (like CONTACTED)
//   engaged   → purple      (like INTERESTED)
//   qualified → amber/gold  (like PROPOSAL SENT)
//   active    → green       (like CUSTOMER)
//   converted → green       (like CUSTOMER)
//   inactive  → muted grey   (like NOT NOW — never red)

export const CONTACT_STATUS_COLORS = {
  new:       { bg: "#e2e8f0", text: "#475569", border: "#94a3b8", accent: "#64748b" },
  contacted: { bg: "#dbeafe", text: "#1d4ed8", border: "#3b82f6", accent: "#3b82f6" },
  engaged:   { bg: "#ede9fe", text: "#6d28d9", border: "#8b5cf6", accent: "#8b5cf6" },
  qualified: { bg: "#fef3c7", text: "#b45309", border: "#f59e0b", accent: "#f59e0b" },
  active:    { bg: "#d1fae5", text: "#047857", border: "#10b981", accent: "#10b981" },
  converted: { bg: "#d1fae5", text: "#047857", border: "#10b981", accent: "#10b981" },
  inactive:  { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1", accent: "#94a3b8" },
};

export function getContactStatusColor(status) {
  return CONTACT_STATUS_COLORS[status] || CONTACT_STATUS_COLORS.new;
}

// Known labels get subtle category colours; custom/user-created labels
// stay neutral so the interface doesn't become rainbow-like.
const LABEL_COLOR_MAP = {
  "hot-lead":  { bg: "#fef3c7", text: "#b45309", border: "#f59e0b" },
  "hot lead":  { bg: "#fef3c7", text: "#b45309", border: "#f59e0b" },
  "follow-up": { bg: "#ccfbf1", text: "#0f766e", border: "#14b8a6" },
  "follow up": { bg: "#ccfbf1", text: "#0f766e", border: "#14b8a6" },
  "followup":  { bg: "#ccfbf1", text: "#0f766e", border: "#14b8a6" },
  "referral":  { bg: "#ede9fe", text: "#6d28d9", border: "#8b5cf6" },
};

const NEUTRAL_LABEL = { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };

export function getLabelColor(label) {
  if (!label) return NEUTRAL_LABEL;
  return LABEL_COLOR_MAP[label.toLowerCase()] || NEUTRAL_LABEL;
}