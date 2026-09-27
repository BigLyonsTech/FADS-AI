// Client-side wording for the FADS AI Assistant. Mirrors server-side
// terminology and suggested questions so the UI can show workspace-aware
// labels without a round-trip.

export function getWelcomeMessage() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning. What would you like help with today?";
  if (hour < 18) return "Good afternoon. What would you like help with today?";
  return "Good evening. What would you like help with today?";
}

export const MODULE_LABELS = {
  finance: "Finance",
  hr: "HR",
  transcribe: "Transcribe",
  crm: "CRM",
};

export const MODULE_COLORS = {
  finance: "text-brand-teal",
  hr: "text-blue-600",
  transcribe: "text-purple-600",
  crm: "text-amber-600",
};

// Card icons by key
export const CARD_ICONS = {
  needs_attention: "AlertCircle",
  money: "DollarSign",
  people: "Users",
  relationships: "Heart",
  meetings: "Mic",
};