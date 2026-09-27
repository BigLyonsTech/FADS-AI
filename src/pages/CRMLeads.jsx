import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCrm } from "@/lib/useCrm";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/AuthContext";
import { getCrmConfig, getPipelineConfig, getStageDisplayName } from "@/lib/crmWording";
import CrmNav from "@/components/crm/CrmNav";
import LeadDialog from "@/components/crm/LeadDialog";
import WhatsAppComposer from "@/components/crm/WhatsAppComposer";
import TaskDialog from "@/components/crm/TaskDialog";
import PipelineFollowUpDialog from "@/components/crm/PipelineFollowUpDialog";
import MessageDialog from "@/components/messages/MessageDialog";
import BulkEmailDialog from "@/components/crm/BulkEmailDialog";
import BulkDirectMessageDialog from "@/components/crm/BulkDirectMessageDialog";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import PipelineBoard, { PipelineFadsGuidance } from "@/components/crm/PipelineBoard";

export default function CRMLeads() {
  const crm = useCrm();
  const { memberships } = useWorkspace();
  const { user } = useAuth();
  const { orgType, loading, leads, stages, contacts, tasks } = crm;
  const config = getCrmConfig(orgType);
  const pipeConfig = getPipelineConfig(orgType);

  const [showDialog, setShowDialog] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskType, setTaskType] = useState("reminder");
  const [taskTarget, setTaskTarget] = useState(null);
  const [internalMessageOpen, setInternalMessageOpen] = useState(false);
  const [internalMessageContext, setInternalMessageContext] = useState(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailContacts, setEmailContacts] = useState([]);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageContacts, setMessageContacts] = useState([]);

  const teamMembers = (memberships || []).filter(
    (m) => m.organisation_id === crm.orgId && m.status === "active" && m.user_id && m.user_id !== user?.id
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  const handleMove = async (lead, newStage) => {
    if (lead.stage === newStage) return;
    await crm.updateLead(lead.id, { stage: newStage });
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Delete "${lead.title}"?`)) return;
    await crm.deleteLead(lead.id);
  };

  const handleFollowUp = (lead, contact) => {
    if (!contact) return;
    setFollowUpTarget({ lead, contact });
    setFollowUpOpen(true);
  };

  const handleWhatsApp = (lead, contact) => {
    if (!contact) return;
    setWhatsappContacts([contact]);
    setWhatsappOpen(true);
  };

  const handleEmail = (lead, contact) => {
    if (!contact) return;
    setEmailContacts([contact]);
    setEmailOpen(true);
  };

  const openTask = (lead, contact, type) => {
    if (!contact) return;
    setTaskTarget({ lead, contact });
    setTaskType(type);
    setTaskOpen(true);
  };

  const moveToDisplayStage = async (lead, displayStageName) => {
    if (!lead || !displayStageName) return;
    const target = stages.find((s) => getStageDisplayName(s.name, orgType) === displayStageName);
    if (target && lead.stage !== target.name) {
      await crm.updateLead(lead.id, { stage: target.name });
    }
  };

  const handleBulkWhatsApp = (selectedContacts) => {
    setWhatsappContacts(selectedContacts);
    setWhatsappOpen(true);
  };

  const handleBulkEmail = (selectedContacts) => {
    setEmailContacts(selectedContacts);
    setEmailOpen(true);
  };

  const handleBulkDirectMessage = (selectedContacts) => {
    setMessageContacts(selectedContacts);
    setMessageOpen(true);
  };

  // Single-card internal message — reuses the existing FADS team Messages dialog.
  const handleDirectMessage = (lead, contact) => {
    if (!contact) return;
    const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
    setInternalMessageContext({
      subject: `Follow up: ${name}`,
      body: `Please follow up with ${name}${contact.phone ? ` (${contact.phone})` : ""}.`,
    });
    setInternalMessageOpen(true);
  };

  const handleDirectMessagePrepared = (eligible, body) => {
    eligible.forEach((c) => {
      const personalised = body.replace(/\{name\}/g, c.first_name || "there");
      crm.createActivity({
        contact_id: c.id,
        contact_name: `${c.first_name} ${c.last_name || ""}`.trim(),
        type: "note",
        subject: "Prepared message",
        content: personalised,
      });
    });
    setMessageOpen(false);
  };

  const handleWhatsAppSend = (contact, message) => {
    crm.createActivity({
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
      type: "whatsapp",
      subject: "WhatsApp message",
      content: message,
    });
    crm.updateContact(contact.id, { last_contact_date: new Date().toISOString().slice(0, 10) });
  };

  const askFads = () => {
    const query = pipeConfig.askFadsQuery;
    window.location.assign(`/assistant?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="space-y-4">
      <CrmNav orgType={orgType} />

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{config.pipelineLabel}</h1>
        <Button size="sm" className="h-9 gap-1" onClick={() => { setEditRecord(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4" /> {config.newLeadLabel}
        </Button>
      </div>

      <PipelineFadsGuidance orgType={orgType} onAskFads={askFads} />

      {stages.length === 0 ? (
        <Card><CardContent className="py-2">
          <CrmEmptyState
            message="Your pipeline stages aren't set up yet. I'll take you to the settings page to add them."
            actionLabel="Set up stages"
            onAction={() => window.location.assign("/crm/settings")}
          />
        </CardContent></Card>
      ) : leads.length === 0 ? (
        <Card><CardContent className="py-2">
          <CrmEmptyState
            message={pipeConfig.emptyMessage}
            actionLabel={config.newLeadLabel}
            actionIcon={Plus}
            onAction={() => { setEditRecord(null); setShowDialog(true); }}
          />
        </CardContent></Card>
      ) : (
        <PipelineBoard
          leads={leads}
          stages={stages}
          contacts={contacts}
          tasks={tasks}
          currency={crm.currency}
          orgType={orgType}
          onMove={handleMove}
          onEdit={(lead) => { setEditRecord(lead); setShowDialog(true); }}
          onDelete={handleDelete}
          onFollowUp={handleFollowUp}
          onWhatsApp={handleWhatsApp}
          onEmail={handleEmail}
          onDirectMessage={handleDirectMessage}
          onBookAppointment={(lead, contact) => openTask(lead, contact, "appointment")}
          onSetReminder={(lead, contact) => openTask(lead, contact, "reminder")}
          onAddNew={() => { setEditRecord(null); setShowDialog(true); }}
          addLabel={config.newLeadLabel}
          onBulkWhatsApp={handleBulkWhatsApp}
          onBulkDirectMessage={handleBulkDirectMessage}
          onBulkEmail={handleBulkEmail}
          onBulkFollowUp={(selectedContacts) => {
            if (selectedContacts.length === 1) {
              handleFollowUp(null, selectedContacts[0]);
            }
          }}
        />
      )}

      <LeadDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditRecord(null); }}
        record={editRecord}
        contacts={contacts}
        stages={stages}
        orgType={orgType}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateLead(id, payload);
          else await crm.createLead(payload);
          setShowDialog(false);
          setEditRecord(null);
        }}
      />

      <PipelineFollowUpDialog
        open={followUpOpen}
        onClose={() => { setFollowUpOpen(false); setFollowUpTarget(null); }}
        contact={followUpTarget?.contact}
        orgType={orgType}
        onInternalMessage={() => handleDirectMessage(followUpTarget?.lead, followUpTarget?.contact)}
        onWhatsApp={() => handleWhatsApp(followUpTarget?.lead, followUpTarget?.contact)}
        onEmail={() => handleEmail(followUpTarget?.lead, followUpTarget?.contact)}
        onReminder={() => openTask(followUpTarget?.lead, followUpTarget?.contact, "reminder")}
      />

      <TaskDialog
        key={`${crm?.orgId || ""}:${crm?.dataMode || ""}`}
        open={taskOpen}
        onClose={() => { setTaskOpen(false); setTaskTarget(null); }}
        contacts={contacts}
        tasks={tasks}
        defaultContactId={taskTarget?.contact?.id}
        defaultType={taskType}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) {
            await crm.updateTask(id, payload);
          } else {
            await crm.createTask({ ...payload, lead_id: taskTarget?.lead?.id || "" });
            if (taskTarget?.lead && taskType === "appointment") {
              await moveToDisplayStage(taskTarget.lead, pipeConfig.stages[2]?.name);
            }
            if (taskTarget?.lead && taskType === "reminder") {
              await moveToDisplayStage(taskTarget.lead, pipeConfig.stages[3]?.name);
            }
          }
          setTaskOpen(false);
          setTaskTarget(null);
        }}
      />

      <MessageDialog
        open={internalMessageOpen}
        onClose={() => { setInternalMessageOpen(false); setInternalMessageContext(null); }}
        orgId={crm.orgId}
        members={teamMembers}
        demoMode={crm.dataMode === "demo"}
        initialSubject={internalMessageContext?.subject || ""}
        initialBody={internalMessageContext?.body || ""}
      />

      <WhatsAppComposer
        open={whatsappOpen}
        onClose={() => { setWhatsappOpen(false); setWhatsappContacts([]); }}
        contacts={whatsappContacts}
        orgId={crm.orgId}
        templates={crm.templates}
        onSend={handleWhatsAppSend}
      />

      <BulkEmailDialog
        open={emailOpen}
        onClose={() => { setEmailOpen(false); setEmailContacts([]); }}
        contacts={emailContacts}
        orgId={crm.orgId}
        templates={crm.templates}
      />

      <BulkDirectMessageDialog
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        contacts={messageContacts}
        orgId={crm.orgId}
        templates={crm.templates}
        onPrepared={handleDirectMessagePrepared}
      />
    </div>
  );
}