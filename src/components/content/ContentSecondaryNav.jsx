import React from "react";
import { Sparkles, FileSearch, LayoutTemplate, History } from "lucide-react";

// Secondary navigation for the Content Centre: Audit | Create | Templates | History
const TABS = [
  { key: "create", label: "Create", icon: Sparkles },
  { key: "audit", label: "Audit", icon: FileSearch },
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "history", label: "History", icon: History },
];

export default function ContentSecondaryNav({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-hide">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-touch ${
              isActive
                ? "border-brand-teal text-brand-teal"
                : "border-transparent text-muted-foreground hover:text-brand-navy"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}