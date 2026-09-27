import { jsPDF } from "jspdf";
import { formatMoney } from "@/lib/financeWording";
import { deliverPdf } from "@/lib/webviewCompat";
import { drawOrgLogo } from "@/lib/pdfLogo";

// Plain number formatter for table cells (no currency symbol clutter).
const num = (n) => (Number(n) || 0).toFixed(2);

// Generate and download a professional invoice PDF. All data is org-scoped
// (passed in from the active org's records), so no other org's data can
// appear. The org snapshot on the invoice guarantees historical accuracy.
export async function generateInvoicePDF(invoice, payments = []) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;
  const org = invoice.org_snapshot || {};
  const logoH = await drawOrgLogo(doc, invoice.logo_url || org.logo_url, margin, margin, 120, 36);
  if (logoH) y += logoH + 8;

  // ---- Header: org name (left), invoice number + dates (right) ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(org.name || "Organisation", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (org.address) {
    doc.splitTextToSize(org.address, 220).forEach((line) => {
      doc.text(line, margin, y);
      y += 11;
    });
  }
  if (org.phone || org.email) {
    doc.text([org.phone, org.email].filter(Boolean).join("  ·  "), margin, y);
    y += 11;
  }
  if (org.tax_id_label && org.tax_id_value) {
    doc.text(`${org.tax_id_label}: ${org.tax_id_value}`, margin, y);
    y += 11;
  }

  // Right side: invoice title + meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(invoice.invoice_number, pageW - margin, margin, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Issued: " + invoice.issue_date, pageW - margin, margin + 14, { align: "right" });
  doc.text("Due: " + invoice.due_date, pageW - margin, margin + 26, { align: "right" });

  // ---- Bill To ----
  y = Math.max(y, margin + 50) + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Bill To:", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(invoice.customer_name || "", margin, y);
  y += 12;
  if (invoice.customer_email) {
    doc.text(invoice.customer_email, margin, y);
    y += 12;
  }
  if (invoice.customer_address) {
    doc.splitTextToSize(invoice.customer_address, 220).forEach((line) => {
      doc.text(line, margin, y);
      y += 12;
    });
  }

  // ---- Line items table ----
  y += 14;
  const colX = {
    desc: margin + 6,
    qty: margin + contentW * 0.50,
    price: margin + contentW * 0.62,
    disc: margin + contentW * 0.74,
    total: margin + contentW - 6,
  };
  // table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", colX.desc, y + 13);
  doc.text("Qty", colX.qty, y + 13);
  doc.text("Price", colX.price, y + 13);
  doc.text("Disc", colX.disc, y + 13);
  doc.text("Total", colX.total, y + 13, { align: "right" });
  y += 20;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");

  (invoice.line_items || []).forEach((li, i) => {
    if (y > pageH - 120) {
      doc.addPage();
      y = margin;
    }
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, contentW, 18, "F");
    }
    doc.text(String(li.description || "").slice(0, 45), colX.desc, y + 12);
    doc.text(String(li.quantity || 1), colX.qty, y + 12);
    doc.text(num(li.unit_price), colX.price, y + 12);
    doc.text(num(li.discount || 0), colX.disc, y + 12);
    doc.text(num(li.total), colX.total, y + 12, { align: "right" });
    y += 18;
  });

  // ---- Totals ----
  y += 12;
  const labelX = pageW - margin - 180;
  const valX = pageW - margin;
  const totalRow = (label, val, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(label, labelX, y);
    doc.text(val, valX, y, { align: "right" });
    y += 15;
  };
  totalRow("Subtotal", formatMoney(invoice.subtotal, invoice.currency));
  if (Number(invoice.discount_total) > 0) {
    totalRow("Discount", "-" + formatMoney(invoice.discount_total, invoice.currency));
  }
  if (Number(invoice.tax_total) > 0) {
    totalRow(org.tax_label || "Tax", formatMoney(invoice.tax_total, invoice.currency));
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(labelX, y - 4, valX, y - 4);
  totalRow("Total", formatMoney(invoice.total, invoice.currency), true);
  totalRow("Amount Paid", formatMoney(invoice.amount_paid, invoice.currency));
  doc.setFont("helvetica", "bold");
  doc.text("Balance Due", labelX, y);
  doc.text(formatMoney(invoice.balance, invoice.currency), valX, y, { align: "right" });
  y += 16;

  // ---- Payment instructions ----
  if (invoice.payment_instructions) {
    if (y > pageH - 80) {
      doc.addPage();
      y = margin;
    }
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Payment Instructions:", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.splitTextToSize(invoice.payment_instructions, contentW).forEach((line) => {
      doc.text(line, margin, y);
      y += 11;
    });
  }

  // ---- Payments history (if any) ----
  if (payments && payments.length) {
    if (y > pageH - 80) {
      doc.addPage();
      y = margin;
    }
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Payments Received:", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    payments.forEach((p) => {
      doc.text(`${p.date}  ·  ${formatMoney(p.amount, p.currency)}  ·  ${p.reference || ""}`, margin, y);
      y += 11;
    });
  }

  // ---- Footer ----
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Generated by FADS AI Business Suite", pageW / 2, pageH - 20, { align: "center" });

  return deliverPdf(doc, `${invoice.invoice_number}.pdf`);
}

// Generate and download a receipt PDF. Works for both invoice payments and
// standalone donations/tithes/offerings/school fees.
export async function generateReceiptPDF(receipt) {
  const doc = new jsPDF({ unit: "pt", format: "a5", format: [420, 595] });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  let y = margin;
  const org = receipt.org_snapshot || {};
  const logoH = await drawOrgLogo(doc, receipt.logo_url || org.logo_url, margin, margin, 120, 32);
  if (logoH) y += logoH + 8;

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(org.name || "Organisation", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  if (org.address) {
    doc.splitTextToSize(org.address, pageW - margin * 2).forEach((line) => {
      doc.text(line, margin, y);
      y += 10;
    });
  }
  if (org.phone || org.email) {
    doc.text([org.phone, org.email].filter(Boolean).join("  ·  "), margin, y);
    y += 10;
  }

  // ---- Receipt title ----
  y += 10;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("RECEIPT", pageW / 2, y, { align: "center" });
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(receipt.receipt_number, pageW / 2, y, { align: "center" });
  y += 18;

  // ---- Details ----
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  const row = (label, val) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(val || "—", pageW - margin, y, { align: "right" });
    y += 14;
  };
  row("Date", receipt.date);
  row("Received from", receipt.payer_name);
  if (receipt.payer_email) row("Email", receipt.payer_email);
  row("Payment method", receipt.payment_method || "cash");
  if (receipt.reference) row("Reference", receipt.reference);
  row("Description", receipt.description);

  // ---- Amount ----
  y += 8;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Amount Received", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 120, 80);
  doc.text(formatMoney(receipt.amount, receipt.currency), pageW - margin, y, { align: "right" });
  y += 24;

  // ---- Footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Thank you for your payment.", pageW / 2, y, { align: "center" });
  doc.text("Generated by FADS AI Business Suite", pageW / 2, pageH - 20, { align: "center" });

  return deliverPdf(doc, `${receipt.receipt_number}.pdf`);
}