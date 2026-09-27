import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useGiving } from "@/lib/useGiving";
import { useReports } from "@/lib/useReports";
import { downloadReportCsv, generateReportPDF } from "@/lib/reportExport";
import { formatCurrency } from "@/lib/currencyFormat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Heart, Plus, Gift, FileDown, Printer, MessageCircle, AlertCircle,
  Loader2, HandHeart, CalendarClock, Users,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import PledgeDialog from "@/components/church/PledgeDialog";
import RecordGivingDialog from "@/components/church/RecordGivingDialog";
import WhatsAppComposer from "@/components/crm/WhatsAppComposer";
import { resolveTerminology } from "@/lib/faithTerminology";

export default function ChurchGiving() {
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const { dataMode } = useDataMode();
  const giving = useGiving();
  const { data: reportData, reload: reloadReports } = useReports({});
  const [showPledge, setShowPledge] = useState(false);
  const [editPledge, setEditPledge] = useState(null);
  const [showGive, setShowGive] = useState(false);
  const [composerContacts, setComposerContacts] = useState(null);
  const [historyContact, setHistoryContact] = useState("");

  if (wsLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (activeOrg?.type !== "church") {
    return <div className="py-20 text-center text-muted-foreground">Giving &amp; Pledges is only available in Church workspaces.</div>;
  }

  const cur = activeOrg.currency;
  const canManage = giving.canManage;
  const givingTerm = resolveTerminology(activeOrg).giving;

  const exportCsv = async () => downloadReportCsv(activeOrg.id, dataMode, "giving_summary", {}, activeOrg.name);
  const exportPdf = () => {
    const s = reportData?.reports?.givingSummary;
    if (!s) return;
    generateReportPDF({ org: reportData.org, reportType: "giving_summary", reportTitle: "Church Giving & Pledges Report", reportData: s, filters: {} });
  };

  const openPledgeEditor = (p) => { setEditPledge(p); setShowPledge(true); };
  const openPledgeNew = () => { setEditPledge(null); setShowPledge(true); };

  const savePledge = async (data) => {
    if (editPledge) await giving.updatePledge(editPledge.id, data);
    else await giving.createPledge(data);
    reloadReports();
  };

  const recordGiving = async (data) => {
    await giving.recordGiving(data);
    reloadReports();
  };

  const removePledge = async (p) => {
    if (!confirm(`Delete the ${p.fund} pledge${p.contact_name ? ` for ${p.contact_name}` : ""}?`)) return;
    await giving.deletePledge(p.id);
    reloadReports();
  };

  // WhatsApp pledge reminder — reuses the shared CRM WhatsApp composer.
  // Human reviews/edits and sends via wa.me. No messaging API.
  const remindPledge = (p) => {
    const contact = giving.crmContacts.find((c) => c.id === p.contact_id);
    if (!contact || !contact.phone) return;
    setComposerContacts([{ ...contact, _purpose: `Pledge reminder for ${p.fund} — outstanding ${formatCurrency(p.outstanding, cur)}` }]);
  };

  const onSendWhatsApp = async (c, message) => {
    try {
      await base44.entities.CRMActivity.create({
        organisation_id: activeOrg.id,
        data_mode: activeOrg.data_mode || "live",
        contact_id: c.id,
        contact_name: `${c.first_name} ${c.last_name || ""}`.trim(),
        type: "whatsapp",
        subject: "Pledge reminder",
        content: message,
        created_by_name: "—",
      });
    } catch { /* non-fatal */ }
  };

  // Member/donor giving history
  const historyTxns = historyContact ? giving.memberGiving(historyContact) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{givingTerm} &amp; Pledges</h1>
          <p className="text-sm text-muted-foreground">{activeOrg.name} · {cur} · {dataMode === "demo" ? "Demo" : "Live"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10" onClick={exportCsv}><FileDown className="w-4 h-4" /> CSV</Button>
          <Button variant="outline" className="h-10" onClick={exportPdf} disabled={!reportData?.reports?.givingSummary}><Printer className="w-4 h-4" /> PDF</Button>
          {canManage && <Button className="h-10" onClick={() => setShowGive(true)}><HandHeart className="w-4 h-4" /> Record giving</Button>}
          <Button variant="outline" className="h-10" onClick={openPledgeNew}><Plus className="w-4 h-4" /> Pledge</Button>
        </div>
      </div>

      {giving.loading && !giving.pledges.length && !giving.transactions.length && (
        <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" /></div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={Heart} label={`Total ${givingTerm.toLowerCase()}`} value={formatCurrency(giving.totalGiving, cur)} highlight />
        <SummaryCard icon={Gift} label="Tithes" value={formatCurrency(giving.byType.Tithes || 0, cur)} />
        <SummaryCard icon={Gift} label="Offerings" value={formatCurrency(giving.byType.Offerings || 0, cur)} />
        <SummaryCard icon={Gift} label="Donations" value={formatCurrency(giving.byType.Donations || 0, cur)} />
        <SummaryCard icon={CalendarClock} label="Outstanding pledges" value={formatCurrency(giving.totalOutstanding, cur)} warn={giving.totalOutstanding > 0} />
      </div>

      {/* Giving by fund */}
      <Card><CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3"><Heart className="w-5 h-5 text-brand-teal" /><h2 className="font-semibold text-brand-navy">{givingTerm} by fund</h2></div>
        {Object.keys(giving.byFund).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No giving recorded yet. {canManage && "Use “Record giving” to add your first entry."}</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(giving.byFund).sort((a, b) => b[1] - a[1]).map(([fund, amount]) => (
              <div key={fund} className="flex items-center justify-between bg-muted/40 rounded-lg p-3">
                <span className="text-sm font-medium text-brand-navy">{fund}</span>
                <span className="font-semibold text-brand-navy">{formatCurrency(amount, cur)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Recent giving */}
      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-navy">Recent giving</h2>
          <Link to="/finance/transactions" className="text-sm text-brand-teal hover:underline">View all</Link>
        </div>
        {giving.givingTxns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No giving transactions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {giving.givingTxns.slice(0, 6).map((t) => (
              <Link key={t.id} to={`/finance/transactions/${t.id}`} className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-navy truncate">{t.description || "Giving"}</p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </div>
                <span className="font-semibold text-status-ok">{formatCurrency(t.amount, t.currency)}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Outstanding pledges */}
      <Card><CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3"><CalendarClock className="w-5 h-5 text-brand-teal" /><h2 className="font-semibold text-brand-navy">Outstanding pledges</h2></div>
        {giving.outstandingPledges.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No outstanding pledges.</p>
        ) : (
          <div className="space-y-2">
            {giving.outstandingPledges.map((p) => (
              <div key={p.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-navy">{p.fund} {p.contact_name && <span className="text-muted-foreground">· {p.contact_name}</span>}</p>
                    <p className="text-xs text-muted-foreground">
                      Pledged {formatCurrency(p.pledged_amount, cur)} · Contributed {formatCurrency(p.contributed_amount || 0, cur)} · Outstanding {formatCurrency(p.outstanding, cur)}
                      {p.target_date && ` · due ${p.target_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.contact_id && giving.crmContacts.find((c) => c.id === p.contact_id)?.phone && (
                      <Button size="sm" variant="outline" className="h-9" onClick={() => remindPledge(p)} title="WhatsApp reminder">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {canManage && <Button size="sm" variant="ghost" className="h-9" onClick={() => openPledgeEditor(p)}>Edit</Button>}
                    {canManage && <Button size="sm" variant="ghost" className="h-9 text-destructive" onClick={() => removePledge(p)}>Delete</Button>}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-brand-teal h-2 rounded-full" style={{ width: `${Math.min(100, p.pledged_amount ? (p.contributed_amount / p.pledged_amount) * 100 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Pledges needing follow-up */}
      {giving.pledgesNeedingFollowUp.length > 0 && (
        <div className="bg-status-warn/10 rounded-2xl border border-status-warn/30 p-4">
          <div className="flex items-center gap-2 text-status-warn font-medium mb-2"><AlertCircle className="w-4 h-4" /> Pledges needing follow-up ({giving.pledgesNeedingFollowUp.length})</div>
          <div className="space-y-2">
            {giving.pledgesNeedingFollowUp.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                <div>
                  <p className="text-sm font-medium text-brand-navy">{p.fund} {p.contact_name && `· ${p.contact_name}`}</p>
                  <p className="text-xs text-muted-foreground">Outstanding {formatCurrency(p.outstanding, cur)} · due {p.target_date}</p>
                </div>
                {p.contact_id && giving.crmContacts.find((c) => c.id === p.contact_id)?.phone && (
                  <Button size="sm" variant="outline" className="h-9" onClick={() => remindPledge(p)}><MessageCircle className="w-4 h-4" /> Remind</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member / donor giving history */}
      <Card><CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3"><Users className="w-5 h-5 text-brand-teal" /><h2 className="font-semibold text-brand-navy">Member / Donor giving history</h2></div>
        <div className="max-w-md mb-3">
          <ResponsiveSelect value={historyContact} onValueChange={setHistoryContact} triggerClassName="h-11"
            placeholder="Select a member or donor…"
            options={[{ value: "", label: "— Select —" }, ...giving.crmContacts.map((c) => ({
              value: c.id,
              label: `${c.first_name} ${c.last_name || ""}`.trim() + ` · ${c.contact_type}`,
            }))]} />
        </div>
        {!historyContact ? (
          <p className="text-sm text-muted-foreground">Choose a contact to see their giving history (linked by email where available).</p>
        ) : historyTxns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No giving recorded for this contact. Giving links to a contact by email — add an email to the contact and the matching Finance contact to see history.</p>
        ) : (
          <div className="divide-y divide-border">
            {historyTxns.map((t) => (
              <Link key={t.id} to={`/finance/transactions/${t.id}`} className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-muted/40">
                <div><p className="text-sm font-medium text-brand-navy">{t.description || "Giving"}</p><p className="text-xs text-muted-foreground">{t.date}</p></div>
                <span className="font-semibold text-status-ok">{formatCurrency(t.amount, t.currency)}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent></Card>

      <div className="bg-muted/40 rounded-xl border border-border p-3 text-xs text-muted-foreground">
        Giving is recorded as real income in Finance (the source of truth) — no second ledger. Pledges track commitments only. WhatsApp reminders open a chat for human review and sending.
      </div>

      <PledgeDialog open={showPledge} onClose={() => setShowPledge(false)} onSaved={savePledge} pledge={editPledge} crmContacts={giving.crmContacts} />
      <RecordGivingDialog open={showGive} onClose={() => setShowGive(false)} onSaved={recordGiving} giving={giving} />
      {composerContacts && (
        <WhatsAppComposer open onClose={() => setComposerContacts(null)} contacts={composerContacts} orgId={activeOrg.id} onSend={onSendWhatsApp} />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, highlight, warn }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "bg-brand-navy text-white border-brand-navy" : warn ? "bg-status-warn/10 border-status-warn/30" : "bg-card border-border"}`}>
      <Icon className={`w-4 h-4 mb-1 ${highlight ? "text-brand-teal" : "text-brand-teal"}`} />
      <div className={`text-lg sm:text-xl font-bold break-words ${highlight ? "text-white" : "text-brand-navy"}`}>{value}</div>
      <div className={`text-xs ${highlight ? "text-white/70" : "text-muted-foreground"}`}>{label}</div>
    </div>
  );
}