// Server-side terminology resolver for faith/community workspaces. Mirrors
// src/lib/faithTerminology.js so backend functions (assistant, invoices,
// reports) can use the organisation's configured terminology.

export const FAITH_TYPES = [
  { value: "church", label: "Church" },
  { value: "mosque", label: "Mosque" },
  { value: "ministry", label: "Ministry" },
  { value: "faith_organisation", label: "Faith Organisation" },
  { value: "religious_organisation", label: "Religious Organisation" },
  { value: "other", label: "Other" },
];

export const NEUTRAL_DEFAULTS = {
  people: "Members",
  leader: "Leader",
  giving: "Giving",
  gatherings: "Gatherings",
  volunteers: "Volunteers",
};

export function resolveTerminology(org: any) {
  const t = (org && org.terminology) || {};
  return {
    people: t.people || NEUTRAL_DEFAULTS.people,
    leader: t.leader || NEUTRAL_DEFAULTS.leader,
    giving: t.giving || NEUTRAL_DEFAULTS.giving,
    gatherings: t.gatherings || NEUTRAL_DEFAULTS.gatherings,
    volunteers: t.volunteers || NEUTRAL_DEFAULTS.volunteers,
  };
}

export function faithTypeLabel(org: any): string {
  const ft = org?.faith_type;
  if (!ft || ft === "church") return "Church";
  if (ft === "other") return org?.faith_type_other || "Faith Organisation";
  return FAITH_TYPES.find((f) => f.value === ft)?.label || "Faith Organisation";
}

export function isFaithWorkspace(org: any): boolean {
  return org?.type === "church";
}

export function singular(term: string): string {
  return term && term.endsWith("s") ? term.slice(0, -1) : term;
}