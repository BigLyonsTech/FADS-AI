import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useAuth } from "@/lib/AuthContext";
import { getDefaultStages, getCrmConfig, getContactStatusForStage, getStageForContactStatus } from "@/lib/crmWording";
import {
  runAutomationsForStageChange, runAutomationsForNewLead,
  runAutomationsForTaskEvent, runAutomationsForDueTasks,
} from "@/lib/usePipelineAutomations";
import { getDefaultTemplates } from "@/lib/automationWording";

// CRM data hook — loads all CRM records for the active organisation, filtered
// by the current Demo / Live data mode. Supports CRUD and auto-seeds demo
// data for demo workspaces.

export function useCrm() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const { user } = useAuth();
  const orgId = activeOrg?.id;
  const orgType = activeOrg?.type;
  const currency = activeOrg?.currency || "";

  const [contacts, setContacts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stages, setStages] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  // Ref guard prevents concurrent seed runs — state alone is async and can
  // allow race conditions where the effect fires again before `seeding`
  // becomes true in a re-render.
  const seedingRef = useRef(false);
  const dueCheckRef = useRef(false);
  const loadRequestRef = useRef(0);
  const loadedScopeRef = useRef("");
  const scopeKey = `${orgId || ""}:${dataMode || ""}`;
  const currentScopeRef = useRef(scopeKey);
  currentScopeRef.current = scopeKey;

  const clearLoadedData = useCallback(() => {
    setContacts([]);
    setOrgs([]);
    setLeads([]);
    setTasks([]);
    setActivities([]);
    setStages([]);
    setAutomations([]);
    setTemplates([]);
    setOffers([]);
  }, []);

  const loadAll = useCallback(async () => {
    const requestScope = `${orgId || ""}:${dataMode || ""}`;
    const requestId = ++loadRequestRef.current;

    if (!orgId) {
      loadedScopeRef.current = "";
      clearLoadedData();
      setLoading(false);
      return;
    }

    // Never leave the previous organisation's CRM records visible while the
    // newly selected organisation/mode is loading.
    if (loadedScopeRef.current !== requestScope) {
      clearLoadedData();
    }
    setLoading(true);

    try {
      // Fetch all CRM entities in a single backend request instead of 8
      // separate client filter calls. 8 client calls per load (re-run after
      // every CRUD op) was bursting the platform rate limit (150 ops/min).
      const res = await base44.functions.invoke("crm", {
        action: "list_all",
        organisation_id: orgId,
        data_mode: dataMode,
      });

      // A slower response from the previously active workspace must never
      // overwrite records for the workspace that is active now.
      if (
        requestId !== loadRequestRef.current ||
        currentScopeRef.current !== requestScope
      ) {
        return;
      }

      const d = res.data || {};
      loadedScopeRef.current = requestScope;
      setContacts(d.contacts || []);
      setOrgs(d.orgs || []);
      setLeads(d.leads || []);
      setTasks(d.tasks || []);
      setActivities(d.activities || []);
      setStages(d.stages || []);
      setAutomations(d.automations || []);
      setTemplates(d.templates || []);
      setOffers(d.offers || []);
      // Seed default templates if none exist yet
      if ((d.templates || []).length === 0 && orgType) {
        seedDefaultTemplates(orgId, dataMode, orgType);
      }
    } finally {
      if (
        requestId === loadRequestRef.current &&
        currentScopeRef.current === requestScope
      ) {
        setLoading(false);
      }
    }
  }, [orgId, dataMode, orgType, clearLoadedData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Check due reminders/follow-ups while the CRM is open. AutomationRun event
  // keys make repeated checks idempotent across refreshes and re-renders.
  useEffect(() => {
    if (!orgId || loading || dueCheckRef.current || !automations.length || !tasks.length) return;
    let cancelled = false;
    const checkDue = async () => {
      if (dueCheckRef.current || cancelled) return;
      dueCheckRef.current = true;
      try {
        const runs = await runAutomationsForDueTasks(
          automations, tasks, contacts, leads,
          { orgId, dataMode, orgType, userName: user?.full_name || user?.email }
        );
        if (runs.length && !cancelled) await loadAll();
      } finally {
        dueCheckRef.current = false;
      }
    };
    checkDue();
    const timer = window.setInterval(checkDue, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orgId, dataMode, orgType, loading, automations, tasks, contacts, leads, user?.id, loadAll]);

  // Auto-seed demo data for demo workspaces in demo mode.
  // The ref guard ensures seedDemoData never runs concurrently even if
  // the effect fires multiple times before the `seeding` state propagates.
  useEffect(() => {
    if (!orgId || dataMode !== "demo" || loading || seedingRef.current) return;
    if (contacts.length > 0 || stages.length > 0) return;
    seedDemoData();
  }, [orgId, dataMode, loading, contacts.length, stages.length, seeding]);

  const seedDemoData = useCallback(async () => {
    if (!orgId || !orgType || seedingRef.current) return;
    seedingRef.current = true;
    setSeeding(true);
    try {
      // DB-level idempotency: check if stages already exist before creating.
      // This prevents duplicates even across hot-reloads (which create a new
      // component instance with a fresh ref) and concurrent seed attempts.
      const existingStages = await base44.entities.CRMPipelineStage.filter(
        { organisation_id: orgId, data_mode: "demo" }, "order", 10
      );
      if (existingStages.length > 0) {
        await loadAll();
        return;
      }

      const defaultStages = getDefaultStages(orgType);
      await base44.entities.CRMPipelineStage.bulkCreate(
        defaultStages.map((s) => ({
          organisation_id: orgId,
          name: s.name,
          order: s.order,
          color: s.color,
          is_default: s.order === 0,
          data_mode: "demo",
        }))
      );

      const config = getCrmConfig(orgType);
      const demoContacts = getDemoContacts(orgType, config);
      const created = await base44.entities.CRMContact.bulkCreate(
        demoContacts.map((c) => ({
          organisation_id: orgId,
          data_mode: "demo",
          ...c,
        }))
      );

      // Create a few leads
      const demoLeads = getDemoLeads(orgType, config, created, currency);
      if (demoLeads.length) {
        await base44.entities.CRMLead.bulkCreate(
          demoLeads.map((l) => ({
            organisation_id: orgId,
            data_mode: "demo",
            currency,
            ...l,
          }))
        );
      }

      // Create a few tasks
      const demoTasks = getDemoTasks(created);
      if (demoTasks.length) {
        await base44.entities.CRMTask.bulkCreate(
          demoTasks.map((t) => ({
            organisation_id: orgId,
            data_mode: "demo",
            ...t,
          }))
        );
      }

      // Create a few activities
      const demoActivities = getDemoActivities(created);
      if (demoActivities.length) {
        await base44.entities.CRMActivity.bulkCreate(
          demoActivities.map((a) => ({
            organisation_id: orgId,
            data_mode: "demo",
            ...a,
          }))
        );
      }

      await loadAll();
    } finally {
      seedingRef.current = false;
      setSeeding(false);
    }
  }, [orgId, orgType, currency, loadAll]);

  // --- CRUD helpers ---
  const createContact = async (data) => {
    const rec = await base44.entities.CRMContact.create({
      ...data,
      status: data.status || "new",
      tags: data.tags || [],
      organisation_id: orgId,
      data_mode: dataMode,
    });
    await loadAll();
    return rec;
  };

  const updateContact = async (id, data) => {
    const rec = await base44.entities.CRMContact.update(id, data);
    // Sync linked leads' stages when the contact's status changes (one source of truth)
    if (data.status) {
      const newStage = getStageForContactStatus(data.status, orgType);
      if (newStage) {
        const linkedLeads = leads.filter((l) => l.contact_id === id);
        await Promise.all(linkedLeads.map((lead) =>
          lead.stage !== newStage
            ? base44.entities.CRMLead.update(lead.id, { stage: newStage }).catch(() => {})
            : null
        ));
      }
    }
    await loadAll();
    return rec;
  };

  const deleteContact = async (id) => {
    await base44.entities.CRMContact.delete(id);
    await loadAll();
  };

  const createLead = async (data) => {
    const rec = await base44.entities.CRMLead.create({
      ...data,
      organisation_id: orgId,
      data_mode: dataMode,
      currency,
    });
    // Fire "new person" automations
    const contact = rec.contact_id ? contacts.find((c) => c.id === rec.contact_id) : null;
    runAutomationsForNewLead(automations, rec, {
      orgId, dataMode, orgType, contact, userName: user?.full_name || user?.email,
    }).catch(() => {});
    await loadAll();
    return rec;
  };

  const updateLead = async (id, data) => {
    const prev = leads.find((l) => l.id === id);
    const rec = await base44.entities.CRMLead.update(id, data);
    // Fire stage-change automations if the stage actually changed
    if (prev && data.stage && prev.stage !== data.stage) {
      // Sync the linked contact's status with the new pipeline stage (one source of truth)
      const newStatus = getContactStatusForStage(data.stage, orgType);
      if (newStatus && rec.contact_id) {
        await base44.entities.CRMContact.update(rec.contact_id, { status: newStatus }).catch(() => {});
      }
      const contact = rec.contact_id ? contacts.find((c) => c.id === rec.contact_id) : null;
      runAutomationsForStageChange(automations, rec, prev.stage, data.stage, {
        orgId, dataMode, orgType, contact, userName: user?.full_name || user?.email,
      }).catch(() => {});
    }
    await loadAll();
    return rec;
  };

  const deleteLead = async (id) => {
    await base44.entities.CRMLead.delete(id);
    await loadAll();
  };

  const createTask = async (data) => {
    const rec = await base44.entities.CRMTask.create({
      ...data,
      organisation_id: orgId,
      data_mode: dataMode,
      status: data.status || "open",
    });
    if (rec.type === "appointment" && rec.status === "open") {
      const contact = rec.contact_id ? contacts.find((c) => c.id === rec.contact_id) : null;
      const lead = rec.lead_id
        ? leads.find((l) => l.id === rec.lead_id)
        : leads.find((l) => l.contact_id === rec.contact_id);
      await runAutomationsForTaskEvent(automations, rec, "appointment_booked", {
        orgId, dataMode, orgType, contact, lead,
        userName: user?.full_name || user?.email,
      }).catch(() => {});
    }
    await loadAll();
    return rec;
  };

  const updateTask = async (id, data) => {
    const prev = tasks.find((t) => t.id === id);
    const rec = await base44.entities.CRMTask.update(id, data);
    if (
      prev?.type === "appointment" &&
      prev.status !== "done" &&
      rec.status === "done"
    ) {
      const contact = rec.contact_id ? contacts.find((c) => c.id === rec.contact_id) : null;
      const lead = rec.lead_id
        ? leads.find((l) => l.id === rec.lead_id)
        : leads.find((l) => l.contact_id === rec.contact_id);
      await runAutomationsForTaskEvent(automations, rec, "appointment_completed", {
        orgId, dataMode, orgType, contact, lead,
        userName: user?.full_name || user?.email,
      }).catch(() => {});
    }
    await loadAll();
    return rec;
  };

  const deleteTask = async (id) => {
    await base44.entities.CRMTask.delete(id);
    await loadAll();
  };

  const createOffer = async (data) => {
    const rec = await base44.entities.CRMOffer.create({
      ...data,
      organisation_id: orgId,
      data_mode: dataMode,
      status: data.status || "active",
    });
    await loadAll();
    return rec;
  };

  const updateOffer = async (id, data) => {
    const rec = await base44.entities.CRMOffer.update(id, data);
    await loadAll();
    return rec;
  };

  const createActivity = async (data) => {
    const rec = await base44.entities.CRMActivity.create({
      ...data,
      organisation_id: orgId,
      data_mode: dataMode,
      created_by_name: user?.full_name || user?.email || "—",
    });
    await loadAll();
    return rec;
  };

  const deleteActivity = async (id) => {
    await base44.entities.CRMActivity.delete(id);
    await loadAll();
  };

  const createStage = async (data) => {
    const rec = await base44.entities.CRMPipelineStage.create({
      ...data,
      organisation_id: orgId,
      data_mode: dataMode,
    });
    await loadAll();
    return rec;
  };

  const updateStage = async (id, data) => {
    const rec = await base44.entities.CRMPipelineStage.update(id, data);
    await loadAll();
    return rec;
  };

  const deleteStage = async (id) => {
    await base44.entities.CRMPipelineStage.delete(id);
    await loadAll();
  };

  // --- Derived stats ---
  const stats = {
    totalContacts: contacts.length,
    newContacts: contacts.filter((c) => c.status === "new").length,
    activeContacts: contacts.filter((c) => c.status === "active" || c.status === "converted").length,
    openLeads: leads.length,
    pipelineValue: leads.reduce((sum, l) => sum + (l.value || 0), 0),
    openTasks: tasks.filter((t) => t.status === "open").length,
    overdueTasks: tasks.filter(
      (t) => t.status === "open" && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())
    ).length,
    upcomingFollowUps: contacts.filter(
      (c) => c.next_follow_up_date && new Date(c.next_follow_up_date) >= new Date(new Date().toDateString())
    ).length,
  };

  return {
    orgId, orgType, currency, dataMode, activeOrg,
    contacts, orgs, leads, tasks, activities, stages, automations, templates, offers,
    loading, seeding,
    reload: loadAll,
    createContact, updateContact, deleteContact,
    createLead, updateLead, deleteLead,
    createTask, updateTask, deleteTask,
    createOffer, updateOffer,
    createActivity, deleteActivity,
    createStage, updateStage, deleteStage,
    stats,
  };
}

// Seed curated default message templates for the active workspace if none exist.
async function seedDefaultTemplates(orgId, dataMode, orgType) {
  const defaults = getDefaultTemplates(orgType);
  try {
    await base44.entities.MessageTemplate.bulkCreate(
      defaults.map((t) => ({ ...t, organisation_id: orgId, data_mode: dataMode }))
    );
  } catch {}
}

// --- Demo data generators ---

function getDemoContacts(orgType, config) {
  const types = config.contactTypes;
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };
  const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

  if (orgType === "small_business") {
    return [
      { first_name: "James", last_name: "O'Connor", email: "james.oconnor@email.com", phone: "+353 87 123 4567", contact_type: "lead", status: "new", source: "Website", organisation_name: "O'Connor Retail Ltd", last_contact_date: daysAgo(2), next_follow_up_date: daysAhead(3), tags: ["hot-lead"], notes: "Interested in premium package." },
      { first_name: "Sarah", last_name: "Murphy", email: "sarah.murphy@email.com", phone: "+353 86 234 5678", contact_type: "prospect", status: "contacted", source: "Referral", organisation_name: "Murphy Design Co", last_contact_date: daysAgo(5), tags: ["referral"], notes: "Referred by existing customer." },
      { first_name: "David", last_name: "Kelly", email: "david.kelly@email.com", phone: "+353 85 345 6789", contact_type: "customer", status: "active", source: "Walk-in", organisation_name: "Kelly Construction", last_contact_date: daysAgo(10), tags: ["vip"], notes: "Long-term customer." },
      { first_name: "Emma", last_name: "Walsh", email: "emma.walsh@email.com", phone: "+353 87 456 7890", contact_type: "supplier", status: "active", source: "Event", organisation_name: "Walsh Wholesale", last_contact_date: daysAgo(7), tags: [], notes: "Office supplies vendor." },
      { first_name: "Michael", last_name: "Ryan", email: "michael.ryan@email.com", phone: "+353 86 567 8901", contact_type: "lead", status: "engaged", source: "Social Media", organisation_name: "Ryan Tech Solutions", last_contact_date: daysAgo(1), next_follow_up_date: daysAhead(1), tags: ["follow-up"], notes: "Awaiting proposal response." },
    ];
  }
  if (orgType === "school") {
    return [
      { first_name: "Mary", last_name: "Byrne", email: "mary.byrne@email.com", phone: "+353 87 111 2222", contact_type: "parent", status: "new", source: "Open Day", organisation_name: "Byrne Family", last_contact_date: daysAgo(3), next_follow_up_date: daysAhead(2), tags: ["year-7"], notes: "Interested in enrolment for September." },
      { first_name: "John", last_name: "Doherty", email: "john.doherty@email.com", phone: "+353 86 333 4444", contact_type: "enquiry", status: "contacted", source: "Website", organisation_name: "Doherty Family", last_contact_date: daysAgo(6), tags: ["prospective"], notes: "Requested prospectus." },
      { first_name: "Claire", last_name: "Fitzgerald", email: "claire.fitz@email.com", phone: "+353 85 555 6666", contact_type: "parent", status: "active", source: "Referral", organisation_name: "Fitzgerald Family", last_contact_date: daysAgo(14), tags: ["existing"], notes: "Two children currently enrolled." },
      { first_name: "Peter", last_name: "Gallagher", email: "peter.gallagher@email.com", phone: "+353 87 777 8888", contact_type: "student", status: "active", source: "Walk-in", organisation_name: "Gallagher Family", last_contact_date: daysAgo(30), tags: ["6th-year"], notes: "6th year student." },
    ];
  }
  if (orgType === "university") {
    return [
      { first_name: "Aoife", last_name: "Ní Bhriain", email: "aoife.nb@email.com", phone: "+353 87 999 0000", contact_type: "applicant", status: "new", source: "UCAS", organisation_name: "Ní Bhriain, Aoife", last_contact_date: daysAgo(2), next_follow_up_date: daysAhead(5), tags: ["engineering"], notes: "Applied for BEng Mechanical." },
      { first_name: "Conor", last_name: "O'Sullivan", email: "conor.osullivan@email.com", phone: "+353 86 111 9999", contact_type: "prospective_student", status: "contacted", source: "Open Day", organisation_name: "O'Sullivan, Conor", last_contact_date: daysAgo(4), tags: ["business"], notes: "Attended open day, awaiting decision." },
      { first_name: "Niamh", last_name: "Carroll", email: "niamh.carroll@email.com", phone: "+353 85 222 8888", contact_type: "student", status: "active", source: "Website", organisation_name: "Carroll, Niamh", last_contact_date: daysAgo(20), tags: ["final-year"], notes: "Final year BSc student." },
      { first_name: "Patrick", last_name: "Dunne", email: "patrick.dunne@email.com", phone: "+353 87 333 7777", contact_type: "alumni", status: "active", source: "Event", organisation_name: "Dunne, Patrick", last_contact_date: daysAgo(60), tags: ["alumni-2023"], notes: "Graduated 2023, interested in alumni network." },
    ];
  }
  // church
  return [
    { first_name: "Bridget", last_name: "Flynn", email: "bridget.flynn@email.com", phone: "+353 87 444 5555", contact_type: "member", status: "active", source: "Sunday Service", organisation_name: "Flynn Household", last_contact_date: daysAgo(3), tags: ["choir"], notes: "Choir member, regular attendee." },
    { first_name: "Thomas", last_name: "Hogan", email: "thomas.hogan@email.com", phone: "+353 86 666 7777", contact_type: "visitor", status: "new", source: "Outreach", organisation_name: "Hogan Household", last_contact_date: daysAgo(7), next_follow_up_date: daysAhead(2), tags: ["new-visitor"], notes: "First visit last Sunday, follow up with welcome pack." },
    { first_name: "Kathleen", last_name: "Daly", email: "kathleen.daly@email.com", phone: "+353 85 888 9999", contact_type: "donor", status: "active", source: "Website", organisation_name: "Daly Household", last_contact_date: daysAgo(10), tags: ["regular-giver"], notes: "Monthly standing order donor." },
    { first_name: "Sean", last_name: "Brady", email: "sean.brady@email.com", phone: "+353 87 101 2020", contact_type: "volunteer", status: "engaged", source: "Event", organisation_name: "Brady Household", last_contact_date: daysAgo(5), tags: ["youth-ministry"], notes: "Volunteers with youth group." },
  ];
}

function getDemoLeads(orgType, config, contacts, currency) {
  if (!contacts.length) return [];
  const stages = getDefaultStages(orgType);
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

  const make = (title, contactIdx, stageOrder, value) => ({
    title,
    contact_id: contacts[contactIdx]?.id,
    contact_name: contacts[contactIdx] ? `${contacts[contactIdx].first_name} ${contacts[contactIdx].last_name}` : "",
    stage: stages[stageOrder].name,
    value,
    source: contacts[contactIdx]?.source || "Website",
    expected_close_date: daysAhead(30 + contactIdx * 10),
  });

  if (orgType === "small_business") {
    return [
      make("Premium software package", 0, 0, 5000),
      make("Design project quote", 1, 1, 4500),
      make("Tech consulting engagement", 4, 2, 8000),
      make("Annual support contract", 2, 3, 12000),
      make("Office supply tender", 3, 4, 3500),
    ];
  }
  if (orgType === "school") {
    return [
      make("September enrolment enquiry", 0, 1, 4500),
      make("Prospectus follow-up", 1, 2, 0),
    ];
  }
  if (orgType === "university") {
    return [
      make("BEng Mechanical application", 0, 1, 9000),
      make("Business open day follow-up", 1, 2, 0),
    ];
  }
  return [
    make("Welcome follow-up", 1, 1, 0),
    make("Volunteer onboarding", 3, 4, 0),
  ];
}

function getDemoTasks(contacts) {
  if (!contacts.length) return [];
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };
  const c0 = contacts[0], c1 = contacts[1];

  return [
    { type: "follow_up", title: `Follow up with ${c0?.first_name || "contact"}`, contact_id: c0?.id, contact_name: c0 ? `${c0.first_name} ${c0.last_name}` : "", due_date: daysAhead(2), priority: "high", status: "open" },
    { type: "call", title: `Call ${c1?.first_name || "contact"}`, contact_id: c1?.id, contact_name: c1 ? `${c1.first_name} ${c1.last_name}` : "", due_date: daysAhead(1), priority: "medium", status: "open" },
    { type: "appointment", title: "Team review meeting", due_date: daysAhead(5), due_time: "10:00", end_time: "11:00", location: "Office", priority: "medium", status: "open" },
  ];
}

function getDemoActivities(contacts) {
  if (!contacts.length) return [];
  const c0 = contacts[0], c2 = contacts[2];
  return [
    { type: "note", contact_id: c0?.id, contact_name: c0 ? `${c0.first_name} ${c0.last_name}` : "", subject: "Initial enquiry", content: "Contacted via website form, interested in our services. Sent introductory brochure." },
    { type: "call", contact_id: c2?.id, contact_name: c2 ? `${c2.first_name} ${c2.last_name}` : "", subject: "Check-in call", content: "Spoke with contact, all going well. No issues reported." },
  ];
}