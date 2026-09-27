import React, { useState, useMemo } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useReports } from "@/lib/useReports";
import { financeWording, invoiceWording, canManageFinance } from "@/lib/financeWording";
import { downloadReportCsv, generateReportPDF } from "@/lib/reportExport";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  BarChart3,
  Wallet,
  Landmark,
  FileText,
  Clock,
  PieChart as PieIcon,
  TrendingUp,
  CheckCircle2,
  FileDown,
  Printer,
  Loader2,
  AlertCircle,
  Banknote,
} from "lucide-react";
import ReportFilters from "@/components/reports/ReportFilters";
import IncomeExpenseReport from "@/components/reports/IncomeExpenseReport";
import CashFlowReport from "@/components/reports/CashFlowReport";
import AccountBalanceReport from "@/components/reports/AccountBalanceReport";
import OutstandingInvoicesReport from "@/components/reports/OutstandingInvoicesReport";
import AgedReceivablesReport from "@/components/reports/AgedReceivablesReport";
import CategoryBreakdownReport from "@/components/reports/CategoryBreakdownReport";
import MonthlyTrendsReport from "@/components/reports/MonthlyTrendsReport";
import ReconciliationStatusReport from "@/components/reports/ReconciliationStatusReport";
import PayrollReport from "@/components/reports/PayrollReport";
import InventoryReport from "@/components/reports/InventoryReport";
import { Package } from "lucide-react";
import FadsRobotLoader from "@/components/FadsRobotLoader";
import BackToFinance from "@/components/finance/BackToFinance";

const REPORT_TABS = [
  { id: "income_expense", label: "Income & Expense", icon: BarChart3 },
  { id: "cash_flow", label: "Cash Flow", icon: Wallet },
  { id: "account_balances", label: "Account Balances", icon: Landmark },
  { id: "outstanding_invoices", label: "Outstanding Invoices", icon: FileText, needsInvoices: true },
  { id: "aged_receivables", label: "Aged Receivables", icon: Clock, needsInvoices: true },
  { id: "category_breakdown", label: "By Category", icon: PieIcon },
  { id: "monthly_trends", label: "Monthly Trends", icon: TrendingUp },
  { id: "reconciliation_status", label: "Reconciliation", icon: CheckCircle2 },
  { id: "payroll_summary", label: "Payroll", icon: Banknote },
  { id: "inventory_summary", label: "Inventory", icon: Package },
];

const REPORT_TITLES = {
  income_expense: "Income and Expense Report",
  cash_flow: "Cash Flow Summary",
  account_balances: "Account Balance Summary",
  outstanding_invoices: "Outstanding Invoices",
  aged_receivables: "Aged Receivables",
  category_breakdown: "Income and Expenses by Category",
  monthly_trends: "Monthly Comparisons and Trends",
  reconciliation_status: "Reconciliation Status Report",
  payroll_summary: "Payroll Summary",
  inventory_summary: "Inventory Valuation Report",
};

export default function Reports() {
  const { activeOrg, activeRole, loading: wsLoading } = useWorkspace();
  const { dataMode } = useDataMode();
  const [filters, setFilters] = useState({});
  const [activeTab, setActiveTab] = useState("income_expense");
  const [exporting, setExporting] = useState(false);
  const { data, loading, error, reload } = useReports(filters);
  const w = financeWording(activeOrg?.type);
  const iw = invoiceWording(activeOrg?.type);
  const canManage = canManageFinance(activeRole);

  const visibleTabs = useMemo(
    () => REPORT_TABS.filter((t) => !t.needsInvoices || iw.invoicesEnabled),
    [iw.invoicesEnabled]
  );

  const resetFilters = () => setFilters({});

  const handleCsvExport = async () => {
    if (!activeOrg || !data) return;
    setExporting(true);
    try {
      await downloadReportCsv(activeOrg.id, dataMode, activeTab, filters, activeOrg.name);
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = () => {
    if (!activeOrg || !data) return;
    generateReportPDF({
      org: data.org,
      reportType: activeTab,
      reportTitle: REPORT_TITLES[activeTab],
      reportData: data.reports[tabToKey(activeTab)],
      filters,
    });
  };

  if (wsLoading) {
    return <FadsRobotLoader compact message="FADS AI IS PREPARING YOUR REPORTS..." />;
  }

  return (
    <div className="space-y-4">
      <BackToFinance />
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Reports Centre</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg?.name} · {activeOrg?.currency} ·{" "}
            {dataMode === "demo" ? "Demo" : "Live"}
          </p>
        </div>
        {canManage && data && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-10" onClick={handleCsvExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              CSV
            </Button>
            <Button variant="outline" className="h-10" onClick={handlePdfExport}>
              <Printer className="w-4 h-4" /> PDF
            </Button>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-muted/40 rounded-xl border border-border p-3 text-xs text-muted-foreground">
        Reports are record-based management estimates. Tax figures require professional verification.
        No formal Balance Sheet — a double-entry ledger is not yet implemented.
      </div>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        setFilters={setFilters}
        lookups={data?.lookups}
        orgCurrency={activeOrg?.currency}
        onReset={resetFilters}
      />

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 rounded-xl p-4 text-center">
          <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={reload}>Retry</Button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="rounded-2xl border border-border bg-card/60">
          <FadsRobotLoader compact message="FADS AI IS COMPUTING YOUR REPORTS..." />
        </div>
      )}

      {/* Reports */}
      {data && !loading && !error && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex overflow-x-auto h-auto p-1 gap-1 bg-card border border-border">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap"
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            <h2 className="text-lg font-semibold text-brand-navy mb-3">{REPORT_TITLES[activeTab]}</h2>
            <TabsContent value="income_expense" className="mt-0">
              <IncomeExpenseReport data={data.reports.incomeExpense} org={data.org} wording={w} />
            </TabsContent>
            <TabsContent value="cash_flow" className="mt-0">
              <CashFlowReport data={data.reports.cashFlow} org={data.org} />
            </TabsContent>
            <TabsContent value="account_balances" className="mt-0">
              <AccountBalanceReport data={data.reports.accountBalances} org={data.org} />
            </TabsContent>
            <TabsContent value="outstanding_invoices" className="mt-0">
              <OutstandingInvoicesReport data={data.reports.outstandingInvoices} org={data.org} invoiceWording={iw} />
            </TabsContent>
            <TabsContent value="aged_receivables" className="mt-0">
              <AgedReceivablesReport data={data.reports.agedReceivables} org={data.org} invoiceWording={iw} />
            </TabsContent>
            <TabsContent value="category_breakdown" className="mt-0">
              <CategoryBreakdownReport data={data.reports.categoryBreakdown} org={data.org} wording={w} />
            </TabsContent>
            <TabsContent value="monthly_trends" className="mt-0">
              <MonthlyTrendsReport data={data.reports.monthlyTrends} org={data.org} wording={w} />
            </TabsContent>
            <TabsContent value="reconciliation_status" className="mt-0">
              <ReconciliationStatusReport data={data.reports.reconciliationStatus} org={data.org} />
            </TabsContent>
            <TabsContent value="payroll_summary" className="mt-0">
              <PayrollReport data={data.reports.payrollSummary} org={data.org} />
            </TabsContent>
            <TabsContent value="inventory_summary" className="mt-0">
              <InventoryReport data={data.reports.inventorySummary} org={data.org} />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}

function tabToKey(tabId) {
  const map = {
    income_expense: "incomeExpense",
    cash_flow: "cashFlow",
    account_balances: "accountBalances",
    outstanding_invoices: "outstandingInvoices",
    aged_receivables: "agedReceivables",
    category_breakdown: "categoryBreakdown",
    monthly_trends: "monthlyTrends",
    reconciliation_status: "reconciliationStatus",
    payroll_summary: "payrollSummary",
    inventory_summary: "inventorySummary",
  };
  return map[tabId] || tabId;
}