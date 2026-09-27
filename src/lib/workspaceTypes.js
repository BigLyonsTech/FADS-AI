// Workspace type display metadata shared across the app.
// All four types retain full access to Finance, HR, and Transcribe — this
// metadata is purely for labels and icons and never gates any product.

import { faithTypeLabel } from "@/lib/faithTerminology";

export const WORKSPACE_TYPES = {
  small_business: { label: "Business" },
  self_employed: { label: "Self-Employed" },
  school: { label: "School" },
  university: { label: "University" },
  church: { label: "Church" },
};

// Accepts either a type string (backward-compatible) or the full org object.
// For church/faith workspaces, returns the organisation's faith type label
// (e.g. "Mosque", "Faith Organisation") instead of the generic "Church".
export function workspaceTypeLabel(typeOrOrg) {
  const isOrg = typeof typeOrOrg === "object" && typeOrOrg !== null;
  if (isOrg && typeOrOrg.type === "church") {
    return faithTypeLabel(typeOrOrg);
  }
  const type = isOrg ? typeOrOrg.type : typeOrOrg;
  return WORKSPACE_TYPES[type]?.label || (type || "").replace(/_/g, " ");
}

// Demo workspace names used when seeding demo organisations for admin accounts.
export const DEMO_WORKSPACE_NAMES = [
  "FADS Demo Business",
  "FADS Demo Self-Employed",
  "FADS Demo School",
  "FADS Demo University",
  "FADS Demo Church",
];

// Maps a workspace type to its demo workspace name. Used to switch between
// demo experiences by type (e.g. "Back to Business Demo").
export const DEMO_NAME_BY_TYPE = {
  small_business: "FADS Demo Business",
  self_employed: "FADS Demo Self-Employed",
  school: "FADS Demo School",
  university: "FADS Demo University",
  church: "FADS Demo Church",
};