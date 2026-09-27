// FADS Year-End Tax Preparation Report — PDF generator.
// Reuses the EXISTING jspdf + deliverPdf + drawOrgLogo + formatCurrency
// infrastructure (same as the Accountant Pack). No separate export engine.
import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/currencyFormat";
import { deliverPdf } from "@/lib/webviewCompat";
import { drawOrgLogo } from "@/lib/pdfLogo";
import { entityTypeLabel } from "@/lib/taxRules";

// Generates the "FADS YEAR-END TAX PREPARATION REPORT" PDF from the structured
// data built by buildTaxPrepReportData. Clearly labels estimates and
// incomplete information.
export async function generateTaxPrepReportPDF(data) {
  const {
    org, taxProfile, cur,
    income, expenses, profit, transactionCount,
    incomeByCategory, expenseByCategory, driverRunningCosts,
    vatCollected, vatPaid, vatNet,
    missingReceipts, needsReview, reviewFindings,
    taxReadiness, taxFindings, outstanding, checklist,
    obligationsLabels, entityTypeLabel: entityLabel,
    dataModeLabel,
  } = data;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;
  const fmt = (n) => formatCurrency(n, cur);

  const logoH = await drawOrgLogo(doc, org?.logo_url, margin, margin, 120, 36);
  if (logoH) y += logoH + 8;

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
    doc.text(String(val), pageW - margin, y, { align: "right" });
    y += 14;
  };

  const para = (text) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(text, contentW);
    lines.forEach((line) => {
      ensureSpace(12);
      doc.text(line, margin, y);
      y += 11;
    });
    y += 3;
  };

  const bullet = (text) => {
    ensureSpace(12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, contentW - 14);
    lines.forEach((line, i) => {
      ensureSpace(11);
      doc.text(i === 0 ? `• ${line}` : `  ${line}`, margin + 6, y);
      y += 11;
    });
  };

  // ---- Title ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text("FADS YEAR-END TAX PREPARATION REPORT", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${org?.name || "Organisation"} · ${cur} · ${dataModeLabel} data`, margin, y);
  y += 12;
  doc.text("Generated: " + new Date().toLocaleString(), margin, y);
  y += 16;

  // ---- Disclaimer ----
  ensureSpace(34);
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, contentW, 30, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.splitTextToSize(
    "This is a preparation report based on information currently recorded in FADS. Figures are estimates derived from your records and the configured rules for the selected jurisdiction and tax year. Estimates and incomplete items are labelled. This is not a filed return and not professional tax advice. Official tax authority requirements and professional advice take precedence.",
    contentW - 16
  ).forEach((line, i) => doc.text(line, margin + 8, y + 12 + i * 10));
  y += 38;

  // ---- Business information ----
  sectionTitle("Business Information");
  kvRow("Name", org?.name || "—");
  kvRow("Business Type", (org?.type || "—").replace(/_/g, " "));
  kvRow("Jurisdiction", org?.country || "—");
  if (taxProfile?.state_region) kvRow("State / Region", taxProfile.state_region);
  kvRow("Tax Year", taxProfile?.tax_year || "Not set up");
  kvRow("Entity Type", entityLabel);
  kvRow("Currency", cur || "—");
  if (taxProfile?.vat_registered != null) kvRow("VAT Registered", taxProfile.vat_registered ? "Yes" : "No");
  if (taxProfile?.employer != null) kvRow("Employer (PAYE)", taxProfile.employer ? "Yes" : "No");
  if (taxProfile?.filing_frequency) kvRow("Filing Frequency", taxProfile.filing_frequency);
  const ids = taxProfile?.tax_ids || {};
  Object.entries(ids).forEach(([k, v]) => { if (v) kvRow(k.toUpperCase(), v); });

  // ---- Applicable obligations ----
  if (obligationsLabels && obligationsLabels.length > 0) {
    sectionTitle("Applicable Tax Obligations");
    obligationsLabels.forEach((o) => bullet(o));
    y += 3;
  }

  // ---- Income, expenses, profit ----
  sectionTitle("Recorded Income, Expenses & Estimated Profit");
  kvRow("Total Recorded Income", fmt(income));
  kvRow("Total Recorded Expenses", fmt(expenses));
  kvRow("Estimated Business Profit", fmt(profit));
  kvRow("Cleared Transactions", String(transactionCount));
  para("Profit is an estimate (income minus expenses) from records currently in FADS. It is not a final taxable profit — allowable deductions, reliefs, capital allowances and adjustments depend on your jurisdiction and circumstances.");

  // ---- Expense breakdown ----
  if (expenseByCategory.length > 0) {
    sectionTitle("Expense Breakdown");
    expenseByCategory.forEach((c) => {
      ensureSpace(14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(c.name, margin, y);
      doc.text(fmt(c.amount), pageW - margin, y, { align: "right" });
      y += 13;
    });
  }

  // ---- Taxi / Driver running costs ----
  if (driverRunningCosts && driverRunningCosts.items.length > 0) {
    sectionTitle("Taxi / Driver Running Costs");
    driverRunningCosts.items.forEach((c) => {
      ensureSpace(14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(c.name, margin, y);
      doc.text(fmt(c.amount), pageW - margin, y, { align: "right" });
      y += 13;
    });
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total Running Costs", margin, y);
    doc.text(fmt(driverRunningCosts.total), pageW - margin, y, { align: "right" });
    y += 14;
  }

  // ---- VAT summary (where relevant) ----
  if (taxProfile?.vat_registered && (vatCollected > 0 || vatPaid > 0)) {
    sectionTitle("VAT Summary");
    kvRow("VAT Collected (on sales)", fmt(vatCollected));
    kvRow("VAT Paid (on purchases)", fmt(vatPaid));
    kvRow("Net VAT Payable / Refundable", fmt(vatNet));
  }

  // ---- Missing receipts ----
  sectionTitle("Missing Receipts");
  if (missingReceipts.length === 0) {
    para("No missing receipts detected for expenses of " + (cur || "") + " 50 or more.");
  } else {
    para(`${missingReceipts.length} expense${missingReceipts.length === 1 ? "" : "s"} of ${cur} 50+ have no receipt attached. Add supporting documents before filing.`);
    missingReceipts.slice(0, 15).forEach((t) => {
      bullet(`${t.date} · ${fmt(t.amount)} · ${(t.description || "no description").slice(0, 60)}`);
    });
  }

  // ---- Transactions requiring review ----
  sectionTitle("Transactions Requiring Review");
  const reviewItems = [
    ...needsReview.map((t) => ({ label: "Pending", t })),
    ...reviewFindings.flatMap((f) => (f.items || []).slice(0, 3).map((t) => ({ label: f.title, t }))),
  ];
  if (reviewItems.length === 0) {
    para("No transactions flagged for review.");
  } else {
    para(`${reviewItems.length} item${reviewItems.length === 1 ? "" : "s"} need attention before filing.`);
    reviewItems.slice(0, 15).forEach(({ label, t }) => {
      bullet(`${label}: ${t.date || "—"} · ${fmt(t.amount)} · ${(t.description || "no description").slice(0, 50)}`);
    });
  }

  // ---- Tax readiness ----
  sectionTitle("Tax Readiness");
  if (taxReadiness != null) {
    kvRow("FADS Tax Readiness Score", `${taxReadiness}%`);
  }
  if (taxFindings.length === 0) {
    para("No issues flagged by the FADS Tax Check.");
  } else {
    taxFindings.forEach((f) => {
      ensureSpace(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`${f.title} (${f.count})`, margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.splitTextToSize(f.detail, contentW).forEach((line) => {
        ensureSpace(11);
        doc.text(line, margin, y);
        y += 11;
      });
      y += 3;
    });
  }

  // ---- Outstanding information ----
  sectionTitle("Outstanding Information");
  if (outstanding.length === 0) {
    para("No outstanding information — your records look complete for this report.");
  } else {
    outstanding.forEach((o) => bullet(o));
    y += 3;
    para("Items above are incomplete. Resolve them before treating this report as final.");
  }

  // ---- Preparation checklist ----
  sectionTitle("Preparation Checklist");
  checklist.forEach((c) => {
    ensureSpace(12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(c.done ? "✔" : "☐", margin + 2, y);
    doc.text(c.label, margin + 16, y);
    y += 12;
  });

  // ---- Footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Generated by FADS AI Business Suite · Year-End Tax Preparation Report · Not a filed return", pageW / 2, pageH - 20, { align: "center" });

  const safeName = (org?.name || "org").replace(/\s+/g, "-").toLowerCase();
  return deliverPdf(doc, `year-end-tax-preparation-${safeName}.pdf`);
}