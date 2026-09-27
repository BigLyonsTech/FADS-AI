import React from "react";
import { Link } from "react-router-dom";
import {
  Wallet, Briefcase, GraduationCap, Contact, Heart, Users,
  MessageCircle, ChevronRight,
} from "lucide-react";
import { canAccessHr } from "@/lib/hrWording";
import { resolveTerminology } from "@/lib/faithTerminology";

// Workspace-aware "Management" hub for School and Church home pages.
// Presentation only — every tile links to an EXISTING route with EXISTING
// labels. No new entities, modules, routes, or permissions. Other workspace
// types keep the generic "Your Departments" grid in WorkspaceHome.

function Tile({ to, icon: Icon, title, subtitle }) {
  return (
    <Link to={to}>
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer h-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-brand-teal" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-brand-navy truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}

export default function ManagementHub({ org, activeRole, givingTerm }) {
  const orgType = org?.type;
  const showStaff = canAccessHr(activeRole);

  if (orgType === "school") {
    const tiles = [
      { to: "/crm/contacts?chip=Students", icon: Users, title: "Students", subtitle: "Student records" },
      { to: "/crm/contacts?chip=Parents", icon: Contact, title: "Parents", subtitle: "Parents & guardians" },
      { to: "/finance", icon: Wallet, title: "Fees & Finance", subtitle: "Fees, income & expenses" },
      ...(showStaff ? [{ to: "/hr", icon: Briefcase, title: "Staff", subtitle: "Staff & departments" }] : []),
      { to: "/school/reports", icon: GraduationCap, title: "Report Cards", subtitle: "Create & print report cards" },
      { to: "/crm/leads", icon: Contact, title: "Enquiries", subtitle: "Admissions enquiries" },
      { to: "/messages", icon: MessageCircle, title: "Messages", subtitle: "Team messages" },
    ];
    return (
      <div>
        <h2 className="font-semibold text-brand-navy mb-3">School Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiles.map((t) => <Tile key={t.title} {...t} />)}
        </div>
      </div>
    );
  }

  if (orgType === "church") {
    const peopleLabel = resolveTerminology(org).people || "Members";
    const tiles = [
      { to: `/crm/contacts?chip=${encodeURIComponent(peopleLabel)}`, icon: Users, title: peopleLabel, subtitle: "Members & visitors" },
      { to: "/church/giving", icon: Heart, title: `${givingTerm} & Finance`, subtitle: "Tithes, offerings & pledges" },
      { to: "/crm/contacts", icon: Heart, title: "Volunteers", subtitle: "Volunteers & teams" },
      ...(showStaff ? [{ to: "/hr", icon: Briefcase, title: "Staff", subtitle: "Employed staff & ministries" }] : []),
      { to: "/messages", icon: MessageCircle, title: "Messages", subtitle: "Team messages" },
    ];
    return (
      <div>
        <h2 className="font-semibold text-brand-navy mb-3">Church Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiles.map((t) => <Tile key={t.title} {...t} />)}
        </div>
      </div>
    );
  }

  return null;
}