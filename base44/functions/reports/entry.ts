import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireFinanceManager,
  getOrgConfig,
} from "../../shared/finance.ts";
import { getActiveMembership, writeAuditLog } from "../../shared/workspace.ts";
import {
  applyFilters,
  computeIncomeExpense,
  computeCashFlow,
  computeAccountBalances,
  computeOutstandingInvoices,
  computeAgedReceivables,
  computeCategoryBreakdown,
  computeMonthlyTrends,
  computeTaxSummary,
  computeReconciliationStatus,
  reportToCSV,
  computeChurchSummary,
  computeGivingSummary,
} from "../../shared/reports.ts";
import { computePayrollSummary } from "../../shared/payroll.ts";
import { computeInventorySummary } from "../../shared/inventory.ts";

// Organisation-isolated financial reports. Every action verifies active
// membership before any service-role read. Service-role access bypasses RLS,
// so organisation and Demo/Live scope are enforced explicitly on every query.
// Exports additionally require a finance-manager role and are audited.
//
// Actions:
//   get_report_data    Returns all computed reports for the active org + filters
//   export_report_csv  Returns a CSV string for one report type (audited)

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, organisation_id } = body;
    const svc = base44.asServiceRole;

    if (!organisation_id) {
      return Response.json({ error: "Missing organisation_id" }, { status: 400 });
    }

    // Service-role reads bypass RLS: verify membership before reading the
    // organisation or any report source records.
    const membership = await getActiveMembership(svc, user.id, organisation_id);
    if (!membership) {
      return Response.json({ error: "Not authorised for this organisation" }, { status: 403 });
    }

    const org = await getOrgConfig(svc, organisation_id);
    if (!org) {
      return Response.json({ error: "Organisation not found" }, { status: 404 });
    }
    const requestedMode =
      body.data_mode === "demo" || body.data_mode === "live"
        ? body.data_mode
        : (org.data_mode || "live");
    const scope = { organisation_id, data_mode: requestedMode };
    const filters = {
      date_from: body.date_from || undefined,
      date_to: body.date_to || undefined,
      account_id: body.account_id || undefined,
      category_id: body.category_id || undefined,
      contact_id: body.contact_id || undefined,
      currency: body.currency || undefined,
      status: body.status || undefined,
    };

    const audit = (act, entity_type, entity_id, before, after) =>
      writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: act,
        entity_type,
        entity_id,
        before,
        after,
      });

    // Load only the active organisation and selected Demo/Live mode.
    const [accounts, categories, contacts, transactions, invoices, payments, reconciliations, statementLines, payrollRuns] = await Promise.all([
      svc.entities.FinanceAccount.filter(scope),
      svc.entities.FinanceCategory.filter(scope),
      svc.entities.FinanceContact.filter(scope),
      svc.entities.FinanceTransaction.filter(scope, "-date", 1000),
      svc.entities.Invoice.filter(scope, "-issue_date", 500),
      svc.entities.InvoicePayment.filter(scope, "-date", 500),
      svc.entities.Reconciliation.filter(scope, "-created_date", 100),
      svc.entities.StatementLine.filter(scope, "row_index", 2000),
      svc.entities.PayrollRun.filter(scope, "-pay_period_end", 200),
    ]);

    // Group statement lines by reconciliation_id for the reconciliation report.
    const linesByRec = {};
    statementLines.forEach((l) => {
      if (!linesByRec[l.reconciliation_id]) linesByRec[l.reconciliation_id] = [];
      linesByRec[l.reconciliation_id].push(l);
    });

    // Compute all reports.
    const incomeExpense = computeIncomeExpense(transactions, filters);
    const cashFlow = computeCashFlow(transactions, accounts, filters);
    const accountBalances = computeAccountBalances(accounts, transactions, filters);
    const outstandingInvoices = computeOutstandingInvoices(invoices);
    const agedReceivables = computeAgedReceivables(invoices);
    const categoryBreakdown = computeCategoryBreakdown(transactions, categories, filters);
    const monthlyTrends = computeMonthlyTrends(transactions, filters, 12);
    const taxSummary = computeTaxSummary(transactions, filters);
    const reconciliationStatus = computeReconciliationStatus(reconciliations, linesByRec);

    const payrollSummary = computePayrollSummary(payrollRuns, filters);

    // Inventory valuation report (shared across all workspace types).
    const inventoryItems = await svc.entities.InventoryItem.filter(scope, "-updated_date", 1000);
    const inventorySummary = computeInventorySummary(inventoryItems);

    let churchSummary = null;
    let givingSummary = null;
    if (org.type === "church") {
      const [crmContacts, crmTasks, crmActivities, receipts, pledges] = await Promise.all([
        svc.entities.CRMContact.filter(scope, "-updated_date", 1000),
        svc.entities.CRMTask.filter(scope, "-due_date", 500),
        svc.entities.CRMActivity.filter(scope, "-created_date", 500),
        svc.entities.Receipt.filter(scope, "-date", 1000),
        svc.entities.GivingPledge.filter(scope, "-created_date", 1000),
      ]);
      churchSummary = computeChurchSummary(transactions, receipts, crmContacts, crmTasks, crmActivities, filters);
      givingSummary = computeGivingSummary(transactions, categories, pledges, contacts, filters);
    }

    const lookups = { accounts, categories, contacts };
    const allReports = {
      incomeExpense,
      cashFlow,
      accountBalances,
      outstandingInvoices,
      agedReceivables,
      categoryBreakdown,
      monthlyTrends,
      taxSummary,
      reconciliationStatus,
      churchSummary,
      givingSummary,
      payrollSummary,
      inventorySummary,
    };

    if (action === "get_report_data") {
      return Response.json({
        ok: true,
        org: { id: org.id, name: org.name, type: org.type, currency: org.currency, data_mode: requestedMode, tax_label: org.tax_label, default_tax_rate: org.default_tax_rate },
        filters,
        reports: allReports,
        lookups: {
          accounts: accounts.map((a) => ({ id: a.id, name: a.name, account_type: a.account_type })),
          categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
          contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
        },
      });
    }

    if (action === "export_report_csv") {
      // Exports require a finance-manager role.
      await requireFinanceManager(svc, user.id, organisation_id);
      const { report_type } = body;
      if (!report_type) return Response.json({ error: "Missing report_type" }, { status: 400 });

      const reportData = allReports[reportTypeToKey(report_type)];
      if (!reportData) return Response.json({ error: "Unknown report type" }, { status: 400 });

      const csv = reportToCSV(report_type, reportData, lookups);
      await audit("reports.exported_csv", "ReportExport", organisation_id, null, {
        report_type,
        filters,
        data_mode: requestedMode,
      });
      return Response.json({ ok: true, csv, report_type, data_mode: requestedMode });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
}

function reportTypeToKey(reportType) {
  const map = {
    income_expense: "incomeExpense",
    cash_flow: "cashFlow",
    account_balances: "accountBalances",
    outstanding_invoices: "outstandingInvoices",
    aged_receivables: "agedReceivables",
    category_breakdown: "categoryBreakdown",
    monthly_trends: "monthlyTrends",
    tax_summary: "taxSummary",
    reconciliation_status: "reconciliationStatus",
    church_summary: "churchSummary",
    giving_summary: "givingSummary",
    payroll_summary: "payrollSummary",
    inventory_summary: "inventorySummary",
  };
  return map[reportType] || reportType;
}