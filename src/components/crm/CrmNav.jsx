import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Columns3, CheckSquare, Zap, Tag } from "lucide-react";
import { getCrmConfig } from "@/lib/crmWording";

// CRM sub-navigation tabs: Dashboard | People & Contacts | Pipeline | Tasks.
// Labels adapt to the workspace type (e.g. "People & Contacts" for business).
export default function CrmNav({ orgType }) {
  const location = useLocation();
  const config = getCrmConfig(orgType);
  const contactsLabel =
    config.contactsLabel === "People & Contacts" ? "People & Contacts" : "Contacts";

  const tabs = [
    { to: "/crm", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/crm/contacts", label: contactsLabel, icon: Users },
    { to: "/crm/leads", label: "Pipeline", icon: Columns3 },
    { to: "/crm/automations", label: "Follow-up Rules", icon: Zap },
    { to: "/crm/tasks", label: "Tasks", icon: CheckSquare },
    { to: "/crm/offers", label: "Offers", icon: Tag },
  ];

  const isActive = (tab) => {
    if (tab.exact) return location.pathname === tab.to;
    return location.pathname.startsWith(tab.to);
  };

  return (
    <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide -mx-1 px-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-touch touch-manipulation ${
              active
                ? "border-brand-teal text-brand-teal"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" /> {tab.label}
          </Link>
        );
      })}
    </div>
  );
}