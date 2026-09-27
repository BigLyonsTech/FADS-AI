import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  Users, UserPlus, Building2, Briefcase, CalendarDays,
  CalendarCheck, FileText, BarChart3, Heart, GraduationCap,
  ChevronRight, BookOpen,
} from "lucide-react";

// Type-aware Quick Actions for the HR dashboard. All link to existing
// HR routes — one shared HR product, no duplicated pages or databases.
// The org type only determines which contextual labels appear.
const ACTIONS = {
  small_business: [
    { label: "Employees", sub: "Search and manage staff", to: "/hr/employees", icon: Users },
    { label: "Departments", sub: "Organisational structure", to: "/hr/settings", icon: Building2 },
    { label: "Roles", sub: "Job roles and titles", to: "/hr/settings", icon: Briefcase },
    { label: "Leave & Attendance", sub: "Requests, balances, schedules", to: "/hr/leave", icon: CalendarDays },
    { label: "HR Documents", sub: "Contracts and certificates", to: "/hr/employees", icon: FileText },
    { label: "Staff Reports", sub: "Headcount and compliance", to: "/hr/compliance", icon: BarChart3 },
  ],
  school: [
    { label: "Teaching Staff", sub: "Teachers and instructors", to: "/hr/employees", icon: BookOpen },
    { label: "Non-Teaching Staff", sub: "Support and administration", to: "/hr/employees", icon: Users },
    { label: "Departments", sub: "Academic departments", to: "/hr/settings", icon: Building2 },
    { label: "Leave & Attendance", sub: "Requests, balances, schedules", to: "/hr/leave", icon: CalendarDays },
    { label: "Staff Documents", sub: "Contracts and certifications", to: "/hr/employees", icon: FileText },
    { label: "Staff Reports", sub: "Headcount and compliance", to: "/hr/compliance", icon: BarChart3 },
  ],
  university: [
    { label: "Academic Staff", sub: "Lecturers and researchers", to: "/hr/employees", icon: GraduationCap },
    { label: "Administrative Staff", sub: "Support and operations", to: "/hr/employees", icon: Users },
    { label: "Faculties / Departments", sub: "Academic structure", to: "/hr/settings", icon: Building2 },
    { label: "Leave & Attendance", sub: "Requests, balances, schedules", to: "/hr/leave", icon: CalendarDays },
    { label: "Staff Documents", sub: "Contracts and certifications", to: "/hr/employees", icon: FileText },
    { label: "Staff Reports", sub: "Headcount and compliance", to: "/hr/compliance", icon: BarChart3 },
  ],
  church: [
    { label: "Staff", sub: "Employed team members", to: "/hr/employees", icon: Users },
    { label: "Volunteers", sub: "Active volunteer team", to: "/hr/employees", icon: Heart },
    { label: "Ministries / Departments", sub: "Ministry structure", to: "/hr/settings", icon: Building2 },
    { label: "Scheduling / Attendance", sub: "Rosters and attendance", to: "/hr/attendance", icon: CalendarCheck },
    { label: "Staff & Volunteer Documents", sub: "Contracts and checks", to: "/hr/employees", icon: FileText },
    { label: "Team Reports", sub: "Headcount and compliance", to: "/hr/compliance", icon: BarChart3 },
  ],
};

export default function HrQuickActions({ orgType }) {
  const actions = ACTIONS[orgType] || ACTIONS.small_business;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {actions.map((a) => (
        <Link key={a.label} to={a.to}>
          <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a.icon className="w-5 h-5 text-brand-navy shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm">{a.label}</p>
                <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Card>
        </Link>
      ))}
    </div>
  );
}