import { jsPDF } from "jspdf";
import { formatMoney } from "@/lib/financeWording";
import { deliverPdf } from "@/lib/webviewCompat";
import { drawOrgLogo } from "@/lib/pdfLogo";

const num = (value) => (Number(value) || 0).toFixed(2);

export async function generateQuotationPDF(quotation) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;
  const org = quotation.org_snapshot || {};

  const logoH = await drawOrgLogo(
    doc,
    quotation.logo_url || org.logo_url,
    margin,
    margin,
    120,
    36
  );
  if (logoH) y += logoH + 8;

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text("QUOTATION", pageW - margin, margin, { align: "right" });
  doc.setFontSize(10);
  doc.text(quotation.quotation_number, pageW - margin, margin + 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Issued: " + quotation.issue_date, pageW - margin, margin + 31, { align: "right" });
  doc.text("Valid until: " + quotation.valid_until, pageW - margin, margin + 44, { align: "right" });

  y = Math.max(y, margin + 60) + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Prepared For:", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(quotation.customer_name || "", margin, y);
  y += 12;
  if (quotation.customer_email) {
    doc.text(quotation.customer_email, margin, y);
    y += 12;
  }
  if (quotation.customer_address) {
    doc.splitTextToSize(quotation.customer_address, 220).forEach((line) => {
      doc.text(line, margin, y);
      y += 12;
    });
  }

  y += 14;
  const colX = {
    desc: margin + 6,
    qty: margin + contentW * 0.50,
    price: margin + contentW * 0.62,
    disc: margin + contentW * 0.74,
    total: margin + contentW - 6,
  };
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

  (quotation.line_items || []).forEach((line, index) => {
    if (y > pageH - 140) {
      doc.addPage();
      y = margin;
    }
    if (index % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, contentW, 18, "F");
    }
    doc.text(String(line.description || "").slice(0, 45), colX.desc, y + 12);
    doc.text(String(line.quantity || 1), colX.qty, y + 12);
    doc.text(num(line.unit_price), colX.price, y + 12);
    doc.text(num(line.discount || 0), colX.disc, y + 12);
    doc.text(num(line.total), colX.total, y + 12, { align: "right" });
    y += 18;
  });

  y += 12;
  const labelX = pageW - margin - 180;
  const valX = pageW - margin;
  const totalRow = (label, value, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(label, labelX, y);
    doc.text(value, valX, y, { align: "right" });
    y += 15;
  };

  totalRow("Subtotal", formatMoney(quotation.subtotal, quotation.currency));
  if (Number(quotation.discount_total) > 0) {
    totalRow("Discount", "-" + formatMoney(quotation.discount_total, quotation.currency));
  }
  if (Number(quotation.tax_total) > 0) {
    totalRow(org.tax_label || "Tax", formatMoney(quotation.tax_total, quotation.currency));
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(labelX, y - 4, valX, y - 4);
  totalRow("Total", formatMoney(quotation.total, quotation.currency), true);

  const addTextSection = (title, value) => {
    if (!value) return;
    if (y > pageH - 90) {
      doc.addPage();
      y = margin;
    }
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.splitTextToSize(value, contentW).forEach((line) => {
      if (y > pageH - 40) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 11;
    });
  };

  addTextSection("Notes", quotation.notes);
  addTextSection("Terms", quotation.terms);

  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "This quotation is not an invoice or proof of payment.",
    pageW / 2,
    pageH - 32,
    { align: "center" }
  );
  doc.text("Generated by FADS AI Business Suite", pageW / 2, pageH - 20, { align: "center" });

  return deliverPdf(doc, `${quotation.quotation_number}.pdf`);
}
