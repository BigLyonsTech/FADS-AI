import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, Phone, MapPin, Building2, Calendar, Edit, Trash2, Plus, Check, MessageCircle, MessageSquare } from "lucide-react";
import { useCrm } from "@/lib/useCrm";
import { getCrmConfig, getContactTypeLabel, TASK_TYPE_OPTIONS } from "@/lib/crmWording";
import BackToCRM from "@/components/crm/BackToCRM";
import ContactDialog from "@/components/crm/ContactDialog";
import ActivityDialog from "@/components/crm/ActivityDialog";
import TaskDialog from "@/components/crm/TaskDialog";
import WhatsAppComposer from "@/components/crm/WhatsAppComposer";
import BulkDirectMessageDialog from "@/components/crm/BulkDirectMessageDialog";
import FollowUpDialog from "@/components/crm/FollowUpDialog";
import ContactFinanceOverview from "@/components/crm/ContactFinanceOverview";
import { Sparkles } from "lucide-react";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmPageIntro from "@/components/crm/CrmPageIntro";

export default function CRMContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const crm = useCrm();
  const { orgType, activeOrg, loading, contacts, activities, tasks } = crm;
  const config = getCrmConfig(activeOrg);

  const [showEdit, setShowEdit] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const contact = contacts.find((c) => c.id === id);
  const contactActivities = activities.filter((a) => a.contact_id === id);
  const contactTasks = tasks.filter((t) => t.contact_id === id);
  const FINANCE_LINKED_TYPES = ["customer", "supplier", "parent", "member", "donor"];
  const showFinanceTab = FINANCE_LINKED_TYPES.includes(contact?.contact_type);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (!contact) {
    return (
      <div className="space-y-4">
        <BackToCRM />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Contact not found.</CardContent></Card>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    await crm.deleteContact(id);
    navigate("/crm/contacts");
  };

  const handleWhatsApp = () => {
    if (!contact.phone) return;
    setComposerOpen(true);
  };

  const handleEmail = () => {
    if (!contact.email) return;
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent("Following up")}`;
  };

  const handleSendWhatsApp = async (c, message) => {
    await crm.createActivity({
      contact_id: c.id,
      contact_name: `${c.first_name} ${c.last_name || ""}`.trim(),
      type: "whatsapp",
      subject: "WhatsApp message",
      content: message,
    });
    await crm.updateContact(c.id, { last_contact_date: new Date().toISOString().slice(0, 10) });
  };

  const toggleTaskDone = async (task) => {
    await crm.updateTask(task.id, {
      status: task.status === "done" ? "open" : "done",
      completed_date: task.status === "done" ? null : new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="space-y-4">
      <BackToCRM to="/crm/contacts" label="Back to Contacts" />

      <CrmPageIntro
        whatIs={`This is ${contact.first_name}'s page — everything about them in one place.`}
        whatYouCanDo="See their details, add notes, set follow-up reminders, send a WhatsApp message, or check their payment history."
      />

      {/* Header */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{contact.first_name} {contact.last_name || ""}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{getContactTypeLabel(activeOrg, contact.contact_type)}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{contact.status}</Badge>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={() => setFollowUpOpen(true)}
                title="Prepare a contextual WhatsApp follow-up"
              >
                <Sparkles className="w-4 h-4 text-brand-teal" /> Follow-up
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={() => { if (contact.phone) window.location.href = `tel:${contact.phone.replace(/\s/g, "")}`; }}
                disabled={!contact.phone}
                title={contact.phone ? "Call" : "This contact doesn't have a mobile number saved yet."}
              >
                <Phone className="w-4 h-4" /> Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={handleWhatsApp}
                disabled={!contact.phone}
                title={contact.phone ? "Open WhatsApp" : "This contact doesn't have a mobile number saved yet."}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={() => setDmOpen(true)}
                title="Direct message"
              >
                <MessageSquare className="w-4 h-4" /> DM
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={handleEmail}
                disabled={!contact.email}
                title={contact.email ? "Email" : "No email address saved"}
              >
                <Mail className="w-4 h-4" /> Email
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => setShowEdit(true)}>
                <Edit className="w-4 h-4" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1 text-destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
            {contact.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {contact.email}</div>}
            {contact.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> Mobile: {contact.phone}</div>}
            {contact.landline && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> Landline: {contact.landline}</div>}
            {contact.organisation_name && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /> {contact.organisation_name}</div>}
            {contact.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> {contact.address}</div>}
            {contact.source && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> Source: {contact.source}</div>}
          </div>

          {contact.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {contact.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
            </div>
          )}

          {!contact.phone && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
              <Phone className="w-4 h-4 shrink-0" />
              This contact doesn't have a mobile number saved yet.
            </div>
          )}

          {contact.notes && <div className="mt-4 p-3 rounded-lg bg-muted text-sm">{contact.notes}</div>}

          <div className="grid sm:grid-cols-2 gap-3 mt-4 text-xs text-muted-foreground">
            {contact.last_contact_date && <div>Last contact: {contact.last_contact_date}</div>}
            {contact.next_follow_up_date && <div>Next follow-up: {contact.next_follow_up_date}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Activities ({contactActivities.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({contactTasks.length})</TabsTrigger>
          {showFinanceTab && <TabsTrigger value="finance">Finance</TabsTrigger>}
          </TabsList>

        <TabsContent value="activities" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-9 gap-1" onClick={() => setShowActivity(true)}>
              <Plus className="w-4 h-4" /> Add Note / Activity
            </Button>
          </div>
          {contactActivities.length === 0 ? (
            <Card><CardContent className="py-2">
              <CrmEmptyState
                message="No notes or activity yet. Add a note to remember what you've discussed with this person."
                actionLabel="Add a note"
                actionIcon={Plus}
                onAction={() => setShowActivity(true)}
              />
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {contactActivities.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{a.type}</Badge>
                        {a.subject && <span className="font-medium text-sm">{a.subject}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{a.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-9 gap-1" onClick={() => setShowTask(true)}>
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </div>
          {contactTasks.length === 0 ? (
            <Card><CardContent className="py-2">
              <CrmEmptyState
                message="No tasks for this person yet. Add a follow-up or task so you don't forget to get back in touch."
                actionLabel="Add a task"
                actionIcon={Plus}
                onAction={() => setShowTask(true)}
              />
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {contactTasks.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={() => toggleTaskDone(t)} className="shrink-0">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${t.status === "done" ? "bg-brand-teal border-brand-teal text-white" : "border-border"}`}>
                          {t.status === "done" && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {TASK_TYPE_OPTIONS.find((o) => o.value === t.type)?.label || t.type}
                          {t.due_date && ` · due ${t.due_date}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{t.priority}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {showFinanceTab && (
          <TabsContent value="finance">
            <ContactFinanceOverview contact={contact} currency={crm.currency} />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <ContactDialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        record={contact}
        orgId={crm.orgId}
        orgType={orgType}
        onSaved={async (payload, isEdit, id) => {
          await crm.updateContact(id, payload);
          setShowEdit(false);
        }}
      />
      <ActivityDialog
        open={showActivity}
        onClose={() => setShowActivity(false)}
        contactId={id}
        contactName={`${contact.first_name} ${contact.last_name || ""}`.trim()}
        onSaved={async (payload) => {
          await crm.createActivity(payload);
          // Update last_contact_date
          await crm.updateContact(id, { last_contact_date: new Date().toISOString().slice(0, 10) });
          setShowActivity(false);
        }}
      />
      <TaskDialog
        key={`${crm?.orgId || ""}:${crm?.dataMode || ""}`}
        open={showTask}
        onClose={() => setShowTask(false)}
        contacts={contacts}
        tasks={tasks}
        defaultContactId={id}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateTask(id, payload);
          else await crm.createTask(payload);
          setShowTask(false);
        }}
      />

      <WhatsAppComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        contacts={contact ? [contact] : []}
        orgId={crm.orgId}
        templates={crm.templates}
        onSend={handleSendWhatsApp}
      />
      <BulkDirectMessageDialog
        open={dmOpen}
        onClose={() => setDmOpen(false)}
        contacts={contact ? [contact] : []}
        orgId={crm.orgId}
        templates={crm.templates}
        onPrepared={async (recipients, message) => {
          await Promise.all(recipients.map((r) =>
            crm.createActivity({
              contact_id: r.id,
              contact_name: `${r.first_name} ${r.last_name || ""}`.trim(),
              type: "note",
              subject: "Prepared message",
              content: message,
            })
          ));
          await Promise.all(recipients.map((r) =>
            crm.updateContact(r.id, { last_contact_date: new Date().toISOString().slice(0, 10) })
          ));
        }}
      />
      <FollowUpDialog
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        contact={contact}
        orgId={crm.orgId}
        onSent={async (c, message, updates) => {
          await crm.createActivity({
            contact_id: c.id,
            contact_name: `${c.first_name} ${c.last_name || ""}`.trim(),
            type: "whatsapp",
            subject: "WhatsApp follow-up",
            content: message,
          });
          await crm.updateContact(c.id, {
            last_contact_date: updates.last_contact_date,
            next_follow_up_date: updates.next_follow_up_date,
          });
        }}
      />
    </div>
  );
}