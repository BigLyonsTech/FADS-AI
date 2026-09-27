import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording, canAccessHr } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Users, UserPlus, UserCheck, Clock, LogOut, AlertCircle,
  Building2, Briefcase, MapPin, Loader2, ChevronRight, Activity,
  FileText, Settings as SettingsIcon, CalendarDays, CalendarCheck, ShieldCheck, AlertTriangle, Bot, Banknote,
} from "lucide-react";
import { useHrDocuments } from "@/lib/useHrDocuments";
import { useHrCompliance } from "@/lib/useHrCompliance";
import ExpiryBadge from "@/components/hr/ExpiryBadge";
import HrQuickActions from "@/components/hr/HrQuickActions";
import HrDocumentDialog from "@/components/hr/HrDocumentDialog";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import BeginnerGuide from "@/components/BeginnerGuide";

export default function HRHome() {
  const { activeOrg, activeRole } = useWorkspace();
  const {
    dashboard, employees, loading, error, seedDemo, loadDashboard,
  } = useHr();
  const { getExpiringDocuments } = useHrDocuments();
  const { getAlerts: getComplianceAlerts } = useHrCompliance();
  const [seeding, setSeeding] = useState(false);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [complianceAlerts, setComplianceAlerts] = useState([]);
  const [hrDocOpen, setHrDocOpen] = useState(false);

  const refreshAll = async () => {
    await loadDashboard();
    if (activeOrg?.id) {
      getExpiringDocuments(30).then((data) => setExpiringDocs(data.documents || [])).catch(() => {});
      getComplianceAlerts().then((data) => setComplianceAlerts(data.alerts || [])).catch(() => {});
    }
  };
  const { pullDistance, refreshing, threshold } = usePullToRefresh(refreshAll);

  const orgType = activeOrg?.type;
  const w = hrWording(orgType);
  const canAccess = canAccessHr(activeRole);

  useEffect(() => {
    if (activeOrg?.id) {
      getExpiringDocuments(30)
        .then((data) => setExpiringDocs(data.documents || []))
        .catch(() => {});
      getComplianceAlerts()
        .then((data) => setComplianceAlerts(data.alerts || []))
        .catch(() => {});
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (activeOrg?.data_mode === "demo" && dashboard?.stats?.total === 0 && !seeding) {
      const doSeed = async () => {
        setSeeding(true);
        try {
          await seedDemo();
          await loadDashboard();
        } catch (e) {
          // ignore — may already be seeded
        } finally {
          setSeeding(false);
        }
      };
      doSeed();
    }
  }, [activeOrg?.data_mode, dashboard?.stats?.total]);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold mb-1">HR Access Required</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You do not have permission to access HR records. Only Organisation Owners and authorised HR roles can view employee data.
        </p>
      </div>
    );
  }

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" className="mt-3" onClick={loadDashboard}>Retry</Button>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const statCards = [
    { label: "Total", value: stats.total || 0, icon: Users, color: "text-brand-navy" },
    { label: "Active", value: stats.active || 0, icon: UserCheck, color: "text-status-ok" },
    { label: "Onboarding", value: stats.onboarding || 0, icon: Clock, color: "text-blue-600" },
    { label: "On Leave", value: stats.on_leave || 0, icon: Clock, color: "text-status-warn" },
    { label: "Offboarding", value: stats.offboarding || 0, icon: LogOut, color: "text-orange-600" },
    { label: "Needs Attention", value: stats.needs_attention || 0, icon: AlertCircle, color: "text-status-bad" },
  ];

  return (
    <div className="space-y-6">
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
      <BeginnerGuide module="hr" orgType={orgType} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">{w.hrHome}</h1>
          <p className="text-sm text-muted-foreground">{activeOrg?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/hr/employees">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="w-4 h-4" /> {w.employeeDirectory}
            </Button>
          </Link>
          <Link to="/hr/employees/new">
            <Button size="sm" className="gap-1.5">
              <UserPlus className="w-4 h-4" /> {w.addEmployee}
            </Button>
          </Link>
        </div>
      </div>

      {seeding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-brand-mint/30 p-3 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          Setting up demo staff records...
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-heading font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Org structure summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-brand-teal" />
            <span className="text-sm font-medium">{w.departmentPlural}</span>
          </div>
          <p className="text-xl font-heading font-bold">{dashboard?.departments || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-brand-teal" />
            <span className="text-sm font-medium">{w.rolePlural}</span>
          </div>
          <p className="text-xl font-heading font-bold">{dashboard?.job_roles || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-brand-teal" />
            <span className="text-sm font-medium">Work Locations</span>
          </div>
          <p className="text-xl font-heading font-bold">{dashboard?.work_locations || 0}</p>
        </Card>
      </div>

      {/* Expiring documents */}
      {expiringDocs.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-status-warn" />
            <h2 className="font-medium text-sm">Documents Expiring Soon</h2>
          </div>
          <div className="space-y-2">
            {expiringDocs.slice(0, 5).map((d) => (
              <Link key={d.id} to={`/hr/employees/${d.employee_id}/documents`}>
                <div className="flex items-center justify-between text-sm border-b last:border-0 border-border pb-2 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded cursor-pointer">
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.employee_name} · {d.document_type_name || "—"}</p>
                  </div>
                  <ExpiryBadge expiryDate={d.expiry_date} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Compliance alerts */}
      {complianceAlerts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-status-warn" />
            <h2 className="font-medium text-sm">Compliance Alerts ({complianceAlerts.length})</h2>
          </div>
          <div className="space-y-2">
            {complianceAlerts.slice(0, 5).map((a) => (
              <Link key={a.id} to="/hr/compliance">
                <div className="flex items-center justify-between text-sm border-b last:border-0 border-border pb-2 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded cursor-pointer">
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.effective_status === "overdue" ? "Overdue" : "Due soon"} · Deadline: {a.deadline_date}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${a.effective_status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {a.effective_status === "overdue" ? "Overdue" : "Due soon"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-brand-teal" />
          <h2 className="font-medium text-sm">Recent HR Activity</h2>
        </div>
        {dashboard?.recent_activity?.length > 0 ? (
          <div className="space-y-2">
            {dashboard.recent_activity.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 border-border pb-2 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-xs">{a.action?.replace("hr.", "").replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.actor_email}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {a.date ? new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
        )}
      </Card>

      {/* Context-aware Quick Actions */}
      <div>
        <h2 className="font-semibold text-brand-navy mb-3">Quick Actions</h2>
        <HrQuickActions orgType={orgType} />
        <Button
          variant="outline"
          className="h-11 mt-3 gap-2"
          onClick={() => setHrDocOpen(true)}
        >
          <FileText className="w-4 h-4 text-brand-teal" /> Draft HR Document with AI
        </Button>
      </div>

      {/* HR Officer + Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link to="/hr/officer">
          <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-center justify-between bg-brand-teal/5 border-brand-teal/20">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-brand-teal" />
              <div>
                <p className="font-medium text-sm">HR Officer</p>
                <p className="text-xs text-muted-foreground">Ask about your HR information</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-brand-teal" />
          </Card>
        </Link>
        <Link to="/hr/settings">
          <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-brand-navy" />
              <div>
                <p className="font-medium text-sm">HR Settings</p>
                <p className="text-xs text-muted-foreground">Document types, onboarding & offboarding templates</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Card>
        </Link>
        <Link to="/payroll">
          <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-center justify-between bg-brand-teal/5 border-brand-teal/20">
            <div className="flex items-center gap-3">
              <Banknote className="w-5 h-5 text-brand-teal" />
              <div>
                <p className="font-medium text-sm">Payroll</p>
                <p className="text-xs text-muted-foreground">Pay config, runs, payslips & posting</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-brand-teal" />
          </Card>
        </Link>
      </div>
      <HrDocumentDialog
        open={hrDocOpen}
        onClose={() => setHrDocOpen(false)}
        orgId={activeOrg?.id}
        employees={employees || []}
      />
    </div>
  );
}