// Client-side icon mapping for FADS AI Team specialist roles. The role
// metadata (title, purpose, example question) comes from the backend
// (getAccessibleTeamRoles) so the source of truth stays server-side; this
// file only resolves the lucide-react icon component for each role icon name.

import {
  Briefcase,
  TrendingUp,
  Calculator,
  CreditCard,
  Users,
  Package,
  Megaphone,
  FileCheck,
  ShieldCheck,
} from "lucide-react";

export const AI_TEAM_ICONS = {
  Briefcase,
  TrendingUp,
  Calculator,
  CreditCard,
  Users,
  Package,
  Megaphone,
  FileCheck,
  ShieldCheck,
};

export function getRoleIcon(iconName) {
  return AI_TEAM_ICONS[iconName] || Briefcase;
}