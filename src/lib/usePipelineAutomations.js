import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useAuth } from "@/lib/AuthContext";
import { getPipelineConfig, getStageDisplayName } from "@/lib/crmWording";
import { getDefaultTemplates } from "@/lib/automationWording";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateString(d) {
  return d.toISOString().slice(0, 10);
}

function timeString(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function resolveDue(actionConfig = {}) {
  const timing = actionConfig.timing;
  const now = new Date();

  if (timing === "now") {
    return { due_date: dateString(now), due_time: timeString(now) };
  }

  if (timing === "later_today") {
    const later = new Date(now);
    later.setHours(Math.min(23, now.getHours() + 3), now.getMinutes(), 0, 0);
    return { due_date: dateString(now), due_time: timeString(later) };
  }

  if (timing === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return { due_date: dateString(tomorrow), due_time: "09:00" };
  }

  if (timing === "custom" && actionConfig.custom_date) {
    return {
      due_date: actionConfig.custom_date,
      due_time: actionConfig.custom_time || "",
    };
  }

  // Backward compatibility for existing rules that use days_ahead.
  const daysAhead = actionConfig.days_ahead ?? 1;
  const due = new Date(now);
  due.setDate(due.getDate() + daysAhead);
  return { due_date: dateString(due), due_time: actionConfig.due_time || "" };
}

function getWonStage(orgType) {
  return getPipelineConfig(orgType).stages[4]?.name || null;
}

export function isWonStage(stageName, orgType) {
  const won = getWonStage(orgType);
  return !!won && getStageDisplayName(stageName, orgType) === won;
}

function followUpPersonWord(orgType) {
  if (orgType === "school") return "parent / guardian";
  if (orgType === "church") return "contact / member";
  return "customer";
}

async function claimEvent(auto, eventKey, {
  orgId, dataMode, contactId, contactName, leadId, sourceTaskId,
}) {
  if (!eventKey) return null;

  const existing = await base44.entities.AutomationRun.filter({
    organisation_id: orgId,
    data_mode: dataMode,
    automation_id: auto.id,
    event_key: eventKey,
  }, "-created_date", 1);

  if (existing.length > 0) return null;

  // Persisted duplicate protection for rule-generated CRM tasks/reminders.
  // This protects against refresh/re-render reprocessing even if a prior run
  // record was interrupted after the task itself had already been created.
  if (["create_reminder", "create_followup", "create_task"].includes(auto.action_type)) {
    const existingTask = await base44.entities.CRMTask.filter({
      organisation_id: orgId,
      data_mode: dataMode,
      automation_id: auto.id,
      automation_event_key: eventKey,
    }, "-created_date", 1);
    if (existingTask.length > 0) return null;
  }

  return base44.entities.AutomationRun.create({
    organisation_id: orgId,
    data_mode: dataMode,
    automation_id: auto.id,
    rule_name: auto.name,
    event_key: eventKey,
    source_task_id: sourceTaskId || "",
    trigger_type: auto.trigger_type,
    action_type: auto.action_type,
    action_label: "Preparing action",
    contact_id: contactId || "",
    contact_name: contactName || "",
    lead_id: leadId || "",
    status: "draft",
    detail: "",
  });
}

async function savePreparedWhatsAppDraft(auto, contact, { orgId, dataMode }) {
  if (!contact?.id || !(contact.phone || "").replace(/[^\d]/g, "")) {
    return { ok: false, detail: "No valid phone number" };
  }

  const existing = await base44.entities.WhatsAppDraft.filter({
    organisation_id: orgId,
    data_mode: dataMode,
    contact_id: contact.id,
  }, "-updated_date", 1);

  // Never overwrite a draft the user has already saved.
  if (existing.length > 0) {
    return { ok: true, detail: "A saved WhatsApp draft already exists for this contact" };
  }

  const category = auto.action_config?.template_category || "follow_up";
  const templates = await base44.entities.MessageTemplate.filter({
    organisation_id: orgId,
    data_mode: dataMode,
    category,
    channel: "whatsapp",
  }, "-created_date", 10);

  const template = templates[0]?.body ||
    "Hi {name}, just following up. Please let me know if there is anything I can help with.";
  const body = template.replace(/\{name\}/g, contact.first_name || "there");

  await base44.entities.WhatsAppDraft.create({
    organisation_id: orgId,
    data_mode: dataMode,
    contact_id: contact.id,
    contact_name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
    contact_phone: contact.phone || "",
    purpose: auto.name,
    body,
  });

  return { ok: true, detail: "Saved as a WhatsApp draft for review" };
}

async function performAction(
  auto,
  lead,
  contact,
  { orgId, dataMode, orgType, eventKey, sourceTask }
) {
  const contactName = contact
    ? `${contact.first_name} ${contact.last_name || ""}`.trim()
    : lead?.contact_name || lead?.title || "";
  const contactId = contact?.id || lead?.contact_id || sourceTask?.contact_id || "";
  const leadId = lead?.id || sourceTask?.lead_id || "";
  const action = auto.action_type;
  const cfg = auto.action_config || {};

  const claim = await claimEvent(auto, eventKey, {
    orgId,
    dataMode,
    contactId,
    contactName,
    leadId,
    sourceTaskId: sourceTask?.id,
  });
  if (!claim) return null;

  let actionLabel = "";
  let detail = "";
  let runStatus = "ready";

  try {
    if (action === "create_reminder" || action === "create_followup" || action === "create_task") {
      const due = resolveDue(cfg);
      const personWord = followUpPersonWord(orgType);
      const type = action === "create_reminder"
        ? "reminder"
        : action === "create_followup"
          ? "follow_up"
          : "task";
      const defaultTitle = action === "create_reminder"
        ? `Follow up with ${personWord}${contactName ? ` — ${contactName}` : ""}`
        : action === "create_followup"
          ? `Follow up with ${personWord}${contactName ? ` — ${contactName}` : ""}`
          : `Task: ${auto.name}`;
      const title = cfg.task_title || defaultTitle;

      await base44.entities.CRMTask.create({
        organisation_id: orgId,
        data_mode: dataMode,
        type,
        title,
        contact_id: contactId,
        contact_name: contactName,
        lead_id: leadId,
        related_task_id: sourceTask?.type === "appointment" ? sourceTask.id : "",
        due_date: due.due_date,
        due_time: due.due_time,
        priority: "medium",
        status: "open",
        automation_id: auto.id,
        automation_event_key: eventKey,
      });

      actionLabel = action === "create_reminder"
        ? `Reminder created for ${due.due_date}${due.due_time ? ` at ${due.due_time}` : ""}`
        : action === "create_followup"
          ? `Follow-up created for ${due.due_date}${due.due_time ? ` at ${due.due_time}` : ""}`
          : `Internal task created: "${title}"`;
    } else if (action === "prepare_whatsapp") {
      if (contact?.status === "inactive") {
        actionLabel = "WhatsApp draft skipped";
        runStatus = "skipped";
        detail = "Contact is inactive";
      } else {
        const result = await savePreparedWhatsAppDraft(auto, contact, { orgId, dataMode });
        if (!result.ok) {
          actionLabel = "WhatsApp draft skipped";
          runStatus = "skipped";
          detail = result.detail;
        } else {
          actionLabel = "WhatsApp draft prepared";
          detail = result.detail;
        }
      }
    } else if (action === "prepare_email") {
      if (!contact?.email || contact?.status === "inactive") {
        actionLabel = "Email draft skipped";
        runStatus = "skipped";
        detail = contact?.status === "inactive" ? "Contact is inactive" : "No email address";
      } else {
        actionLabel = "Email follow-up ready to prepare";
        detail = `Template: ${cfg.template_category || "follow_up"}. User approval is required before sending.`;
      }
    } else if (action === "prepare_message") {
      actionLabel = "Internal message follow-up ready to prepare";
      detail = "Open Messages to choose the team recipient. Nothing was sent automatically.";
    } else if (action === "add_label") {
      // Legacy support for existing saved rules.
      const label = cfg.label || "follow-up";
      if (contact) {
        const tags = Array.isArray(contact.tags) ? [...contact.tags] : [];
        if (!tags.includes(label)) {
          tags.push(label);
          await base44.entities.CRMContact.update(contact.id, { tags });
        }
      }
      actionLabel = `Label "${label}" added`;
    } else if (action === "move_stage") {
      // Legacy support for existing saved rules.
      if (cfg.stage && lead) {
        await base44.entities.CRMLead.update(lead.id, { stage: cfg.stage });
      }
      actionLabel = cfg.stage ? `Moved to ${cfg.stage}` : "No stage selected";
    } else {
      actionLabel = auto.name;
    }

    await base44.entities.AutomationRun.update(claim.id, {
      action_label: actionLabel,
      status: runStatus,
      detail,
    });
    return { ...claim, action_label: actionLabel, status: runStatus, detail };
  } catch (e) {
    try {
      await base44.entities.AutomationRun.update(claim.id, {
        action_label: auto.name,
        status: "failed",
        detail: e?.message || "Action failed",
      });
    } catch {}
    return null;
  }
}

export async function runAutomationsForStageChange(
  automations,
  lead,
  oldStage,
  newStage,
  { orgId, dataMode, orgType, contact, userName, eventId }
) {
  if (!automations?.length || oldStage === newStage) return [];
  const active = automations.filter((a) => a.status === "active");
  const runs = [];
  const displayNew = getStageDisplayName(newStage, orgType);
  const wonStage = getWonStage(orgType);

  for (const auto of active) {
    let matched = false;
    if (auto.trigger_type === "stage_entered") {
      matched = !!auto.trigger_config?.stage &&
        getStageDisplayName(auto.trigger_config.stage, orgType) === displayNew;
    } else if (auto.trigger_type === "becomes_customer" && wonStage) {
      matched = displayNew === wonStage && getStageDisplayName(oldStage, orgType) !== wonStage;
    }
    if (!matched) continue;

    const eventKey = `stage:${lead.id}:${oldStage || "none"}->${newStage}:${eventId || lead.updated_date || "change"}`;
    const run = await performAction(auto, lead, contact, {
      orgId, dataMode, orgType, eventKey, sourceTask: null, userName,
    });
    if (run) runs.push(run);
  }
  return runs;
}

export async function runAutomationsForNewLead(
  automations,
  lead,
  { orgId, dataMode, orgType, contact, userName }
) {
  const active = (automations || []).filter(
    (a) => a.status === "active" && a.trigger_type === "new_person"
  );
  const runs = [];
  for (const auto of active) {
    const run = await performAction(auto, lead, contact, {
      orgId,
      dataMode,
      orgType,
      eventKey: `new_person:${lead.id}`,
      sourceTask: null,
      userName,
    });
    if (run) runs.push(run);
  }
  return runs;
}

export async function runAutomationsForTaskEvent(
  automations,
  task,
  eventType,
  { orgId, dataMode, orgType, contact, lead, userName, eventId }
) {
  const active = (automations || []).filter(
    (a) => a.status === "active" && a.trigger_type === eventType
  );
  const runs = [];
  for (const auto of active) {
    const eventKey = `${eventType}:${task.id}:${eventId || task.updated_date || task.created_date || task.status || "event"}`;
    const run = await performAction(auto, lead, contact, {
      orgId,
      dataMode,
      orgType,
      eventKey,
      sourceTask: task,
      userName,
    });
    if (run) runs.push(run);
  }
  return runs;
}

function isDue(task, now = new Date()) {
  if (!task || task.status !== "open" || !task.due_date) return false;
  const today = dateString(now);
  if (task.due_date < today) return true;
  if (task.due_date > today) return false;
  if (!task.due_time) return true;
  return task.due_time <= timeString(now);
}

export async function runAutomationsForDueTasks(
  automations,
  tasks,
  contacts,
  leads,
  { orgId, dataMode, orgType, userName }
) {
  const rules = (automations || []).filter(
    (a) => a.status === "active" && a.trigger_type === "follow_up_due"
  );
  if (!rules.length) return [];

  const dueTasks = (tasks || []).filter(
    (task) => (task.type === "reminder" || task.type === "follow_up") && isDue(task)
  );
  const runs = [];

  for (const task of dueTasks) {
    const contact = (contacts || []).find((c) => c.id === task.contact_id) || null;
    const lead = (leads || []).find((l) => l.id === task.lead_id) ||
      (leads || []).find((l) => l.contact_id === task.contact_id) || null;

    for (const auto of rules) {
      // Prevent a rule from recursively triggering on its own generated due task.
      if (task.automation_id && task.automation_id === auto.id) continue;

      const eventKey = `follow_up_due:${task.id}:${task.due_date}:${task.due_time || "day"}`;
      const run = await performAction(auto, lead, contact, {
        orgId,
        dataMode,
        orgType,
        eventKey,
        sourceTask: task,
        userName,
      });
      if (run) runs.push(run);
    }
  }

  return runs;
}

export function usePipelineAutomations() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const { user } = useAuth();
  const orgId = activeOrg?.id;
  const orgType = activeOrg?.type;

  const [automations, setAutomations] = useState([]);
  const [runs, setRuns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!orgId) {
      setAutomations([]);
      setRuns([]);
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const filter = { organisation_id: orgId, data_mode: dataMode };
      const [a, r, t] = await Promise.all([
        base44.entities.PipelineAutomation.filter(filter, "-created_date", 200),
        base44.entities.AutomationRun.filter(filter, "-created_date", 100),
        base44.entities.MessageTemplate.filter(filter, "category", 100),
      ]);
      setAutomations(a);
      setRuns(r);
      setTemplates(t);

      if (t.length === 0) {
        await seedDefaultTemplates(orgId, dataMode, orgType);
        const t2 = await base44.entities.MessageTemplate.filter(filter, "category", 100);
        setTemplates(t2);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, dataMode, orgType]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createAutomation = async (data) => {
    const rec = await base44.entities.PipelineAutomation.create({
      ...data,
      organisation_id: orgId,
      data_mode: dataMode,
      created_by_name: user?.full_name || user?.email || "—",
      status: data.status || "active",
    });
    await loadAll();
    return rec;
  };

  const updateAutomation = async (id, data) => {
    const rec = await base44.entities.PipelineAutomation.update(id, data);
    await loadAll();
    return rec;
  };

  const deleteAutomation = async (id) => {
    await base44.entities.PipelineAutomation.delete(id);
    await loadAll();
  };

  const createTemplate = async (data) => {
    const rec = await base44.entities.MessageTemplate.create({
      ...data,
      organisation_id: orgId,
      data_mode: dataMode,
      is_builtin: false,
    });
    await loadAll();
    return rec;
  };

  const deleteTemplate = async (id) => {
    await base44.entities.MessageTemplate.delete(id);
    await loadAll();
  };

  return {
    orgId,
    orgType,
    dataMode,
    automations,
    runs,
    templates,
    loading,
    reload: loadAll,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    createTemplate,
    deleteTemplate,
  };
}

async function seedDefaultTemplates(orgId, dataMode, orgType) {
  const defaults = getDefaultTemplates(orgType);
  try {
    await base44.entities.MessageTemplate.bulkCreate(
      defaults.map((t) => ({
        ...t,
        organisation_id: orgId,
        data_mode: dataMode,
      }))
    );
  } catch {}
}
