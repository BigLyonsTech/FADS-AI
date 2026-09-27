import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, AlertTriangle, Info, CheckCircle2,
  ChevronRight, Loader2, ClipboardList,
} from "lucide-react";

const SEVERITY_STYLES = {
  info: { icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  warn: { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  alert: { icon: AlertTriangle, bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
};

const ACCESS_LABELS = {
  hr_admin: "HR Admin",
  manager: "Manager",
  employee: "Employee",
};

// Today's HR Briefing panel. Shows a summary of items requiring attention,
// computed from the user's accessible HR data. Collapsible on mobile.
export default function HrOfficerBriefing({ briefing, loading, accessLevel }) {
  if (loading && !briefing) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
        <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
        Loading today's briefing...
      </div>
    );
  }

  if (!briefing || !briefing.items || briefing.items.length === 0) {
    return (
      <div className="flex items-start gap-2 bg-brand-mint/30 border border-brand-teal/20 rounded-xl p-3">
        <CheckCircle2 className="w-4 h-4 text-status-ok shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-brand-navy">All clear today</p>
          <p className="text-xs text-muted-foreground">
            No items require immediate attention.
            {accessLevel && ` Viewing as ${ACCESS_LABELS[accessLevel] || accessLevel}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-brand-teal" />
          <h3 className="text-sm font-medium text-brand-navy">
            Today's HR Briefing
          </h3>
          {accessLevel && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {ACCESS_LABELS[accessLevel] || accessLevel}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {briefing.date}
        </span>
      </div>

      <div className="space-y-1.5">
        {briefing.items.map((item, i) => {
          const style = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.info;
          const Icon = style.icon;
          return (
            <Link
              key={i}
              to={item.url}
              className={`flex items-start gap-2 ${style.bg} ${style.border} border rounded-lg p-2.5 hover:shadow-sm transition-shadow`}
            >
              <Icon className={`w-4 h-4 ${style.text} shrink-0 mt-0.5`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${style.text}`}>{item.label}</p>
                {item.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {item.detail}
                  </p>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            </Link>
          );
        })}
      </div>

      {briefing.follow_ups && briefing.follow_ups.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-2.5">
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <ClipboardList className="w-3 h-3" /> Suggested follow-up actions
          </p>
          <ul className="space-y-1">
            {briefing.follow_ups.map((f, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-brand-teal mt-0.5">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}