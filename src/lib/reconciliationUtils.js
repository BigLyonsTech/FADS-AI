// Client-side reconciliation helpers: derived status, status labels,
// and reconciliation summary text for the downloadable report.

// Derives a UI status from the stored reconciliation record.
// "Reconciled" appears only when status=completed AND the closing
// difference is zero. A completed record with a non-zero difference
// is shown as "partial" (needs attention).
// Returns: "reconciled" | "partial" | "unreconciled" | "ready"
export function deriveRecStatus(rec) {
  if (rec.status === "completed" && Math.abs(Number(rec.difference) || 0) < 0.01) return "reconciled";
  if (rec.status === "completed") return "partial";
  if (!rec.matched_count || rec.matched_count === 0) return "unreconciled";
  if (rec.matched_count >= rec.imported_count) return "ready";
  return "partial";
}

export function recStatusLabel(status) {
  switch (status) {
    case "reconciled":
      return "Reconciled";
    case "partial":
      return "Partially Reconciled";
    case "unreconciled":
      return "Unreconciled";
    case "ready":
      return "Ready to Complete";
    default:
      return status;
  }
}

export function lineStatusLabel(status) {
  switch (status) {
    case "matched":
      return "Matched";
    case "suggested":
      return "Suggested";
    case "unmatched":
      return "Unmatched";
    case "ignored":
      return "Ignored";
    default:
      return status;
  }
}

// Computes the difference between the statement closing balance and the
// computed closing balance from the statement lines.
export function computeDifference(rec, lines) {
  const totalIn = lines.reduce((s, l) => s + (Number(l.amount_in) || 0), 0);
  const totalOut = lines.reduce((s, l) => s + (Number(l.amount_out) || 0), 0);
  const computed = Number(rec.opening_balance) + totalIn - totalOut;
  return Math.round((Number(rec.closing_balance) - computed) * 100) / 100;
}

// Builds a text summary for the downloadable reconciliation report.
export function buildRecSummary(rec, lines) {
  const matched = lines.filter((l) => l.status === "matched").length;
  const unmatched = lines.filter((l) => l.status === "unmatched" || l.status === "suggested").length;
  const ignored = lines.filter((l) => l.status === "ignored").length;
  const totalIn = lines.reduce((s, l) => s + (Number(l.amount_in) || 0), 0);
  const totalOut = lines.reduce((s, l) => s + (Number(l.amount_out) || 0), 0);
  const computed = Number(rec.opening_balance) + totalIn - totalOut;
  const diff = computeDifference(rec, lines);
  return [
    "Reconciliation Summary",
    "========================",
    `Account: ${rec.account_name || rec.account_id}`,
    `Period: ${rec.period_start} to ${rec.period_end}`,
    `Currency: ${rec.currency}`,
    "",
    `Opening balance: ${Number(rec.opening_balance).toFixed(2)}`,
    `Closing balance: ${Number(rec.closing_balance).toFixed(2)}`,
    `Total money in: ${totalIn.toFixed(2)}`,
    `Total money out: ${totalOut.toFixed(2)}`,
    `Computed closing: ${computed.toFixed(2)}`,
    `Difference: ${diff.toFixed(2)}`,
    "",
    `Lines imported: ${lines.length}`,
    `Lines matched: ${matched}`,
    `Lines unmatched: ${unmatched}`,
    `Lines ignored: ${ignored}`,
    "",
    `Status: ${rec.status}`,
    rec.completed_date ? `Completed: ${rec.completed_date}` : "",
    "",
    "Statement Lines",
    "========================",
    ...lines.map((l, i) => {
      const amt = l.amount_in > 0 ? `+${Number(l.amount_in).toFixed(2)}` : `-${Number(l.amount_out).toFixed(2)}`;
      return `${i + 1}. ${l.date} | ${amt} | ${l.description || ""} | ${lineStatusLabel(l.status)}`;
    }),
  ]
    .filter(Boolean)
    .join("\n");
}

// Triggers a text-file download in the browser.
export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}