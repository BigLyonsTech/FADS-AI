// Configurable terminology for faith/community workspaces (Church, Mosque,
// Ministry, Faith Organisation, etc.). Each organisation can choose its own
// words for people, leaders, giving, gatherings and volunteers. Missing terms
// fall back to welcoming neutral defaults — never to specifically Christian
// terminology. Christian terms (Pastor, Tithes, Services, etc.) remain
// available for churches that want them via the terminology setting.

// Faith community types — all share the existing church workspace architecture.
export const FAITH_TYPES = [
  { value: "church", label: "Church" },
  { value: "mosque", label: "Mosque" },
  { value: "ministry", label: "Ministry" },
  { value: "faith_organisation", label: "Faith Organisation" },
  { value: "religious_organisation", label: "Religious Organisation" },
  { value: "other", label: "Other" },
];

// Terminology option lists for the settings UI. Each includes a "Custom"
// option that lets the organisation enter its own term.
export const TERM_OPTIONS = {
  people: [
    { value: "Members", label: "Members" },
    { value: "Congregation", label: "Congregation" },
    { value: "Community", label: "Community" },
    { value: "Attendees", label: "Attendees" },
  ],
  leader: [
    { value: "Pastor", label: "Pastor" },
    { value: "Priest", label: "Priest" },
    { value: "Minister", label: "Minister" },
    { value: "Imam", label: "Imam" },
    { value: "Leader", label: "Leader" },
    { value: "Administrator", label: "Administrator" },
  ],
  giving: [
    { value: "Giving", label: "Giving" },
    { value: "Donations", label: "Donations" },
    { value: "Tithes & Offerings", label: "Tithes & Offerings" },
    { value: "Contributions", label: "Contributions" },
  ],
  gatherings: [
    { value: "Services", label: "Services" },
    { value: "Meetings", label: "Meetings" },
    { value: "Worship", label: "Worship" },
    { value: "Events", label: "Events" },
    { value: "Gatherings", label: "Gatherings" },
  ],
  volunteers: [
    { value: "Volunteers", label: "Volunteers" },
    { value: "Team", label: "Team" },
    { value: "Workers", label: "Workers" },
    { value: "Ministry Team", label: "Ministry Team" },
  ],
};

// Neutral defaults — used when an organisation has not chosen custom terms.
// Welcoming and inclusive; never specifically Christian.
export const NEUTRAL_DEFAULTS = {
  people: "Members",
  leader: "Leader",
  giving: "Giving",
  gatherings: "Gatherings",
  volunteers: "Volunteers",
};

// Resolve an organisation's terminology, filling gaps with neutral defaults.
export function resolveTerminology(org) {
  const t = (org && org.terminology) || {};
  return {
    people: t.people || NEUTRAL_DEFAULTS.people,
    leader: t.leader || NEUTRAL_DEFAULTS.leader,
    giving: t.giving || NEUTRAL_DEFAULTS.giving,
    gatherings: t.gatherings || NEUTRAL_DEFAULTS.gatherings,
    volunteers: t.volunteers || NEUTRAL_DEFAULTS.volunteers,
  };
}

// Display label for the faith type, including custom "other" descriptions.
export function faithTypeLabel(org) {
  const ft = org?.faith_type;
  if (!ft || ft === "church") return "Church";
  if (ft === "other") return org?.faith_type_other || "Faith Organisation";
  return FAITH_TYPES.find((f) => f.value === ft)?.label || "Faith Organisation";
}

// Whether this org is a faith/community workspace (uses the church architecture).
export function isFaithWorkspace(org) {
  return org?.type === "church";
}

// Derive a singular form from a plural term for contact type labels.
// "Members" → "Member", "Attendees" → "Attendee", "Community" → "Community".
export function singular(term) {
  return term && term.endsWith("s") ? term.slice(0, -1) : term;
}