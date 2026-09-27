// Frontend constants for the Transcribe module. Mirrors the backend
// base44/shared/transcribe.ts constants for client-side use.

export const TRANSCRIBE_SESSION_TYPES = [
  { value: "business_meeting", label: "Business Meeting", icon: "Briefcase" },
  { value: "lecture", label: "Lecture", icon: "GraduationCap" },
  { value: "government_council", label: "Government & Council", icon: "Landmark" },
  { value: "interview", label: "Interview", icon: "UserCircle" },
  { value: "voice_note", label: "Voice Note", icon: "Mic" },
  { value: "other", label: "Other", icon: "FileAudio" },
];

export const TRANSCRIBE_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-NG", label: "English (Nigeria)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ig", label: "Igbo" },
  { value: "yo", label: "Yoruba" },
];

export const REVIEW_STATUSES = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "in_review", label: "In Review", color: "#1a8a8a" },
  { value: "approved", label: "Approved", color: "#2d8659" },
  { value: "rejected", label: "Rejected", color: "#c0392b" },
];

export const ACTION_POINT_STATUSES = [
  { value: "open", label: "Open", color: "#1a8a8a" },
  { value: "done", label: "Done", color: "#2d8659" },
  { value: "cancelled", label: "Cancelled", color: "#6b7280" },
];

export function sessionTypeLabel(value) {
  const t = TRANSCRIBE_SESSION_TYPES.find((s) => s.value === value);
  return t ? t.label : "Other";
}

export function languageLabel(value) {
  const l = TRANSCRIBE_LANGUAGES.find((l) => l.value === value);
  return l ? l.label : value || "English";
}

export function reviewStatusLabel(value) {
  const r = REVIEW_STATUSES.find((r) => r.value === value);
  return r ? r.label : "Draft";
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}