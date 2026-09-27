import { jsPDF } from "jspdf";
import { formatMoney } from "@/lib/financeWording";

// Generates a "FADS Account Activity" PDF from already-loaded, org-isolated
// transactions. This is a FADS-generated summary of recorded activity — NOT
// an official bank-issued statement. Reuses formatMoney for consistent
// currency formatting.
export function downloadStatementPdf({ org, account, dateFrom, dateTo, rows }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 50;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("FADS Account Activity", 40, y);
  y += 22;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(String(org?.name || ""), 40, y);
  y += 14;
  doc.text(
    `Account: ${account?.name || "All accounts"} · ${org?.currency || ""}`,
    40,
    y
  );
  y += 14;
  doc.text(`Period: ${dateFrom || "—"} to ${dateTo || "—"}`, 40, y);
  y += 14;
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);
  y += 14;

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "This is a FADS-generated summary of activity recorded in FADS — not an official bank-issued statement.",
    40,
    y
  );
  doc.setTextColor(0);
  y += 22;

  // Table header
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.text("Date", 40, y);
  doc.text("Description", 120, y);
  doc.text("Money In", W - 170, y, { align: "right" });
  doc.text("Money Out", W - 95, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220);
  doc.line(40, y, W - 40, y);
  y += 14;
  doc.setFont(undefined, "normal");

  rows.forEach((r) => {
    if (y > 780) {
      doc.addPage();
      y = 50;
    }
    doc.text(String(r.date || ""), 40, y);
    doc.text(String(r.description || "").slice(0, 48), 120, y);
    if (r.direction === "in") {
      doc.text(formatMoney(Number(r.amount) || 0, r.currency || org?.currency), W - 170, y, {
        align: "right",
      });
    } else {
      doc.text(formatMoney(Number(r.amount) || 0, r.currency || org?.currency), W - 95, y, {
        align: "right",
      });
    }
    y += 14;
  });

  y += 6;
  doc.setDrawColor(220);
  doc.line(40, y, W - 40, y);
  y += 16;
  doc.setFont(undefined, "bold");
  const net = rows.reduce(
    (s, r) => s + (r.direction === "in" ? Number(r.amount) || 0 : -(Number(r.amount) || 0)),
    0
  );
  doc.text(`Net activity: ${formatMoney(net, org?.currency)}`, W - 40, y, { align: "right" });

  const safeName = (org?.name || "export").replace(/[^\w-]+/g, "-");
  const today = new Date().toISOString().slice(0, 10);
  doc.save(`FADS-Account-Activity-${safeName}-${today}.pdf`);
}