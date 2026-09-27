import React from "react";
import { Link } from "react-router-dom";
import { FileText, Receipt, Users, Mic, BarChart3, Heart, ChevronRight } from "lucide-react";
import { resolveTerminology, faithTypeLabel } from "@/lib/faithTerminology";

// Type-specific quick action shortcuts. All link to existing routes — no
// duplicated products. Every type keeps full Finance, HR and Transcribe access.
const QUICK_ACTIONS = {
  small_business: [
    { label: "Create Invoice", to: "/finance/invoices/new", icon: FileText, product: "Finance" },
    { label: "Record Expense", to: "/finance/money-out", icon: Receipt, product: "Finance" },
    { label: "Manage Employees", to: "/hr/employees", icon: Users, product: "HR" },
    { label: "Record Meeting", to: "/transcribe/studio", icon: Mic, product: "Transcribe" },
  ],
  school: [
    { label: "School Fees", to: "/finance/invoices", icon: FileText, product: "Finance" },
    { label: "Report Cards", to: "/school/reports", icon: FileText, product: "School" },
    { label: "Staff Management", to: "/hr/employees", icon: Users, product: "HR" },
    { label: "Record Staff/Parent Meeting", to: "/transcribe/studio", icon: Mic, product: "Transcribe" },
    { label: "School Reports", to: "/finance/reports", icon: BarChart3, product: "Reports" },
  ],
  university: [
    { label: "Student Fees", to: "/finance/invoices", icon: FileText, product: "Finance" },
    { label: "Staff & Departments", to: "/hr/employees", icon: Users, product: "HR" },
    { label: "Record Lecture/Meeting", to: "/transcribe/studio", icon: Mic, product: "Transcribe" },
    { label: "University Reports", to: "/finance/reports", icon: BarChart3, product: "Reports" },
  ],
  church: [
    { label: "Giving & Donations", to: "/church/giving", icon: Heart, product: "Finance" },
    { label: "Staff & Volunteers", to: "/hr/employees", icon: Users, product: "HR" },
    { label: "Record Service/Meeting", to: "/transcribe/studio", icon: Mic, product: "Transcribe" },
    { label: "Church Reports", to: "/church/reports", icon: BarChart3, product: "Reports" },
  ],
};

export default function QuickActions({ orgType, org }) {
  let actions = QUICK_ACTIONS[orgType] || QUICK_ACTIONS.small_business;
  if (orgType === "church" && org) {
    const term = resolveTerminology(org);
    const ftLabel = faithTypeLabel(org);
    actions = actions.map((a) => {
      if (a.label === "Giving & Donations") return { ...a, label: term.giving };
      if (a.label === "Staff & Volunteers") return { ...a, label: `Staff & ${term.volunteers}` };
      if (a.label === "Record Service/Meeting") return { ...a, label: `Record ${term.gatherings}/Meeting` };
      if (a.label === "Church Reports") return { ...a, label: `${ftLabel} Reports` };
      return a;
    });
  }

  return (
    <div>
      <h2 className="font-semibold text-brand-navy mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link key={a.label} to={a.to}>
            <div className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow cursor-pointer h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                  <a.icon className="w-4 h-4 text-brand-teal" />
                </div>
                <span className="text-xs text-muted-foreground">{a.product}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-brand-navy">{a.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}