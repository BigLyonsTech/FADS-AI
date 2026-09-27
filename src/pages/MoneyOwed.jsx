import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInvoices } from "@/lib/useInvoices";
import { useFinance } from "@/lib/useFinance";
import { useDataMode } from "@/lib/useDataMode";
import { base44 } from "@/api/base44Client";
import {
  collectionsWording, computeCollectionsSummary, computePledgeSummary,
  invoiceToReceivable,
} from "@/lib/collectionsWording";
import { formatMoney, canManageInvoices } from "@/lib/financeWording";
import BackToFinance from "@/components/finance/BackToFinance";
import CollectionsSummary from "@/components/finance/CollectionsSummary";
import CollectionAccountCard from "@/components/finance/CollectionAccountCard";
import CollectionsReviewDialog from "@/components/finance/CollectionsReviewDialog";
import RecordPaymentDialog from "@/components/finance/RecordPaymentDialog";
import DraftWhatsAppReminderDialog from "@/components/finance/DraftWhatsAppReminderDialog";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet, Sparkles, Send, CheckSquare,
} from "lucide-react";

// Money Owed / Collections page. ONE underlying engine that reads from the
// EXISTING Invoice entity (business/school/university) and GivingPledge
// entity (church — pledges only, never ordinary giving). Workspace-adaptive
// labels. Multi-select with bulk personalised reminders. Reuses existing
// RecordPaymentDialog, DraftWhatsAppReminderDialog, and communications.
export default function MoneyOwed() {
  const { activeOrg, activeRole } = useWorkspace();
  const inv = useInvoices();
  const fin = useFinance();
  const { dataMode } = useDataMode();
  const w = collectionsWording(activeOrg);
  const canManage = canManageInvoices(activeRole);
  const orgType = activeOrg?.type || "small_business";
  const isChurch = orgType === "church";

  const [selected, setSelected] = useState({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [payDialog, setPayDialog] = useState(null);
  const [reminderDialog, setReminderDialog] = useState(null);
  const [pledges, setPledges] = useState([]);

  // Load pledges for church workspaces
  useEffect(() => {
    if (!isChurch || !activeOrg?.id) return;
    (async () => {
      try {
        const p = await base44.entities.GivingPledge.filter(
          { organisation_id: activeOrg.id, data_mode: dataMode, status: "open" },
          "-created_date", 200
        );
        setPledges(p);
      } catch {
        setPledges([]);
      }
    })();
  }, [isChurch, activeOrg?.id, dataMode]);

  const loading = inv.loading || (isChurch && false);

  // Compute summary from invoices (non-church) or pledges (church)
  const summary = useMemo(() => {
    if (isChurch) {
      return computePledgeSummary(pledges);
    }
    return computeCollectionsSummary(inv.invoices, inv.payments);
  }, [isChurch, pledges, inv.invoices, inv.payments]);

  // Outstanding accounts to display
  const accounts = summary.outstanding;

  // Selection helpers
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedAccounts = accounts.filter((a) => selected[a.id]);
  const selectedTotal = selectedAccounts.reduce((s, a) => {
    const bal = a.invoice_number
      ? Number(a.balance)
      : (Number(a.pledged_amount) - Number(a.contributed_amount));
    return s + (bal || 0);
  }, 0);

  const toggleSelect = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const all = {};
    accounts.forEach((a) => { all[a.id] = true; });
    setSelected(all);
  };

  const selectNone = () => setSelected({});

  const selectOverdue = () => {
    const overdue = {};
    summary.overdue.forEach((a) => { overdue[a.id] = true; });
    setSelected(overdue);
  };

  // Single-account reminder
  const openSingleReminder = (account) => {
    const receivable = account.invoice_number
      ? invoiceToReceivable(account)
      : {
          recipientName: account.contact_name || "there",
          outstandingAmount: (Number(account.pledged_amount) - Number(account.contributed_amount)),
          currency: activeOrg?.currency,
          dueDate: account.target_date || "",
          reference: account.fund || "",
          description: account.fund || "",
        };
    const contact = fin.contacts.find((c) => c.id === account.customer_id);
    const phone = contact?.phone || account.customer_phone || "";
    setReminderDialog({ receivable, phone });
  };

  // Single-account payment
  const openRecordPayment = (account) => {
    setPayDialog(account);
  };

  // After reminders sent, reload and clear selection
  const handleRemindersSent = async () => {
    await inv.reload();
    setSelected({});
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <BackToFinance />
        <p className="py-20 text-center text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <BackToFinance />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-status-warn/15 text-status-warn flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{w.title}</h1>
          <p className="text-sm text-muted-foreground">{w.subtitle}</p>
        </div>
      </div>

      {/* FADS proactive recommendation */}
      {summary.count > 0 && (
        <Card className="bg-brand-navy text-white border-0 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <FadsRobotAvatar size="sm" />
              <div className="flex-1">
                <p className="font-medium">
                  {formatMoney(summary.totalOwed, activeOrg?.currency)} is currently outstanding across {summary.count} account{summary.count === 1 ? "" : "s"}.
                </p>
                {summary.overdueCount > 0 && (
                  <p className="text-sm text-white/70 mt-1">
                    {summary.overdueCount} payment{summary.overdueCount === 1 ? " is" : "s are"} overdue.
                  </p>
                )}
                <p className="text-sm text-white/70 mt-1">Would you like me to prepare polite reminders?</p>
                <Button
                  className="mt-3 gap-1.5 bg-brand-teal hover:bg-brand-teal/90"
                  onClick={() => { selectAll(); setReviewOpen(true); }}
                >
                  <Sparkles className="w-4 h-4" /> Review & Prepare
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <CollectionsSummary summary={summary} currency={activeOrg?.currency} wording={w} />

      {/* Bulk actions bar */}
      {accounts.length > 0 && canManage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={selectAll} className="text-sm text-brand-teal hover:underline flex items-center gap-1 min-h-touch">
                  <CheckSquare className="w-4 h-4" /> Select all
                </button>
                <button onClick={selectOverdue} className="text-sm text-brand-teal hover:underline min-h-touch">
                  Select overdue
                </button>
                <button onClick={selectNone} className="text-sm text-muted-foreground hover:underline min-h-touch">
                  Clear
                </button>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected · {formatMoney(selectedTotal, activeOrg?.currency)}
                  </span>
                  <Button
                    className="gap-1.5"
                    onClick={() => setReviewOpen(true)}
                  >
                    <Send className="w-4 h-4" /> Send Reminders
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account list */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-status-ok/15 text-status-ok flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-sm text-muted-foreground">{w.emptyMessage}</p>
            {!isChurch && (
              <Link to="/finance/invoices">
                <Button variant="outline" className="mt-4">View {w.accountNoun}s</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <CollectionAccountCard
              key={account.id}
              account={account}
              selected={!!selected[account.id]}
              onToggleSelect={() => toggleSelect(account.id)}
              onSendReminder={() => openSingleReminder(account)}
              onRecordPayment={() => openRecordPayment(account)}
              wording={w}
              currency={activeOrg?.currency}
            />
          ))}
        </div>
      )}

      {/* Church giving note */}
      {isChurch && (
        <div className="text-center">
          <Link to="/church/giving" className="text-sm text-brand-teal hover:underline">
            Go to Giving & Pledges →
          </Link>
        </div>
      )}

      {/* Collections review dialog (bulk) */}
      {reviewOpen && (
        <CollectionsReviewDialog
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          accounts={selectedAccounts}
          orgId={activeOrg?.id}
          currency={activeOrg?.currency}
          wording={w}
          onReminderSent={handleRemindersSent}
        />
      )}

      {/* Record payment dialog (single invoice) */}
      {payDialog && (
        <RecordPaymentDialog
          open
          onClose={() => setPayDialog(null)}
          onSaved={async () => {
            setPayDialog(null);
            await inv.reload();
            await fin.reload();
          }}
          invoice={payDialog}
          accounts={fin.accounts}
          incomeCategories={fin.categories.filter((c) => c.kind === "income")}
          currency={payDialog.currency}
        />
      )}

      {/* Draft WhatsApp reminder dialog (single) */}
      {reminderDialog && (
        <DraftWhatsAppReminderDialog
          open
          onClose={() => setReminderDialog(null)}
          organisationId={activeOrg?.id}
          receivable={reminderDialog.receivable}
          phone={reminderDialog.phone}
        />
      )}
    </div>
  );
}