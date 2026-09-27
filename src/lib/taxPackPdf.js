// Accountant / Tax Adviser Pack PDF generator.
// Reuses the existing jspdf + deliverPdf + drawOrgLogo + formatCurrency
// infrastructure — no separate export engine.
import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/currencyFormat";
import { deliverPdf } from "@/lib/webviewCompat";
import { drawOrgLogo } from "@/lib/pdfLogo";
import { entityTypeLabel, OBLIGATION_LABELS, getObligations } from "@/lib/taxRules";

export async function generateAccountantPackPDF(data) {
  const {
    org, taxProfile, cur,
    income, expenses, net, transactionCount, byCategory,
    vatCollected, vatPaid, vatNet, taxCheck,
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

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(org?.name || "Organisation", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tax-Ready Accountant Pack · ${cur} · ${org?.data_mode === "demo" ? "Demo" : "Live"} data`, margin, y);
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
    "FADS helps organise financial records and prepare tax information. Estimates are based on information currently recorded in FADS and the configured rules for the selected jurisdiction and tax year. Review your information before filing. Official tax authority requirements and professional advice take precedence.",
    contentW - 16
  ).forEach((line, i) => doc.text(line, margin + 8, y + 12 + i * 10));
  y += 38;

  // ---- Business details ----
  sectionTitle("Business Details");
  kvRow("Name", org?.name || "—");
  kvRow("Type", (org?.type || "—").replace(/_/g, " "));
  kvRow("Country", org?.country || "—");
  if (taxProfile?.state_region) kvRow("State / Region", taxProfile.state_region);
  kvRow("Currency", cur || "—");
  kvRow("Tax Year", taxProfile?.tax_year || "—");
  kvRow("Entity Type", taxProfile ? entityTypeLabel(org?.country, taxProfile.entity_type) : "—");

  // ---- Tax profile / registrations ----
  if (taxProfile) {
    sectionTitle("Tax Profile & Registrations");
    kvRow("VAT Registered", taxProfile.vat_registered ? "Yes" : "No");
    kvRow("Employer (PAYE)", taxProfile.employer ? "Yes" : "No");
    if (taxProfile.filing_frequency) kvRow("Filing Frequency", taxProfile.filing_frequency);
    const ids = taxProfile.tax_ids || {};
    Object.entries(ids).forEach(([k, v]) => {
      if (v) kvRow(k.toUpperCase(), v);
    });
    const obligations = getObligations(org?.country, taxProfile.entity_type);
    if (obligations.length) {
      ensureSpace(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Applicable obligations:", margin, y);
      y += 12;
      obligations.forEach((o) => {
        ensureSpace(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${OBLIGATION_LABELS[o] || o}`, margin + 12, y);
        y += 11;
      });
      y += 4;
    }
  }

  // ---- Income & expense summary ----
  sectionTitle("Income & Expense Summary");
  kvRow("Total Income", fmt(income));
  kvRow("Total Expenses", fmt(expenses));
  kvRow("Net (Estimated Taxable Position)", fmt(net));
  kvRow("Cleared Transactions", String(transactionCount));
  para("This net figure is an estimated taxable position based on records currently in FADS. It is not a final tax liability — applicable rates, reliefs and adjustments depend on your jurisdiction and circumstances. Review with your accountant or tax adviser.");

  // ---- Category breakdown ----
  if (byCategory.length > 0) {
    sectionTitle("Category Breakdown");
    byCategory.forEach((c) => {
      const line = `${c.name}: Income ${fmt(c.income)} · Expense ${fmt(c.expense)}`;
      ensureSpace(14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(line, margin, y);
      y += 13;
    });
  }

  // ---- VAT summary (where relevant) ----
  if (taxProfile?.vat_registered && (vatCollected > 0 || vatPaid > 0)) {
    sectionTitle("VAT Summary");
    kvRow("VAT Collected (on sales)", fmt(vatCollected));
    kvRow("VAT Paid (on purchases)", fmt(vatPaid));
    kvRow("Net VAT Payable / Refundable", fmt(vatNet));
  }

  // ---- Tax check findings ----
  if (taxCheck && taxCheck.findings.length > 0) {
    sectionTitle("Records Needing Review (FADS Tax Check)");
    kvRow("Tax Readiness", `${taxCheck.readiness}%`);
    taxCheck.findings.forEach((f) => {
      ensureSpace(28);
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
      y += 4;
    });
  } else if (taxCheck) {
    sectionTitle("Records Needing Review (FADS Tax Check)");
    para("No issues flagged. Your records look clean for this tax year.");
  }

  // ---- Footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Generated by FADS AI Business Suite · Tax-Ready Accountant Pack", pageW / 2, pageH - 20, { align: "center" });

  const safeName = (org?.name || "org").replace(/\s+/g, "-").toLowerCase();
  return deliverPdf(doc, `accountant-pack-${safeName}.pdf`);
}