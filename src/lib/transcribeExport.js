import { jsPDF } from "jspdf";
import { sessionTypeLabel, formatDuration } from "@/lib/transcribeConstants";

// Download transcript as TXT file
export function downloadTXT(session, segments) {
  const lines = segments && segments.length > 0
    ? segments.map((s) => {
        const speaker = s.speaker_name ? `${s.speaker_name}: ` : "";
        return `${speaker}${s.text}`;
      })
    : (session.full_text || "").split("\n");

  const header = [
    `${session.title}`,
    `Type: ${sessionTypeLabel(session.session_type)}`,
    `Date: ${session.session_date ? new Date(session.session_date).toLocaleString() : ""}`,
    `Participants: ${(session.participants || []).join(", ")}`,
    `Status: ${session.status} | Review: ${session.review_status || "draft"}`,
    "",
    "--- Transcript ---",
    "",
  ].join("\n");

  const blob = new Blob([header + lines.join("\n")], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${safeFileName(session.title)}.txt`);
}

// Download transcript as PDF file
export function downloadPDF(session, segments) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  doc.setFontSize(16);
  doc.text(session.title || "Transcript", margin, 20);

  doc.setFontSize(9);
  doc.setTextColor(100);
  let metaY = 28;
  const metaLines = [
    `Type: ${sessionTypeLabel(session.session_type)}`,
    `Date: ${session.session_date ? new Date(session.session_date).toLocaleString() : ""}`,
    `Participants: ${(session.participants || []).join(", ") || "None"}`,
    `Duration: ${formatDuration(session.duration_seconds)}`,
    `Review Status: ${session.review_status || "draft"}`,
  ];
  for (const line of metaLines) {
    doc.text(line, margin, metaY);
    metaY += 5;
  }

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text("Transcript", margin, metaY + 5);
  doc.setFontSize(9);
  let y = metaY + 12;

  const lines = segments && segments.length > 0
    ? segments.map((s) => {
        const speaker = s.speaker_name ? `${s.speaker_name}: ` : "";
        return `${speaker}${s.text}`;
      })
    : (session.full_text || "").split("\n");

  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    for (const w of wrapped) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(w, margin, y);
      y += 5;
    }
    y += 1;
  }

  doc.save(`${safeFileName(session.title)}.pdf`);
}

// Export all transcripts as CSV
export function downloadCSV(sessions) {
  const headers = [
    "Title", "Type", "Date", "Status", "Review Status",
    "Participants", "Folder", "Tags", "Segments", "Duration (sec)",
    "Summary", "Decisions", "Action Points", "Favourite", "Archived",
    "Created By", "Created Date",
  ];

  const rows = sessions.map((s) => [
    s.title || "",
    sessionTypeLabel(s.session_type),
    s.session_date ? new Date(s.session_date).toISOString() : "",
    s.status || "",
    s.review_status || "draft",
    (s.participants || []).join("; "),
    s.folder_name || "",
    (s.tags || []).join("; "),
    s.segment_count || 0,
    s.duration_seconds || 0,
    (s.summary || "").replace(/\n/g, " "),
    (s.decisions || []).map((d) => d.text).join("; "),
    (s.action_points || []).map((a) => a.text).join("; "),
    s.is_favourite ? "Yes" : "No",
    s.is_archived ? "Yes" : "No",
    s.created_by_name || "",
    s.created_date || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, "transcripts-export.csv");
}

// Compute searchable word total across all sessions
export function computeSearchableWords(sessions) {
  let total = 0;
  for (const s of sessions) {
    const text = [
      s.title || "",
      (s.participants || []).join(" "),
      s.full_text || "",
      s.summary || "",
      s.minutes || "",
      (s.decisions || []).map((d) => d.text || "").join(" "),
      (s.action_points || []).map((a) => a.text || "").join(" "),
    ].join(" ");
    total += (text.match(/\S+/g) || []).length;
  }
  return total;
}

// Compute total action points across all sessions
export function computeActionPointTotal(sessions) {
  return sessions.reduce((sum, s) => sum + (s.action_points || []).length, 0);
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFileName(name) {
  return (name || "transcript").replace(/[^a-z0-9_-]/gi, "_").slice(0, 60);
}