// Lightweight shared helpers for School Grade Report Cards.
// Reused by the editor, detail view and PDF generator so the overall
// average/result and WhatsApp share text stay consistent everywhere.

export function computeReportCardAverage(subjects = []) {
  const marks = (subjects || [])
    .map((s) => Number(s.mark))
    .filter((m) => Number.isFinite(m));
  if (marks.length === 0) return null;
  const sum = marks.reduce((a, b) => a + b, 0);
  return Math.round((sum / marks.length) * 10) / 10;
}

export function averageRemark(avg) {
  if (avg == null) return "";
  if (avg >= 70) return "Distinction";
  if (avg >= 60) return "Merit";
  if (avg >= 50) return "Pass";
  if (avg >= 40) return "Conditional Pass";
  return "Needs Improvement";
}

export function buildReportCardWhatsAppUrl(card, org) {
  const avg = computeReportCardAverage(card.subjects);
  const lines = [
    `${org?.name || "School"} — Student Report Card`,
    `Student: ${card.student_name || "-"}`,
    card.class_name ? `Class: ${card.class_name}` : null,
    card.academic_term ? `Term: ${card.academic_term}` : null,
    card.academic_year ? `Academic Year: ${card.academic_year}` : null,
    avg != null ? `Overall Average: ${avg}% (${averageRemark(avg)})` : null,
    card.overall_comment ? `Comment: ${card.overall_comment}` : null,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
}