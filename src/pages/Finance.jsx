import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { financeWording, canManageFinance, formatMoney, invoiceWording, financeAccessLevel, canViewFinanceTotals, canViewFinanceReports, canAccessFinanceSettings, canAccessReconciliation, canAccessFinanceOfficer, canAccessPayroll, canExportFinance, canManageInvoices, canManageContacts, canManageReceipts, canViewTransactions } from "@/lib/financeWording";
import { downloadFinanceCsv } from "@/lib/financeExport";
import { useDataMode } from "@/lib/useDataMode";
import { useToast } from "@/components/ui/use-toast";
import { useInvoices } from "@/lib/useInvoices";
import { deriveInvoiceStatus } from "@/lib/invoiceUtils";
import { Button } from "@/components/ui/button";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Users,
  List,
  Tag,
  FileDown,
  AlertCircle,
  FileText,
  Receipt as ReceiptIcon,
  Landmark,
  BarChart3,
  Bot,
  ChevronRight,
  Mic,
  Calculator,
  CircleDollarSign,
} from "lucide-react";
import TransactionDialog from "@/components/finance/TransactionDialog";
import AccountDialog from "@/components/finance/AccountDialog";
import ContactDialog from "@/components/finance/ContactDialog";
import CategoryDialog from "@/components/finance/CategoryDialog";
import FinanceQuickActions from "@/components/finance/FinanceQuickActions";
import FadsMoneyPlayer from "@/components/finance/FadsMoneyPlayer";
import FadsCounter from "@/components/shared/FadsCounter";
import ReceiptScanDialog from "@/components/finance/ReceiptScanDialog";
import BankStatementDialog from "@/components/finance/BankStatementDialog";
import DownloadStatementDialog from "@/components/finance/DownloadStatementDialog";
import { base44 } from "@/api/base44Client";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import BeginnerGuide from "@/components/BeginnerGuide";
import TaxEasyPromo from "@/components/finance/TaxEasyPromo";
import BulkFinanceEntryDialog from "@/components/finance/BulkFinanceEntryDialog";
import NigeriaFinanceActions from "@/components/finance/NigeriaFinanceActions";
import NigeriaTaxCentre from "@/components/finance/NigeriaTaxCentre";
import NigeriaTaxEstimator from "@/components/finance/NigeriaTaxEstimator";

// Module-level guard: ensures seed_demo runs at most once per org per page
// load, even when multiple Finance instances mount concurrently (the race that
// created duplicate default accounts/categories). Shared across all instances.
const _seededInSession = new Set();

export default function Finance() {
  const { activeOrg, activeRole, loading: wsLoading } = useWorkspace();
  const fin = useFinance();
  const inv = useInvoices();
  const { dataMode } = useDataMode();
  const { toast } = useToast();
  const w = financeWording(activeOrg);
  const iw = invoiceWording(activeOrg);
  const canManage = canManageFinance(activeRole);
  const financeLevel = financeAccessLevel(activeRole);
  const [dialog, setDialog] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { pullDistance, refreshing, threshold } = usePullToRefresh(() => fin.reload());
  const micSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";

  // Auto-seed fictional Finance data only when the current session is
  // actually viewing Demo mode. Organisation lifecycle mode and the admin
  // Demo/Live switch are separate, so using activeOrg.data_mode here could
  // start a Demo seed while the user was working in Live.
  useEffect(() => {
    const seedKey = activeOrg?.id ? `${activeOrg.id}:demo` : "";
    if (
      dataMode === "demo" &&
      !fin.loading &&
      fin.accounts.length === 0 &&
      canManage &&
      seedKey &&
      !_seededInSession.has(seedKey)
    ) {
      _seededInSession.add(seedKey);
      (async () => {
        try {
          await base44.functions.invoke("finance", {
            action: "seed_demo",
            organisation_id: activeOrg.id,
          });
          await fin.reload();
        } catch {
          // Allow a later remount/mode change to retry. Do not loop or block
          // ordinary manual Finance actions when Demo setup is rate-limited.
          _seededInSession.delete(seedKey);
        }
      })();
    }
  }, [activeOrg?.id, dataMode, fin.loading, fin.accounts.length, canManage]);

  // Auto-open the receipt scanner whenever a shortcut navigates to ?scan=1.
  // Finance can remain mounted during client-side navigation, so this must
  // react to the router location instead of reading window.location once.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("scan") === "1") {
      setScanOpen(true);
    }
  }, [location.search]);

  const closeReceiptScanner = () => {
    setScanOpen(false);
    const params = new URLSearchParams(location.search);
    if (params.delete("scan")) {
      const search = params.toString();
      navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
    }
  };

  if (wsLoading || fin.loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">Loading finance…</div>
    );
  }

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    const preparing = toast({
      title: "Preparing export…",
      description: `${activeOrg?.name} · ${dataMode === "demo" ? "Demo" : "Live"} mode`,
    });
    try {
      const result = await downloadFinanceCsv(activeOrg.id, dataMode, activeOrg.name);
      // Dismiss the "Preparing…" toast before showing the result so they
      // never stack on screen.
      preparing.dismiss();
      if (result.empty) {
        toast({
          title: "No finance records available to export.",
          description: "Add some transactions or invoices first, then try again.",
        });
      } else {
        toast({
          title: "Finance export downloaded.",
          description: `${result.count} record${result.count === 1 ? "" : "s"} exported.`,
        });
      }
    } catch (e) {
      preparing.dismiss();
      toast({
        title: "Export couldn't be completed. Please try again.",
        description: e?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const recent = fin.transactions.slice(0, 6);

  // Outstanding invoices: issued/part_paid/overdue with a positive balance.
  const outstandingInvoices = inv.invoices.filter((i) => {
    const s = deriveInvoiceStatus(i);
    return (s === "issued" || s === "part_paid" || s === "overdue") && Number(i.balance) > 0;
  });
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + Number(i.balance), 0);

  // Role-tier Finance menu — items a user may access are shown; others hidden.
  const financeMenu = [
    { to: "/finance/sales", icon: CircleDollarSign, label: "Sales", show: activeOrg?.type === "small_business" && canViewFinanceTotals(activeRole) },
    { to: "/finance/transactions", icon: List, label: "Transactions", show: canViewTransactions(activeRole) },
    { to: "/finance/accounts", icon: Wallet, label: "Chart of Accounts", show: canAccessFinanceSettings(activeRole) },
    { to: "/finance/contacts", icon: Users, label: w.contactInPlural, show: canManageContacts(activeRole) },
    { to: "/finance/categories", icon: Tag, label: "Categories", show: canAccessFinanceSettings(activeRole) },
    { to: "/finance/money-owed", icon: AlertCircle, label: activeOrg?.type === "school" ? "School Fees" : activeOrg?.type === "church" ? "Collections" : "Who Owes Me?", show: canViewFinanceTotals(activeRole) },
    { to: "/finance/invoices", icon: FileText, label: iw.invoicePlural, show: iw.invoicesEnabled && canManageInvoices(activeRole) },
    { to: "/finance/quotations", icon: FileText, label: "Quotations", show: activeOrg?.type === "small_business" && canManageInvoices(activeRole) },
    { to: "/finance/receipts", icon: ReceiptIcon, label: iw.receiptPlural, show: canManageReceipts(activeRole) },
    { to: "/finance/reconciliation", icon: Landmark, label: "Reconciliation", show: canAccessReconciliation(activeRole) },
    { to: "/finance/reports", icon: BarChart3, label: "Reports", show: canViewFinanceReports(activeRole) },
  ].filter((m) => m.show);

  return (
    <div className="space-y-6">
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Finance</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg?.name} · {activeOrg?.currency} ·{" "}
            {activeOrg?.data_mode === "demo" ? "Demo" : "Live"}
          </p>
        </div>
        {canAccessPayroll(activeRole) && (
          <Link to="/payroll">
            <Button variant="outline" className="h-11 gap-1.5">
              <Wallet className="w-4 h-4" /> Payroll
            </Button>
          </Link>
        )}
        {canManage && (
          <Button variant="outline" className="h-11 gap-1.5" onClick={() => setBulkOpen(true)}>
            <List className="w-4 h-4" /> Bulk Entry
          </Button>
        )}
        {canExportFinance(activeRole) && (
          <Button variant="outline" className="h-11" onClick={exportData} disabled={exporting}>
            <FileDown className="w-4 h-4" /> {exporting ? "Exporting…" : "Export"}
          </Button>
        )}
      </div>

      {canManage && activeOrg?.country === "NG" ? (
        <NigeriaFinanceActions
          micSupported={micSupported}
          onSpeak={() => setDialog({ type: "txn", direction: "in", autoDictate: true })}
          onScan={() => setScanOpen(true)}
          onTax={() => setTaxOpen(true)}
          onEstimate={() => setEstimateOpen(true)}
        />
      ) : canManage && micSupported ? (
        <div className="rounded-2xl border border-brand-teal/40 bg-gradient-to-r from-brand-teal/10 to-brand-mint/40 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setDialog({ type: "txn", direction: "in", autoDictate: true })}
              className="flex items-center gap-2 self-start rounded-xl bg-brand-teal px-4 h-12 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Mic className="w-5 h-5" />
              Speak a Record
            </button>
            <div className="min-w-0">
              <p className="font-semibold text-brand-navy">Speak a Record</p>
              <p className="text-sm text-muted-foreground">
                Tell FADS about income or an expense instead of typing it.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Example: “I spent €42 on fuel today and paid by card.”
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {canManage && activeOrg?.country === "IE" && ["small_business", "self_employed"].includes(activeOrg?.type) && (
        <div className="bg-gradient-to-r from-brand-navy to-brand-teal/90 text-white rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-2xl leading-none">🇮🇪</div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Ireland Business & Tax Centre</p>
              <p className="text-xs text-white/70 mt-0.5">
                Business overview, VAT records, tax readiness, Revenue/ROS guidance and Accountant Pack — using this workspace&apos;s existing Finance records.
              </p>
            </div>
            <Link to="/finance/business-tax-centre" className="shrink-0">
              <Button className="h-11 gap-1.5 bg-white text-brand-navy hover:bg-white/90">
                <Calculator className="w-4 h-4" /> Open Centre
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Nigeria Tax Centre — prominent entry for Nigerian small-business
          workspaces. Reuses the existing NigeriaTaxCentre / NigeriaTaxEstimator
          dialogs and the Nigeria 2026 progressive PIT bands. Not a TaxEasy
          (Europe) signpost — TaxEasy remains a separate Europe product. */}
      {canManage && activeOrg?.country === "NG" && activeOrg?.type === "small_business" && (
        <div className="bg-gradient-to-r from-brand-navy to-brand-teal/90 text-white rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-2xl leading-none">🇳🇬</div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Nigeria Tax Centre</p>
              <p className="text-xs text-white/70 mt-0.5">
                Tax overview, readiness and estimated Personal Income Tax — from your Finance records, using the Nigeria 2026 tax rules.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                className="h-11 gap-1.5 border-white/30 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setTaxOpen(true)}
              >
                <Calculator className="w-4 h-4" /> Tax Centre
              </Button>
              <Button
                className="h-11 gap-1.5 bg-white text-brand-navy hover:bg-white/90"
                onClick={() => setEstimateOpen(true)}
              >
                <Calculator className="w-4 h-4" /> Estimate My Tax
              </Button>
            </div>
          </div>
        </div>
      )}

      <BeginnerGuide module="finance" orgType={activeOrg?.type} />

      {canViewFinanceTotals(activeRole) && (
        <>
          {/* FADS Money Player — hero */}
          <FadsMoneyPlayer
            totalBalance={fin.totalBalance}
            moneyIn={fin.moneyIn}
            moneyOut={fin.moneyOut}
            outstandingTotal={outstandingTotal}
            currency={activeOrg?.currency}
            wording={w}
            onScanReceipt={() => setScanOpen(true)}
            canManage={canManage}
          />

          {/* Mini Y2K counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FadsCounter label="Transactions" value={fin.transactions.length} sublabel="Recorded" icon={List} />
            <FadsCounter
              label="Pending"
              value={fin.outstanding.length}
              sublabel={fin.outstanding.length > 0 ? "To review" : "All clear"}
              icon={AlertCircle}
              sublabelAccent={fin.outstanding.length > 0 ? "warn" : "teal"}
            />
            <FadsCounter
              label="Invoices"
              value={outstandingInvoices.length}
              sublabel={outstandingInvoices.length > 0 ? "Unpaid" : "All paid"}
              icon={FileText}
              sublabelAccent={outstandingInvoices.length > 0 ? "warn" : "teal"}
            />
            <FadsCounter label="Accounts" value={fin.accounts.length} sublabel="Open" icon={Wallet} />
          </div>
        </>
      )}

      {canAccessFinanceOfficer(activeRole) && (
        <Link to="/finance-officer" className="block">
          <div className="bg-gradient-to-r from-brand-navy to-brand-teal/90 text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Ask the Finance Officer</p>
              <p className="text-xs text-white/70">Get instant answers about your {w.moneyIn.toLowerCase()} and {w.moneyOut.toLowerCase()} — with source citations</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
          </div>
        </Link>
      )}

      {canManage && (
        <div>
          <h2 className="font-semibold text-brand-navy mb-3">Quick Actions</h2>
          <FinanceQuickActions
            orgType={activeOrg.type}
            onScanReceipt={() => setScanOpen(true)}
            onUploadStatement={() => setStatementOpen(true)}
            onDownloadStatement={() => setDownloadOpen(true)}
          />
        </div>
      )}

      {financeLevel === "staff" && (
        <div>
          <h2 className="font-semibold text-brand-navy mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/finance/money-in">
              <Button className="h-11 w-full gap-1.5">
                <ArrowDownLeft className="w-4 h-4" /> Record {w.moneyIn}
              </Button>
            </Link>
            <Link to="/finance/receipts/new">
              <Button variant="outline" className="h-11 w-full gap-1.5">
                <ReceiptIcon className="w-4 h-4" /> New {iw.receiptNoun}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Who owes me? — Money Owed / Collections */}
      {canViewFinanceTotals(activeRole) && outstandingInvoices.length > 0 && (
        <Link to="/finance/money-owed" className="block">
          <div className="bg-gradient-to-r from-status-warn/15 to-brand-teal/10 rounded-2xl border border-status-warn/30 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-status-warn/20 text-status-warn flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-brand-navy">
                    {activeOrg?.type === "school" ? "School Fees Outstanding" : "Who Owes Me?"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {outstandingInvoices.length} account{outstandingInvoices.length === 1 ? "" : "s"} · Click to review and send reminders
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-status-warn">{formatMoney(outstandingTotal, activeOrg?.currency)}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {canViewFinanceTotals(activeRole) && fin.outstanding.length > 0 && (
        <div className="bg-status-warn/10 rounded-2xl border border-status-warn/30 p-4">
          <div className="flex items-center gap-2 text-status-warn font-medium">
            <AlertCircle className="w-4 h-4" /> Outstanding items ({fin.outstanding.length})
          </div>
          <div className="mt-3 space-y-2">
            {fin.outstanding.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                <div>
                  <p className="text-sm font-medium text-brand-navy">{t.description || t.reference || "—"}</p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </div>
                <span className="font-semibold text-brand-navy">{formatMoney(t.amount, t.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-navy">Recent transactions</h2>
          <Link to="/finance/transactions" className="text-sm text-brand-teal hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-5 text-center space-y-4">
            <div>
              <p className="font-medium text-brand-navy">Nothing recorded yet.</p>
              <p className="text-sm text-muted-foreground mt-1">What happened today?</p>
            </div>
            {canManage && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Link to={activeOrg?.type === "small_business" ? "/finance/sales?record=1" : "/finance/money-in"}>
                  <Button variant="outline" className="w-full min-h-11">
                    {activeOrg?.type === "school" || activeOrg?.type === "university"
                      ? "Fee / payment"
                      : activeOrg?.type === "church"
                        ? "Money received"
                        : "I made a sale"}
                  </Button>
                </Link>
                <Link to="/finance/money-in">
                  <Button variant="outline" className="w-full min-h-11">I got paid</Button>
                </Link>
                <Link to="/finance/money-out">
                  <Button variant="outline" className="w-full min-h-11">I spent money</Button>
                </Link>
                <Button variant="outline" className="w-full min-h-11" onClick={() => setScanOpen(true)}>
                  Scan a receipt
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((t) => (
              <Link key={t.id} to={`/finance/transactions/${t.id}`} className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-muted/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.direction === "in" ? "bg-status-ok/15 text-status-ok" : "bg-status-bad/15 text-status-bad"}`}>
                    {t.direction === "in" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-navy truncate">
                      {t.description || t.reference || (t.direction === "in" ? w.moneyIn : w.moneyOut)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.date}
                      {t.status === "pending" ? " · Pending" : t.status === "cancelled" ? " · Cancelled" : ""}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${t.direction === "in" ? "text-status-ok" : "text-brand-navy"} ${t.status === "cancelled" ? "line-through opacity-60" : ""}`}>
                  {t.direction === "in" ? "+" : "−"}
                  {formatMoney(t.amount, t.currency)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {financeMenu.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {financeMenu.map((m) => (
            <Link key={m.to} to={m.to}>
              <div className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal">
                <m.icon className="w-5 h-5 text-brand-teal" />
                <p className="text-sm font-medium mt-2 text-brand-navy">{m.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeOrg?.country !== "NG" && <TaxEasyPromo />}

      {dialog?.type === "txn" && (
        <TransactionDialog
          open
          onClose={() => setDialog(null)}
          onSaved={async () => {
            await fin.reload();
            setDialog(null);
          }}
          direction={dialog.direction}
          accounts={fin.accounts}
          categories={fin.categories}
          contacts={fin.contacts}
          orgId={activeOrg.id}
          wording={w}
          autoDictate={dialog.autoDictate}
        />
      )}
      {dialog?.type === "account" && (
        <AccountDialog open onClose={() => setDialog(null)} onSaved={fin.reload} orgId={activeOrg.id} />
      )}
      {dialog?.type === "contact" && (
        <ContactDialog open onClose={() => setDialog(null)} onSaved={fin.reload} orgId={activeOrg.id} />
      )}
      {dialog?.type === "category" && (
        <CategoryDialog open onClose={() => setDialog(null)} onSaved={fin.reload} orgId={activeOrg.id} />
      )}
      <ReceiptScanDialog open={scanOpen} onClose={closeReceiptScanner} onSaved={fin.reload} />
      <BankStatementDialog open={statementOpen} onClose={() => setStatementOpen(false)} onSaved={fin.reload} />
      <DownloadStatementDialog
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        accounts={fin.accounts}
        transactions={fin.transactions}
        org={activeOrg}
      />
      <BulkFinanceEntryDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSaved={fin.reload}
        accounts={fin.accounts}
        categories={fin.categories}
        contacts={fin.contacts}
        orgId={activeOrg.id}
        wording={w}
        currency={activeOrg.currency}
      />
      <NigeriaTaxCentre
        open={taxOpen}
        onClose={() => setTaxOpen(false)}
        onEstimate={() => { setTaxOpen(false); setEstimateOpen(true); }}
      />
      <NigeriaTaxEstimator
        open={estimateOpen}
        onClose={() => setEstimateOpen(false)}
      />
    </div>
  );
}