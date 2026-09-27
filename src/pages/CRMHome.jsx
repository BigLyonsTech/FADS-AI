import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FolderPlus, CheckSquare, AlertCircle, TrendingUp, Calendar, ArrowRight, UserPlus } from "lucide-react";
import { useCrm } from "@/lib/useCrm";
import { formatCurrencyCompact } from "@/lib/currencyFormat";
import { getCrmConfig, getContactTypeLabel, getPipelineConfig, getStageDisplayName } from "@/lib/crmWording";
import CrmQuickActions from "@/components/crm/CrmQuickActions";
import CrmNav from "@/components/crm/CrmNav";
import FadsRelationshipPlayer from "@/components/crm/FadsRelationshipPlayer";
import FadsCounter from "@/components/shared/FadsCounter";
import ContactDialog from "@/components/crm/ContactDialog";
import LeadDialog from "@/components/crm/LeadDialog";
import TaskDialog from "@/components/crm/TaskDialog";
import BulkImportDialog from "@/components/import/BulkImportDialog";
import BeginnerGuide from "@/components/BeginnerGuide";
import CrmEmptyState from "@/components/crm/CrmEmptyState";

export default function CRMHome() {
  const crm = useCrm();
  const { orgType, loading, seeding, stats, contacts, leads, tasks, stages, activeOrg, orgId } = crm;
  const config = getCrmConfig(orgType);
  const pipeConfig = getPipelineConfig(orgType);

  const [showContact, setShowContact] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  const recentContacts = contacts.slice(0, 5);
  const upcomingTasks = tasks.filter((t) => t.status === "open").slice(0, 5);
  // Use the canonical pipeline stages (one per stage, workspace-specific)
  // and count leads by their DISPLAY name so old and new stage names map to
  // the same column. This is the same source of truth as the visual Pipeline
  // board — both read from getPipelineConfig + getStageDisplayName.
  const pipelineByStage = pipeConfig.stages.map((s) => {
    const stageLeads = leads.filter((l) => getStageDisplayName(l.stage, orgType) === s.name);
    return {
      ...s,
      count: stageLeads.length,
      value: stageLeads.reduce((sum, l) => sum + (l.value || 0), 0),
    };
  });

  const fmtCurrency = (v) => formatCurrencyCompact(v, crm.currency);

  return (
    <div className="space-y-6">
      <CrmNav orgType={orgType} />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{config.dashboardTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {pipeConfig.crmExplanation} FADS will tell you who needs attention.
        </p>
      </div>

      <BeginnerGuide module="crm" orgType={orgType} />

      {seeding && <div className="p-3 rounded-md bg-brand-teal/10 text-brand-teal text-sm">Seeding demo data…</div>}

      {/* FADS Relationship Player — hero */}
      <FadsRelationshipPlayer
        contacts={contacts}
        leads={leads}
        tasks={tasks}
        orgType={orgType}
      />

      {/* Mini Y2K counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <FadsCounter label={config.contactsLabel === "People & Contacts" ? "People" : "Contacts"} value={stats.totalContacts} sublabel="People" icon={Users} />
        <FadsCounter label={config.leadsLabel} value={stats.openLeads} sublabel="Active" icon={FolderPlus} />
        <FadsCounter label="Pipeline" value={fmtCurrency(stats.pipelineValue)} sublabel="Value" icon={TrendingUp} />
        <FadsCounter
          label="Tasks"
          value={stats.openTasks}
          sublabel={stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "Open"}
          icon={CheckSquare}
          sublabelAccent={stats.overdueTasks > 0 ? "warn" : "teal"}
        />
      </div>

      <CrmQuickActions
        orgType={orgType}
        onNewContact={() => setShowContact(true)}
        onNewLead={() => setShowLead(true)}
        onNewTask={() => setShowTask(true)}
        onSettings={() => window.location.assign("/crm/settings")}
        onImport={() => setImportOpen(true)}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent contacts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent {config.contactsLabel === "People & Contacts" ? "People" : "Contacts"}</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-brand-teal">
              <Link to="/crm/contacts">View all <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentContacts.length === 0 ? (
              <CrmEmptyState
                message="No one here yet. Add your first person or import your contacts to get started."
                actionLabel="Add someone"
                actionIcon={UserPlus}
                onAction={() => setShowContact(true)}
              />
            ) : recentContacts.map((c) => (
              <Link key={c.id} to={`/crm/contacts/${c.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{c.first_name} {c.last_name || ""}</div>
                  <div className="text-xs text-muted-foreground">{getContactTypeLabel(orgType, c.contact_type)}</div>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Pipeline overview */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{config.pipelineLabel}</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-brand-teal">
              <Link to="/crm/leads">View all <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pipelineByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pipeline stages yet. Set them up in Settings to start tracking potential customers.</p>
            ) : pipelineByStage.map((s) => {
              const isSuccess = s.order === 4;
              return (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className={isSuccess ? "font-semibold" : ""} style={isSuccess ? { color: s.color } : undefined}>
                    {getStageDisplayName(s.name, orgType)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={isSuccess ? "font-semibold" : "text-muted-foreground"} style={isSuccess ? { color: s.color } : undefined}>{s.count}</span>
                  {s.value > 0 && <span className="text-xs text-muted-foreground">{fmtCurrency(s.value)}</span>}
                </div>
              </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming tasks */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Upcoming Tasks</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-brand-teal">
            <Link to="/crm/tasks">View all <ArrowRight className="w-3 h-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">You're all caught up — no open tasks right now.</p>
          ) : upcomingTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{t.title}</div>
                  {t.due_date && <div className="text-xs text-muted-foreground">Due {t.due_date}</div>}
                </div>
              </div>
              <Badge variant="outline" className="text-xs capitalize">{t.type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ContactDialog
        open={showContact}
        onClose={() => setShowContact(false)}
        orgId={crm.orgId}
        orgType={orgType}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateContact(id, payload);
          else await crm.createContact(payload);
          setShowContact(false);
        }}
      />
      <LeadDialog
        open={showLead}
        onClose={() => setShowLead(false)}
        contacts={contacts}
        stages={stages}
        orgType={orgType}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateLead(id, payload);
          else await crm.createLead(payload);
          setShowLead(false);
        }}
      />
      <TaskDialog
        key={`${crm?.orgId || ""}:${crm?.dataMode || ""}`}
        open={showTask}
        onClose={() => setShowTask(false)}
        contacts={contacts}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateTask(id, payload);
          else await crm.createTask(payload);
          setShowTask(false);
        }}
      />

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importType="crm"
        orgId={orgId}
        orgType={orgType}
        orgName={activeOrg?.name}
        dataMode={activeOrg?.data_mode}
        existingRecords={contacts}
      />
    </div>
  );
}