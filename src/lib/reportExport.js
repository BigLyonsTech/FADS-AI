import { jsPDF } from "jspdf";
import { exportReportCsv } from "@/lib/useReports";
import { formatCurrency } from "@/lib/currencyFormat";
import { deliverPdf } from "@/lib/webviewCompat";
import { drawOrgLogo } from "@/lib/pdfLogo";

// Triggers a browser download of a CSV string.
function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Export a report as CSV (server-side generation, audited).
export async function downloadReportCsv(orgId, dataMode, reportType, filters, orgName) {
  const csv = await exportReportCsv(orgId, dataMode, reportType, filters);
  const safeName = (orgName || "org").replace(/\s+/g, "-").toLowerCase();
  downloadCsv(csv, `${reportType}-${safeName}.csv`);
}

// Generate and download a printable PDF for any report. The PDF is a
// clean, professional summary suitable for sharing with accountants
// or stakeholders. All data is org-scoped (passed from the backend).
export async function generateReportPDF({ org, reportType, reportTitle, reportData, filters }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;
  const logoH = await drawOrgLogo(doc, org?.logo_url, margin, margin, 120, 36);
  if (logoH) y += logoH + 8;
  const fmt = (n) => formatCurrency(n, org?.currency);

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(org?.name || "Organisation", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${reportTitle} · ${org?.currency} · ${org?.data_mode === "demo" ? "Demo" : "Live"} data`, margin, y);
  y += 12;
  const filterParts = [];
  if (filters?.date_from) filterParts.push("From: " + filters.date_from);
  if (filters?.date_to) filterParts.push("To: " + filters.date_to);
  if (filterParts.length) {
    doc.text(filterParts.join("  ·  "), margin, y);
    y += 12;
  }
  doc.text("Generated: " + new Date().toLocaleString(), margin, y);
  y += 16;

  // ---- Disclaimer ----
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, contentW, 28, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.splitTextToSize(
    "Record-based estimates for management purposes only. Tax figures require professional verification. Not a formal Balance Sheet — a double-entry ledger is not yet implemented.",
    contentW - 16
  ).forEach((line, i) => doc.text(line, margin + 8, y + 12 + i * 10));
  y += 38;

  // ---- Content ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  const ensureSpace = (needed) => {
    if (y > pageH - margin - needed) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (title) => {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin, y);
    y += 14;
  };

  const kvRow = (label, val) => {
    ensureSpace(16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(val, pageW - margin, y, { align: "right" });
    y += 14;
  };

  const tableHeader = (cols) => {
    ensureSpace(22);
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    cols.forEach((c) => doc.text(c.label, margin + c.x, y + 12, c.align ? { align: c.align } : undefined));
    y += 18;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
  };

  const tableRow = (cols, i) => {
    ensureSpace(16);
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, contentW, 14, "F");
    }
    doc.setFontSize(8);
    cols.forEach((c) => doc.text(String(c.val), margin + c.x, y + 10, c.align ? { align: c.align } : undefined));
    y += 14;
  };

  const r = reportData;
  if (reportType === "income_expense") {
    sectionTitle("Summary");
    kvRow("Total Income", fmt(r.totalIncome));
    kvRow("Total Expense", fmt(r.totalExpense));
    kvRow("Net", fmt(r.net));
    kvRow("Transactions", String(r.transactionCount));
    sectionTitle("Monthly Breakdown");
    tableHeader([
      { label: "Month", x: 4 },
      { label: "Income", x: contentW * 0.35, align: "right" },
      { label: "Expense", x: contentW * 0.6, align: "right" },
      { label: "Net", x: contentW - 4, align: "right" },
    ]);
    r.byMonth.forEach((m, i) => tableRow([
      { val: m.month, x: 4 },
      { val: fmt(m.income), x: contentW * 0.35, align: "right" },
      { val: fmt(m.expense), x: contentW * 0.6, align: "right" },
      { val: fmt(m.net), x: contentW - 4, align: "right" },
    ], i));
  } else if (reportType === "cash_flow") {
    sectionTitle("Cash Flow Summary");
    kvRow("Opening Balance", fmt(r.openingBalance));
    kvRow("Total Inflow", fmt(r.totalInflow));
    kvRow("Total Outflow", fmt(r.totalOutflow));
    kvRow("Net Flow", fmt(r.netFlow));
    kvRow("Closing Balance", fmt(r.closingBalance));
    kvRow("Transactions", String(r.transactionCount));
  } else if (reportType === "account_balances") {
    sectionTitle("Account Balances");
    tableHeader([
      { label: "Account", x: 4 },
      { label: "Opening", x: contentW * 0.4, align: "right" },
      { label: "Inflow", x: contentW * 0.58, align: "right" },
      { label: "Outflow", x: contentW * 0.76, align: "right" },
      { label: "Current", x: contentW - 4, align: "right" },
    ]);
    r.forEach((a, i) => tableRow([
      { val: a.name, x: 4 },
      { val: fmt(a.opening_balance), x: contentW * 0.4, align: "right" },
      { val: fmt(a.inflow), x: contentW * 0.58, align: "right" },
      { val: fmt(a.outflow), x: contentW * 0.76, align: "right" },
      { val: fmt(a.current_balance), x: contentW - 4, align: "right" },
    ], i));
  } else if (reportType === "outstanding_invoices") {
    sectionTitle("Outstanding Invoices");
    kvRow("Total Outstanding", fmt(r.totalOutstanding));
    kvRow("Total Overdue", fmt(r.totalOverdue));
    kvRow("Count", String(r.count));
    if (r.invoices.length) {
      sectionTitle("Invoice Details");
      tableHeader([
        { label: "Invoice", x: 4 },
        { label: "Customer", x: contentW * 0.25 },
        { label: "Due", x: contentW * 0.55 },
        { label: "Balance", x: contentW - 4, align: "right" },
      ]);
      r.invoices.forEach((inv, i) => tableRow([
        { val: inv.invoice_number, x: 4 },
        { val: (inv.customer_name || "").slice(0, 25), x: contentW * 0.25 },
        { val: inv.due_date || "", x: contentW * 0.55 },
        { val: fmt(inv.balance), x: contentW - 4, align: "right" },
      ], i));
    }
  } else if (reportType === "aged_receivables") {
    sectionTitle("Aged Receivables");
    kvRow("Total Outstanding", fmt(r.totalOutstanding));
    kvRow("Count", String(r.count));
    sectionTitle("Age Buckets");
    tableHeader([
      { label: "Bucket", x: 4 },
      { label: "Amount", x: contentW - 4, align: "right" },
    ]);
    r.buckets.forEach((b, i) => tableRow([
      { val: b.label, x: 4 },
      { val: fmt(b.amount), x: contentW - 4, align: "right" },
    ], i));
  } else if (reportType === "category_breakdown") {
    sectionTitle("Income by Category");
    r.income.forEach((c, i) => kvRow(c.name, `${fmt(c.amount)}  (${c.percentage}%)`));
    if (r.uncategorisedIncome > 0) kvRow("Uncategorised", fmt(r.uncategorisedIncome));
    sectionTitle("Expense by Category");
    r.expense.forEach((c) => kvRow(c.name, `${fmt(c.amount)}  (${c.percentage}%)`));
    if (r.uncategorisedExpense > 0) kvRow("Uncategorised", fmt(r.uncategorisedExpense));
  } else if (reportType === "monthly_trends") {
    sectionTitle("Monthly Trends (12 months)");
    tableHeader([
      { label: "Month", x: 4 },
      { label: "Income", x: contentW * 0.3, align: "right" },
      { label: "Expense", x: contentW * 0.55, align: "right" },
      { label: "Net", x: contentW * 0.78, align: "right" },
      { label: "Cum. Income", x: contentW - 4, align: "right" },
    ]);
    r.forEach((m, i) => tableRow([
      { val: m.month, x: 4 },
      { val: fmt(m.income), x: contentW * 0.3, align: "right" },
      { val: fmt(m.expense), x: contentW * 0.55, align: "right" },
      { val: fmt(m.net), x: contentW * 0.78, align: "right" },
      { val: fmt(m.cumulativeIncome), x: contentW - 4, align: "right" },
    ], i));
  } else if (reportType === "tax_summary") {
    sectionTitle("Tax Record Summary");
    kvRow("Tax Collected (on income)", fmt(r.taxCollected));
    kvRow("Tax Paid (on expenses)", fmt(r.taxPaid));
    kvRow("Net Tax", fmt(r.netTax));
    kvRow("Transactions", String(r.transactionCount));
    if (r.byMonth.length) {
      sectionTitle("Monthly Breakdown");
      tableHeader([
        { label: "Month", x: 4 },
        { label: "Collected", x: contentW * 0.4, align: "right" },
        { label: "Paid", x: contentW * 0.65, align: "right" },
        { label: "Net", x: contentW - 4, align: "right" },
      ]);
      r.byMonth.forEach((m, i) => tableRow([
        { val: m.month, x: 4 },
        { val: fmt(m.collected), x: contentW * 0.4, align: "right" },
        { val: fmt(m.paid), x: contentW * 0.65, align: "right" },
        { val: fmt(m.collected - m.paid), x: contentW - 4, align: "right" },
      ], i));
    }
  } else if (reportType === "reconciliation_status") {
    sectionTitle("Reconciliation Status");
    kvRow("Total Reconciliations", String(r.total));
    kvRow("Reconciled", String(r.reconciledCount));
    kvRow("In Progress / Unreconciled", String(r.inProgressCount));
    if (r.rows.length) {
      sectionTitle("Details");
      tableHeader([
        { label: "Account", x: 4 },
        { label: "Period", x: contentW * 0.3 },
        { label: "Status", x: contentW * 0.6 },
        { label: "Diff", x: contentW - 4, align: "right" },
      ]);
      r.rows.forEach((row2, i) => tableRow([
        { val: (row2.account_name || "").slice(0, 20), x: 4 },
        { val: row2.period_start || "", x: contentW * 0.3 },
        { val: row2.reconciled ? "Reconciled" : "Unreconciled", x: contentW * 0.6 },
        { val: fmt(row2.difference), x: contentW - 4, align: "right" },
      ], i));
    }
  } else if (reportType === "church_summary") {
    sectionTitle("Membership Overview");
    kvRow("Total Members", String(r.membership.totalMembers));
    kvRow("Active Members", String(r.membership.activeMembers));
    kvRow("New Members", String(r.membership.newMembers));
    kvRow("Total Visitors", String(r.membership.totalVisitors));
    kvRow("New Visitors", String(r.membership.newVisitors));
    sectionTitle("Tithes, Offerings & Donations");
    kvRow("Tithes", fmt(r.giving.totalTithes));
    kvRow("Offerings", fmt(r.giving.totalOfferings));
    kvRow("Donations", fmt(r.giving.totalDonations));
    kvRow("Total Giving", fmt(r.giving.totalGiving));
    sectionTitle("Income & Expense");
    kvRow("Total Income", fmt(r.totalIncome));
    kvRow("Total Expense", fmt(r.totalExpense));
    sectionTitle("Follow-ups");
    kvRow("Contacts Needing Follow-up", String(r.followUps.contactsNeedingFollowUp));
    kvRow("Open Tasks", String(r.followUps.openTasks));
    kvRow("Overdue Tasks", String(r.followUps.overdueTasks));
  } else if (reportType === "giving_summary") {
    sectionTitle("Giving Summary");
    kvRow("Total Giving", fmt(r.totalGiving));
    kvRow("Tithes", fmt(r.tithes));
    kvRow("Offerings", fmt(r.offerings));
    kvRow("Donations", fmt(r.donations));
    kvRow("Outstanding Pledges", String(r.outstandingPledges));
    kvRow("Total Outstanding Pledges", fmt(r.totalOutstanding));
    if (r.byFund && r.byFund.length) {
      sectionTitle("Giving by Fund");
      tableHeader([
        { label: "Fund", x: 4 },
        { label: "Amount", x: contentW * 0.6, align: "right" },
        { label: "Txns", x: contentW - 4, align: "right" },
      ]);
      r.byFund.forEach((f, i) => tableRow([
        { val: f.fund, x: 4 },
        { val: fmt(f.amount), x: contentW * 0.6, align: "right" },
        { val: String(f.count), x: contentW - 4, align: "right" },
      ], i));
    }
    if (r.topDonors && r.topDonors.length) {
      sectionTitle("Top Donors");
      r.topDonors.forEach((d) => kvRow(d.name, fmt(d.amount)));
    }
    if (r.pledgesNeedingFollowUp && r.pledgesNeedingFollowUp.length) {
      sectionTitle("Pledges Needing Follow-up");
      tableHeader([
        { label: "Fund", x: 4 },
        { label: "Contact", x: contentW * 0.35 },
        { label: "Outstanding", x: contentW * 0.7, align: "right" },
        { label: "Due", x: contentW - 4, align: "right" },
      ]);
      r.pledgesNeedingFollowUp.forEach((p, i) => tableRow([
        { val: p.fund, x: 4 },
        { val: (p.contact_name || "General").slice(0, 22), x: contentW * 0.35 },
        { val: fmt(p.outstanding), x: contentW * 0.7, align: "right" },
        { val: p.target_date || "", x: contentW - 4, align: "right" },
      ], i));
    }
  } else if (reportType === "inventory_summary") {
    sectionTitle("Inventory Summary");
    kvRow("Total Items", String(r.totalItems));
    kvRow("In Stock", String(r.inStockCount));
    kvRow("Low Stock", String(r.lowStockCount));
    kvRow("Out of Stock", String(r.outOfStockCount));
    kvRow("Total Cost Value", fmt(r.costValue));
    kvRow("Total Selling Value", fmt(r.sellingValue));
    if (r.rows.length) {
      sectionTitle("Item Details");
      tableHeader([
        { label: "Item", x: 4 },
        { label: "SKU", x: contentW * 0.28 },
        { label: "Qty", x: contentW * 0.45, align: "right" },
        { label: "Cost Value", x: contentW * 0.65, align: "right" },
        { label: "Sell Value", x: contentW * 0.82, align: "right" },
        { label: "Status", x: contentW - 4, align: "right" },
      ]);
      r.rows.forEach((it, i) => tableRow([
        { val: (it.name || "").slice(0, 22), x: 4 },
        { val: (it.sku || "").slice(0, 14), x: contentW * 0.28 },
        { val: String(it.quantity), x: contentW * 0.45, align: "right" },
        { val: fmt(it.cost_value), x: contentW * 0.65, align: "right" },
        { val: fmt(it.selling_value), x: contentW * 0.82, align: "right" },
        { val: it.status.replace("_", " "), x: contentW - 4, align: "right" },
      ], i));
    }
  }

  // ---- Footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Generated by FADS AI Business Suite", pageW / 2, pageH - 20, { align: "center" });

  return deliverPdf(doc, `${reportType}.pdf`);
}