import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import MessageTemplatePicker from "@/components/crm/MessageTemplatePicker";
import { Sparkles, Trash2, Plus, Pause, Play, ChevronDown, Send, Loader2 } from "lucide-react";
import { getPipelineConfig, getCrmConfig } from "@/lib/crmWording";
import { base44 } from "@/api/base44Client";
import {
  TRIGGER_OPTIONS, ACTION_OPTIONS, TIMING_OPTIONS, getSuggestedRules,
  AUDIENCE_TYPE_OPTIONS, resolveAudienceContacts,
} from "@/lib/automationWording";

// Plain-language automation builder for non-technical owners.
// "When this happens… FADS should…"
// No workflow terminology exposed.
export default function AutomationBuilder({
  open, onClose, orgType, stages, onSave, automations, onCreateFromSuggestion,
  contacts, orgs, leads, templates, orgId,
}) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("stage_entered");
  const [triggerStage, setTriggerStage] = useState("");
  const [noContactDays, setNoContactDays] = useState(7);
  const [actionType, setActionType] = useState("create_followup");
  const [actionDaysAhead, setActionDaysAhead] = useState(1);
  const [actionLabel_, setActionLabel_] = useState("follow-up");
  const [actionStage, setActionStage] = useState("");
  const [actionTaskTitle, setActionTaskTitle] = useState("");
  const [actionTemplateCategory, setActionTemplateCategory] = useState("follow_up");
  const [timing, setTiming] = useState("tomorrow");
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Audience broadcast state
  const [audienceType, setAudienceType] = useState("contact_type");
  const [audienceValues, setAudienceValues] = useState([]);
  const [channels, setChannels] = useState(["whatsapp"]);
  const [message, setMessage] = useState("");
  const [draftPurpose, setDraftPurpose] = useState("");
  const [drafting, setDrafting] = useState(false);

  const pipe = getPipelineConfig(orgType);
  const stageNames = useMemo(() => pipe.stages.map((s) => s.name), [pipe]);

  useEffect(() => {
    if (open) {
      setTriggerStage(stageNames[2] || stageNames[0] || "");
      setActionStage(stageNames[3] || stageNames[0] || "");
    }
  }, [open, stageNames]);

  const suggestions = useMemo(() => getSuggestedRules(orgType), [orgType]);

  const crmConfig = getCrmConfig(orgType);
  const groupOptions = useMemo(() => (orgs || []).map((o) => ({ value: o.id, label: o.name })), [orgs]);

  // Live audience preview count for the broadcast mode
  const audiencePreview = useMemo(
    () => resolveAudienceContacts({ audience_type: audienceType, audience_values: audienceValues }, contacts || [], leads || []),
    [audienceType, audienceValues, contacts, leads]
  );

  const toggleArray = (arr, val) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  // Whether any non-essential config fields exist for the current selection.
  // These sit under "More options" (collapsed by default) so the basic rule
  // fits on one screen. All have sensible defaults so the automation is
  // fully functional without expanding them.
  const hasMoreOptions =
    triggerType === "stage_entered" ||
    actionType === "create_task";

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let trigger_config, action_type, action_config;

      if (triggerType === "audience_broadcast") {
        trigger_config = {};
        action_type = "send_to_audience";
        action_config = {
          audience_type: audienceType,
          audience_values: audienceValues,
          channels,
          message,
          template_category: actionTemplateCategory,
        };
      } else {
        trigger_config = triggerType === "stage_entered"
          ? { stage: triggerStage }
          : triggerType === "no_contact_days"
          ? { days: noContactDays }
          : {};
        action_type = actionType;
        action_config = buildActionConfig(actionType, {
          actionDaysAhead, actionLabel_, actionStage, actionTaskTitle, actionTemplateCategory,
          timing, customDate, customTime,
        });
      }

      await onSave({
        name: name.trim(),
        trigger_type: triggerType,
        trigger_config,
        action_type,
        action_config,
        status: "active",
      });
      onClose();
      setName("");
    } finally {
      setSaving(false);
    }
  };

  const applySuggestion = (s) => {
    setName(s.name);
    setTriggerType(s.trigger_type);
    setTriggerStage(s.trigger_config?.stage || triggerStage);
    setNoContactDays(s.trigger_config?.days || 7);
    setActionType(s.action_type);
    setActionTemplateCategory(s.action_config?.template_category || "follow_up");
    setActionDaysAhead(s.action_config?.days_ahead ?? 1);
    setTiming(s.action_config?.timing || "tomorrow");
    setCustomDate(s.action_config?.custom_date || "");
    setCustomTime(s.action_config?.custom_time || "");
    // Audience broadcast fields
    setAudienceType(s.action_config?.audience_type || "contact_type");
    setAudienceValues(s.action_config?.audience_values || []);
    setChannels(s.action_config?.channels || ["whatsapp"]);
    setMessage(s.action_config?.message || "");
  };

  const draftWithAI = async () => {
    if (!draftPurpose.trim()) return;
    setDrafting(true);
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "draft_whatsapp",
        organisation_id: orgId,
        context: { purpose: draftPurpose.trim(), audienceDescription: `Audience of ${audiencePreview.length} contact(s).` },
      });
      setMessage(res.message || "");
    } catch (e) {
      // silent — user can write manually
    } finally {
      setDrafting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] p-4 gap-3 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-0.5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-brand-teal" /> New Follow-up Rule
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            FADS prepares actions for you to approve. Nothing is sent automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Quick start — compact chips */}
        {suggestions.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Quick start</Label>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(s)}
                  className="text-xs rounded-full border border-border hover:border-brand-teal/40 hover:bg-brand-teal/5 px-2.5 py-1 transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rule builder card — audience broadcast mode */}
        {triggerType === "audience_broadcast" ? (
          <div className="rounded-lg border bg-card p-3 space-y-2.5">
            {/* AUDIENCE */}
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Who should receive this?</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={audienceType}
                onChange={(e) => { setAudienceType(e.target.value); setAudienceValues([]); }}
              >
                {AUDIENCE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Audience value selector */}
            {audienceType === "contact_type" && (
              <div className="flex flex-wrap gap-1.5">
                {crmConfig.contactTypes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAudienceValues(toggleArray(audienceValues, t.value))}
                    className={`text-xs rounded-full border px-2.5 py-1 transition-colors ${
                      audienceValues.includes(t.value)
                        ? "bg-brand-teal text-white border-brand-teal"
                        : "border-border hover:border-brand-teal/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            {audienceType === "group" && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {groupOptions.length === 0 && <p className="text-xs text-muted-foreground">No groups found. Create groups in People & Contacts.</p>}
                {groupOptions.map((g) => (
                  <label key={g.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={audienceValues.includes(g.value)} onCheckedChange={() => setAudienceValues(toggleArray(audienceValues, g.value))} />
                    {g.label}
                  </label>
                ))}
              </div>
            )}
            {audienceType === "pipeline_stage" && (
              <div className="flex flex-wrap gap-1.5">
                {stageNames.map((s) => (
                  <button
                    key={s}
                    onClick={() => setAudienceValues(toggleArray(audienceValues, s))}
                    className={`text-xs rounded-full border px-2.5 py-1 transition-colors ${
                      audienceValues.includes(s)
                        ? "bg-brand-teal text-white border-brand-teal"
                        : "border-border hover:border-brand-teal/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {audienceType === "individual" && (
              <p className="text-xs text-muted-foreground">Select specific recipients in the review step after saving.</p>
            )}
            {audienceType === "filtered" && (
              <p className="text-xs text-muted-foreground">Everyone in your CRM will be included. You can remove people in the review step.</p>
            )}

            {/* Audience count */}
            {audienceValues.length > 0 && audienceType !== "filtered" && (
              <div className="text-xs font-medium text-brand-teal">
                Selected audience: {audiencePreview.length} {audiencePreview.length === 1 ? "person" : "people"}
              </div>
            )}

            {/* COMMUNICATION */}
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">How would you like FADS to contact them?</Label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "message", label: "Direct Message" },
                  { value: "email", label: "Email" },
                ].map((ch) => (
                  <label key={ch.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={channels.includes(ch.value)}
                      onCheckedChange={() => setChannels(toggleArray(channels, ch.value))}
                    />
                    {ch.label}
                  </label>
                ))}
              </div>
            </div>

            {/* MESSAGE */}
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Message</Label>
              <Textarea
                className="min-h-[80px] text-sm"
                placeholder="Write your message here…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  className="h-8 flex-1 text-xs"
                  placeholder="Ask FADS to draft it — describe what you want to say…"
                  value={draftPurpose}
                  onChange={(e) => setDraftPurpose(e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={draftWithAI} disabled={drafting || !draftPurpose.trim()}>
                  {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Ask FADS
                </Button>
              </div>
              {templates && templates.length > 0 && (
                <MessageTemplatePicker
                  templates={templates}
                  channel="whatsapp"
                  onSelect={(body) => setMessage(body || "")}
                />
              )}
            </div>

            {/* RULE NAME */}
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Rule name</Label>
              <Input
                className="h-9"
                placeholder="e.g. Bake sale reminder for parents"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-3 space-y-2.5">
          {/* WHEN + FADS SHOULD — two columns on wider screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">When this happens</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">FADS should</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                {ACTION_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(actionType === "create_reminder" || actionType === "create_followup" || actionType === "create_task") && (
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">When?</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
              >
                {TIMING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {timing === "custom" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Input type="date" className="h-9" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
                  <Input type="time" className="h-9" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* TEMPLATE — only for prepare_* actions */}
          {(actionType === "prepare_whatsapp" || actionType === "prepare_message" || actionType === "prepare_email") && (
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Template</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={actionTemplateCategory}
                onChange={(e) => setActionTemplateCategory(e.target.value)}
              >
                <option value="first_contact">First Contact</option>
                <option value="follow_up">Follow-Up</option>
                <option value="proposal_follow_up">Proposal Follow-Up</option>
                <option value="thank_you">Thank You</option>
                <option value="customer_check_in">Customer Check-In</option>
                <option value="payment_reminder">Payment Reminder</option>
              </select>
            </div>
          )}

          {/* RULE NAME */}
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Rule name</Label>
            <Input
              className="h-9"
              placeholder="e.g. Welcome new customers"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* More options — collapsed by default */}
          {hasMoreOptions && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? "" : "-rotate-90"}`} />
                Details
              </button>
              {showMore && (
                <div className="space-y-2 pt-0.5">
                  {triggerType === "stage_entered" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Which stage?</Label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={triggerStage}
                        onChange={(e) => setTriggerStage(e.target.value)}
                      >
                        {stageNames.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  {triggerType === "no_contact_days" && (
                    <div className="space-y-1">
                      <Label className="text-xs">After how many days without contact?</Label>
                      <Input
                        type="number" min={1} className="h-9" value={noContactDays}
                        onChange={(e) => setNoContactDays(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  )}
                  {actionType === "create_task" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Task title</Label>
                      <Input
                        className="h-9" placeholder="e.g. Send proposal document"
                        value={actionTaskTitle}
                        onChange={(e) => setActionTaskTitle(e.target.value)}
                      />
                    </div>
                  )}
                  {actionType === "add_label" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Which label?</Label>
                      <Input
                        className="h-9" placeholder="e.g. follow-up, hot-lead"
                        value={actionLabel_}
                        onChange={(e) => setActionLabel_(e.target.value)}
                      />
                    </div>
                  )}
                  {actionType === "move_stage" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Move to which stage?</Label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={actionStage}
                        onChange={(e) => setActionStage(e.target.value)}
                      >
                        {stageNames.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Sticky bottom actions */}
        <div className="flex gap-2 pt-1 sticky bottom-0 bg-background pb-1 -mx-4 px-4">
          <Button variant="outline" className="h-9 flex-1" onClick={onClose}>Cancel</Button>
          <Button className="h-9 flex-1 gap-1.5" onClick={handleSave} disabled={saving || !name.trim()}>
            <Plus className="w-4 h-4" /> {saving ? "Saving…" : "Save Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildActionConfig(actionType, p) {
  const timed = {
    timing: p.timing,
    custom_date: p.timing === "custom" ? p.customDate : "",
    custom_time: p.timing === "custom" ? p.customTime : "",
  };
  if (actionType === "create_reminder") return timed;
  if (actionType === "create_followup") return timed;
  if (actionType === "create_task") return { ...timed, task_title: p.actionTaskTitle };
  if (actionType === "add_label") return { label: p.actionLabel_ };
  if (actionType === "move_stage") return { stage: p.actionStage };
  if (actionType === "prepare_whatsapp" || actionType === "prepare_message" || actionType === "prepare_email")
    return { template_category: p.actionTemplateCategory };
  return {};
}

// ── Automation rule card (list item) ──────────────────────────────────
export function AutomationRuleCard({ auto, orgType, onToggle, onDelete, onSendNow }) {
  const triggerText = describeTrigger(auto, orgType);
  const actionText = describeAction(auto);
  return (
    <div className="rounded-lg border p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{auto.name}</div>
          <div className="text-xs text-muted-foreground">
            When {triggerText} → FADS will {actionText}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {auto.trigger_type === "audience_broadcast" && onSendNow && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onSendNow(auto)}>
              <Send className="w-3 h-3" /> Send now
            </Button>
          )}
          <button
            onClick={() => onToggle(auto)}
            className={`p-1.5 rounded-md min-h-touch min-w-touch ${auto.status === "active" ? "text-status-ok" : "text-muted-foreground hover:bg-accent"}`}
            title={auto.status === "active" ? "Pause" : "Resume"}
          >
            {auto.status === "active" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(auto)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent min-h-touch min-w-touch"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {auto.status === "paused" && (
        <span className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Paused</span>
      )}
    </div>
  );
}

function describeTrigger(auto, orgType) {
  if (auto.trigger_type === "stage_entered") return `someone enters "${auto.trigger_config?.stage || "—"}"`;
  if (auto.trigger_type === "no_contact_days") return `no contact for ${auto.trigger_config?.days || 7} days`;
  if (auto.trigger_type === "appointment_booked") return "an appointment is booked";
  if (auto.trigger_type === "appointment_completed") return "an appointment is completed";
  if (auto.trigger_type === "follow_up_due") return "a reminder or follow-up becomes due";
  if (auto.trigger_type === "new_person") return "a new person is added";
  if (auto.trigger_type === "becomes_customer") return "someone becomes a customer / member";
  if (auto.trigger_type === "audience_broadcast") return "you want to message a group";
  return auto.trigger_type;
}

function describeAction(auto) {
  const a = auto.action_type;
  const when = auto.action_config?.timing === "now" ? "now"
    : auto.action_config?.timing === "later_today" ? "later today"
    : auto.action_config?.timing === "custom" ? (auto.action_config?.custom_date || "on a custom date")
    : "tomorrow";
  if (a === "create_reminder") return `create a reminder ${when}`;
  if (a === "create_followup") return `create a follow-up ${when}`;
  if (a === "create_task") return `create an internal task ${when}`;
  if (a === "add_label") return `add the label "${auto.action_config?.label || "—"}"`;
  if (a === "move_stage") return `move to "${auto.action_config?.stage || "—"}"`;
  if (a === "prepare_whatsapp") return "prepare a WhatsApp (you approve before sending)";
  if (a === "prepare_message") return "prepare a message (you approve before sending)";
  if (a === "prepare_email") return "prepare an email (you approve before sending)";
  if (a === "send_to_audience") {
    const ch = auto.action_config?.channels || [];
    const chLabel = ch.map((c) => c === "whatsapp" ? "WhatsApp" : c === "email" ? "Email" : "DM").join(", ") || "message";
    return `send ${chLabel} to selected people (you approve before sending)`;
  }
  return a;
}