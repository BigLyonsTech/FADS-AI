import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Zap, History, Sparkles, Megaphone } from "lucide-react";
import { useCrm } from "@/lib/useCrm";
import { usePipelineAutomations } from "@/lib/usePipelineAutomations";
import { getCrmConfig } from "@/lib/crmWording";
import CrmNav from "@/components/crm/CrmNav";
import BackToCRM from "@/components/crm/BackToCRM";
import AutomationBuilder, { AutomationRuleCard } from "@/components/crm/AutomationBuilder";
import AutomationHistory from "@/components/crm/AutomationHistory";
import FadsAutomationSuggestions from "@/components/crm/FadsAutomationSuggestions";
import WhatsAppComposer from "@/components/crm/WhatsAppComposer";
import BulkDirectMessageDialog from "@/components/crm/BulkDirectMessageDialog";
import BulkEmailDialog from "@/components/crm/BulkEmailDialog";
import BroadcastReviewDialog from "@/components/crm/BroadcastReviewDialog";
import AnnouncementDialog from "@/components/crm/AnnouncementDialog";

// Pipeline Automations page — one shared engine, workspace-adaptive language.
// Owners create simple "When this happens → FADS should…" rules.
// All communication is review-first and approval-based.
export default function CRMAutomations() {
  const crm = useCrm();
  const auto = usePipelineAutomations();
  const { orgType, loading: crmLoading } = crm;
  const config = getCrmConfig(orgType);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageContacts, setMessageContacts] = useState([]);

  // Broadcast (audience) flow
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAutomation, setReviewAutomation] = useState(null);
  const [broadcastQueue, setBroadcastQueue] = useState([]);
  const [broadcastContacts, setBroadcastContacts] = useState([]);
  const [broadcastConfig, setBroadcastConfig] = useState(null);

  // Announcement flow
  const [announcementOpen, setAnnouncementOpen] = useState(false);

  if (crmLoading || auto.loading) {
    return (
      <div className="space-y-4">
        <CrmNav orgType={orgType} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const handleSaveAutomation = async (data) => {
    await auto.createAutomation(data);
    setBuilderOpen(false);
  };

  const handleToggle = async (a) => {
    await auto.updateAutomation(a.id, {
      status: a.status === "active" ? "paused" : "active",
    });
  };

  const handleDelete = async (a) => {
    if (!confirm(`Delete rule "${a.name}"?`)) return;
    await auto.deleteAutomation(a.id);
  };

  // FADS suggestion "Prepare" → open WhatsApp composer with the suggested contacts
  const handlePrepareSuggestion = (s) => {
    const contacts = s.contacts || [];
    if (!contacts.length) return;
    if (s.action_type === "prepare_whatsapp") {
      setWhatsappContacts(contacts);
      setWhatsappOpen(true);
    } else {
      setMessageContacts(contacts);
      setMessageOpen(true);
    }
  };

  const handleWhatsAppSend = (contact, message) => {
    crm.createActivity({
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
      type: "whatsapp",
      subject: "WhatsApp message (from FADS suggestion)",
      content: message,
    });
    crm.updateContact(contact.id, { last_contact_date: new Date().toISOString().slice(0, 10) });
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

  // Broadcast (audience) handlers
  const handleSendNow = (auto) => {
    setReviewAutomation(auto);
    setReviewOpen(true);
  };

  const handleBroadcastApprove = (selectedContacts, chs, config) => {
    setReviewOpen(false);
    setBroadcastContacts(selectedContacts);
    setBroadcastConfig(config);
    setBroadcastQueue(chs);
  };

  const handleChannelClose = () => {
    setBroadcastQueue((q) => q.slice(1));
  };

  // Announcement handler — same composer queue as broadcast, but with
  // per-channel messages (FADS adapts the message for each channel).
  const handleAnnouncementApprove = (selectedContacts, chs, messages) => {
    setAnnouncementOpen(false);
    setBroadcastContacts(selectedContacts);
    setBroadcastConfig({ messages });
    setBroadcastQueue(chs);
  };

  const currentChannel = broadcastQueue[0];

  return (
    <div className="space-y-4">
      <CrmNav orgType={orgType} />
      <BackToCRM />

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-teal" /> Follow-up Rules
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose what should happen, what FADS should prepare, and when. You approve every external message before it is sent.
          </p>
        </div>
        <Button size="sm" className="h-9 gap-1" onClick={() => setBuilderOpen(true)}>
          <Plus className="w-4 h-4" /> New rule
        </Button>
      </div>

      {/* Send an Announcement — prominent beginner-friendly quick start */}
      <button
        onClick={() => setAnnouncementOpen(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-brand-teal/30 bg-brand-teal/5 hover:bg-brand-teal/10 hover:border-brand-teal/50 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-full bg-brand-teal/15 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5 text-brand-teal" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-brand-navy">Send an Announcement</div>
          <div className="text-xs text-muted-foreground">
            Just need to tell a group of people something? FADS writes it, you pick who and how, then approve.
          </div>
        </div>
      </button>

      {/* FADS Recommendations */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-brand-teal" /> FADS Recommendations
        </h2>
        <FadsAutomationSuggestions crm={crm} onPrepare={handlePrepareSuggestion} />
      </div>

      {/* Active rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your follow-up rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {auto.automations.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No follow-up rules yet. Click "New rule" or pick a suggestion to get started.
            </div>
          ) : (
            auto.automations.map((a) => (
              <AutomationRuleCard
                key={a.id}
                auto={a}
                orgType={orgType}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onSendNow={handleSendNow}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Automation History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">
            <History className="w-4 h-4 text-brand-teal" /> Recent Rule Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AutomationHistory runs={auto.runs} />
        </CardContent>
      </Card>

      <AutomationBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        orgType={orgType}
        stages={crm.stages}
        onSave={handleSaveAutomation}
        automations={auto.automations}
        contacts={crm.contacts}
        orgs={crm.orgs}
        leads={crm.leads}
        templates={auto.templates}
        orgId={crm.orgId}
      />

      <WhatsAppComposer
        open={whatsappOpen}
        onClose={() => { setWhatsappOpen(false); setWhatsappContacts([]); }}
        contacts={whatsappContacts}
        orgId={crm.orgId}
        templates={auto.templates}
        onSend={handleWhatsAppSend}
      />

      <BulkDirectMessageDialog
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        contacts={messageContacts}
        onPrepared={handleDirectMessagePrepared}
      />

      {/* Announcement wizard */}
      <AnnouncementDialog
        open={announcementOpen}
        onClose={() => setAnnouncementOpen(false)}
        orgType={orgType}
        contacts={crm.contacts}
        orgs={crm.orgs}
        leads={crm.leads}
        orgId={crm.orgId}
        onApprove={handleAnnouncementApprove}
      />

      {/* Broadcast (audience) flow */}
      <BroadcastReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        automation={reviewAutomation}
        contacts={crm.contacts}
        leads={crm.leads}
        orgs={crm.orgs}
        stages={crm.stages}
        templates={auto.templates}
        orgType={orgType}
        onApprove={handleBroadcastApprove}
      />

      {/* Broadcast composers — opened sequentially from the queue */}
      {currentChannel === "whatsapp" && (
        <WhatsAppComposer
          open={true}
          onClose={handleChannelClose}
          contacts={broadcastContacts}
          orgId={crm.orgId}
          templates={auto.templates}
          onSend={handleWhatsAppSend}
          initialDraft={broadcastConfig?.messages?.whatsapp || broadcastConfig?.message || ""}
        />
      )}
      {currentChannel === "email" && (
        <BulkEmailDialog
          open={true}
          onClose={handleChannelClose}
          contacts={broadcastContacts}
          orgId={crm.orgId}
          templates={auto.templates}
          initialSubject={broadcastConfig?.messages?.email_subject || (broadcastConfig?.message ? "Message from FADS" : "")}
          initialBody={broadcastConfig?.messages?.email_body || broadcastConfig?.message || ""}
        />
      )}
      {currentChannel === "message" && (
        <BulkDirectMessageDialog
          open={true}
          onClose={handleChannelClose}
          contacts={broadcastContacts}
          orgId={crm.orgId}
          templates={auto.templates}
          onPrepared={handleDirectMessagePrepared}
          initialBody={broadcastConfig?.messages?.message || broadcastConfig?.message || ""}
        />
      )}
    </div>
  );
}