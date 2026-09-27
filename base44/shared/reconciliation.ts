// Shared reconciliation helpers: CSV parsing, column auto-detection,
// date/amount parsing, duplicate detection, and match scoring.
// Pure functions used by the reconciliation backend function.

// Parse CSV text into rows of cells. Handles quoted fields with embedded
// commas, doubled quotes (""), and newlines inside quotes.
export function parseCSV(text: string): string[][] {
  let clean = text;
  // Strip BOM
  if (clean.charCodeAt(0) === 0xfeff) clean = clean.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  // flush last cell/row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop fully empty rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Auto-detect column indices from header names. Returns a map of
// field -> column index. Fields: date, description, reference,
// amount_in, amount_out, balance, amount (single-column fallback).
export function autoDetectColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const l = h.toLowerCase().trim();
    if (map.date === undefined && /^(date|posted|trans.*date|value.*date)$/i.test(l)) map.date = i;
    if (map.description === undefined && /^(desc|description|narrativ|narrative|details|memo|payee|name|particulars)$/i.test(l)) map.description = i;
    if (map.reference === undefined && /^(ref|reference|id|number|txn|transaction)$/i.test(l)) map.reference = i;
    if (map.amount_in === undefined && /^(credit|deposit|money.?in|inflow|received|paid.?in)$/i.test(l)) map.amount_in = i;
    if (map.amount_out === undefined && /^(debit|withdrawal|money.?out|outflow|paid|payment|paid.?out)$/i.test(l)) map.amount_out = i;
    if (map.balance === undefined && /^(balance|running.?balance)$/i.test(l)) map.balance = i;
    if (map.amount === undefined && /^(amount|amt|value)$/i.test(l)) map.amount = i;
  });
  return map;
}

// Parse a date string into ISO yyyy-mm-dd. Returns null if unparseable.
// Supports ISO, DD/MM/YYYY, MM/DD/YYYY (heuristic), DD-MM-YYYY, DD MMM YYYY.
export function parseDate(val: string): string | null {
  if (!val) return null;
  const s = val.trim();
  // ISO: 2026-08-15 or 2026/08/15
  let m = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD/MM/YYYY or MM/DD/YYYY
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    let year = m[3].length === 2 ? "20" + m[3] : m[3];
    let day, month;
    // If first part > 12 it must be the day; else assume DD/MM (European bank default)
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      day = b;
      month = a;
    } else {
      day = a;
      month = b;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  // DD MMM YYYY  e.g. 15 Aug 2026
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{2,4})$/);
  if (m) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mi = months.indexOf(m[2].toLowerCase().slice(0, 3));
    if (mi >= 0) {
      const year = m[3].length === 2 ? "20" + m[3] : m[3];
      return `${year}-${String(mi + 1).padStart(2, "0")}-${String(parseInt(m[1], 10)).padStart(2, "0")}`;
    }
  }
  return null;
}

// Parse an amount string into a number. Handles currency symbols,
// European (1.234,56) and US (1,234.56) formats, and negatives.
export function parseAmount(val: string): number {
  if (!val) return 0;
  let s = val.trim().replace(/[€$£₦\s]/g, "");
  if (!s || s === "-") return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // European: 1.234,56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // US: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // decimal: 1234,56
      s = s.replace(",", ".");
    } else {
      // thousands: 1,234
      s = s.replace(/,/g, "");
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Build a hash for duplicate detection from a line's key fields.
export function lineHash(line: { date: string; description: string; amount_in: number; amount_out: number }): string {
  const key = `${line.date}|${(line.description || "").trim().toLowerCase()}|${Number(line.amount_in) || 0}|${Number(line.amount_out) || 0}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return "h" + (h >>> 0).toString(36);
}

// Score a candidate transaction match for a statement line.
// Returns { score, confidence } — confidence is high/medium/low/none.
// A "none" confidence means the amount did not match and the pair should
// not be suggested.
export function scoreMatch(
  line: { date: string; amount_in: number; amount_out: number; reference?: string },
  txn: { date: string; amount: number; direction: string; reference?: string }
): { score: number; confidence: string } {
  const lineAmount = Number(line.amount_in || 0) - Number(line.amount_out || 0);
  const txnSigned = txn.direction === "in" ? Number(txn.amount) : -Number(txn.amount);
  // Amount must match within 0.01
  if (Math.abs(lineAmount - txnSigned) > 0.01) {
    return { score: 0, confidence: "none" };
  }
  let score = 50;
  const ld = new Date(line.date);
  const td = new Date(txn.date);
  const dayDiff = Math.abs((ld.getTime() - td.getTime()) / 86400000);
  if (dayDiff === 0) score += 30;
  else if (dayDiff <= 3) score += 20;
  else if (dayDiff <= 7) score += 10;
  if (
    line.reference &&
    txn.reference &&
    line.reference.trim().toLowerCase() === txn.reference.trim().toLowerCase()
  ) {
    score += 20;
  }
  let confidence = "low";
  if (score >= 70) confidence = "high";
  else if (score >= 50) confidence = "medium";
  return { score, confidence };
}

// Build a reconciliation summary text for the downloadable report.
export function buildSummary(rec: Record<string, any>, lines: any[]): string {
  const lines2 = lines || [];
  const matched = lines2.filter((l) => l.status === "matched").length;
  const unmatched = lines2.filter((l) => l.status === "unmatched" || l.status === "suggested").length;
  const ignored = lines2.filter((l) => l.status === "ignored").length;
  const totalIn = lines2.reduce((s, l) => s + (Number(l.amount_in) || 0), 0);
  const totalOut = lines2.reduce((s, l) => s + (Number(l.amount_out) || 0), 0);
  const computed = Number(rec.opening_balance) + totalIn - totalOut;
  const diff = Number(rec.closing_balance) - computed;
  return [
    `Reconciliation Summary`,
    `Account: ${rec.account_name || rec.account_id}`,
    `Period: ${rec.period_start} to ${rec.period_end}`,
    `Opening balance: ${Number(rec.opening_balance).toFixed(2)} ${rec.currency}`,
    `Closing balance: ${Number(rec.closing_balance).toFixed(2)} ${rec.currency}`,
    `Total money in: ${totalIn.toFixed(2)} ${rec.currency}`,
    `Total money out: ${totalOut.toFixed(2)} ${rec.currency}`,
    `Computed closing: ${computed.toFixed(2)} ${rec.currency}`,
    `Difference: ${diff.toFixed(2)} ${rec.currency}`,
    `Lines imported: ${lines2.length}`,
    `Lines matched: ${matched}`,
    `Lines unmatched: ${unmatched}`,
    `Lines ignored: ${ignored}`,
    `Status: ${rec.status}`,
    rec.completed_date ? `Completed: ${rec.completed_date}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}