import { jsPDF } from "jspdf";
import { GUIDE_SECTIONS } from "@/lib/userGuideContent";
import { deliverPdf } from "@/lib/webviewCompat";

// Generate and download a branded FADS AI Business Suite User Guide PDF.
// Reuses the same jsPDF pattern as the report-card / payslip / invoice PDFs.
// ONE shared guide: includes every section (workspace-aware sections included)
// so a single PDF covers all workspace types.
export function generateUserGuidePDF(org) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  const NAVY = [30, 41, 59];
  const TEAL = [26, 138, 138];
  const MUTE = [110, 116, 130];
  const INK = [40, 46, 60];

  // ---- Cover page ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, pageH, "F");
  // teal accent bar
  doc.setFillColor(...TEAL);
  doc.rect(0, pageH - 90, pageW, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("FADS AI Business Suite", margin, 200);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(180, 200, 205);
  doc.text("User Guide", margin, 232);

  doc.setFontSize(10);
  doc.setTextColor(150, 170, 180);
  const coverMeta = [];
  if (org?.name) coverMeta.push("Workspace: " + org.name);
  coverMeta.push("Generated " + new Date().toLocaleDateString());
  doc.text(coverMeta.join("    ·    "), margin, pageH - 110);

  doc.setFontSize(8);
  doc.setTextColor(130, 150, 160);
  doc.text(
    "This guide describes only features available in FADS today.",
    margin,
    pageH - 60
  );

  // ---- Contents page (page 2) ----
  doc.addPage();
  const contentsPage = 2;

  // ---- Sections (page 3 onward) ----
  doc.addPage();
  let y = margin;
  const sectionStartPages = [];

  GUIDE_SECTIONS.forEach((s, idx) => {
    // heading
    if (y > pageH - margin - 60) {
      doc.addPage();
      y = margin;
    }
    sectionStartPages.push(doc.internal.getCurrentPageInfo().pageNumber);

    // teal heading rule
    doc.setFillColor(...TEAL);
    doc.rect(margin, y, 4, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...NAVY);
    doc.text(s.title, margin + 12, y + 13);
    y += 26;

    // body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    (s.body || []).forEach((p) => {
      const isBullet = p.startsWith("- ");
      const text = isBullet ? p.slice(2) : p;
      const indent = isBullet ? margin + 16 : margin;
      const width = contentW - (isBullet ? 16 : 0);
      const lines = doc.splitTextToSize(text, width);
      lines.forEach((line) => {
        if (y > pageH - margin - 16) {
          doc.addPage();
          y = margin;
        }
        if (isBullet) {
          doc.setTextColor(...TEAL);
          doc.text("•", margin + 4, y);
          doc.setTextColor(...INK);
        }
        doc.text(line, indent, y);
        y += 14;
      });
      y += 4;
    });

    // links (as a "See also" line)
    if (s.links && s.links.length) {
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...TEAL);
      const linkText = "See also: " + s.links.map((l) => l.label).join("  ·  ");
      const linkLines = doc.splitTextToSize(linkText, contentW);
      linkLines.forEach((line) => {
        if (y > pageH - margin - 16) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 13;
      });
      doc.setTextColor(...INK);
    }
    y += 14;
  });

  // ---- Write the Contents page now that we know section page numbers ----
  doc.setPage(contentsPage);
  let cy = margin;
  doc.setFillColor(...TEAL);
  doc.rect(margin, cy, 4, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text("Contents", margin + 12, cy + 14);
  cy += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  GUIDE_SECTIONS.forEach((s, idx) => {
    if (cy > pageH - margin - 20) {
      doc.addPage();
      cy = margin;
    }
    const num = String(idx + 1) + ".";
    doc.setTextColor(...MUTE);
    doc.text(num, margin, cy);
    doc.setTextColor(...INK);
    doc.text(s.title, margin + 24, cy);
    const pageStr = String(sectionStartPages[idx]);
    doc.setTextColor(...MUTE);
    doc.text(pageStr, pageW - margin, cy, { align: "right" });
    cy += 16;
  });

  // ---- Footers on every page ----
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 160, 170);
    if (p === 1) {
      // cover footer
      doc.text("FADS AI Business Suite", pageW / 2, pageH - 28, { align: "center" });
    } else {
      doc.text("FADS AI Business Suite — User Guide", margin, pageH - 24);
      doc.text("Page " + p + " of " + total, pageW - margin, pageH - 24, { align: "right" });
    }
  }

  // Hand the PDF to the user. Desktop/mobile browser open it in a new tab
  // (falling back to a direct download); the installed Android app uses the
  // native share sheet or a visible fallback link. See webviewCompat.deliverPdf.
  return deliverPdf(doc, "FADS-AI-Business-Suite-User-Guide.pdf", { openInTab: true });
}