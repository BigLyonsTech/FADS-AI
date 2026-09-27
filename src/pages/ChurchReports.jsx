import React from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useReports } from "@/lib/useReports";
import { downloadReportCsv, generateReportPDF } from "@/lib/reportExport";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileDown, Printer, Users, Heart, ArrowRightCircle, AlertCircle, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/currencyFormat";
import { faithTypeLabel } from "@/lib/faithTerminology";

export default function ChurchReports() {
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const { dataMode } = useDataMode();
  const { data, loading, error, reload } = useReports({});

  if (wsLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (activeOrg?.type !== "church") {
    return <div className="py-20 text-center text-muted-foreground">Reports are only available in faith/community workspaces.</div>;
  }

  const ftLabel = faithTypeLabel(activeOrg);
  const r = data?.reports?.churchSummary;

  const exportCsv = async () => downloadReportCsv(activeOrg.id, dataMode, "church_summary", {}, activeOrg.name);
  const exportPdf = () => generateReportPDF({ org: data.org, reportType: "church_summary", reportTitle: `${ftLabel} Management Report`, reportData: r, filters: {} });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{ftLabel} Management Report</h1>
          <p className="text-sm text-muted-foreground">{activeOrg.name} · {activeOrg.currency} · {dataMode === "demo" ? "Demo" : "Live"}</p>
        </div>
        {r && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-10" onClick={exportCsv}><FileDown className="w-4 h-4" /> CSV</Button>
            <Button variant="outline" className="h-10" onClick={exportPdf}><Printer className="w-4 h-4" /> PDF</Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 rounded-xl p-4 text-center">
          <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={reload}>Retry</Button>
        </div>
      )}

      {loading && !error && <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>}

      {r && !loading && !error && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat icon={Users} label="Members" value={r.membership.totalMembers} />
            <Stat icon={Users} label="Active members" value={r.membership.activeMembers} />
            <Stat icon={Users} label="New members" value={r.membership.newMembers} />
            <Stat icon={Users} label="Visitors" value={r.membership.totalVisitors} />
            <Stat icon={Users} label="New visitors" value={r.membership.newVisitors} />
          </div>

          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3"><Heart className="w-5 h-5 text-brand-teal" /><h2 className="font-semibold text-brand-navy">Tithes, Offerings & Donations</h2></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MoneyStat label="Tithes" value={r.giving.totalTithes} cur={activeOrg.currency} />
              <MoneyStat label="Offerings" value={r.giving.totalOfferings} cur={activeOrg.currency} />
              <MoneyStat label="Donations" value={r.giving.totalDonations} cur={activeOrg.currency} />
              <MoneyStat label="Total giving" value={r.giving.totalGiving} cur={activeOrg.currency} highlight />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MoneyStat label="Total income" value={r.totalIncome} cur={activeOrg.currency} />
              <MoneyStat label="Total expenses" value={r.totalExpense} cur={activeOrg.currency} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <Link to="/church/giving" className="flex items-center justify-between bg-brand-mint/60 rounded-xl border border-brand-mint p-3 hover:bg-brand-mint mb-4">
        <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-brand-teal" /><div><p className="font-semibold text-brand-navy">Giving &amp; Pledges</p><p className="text-xs text-muted-foreground">Record tithes, offerings, donations and track pledges</p></div></div>
        <ChevronRight className="w-5 h-5 text-brand-teal" />
      </Link>
      <div className="flex items-center gap-2 mb-3"><ArrowRightCircle className="w-5 h-5 text-brand-teal" /><h2 className="font-semibold text-brand-navy">Follow-ups</h2></div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Need follow-up" value={r.followUps.contactsNeedingFollowUp} />
              <Stat label="Open tasks" value={r.followUps.openTasks} />
              <Stat label="Overdue tasks" value={r.followUps.overdueTasks} />
            </div>
            {r.followUps.contacts.length > 0 && (
              <div className="space-y-2">
                {r.followUps.contacts.map((c) => (
                  <Link key={c.id} to={`/crm/contacts/${c.id}`} className="flex items-center justify-between bg-muted/40 rounded-lg p-3 hover:bg-muted">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">Follow-up: {c.next_follow_up_date}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent></Card>

          <div className="bg-muted/40 rounded-xl border border-border p-3 text-xs text-muted-foreground">
            Church reports reuse the shared Reports engine. Pledges are tracked in Giving &amp; Pledges.
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {Icon && <Icon className="w-4 h-4 text-brand-teal mb-1" />}
      <div className="text-2xl font-bold text-brand-navy">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MoneyStat({ label, value, cur, highlight }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-brand-mint border border-brand-mint" : "bg-muted/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${highlight ? "text-brand-navy" : "text-foreground"}`}>{formatCurrency(value || 0, cur)}</div>
    </div>
  );
}