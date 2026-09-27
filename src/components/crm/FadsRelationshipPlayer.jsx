import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { Bot, ChevronRight, Users } from "lucide-react";
import { getCrmConfig } from "@/lib/crmWording";

// FADS Relationship Player — a compact Y2K-style AI control panel for the
// CRM dashboard. Uses REAL existing CRM data (contacts, leads, tasks) to
// compute who needs attention today. No invented numbers.
//
// The player answers: "Who needs me?" — everything else on the CRM page
// (pipeline, recent contacts, quick actions) is secondary.
export default function FadsRelationshipPlayer({ contacts, leads, tasks, orgType }) {
  const config = getCrmConfig(orgType);

  const attention = useMemo(() => {
    const today = new Date(new Date().toDateString());

    const overdueFollowUps = contacts.filter(
      (c) => c.next_follow_up_date && new Date(c.next_follow_up_date) < today && c.status !== "inactive"
    );
    const warmLeads = leads.filter(
      (l) => l.stage === "Engaged" || l.stage === "Follow-up" || l.stage === "Qualified"
    );
    const newEnquiries = contacts.filter((c) => c.status === "new");
    const overdueTasks = tasks.filter(
      (t) => t.status === "open" && t.due_date && new Date(t.due_date) < today
    );

    const items = [];
    if (overdueFollowUps.length > 0) items.push({ count: overdueFollowUps.length, label: "overdue follow-up" });
    if (warmLeads.length > 0)
      items.push({ count: warmLeads.length, label: `active ${config.leadsLabel.toLowerCase()}` });
    if (newEnquiries.length > 0) items.push({ count: newEnquiries.length, label: "new contact" });
    if (overdueTasks.length > 0) items.push({ count: overdueTasks.length, label: "overdue task" });

    const total = items.reduce((s, i) => s + i.count, 0);

    let fadsSays;
    let showMeLink = "/crm/contacts";
    if (overdueTasks.length > 0) {
      fadsSays = `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? "s" : ""}. I'd start with the people who are already waiting for a response.`;
      showMeLink = "/crm/tasks";
    } else if (overdueFollowUps.length > 0) {
      fadsSays = `You have ${overdueFollowUps.length} follow-up${overdueFollowUps.length !== 1 ? "s" : ""} overdue. I'd start with those.`;
      showMeLink = "/crm/contacts";
    } else if (total === 0) {
      fadsSays = "You're caught up. There's nothing urgent waiting for you here.";
    } else {
      fadsSays = "Here's who I'd follow up with today.";
      if (warmLeads.length > 0) showMeLink = "/crm/leads";
    }

    return { items, total, fadsSays, showMeLink, hasUrgent: overdueTasks.length > 0 || overdueFollowUps.length > 0 };
  }, [contacts, leads, tasks, config.leadsLabel]);

  return (
    <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS RELATIONSHIPS</p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${attention.hasUrgent ? "bg-status-warn" : "bg-status-ok"} animate-pulse`} />
          CHECK COMPLETE
        </p>
      </div>

      {/* Robot + message */}
      <div className="flex flex-col items-center py-1">
        <FadsRobotAvatar size="lg" />
        <p className="text-sm text-white/80 mt-3 text-center max-w-[260px] leading-relaxed">
          {attention.total === 0
            ? "You're caught up. There's nothing urgent waiting for you here."
            : "Here's who I'd follow up with today."}
        </p>
      </div>

      {/* Attention count + breakdown */}
      {attention.total > 0 && (
        <div className="bg-white/5 rounded-xl p-3 space-y-2">
          <p className="text-2xl font-bold font-mono text-white tabular-nums">
            {String(attention.total).padStart(2, "0")}
            <span className="text-sm font-normal text-white/50 ml-1.5">PEOPLE NEED ATTENTION</span>
          </p>
          <div className="space-y-1">
            {attention.items.map((item, i) => (
              <p key={i} className="text-xs text-white/60 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-teal shrink-0" />
                {item.count} {item.label}{item.count !== 1 ? "s" : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* FADS says */}
      <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
        <FadsRobotAvatar size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium mb-0.5">FADS says</p>
          <p className="text-xs text-white/80 leading-relaxed">&ldquo;{attention.fadsSays}&rdquo;</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {attention.total > 0 && (
          <Link
            to={attention.showMeLink}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <Users className="w-4 h-4" /> Show Me Who
          </Link>
        )}
        <Link
          to="/assistant?q=who+should+I+follow+up+with+today"
          className={`${attention.total > 0 ? "flex-1" : "w-full"} inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors`}
        >
          <Bot className="w-4 h-4" /> Ask FADS
        </Link>
      </div>
    </div>
  );
}