import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Mail, Eye, MoreHorizontal, Edit, Trash2, Phone,
  CheckSquare, Square, CheckCircle2, MessageSquare, CalendarClock, Bell,
} from "lucide-react";
import { formatCurrencyCompact } from "@/lib/currencyFormat";
import { getPipelineConfig, getStageDisplayName } from "@/lib/crmWording";

// A single pipeline card showing a lead and its linked contact.
// Displays useful info only (name, business, value, last contact, next
// appointment/follow-up) and routes communication actions through EXISTING
// review-first FADS composers before any external handoff/send.
// Less-used actions (Edit, Delete, Call) are under "More".
//
// Intelligence indicators are workspace-adaptive and shown ONLY when
// supported by real data.
export default function PipelineCard({
  lead, contact, tasks = [], stages, displayStages, currency, orgType,
  onMove, onEdit, onDelete, onFollowUp, onWhatsApp, onEmail, onDirectMessage,
  onBookAppointment, onSetReminder, isMobile, selected, onToggleSelect,
}) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [showMoveTo, setShowMoveTo] = useState(false);

  const fmtCurrency = (v) => formatCurrencyCompact(v, currency);
  const today = new Date(new Date().toDateString());
  const hasPhone = contact && (contact.phone || "").replace(/[^\d]/g, "");
  const hasEmail = contact && contact.email;
  const pipeConfig = getPipelineConfig(orgType);
  const ind = pipeConfig.indicators;

  // Intelligence indicators — only from real data, workspace-adaptive
  const indicators = [];
  if (contact?.next_follow_up_date) {
    const fu = new Date(contact.next_follow_up_date);
    if (fu <= today) indicators.push({ label: ind.followUpToday, tone: "warn" });
  }
  if (contact?.last_contact_date) {
    const days = Math.floor((today - new Date(contact.last_contact_date)) / 86400000);
    if (days >= 7) indicators.push({ label: ind.noContact(days), tone: "muted" });
  }
  // Workspace-specific indicators based on stage
  const displayStage = getStageDisplayName(lead.stage, orgType);
  const stageInfo = (displayStages || []).find((s) => s.name === displayStage);
  const stageColor = stageInfo?.color || "#64748b";
  const contactTasks = contact ? tasks.filter((t) => t.contact_id === contact.id && t.status === "open") : [];
  const taskSortKey = (t) => `${t.due_date || "9999-99-99"} ${t.due_time || "99:99"}`;
  const nextAppointment = contactTasks
    .filter((t) => t.type === "appointment")
    .sort((a, b) => taskSortKey(a).localeCompare(taskSortKey(b)))[0];
  const nextReminder = contactTasks
    .filter((t) => t.type === "reminder" || t.type === "follow_up")
    .sort((a, b) => taskSortKey(a).localeCompare(taskSortKey(b)))[0];
  const successStageName = pipeConfig.stages[4]?.name;
  const isSuccess = displayStage === successStageName;
  if (orgType === "small_business") {
    if (displayStage === "PROPOSAL SENT") indicators.push({ label: ind.proposalWaiting || "Proposal waiting", tone: "teal" });
  } else if (orgType === "school" || orgType === "university") {
    if (displayStage === "APPLICATION" || displayStage === "INTERVIEW")
      indicators.push({ label: ind.applicationNeedsAttention || "Application needs attention", tone: "teal" });
  } else if (orgType === "church") {
    if (displayStage === "NEW VISITOR") indicators.push({ label: ind.newVisitor || "New visitor", tone: "teal" });
  }

  const handleWhatsApp = (e) => {
    e?.stopPropagation();
    if (!hasPhone) return;
    onWhatsApp?.(lead, contact);
  };

  const handleEmail = (e) => {
    e?.stopPropagation();
    if (!hasEmail) return;
    onEmail?.(lead, contact);
  };

  const handleCall = (e) => {
    e?.stopPropagation();
    if (!hasPhone) return;
    window.open(`tel:${contact.phone}`, "_blank");
  };

  const handleView = (e) => {
    e?.stopPropagation();
    if (contact) navigate(`/crm/contacts/${contact.id}`);
  };

  const handleMoveTo = (stageInternalName) => {
    setShowMoveTo(false);
    onMove(lead, stageInternalName);
  };

  // Stages for "Move to" dropdown — use display stages with internal names
  const moveStages = displayStages || stages.map((s) => ({
    name: getStageDisplayName(s.name, orgType),
    color: s.color,
    internalName: s.name,
  }));

  return (
    <div
      className={`rounded-lg border bg-card shadow-sm p-3 space-y-2 border-l-[3px] ${
        selected ? "ring-2 ring-brand-teal" : ""
      }`}
      style={{
        borderLeftColor: isSuccess ? "#10b981" : stageColor,
        ...(isSuccess ? { backgroundColor: "#10b98108" } : {}),
      }}
    >
      {/* Checkbox + title */}
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
          className="p-0.5 rounded shrink-0 min-h-touch min-w-touch"
          title={selected ? "Deselect" : "Select"}
        >
          {selected ? (
            <CheckSquare className="w-4 h-4 text-brand-teal" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground/40" />
          )}
        </button>
        <div
          className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
          onClick={(e) => { if (!isMobile) handleView(e); }}
        >
          <div className="font-medium text-sm min-w-0 leading-tight flex items-center gap-1">
            <span className="truncate">{lead.contact_name || lead.title}</span>
            {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-status-ok shrink-0" />}
          </div>
        </div>
        {lead.value > 0 && (
          <div className="text-sm font-semibold shrink-0">{fmtCurrency(lead.value)}</div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pl-6 text-[11px] text-muted-foreground">
        {contact?.phone && <span><Phone className="w-3 h-3 inline mr-1" />{contact.phone}</span>}
        <span className="font-medium" style={{ color: stageColor }}>Stage: {displayStage}</span>
      </div>

      {/* Business / org */}
      {(contact?.organisation_name || (lead.title && lead.title !== lead.contact_name)) && (
        <div className="text-xs text-muted-foreground truncate pl-6">
          {contact?.organisation_name || lead.title}
        </div>
      )}

      {/* Intelligence indicators */}
      {indicators.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {indicators.map((item, i) => (
            <span
              key={i}
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                item.tone === "warn" ? "bg-status-warn/15 text-status-warn" :
                item.tone === "teal" ? "bg-brand-teal/15 text-brand-teal" :
                "bg-muted text-muted-foreground"
              }`}
            >
              {item.label}
            </span>
          ))}
        </div>
      )}

      {/* Next appointment / reminder / follow-up */}
      <div className="space-y-1 text-[11px] text-muted-foreground pl-6">
        {nextAppointment && (
          <div className="flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            <span>Next appointment: {nextAppointment.due_date || "—"}{nextAppointment.due_time ? ` at ${nextAppointment.due_time}` : ""}</span>
          </div>
        )}
        {nextReminder && (
          <div className="flex items-center gap-1">
            <Bell className="w-3 h-3" />
            <span>Next follow-up: {nextReminder.due_date || "—"}{nextReminder.due_time ? ` at ${nextReminder.due_time}` : ""}</span>
          </div>
        )}
        {!nextReminder && contact?.next_follow_up_date && <div>Next follow-up: {contact.next_follow_up_date}</div>}
      </div>

      <div className="grid grid-cols-2 gap-2 pl-6">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={(e) => { e.stopPropagation(); onBookAppointment?.(lead, contact); }}
        >
          Book Appointment
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={(e) => { e.stopPropagation(); onFollowUp?.(lead, contact); }}
        >
          Follow Up
        </Button>
      </div>

      {/* Move to dropdown — available on all devices as alternative to drag-and-drop */}
      <div className="relative pl-6">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full text-xs gap-1 min-h-touch"
          onClick={(e) => { e.stopPropagation(); setShowMoveTo(!showMoveTo); }}
        >
          Move to →
        </Button>
        {showMoveTo && (
          <div className="absolute z-20 left-6 right-0 top-full mt-1 bg-card border rounded-md shadow-lg p-1 space-y-0.5">
            {moveStages.map((s) => (
              <button
                key={s.internalName || s.name}
                className={`w-full text-left px-2 py-2 rounded text-xs hover:bg-accent min-h-touch ${
                  getStageDisplayName(lead.stage, orgType) === s.name ? "bg-brand-teal/10 text-brand-teal font-medium" : ""
                }`}
                onClick={(e) => { e.stopPropagation(); handleMoveTo(s.internalName || s.name); }}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Communication actions — Call · WhatsApp · DM · Email · Follow up · View · More */}
      <div className="flex items-center gap-1 flex-wrap pl-6 pt-1 border-t">
        <button
          onClick={handleCall}
          disabled={!hasPhone}
          className="p-1.5 rounded hover:bg-blue-50 min-h-touch min-w-touch disabled:opacity-30"
          title={hasPhone ? "Call" : "No phone number saved"}
        >
          <Phone className="w-4 h-4 text-blue-600" />
        </button>
        <button
          onClick={handleWhatsApp}
          disabled={!hasPhone}
          className="p-1.5 rounded hover:bg-green-50 min-h-touch min-w-touch disabled:opacity-30"
          title={hasPhone ? "WhatsApp" : "No phone number saved"}
        >
          <MessageCircle className="w-4 h-4 text-green-600" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDirectMessage?.(lead, contact); }}
          className="p-1.5 rounded hover:bg-teal-50 min-h-touch min-w-touch"
          title="Internal message"
        >
          <MessageSquare className="w-4 h-4 text-teal-600" />
        </button>
        <button
          onClick={handleEmail}
          disabled={!hasEmail}
          className="p-1.5 rounded hover:bg-purple-50 min-h-touch min-w-touch disabled:opacity-30"
          title={hasEmail ? "Email" : "No email address saved"}
        >
          <Mail className="w-4 h-4 text-purple-600" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSetReminder?.(lead, contact); }}
          className="p-1.5 rounded hover:bg-accent min-h-touch min-w-touch"
          title="Set reminder"
        >
          <Bell className="w-4 h-4 text-brand-teal" />
        </button>
        <button
          onClick={handleView}
          className="p-1.5 rounded hover:bg-accent min-h-touch min-w-touch"
          title="View contact"
        >
          <Eye className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="relative ml-auto">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMore(!showMore); }}
            className="p-1.5 rounded hover:bg-accent min-h-touch min-w-touch"
            title="More"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          {showMore && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-card border rounded-md shadow-lg p-1 space-y-0.5 min-w-[140px]">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMore(false); onEdit(lead); }}
                className="w-full text-left px-2 py-2 rounded text-xs hover:bg-accent flex items-center gap-1.5 min-h-touch"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMore(false); onDelete(lead); }}
                className="w-full text-left px-2 py-2 rounded text-xs hover:bg-accent flex items-center gap-1.5 text-destructive min-h-touch"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}