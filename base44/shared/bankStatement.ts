import { parseDate, parseAmount } from "./reconciliation.ts";

export type StatementRow = {
  date: string;
  description: string;
  reference: string;
  money_in: number;
  money_out: number;
  running_balance: number | null;
  suggested_category: string;
};

const ALIASES = {
  date: ["date", "transactiondate", "transdate", "posteddate", "postingdate", "valuedate", "posted"],
  description: ["desc", "description", "transactiondescription", "narrative", "narration", "details", "transactiondetails", "memo", "payee", "particulars", "name"],
  reference: ["reference", "ref", "referenceno", "referencenumber", "transactionref", "transactionreference", "txnref", "id", "number"],
  money_in: ["moneyin", "credit", "creditamount", "deposit", "deposits", "inflow", "received", "paidin", "receipts"],
  money_out: ["moneyout", "debit", "debitamount", "withdrawal", "withdrawals", "outflow", "paidout", "payment", "payments"],
  balance: ["balance", "runningbalance", "closingbalance"],
  amount: ["amount", "transactionamount", "txnamount", "amt", "value"],
  type: ["type", "transactiontype", "debitcredit", "creditdebit", "drcr", "crdr", "direction"],
  suggested_category: ["suggestedcategory", "category"],
};

function normKey(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/^\uFEFF/, "").replace(/[^a-z0-9]/g, "");
}

function aliasScore(header: string, aliases: string[]): number {
  const h = normKey(header);
  if (!h) return 0;
  if (aliases.includes(h)) return 3;
  if (aliases.some((alias) => alias.length >= 4 && h.includes(alias))) return 2;
  return 0;
}

export function detectStatementColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const used = new Set<number>();
  const order = ["date", "description", "reference", "balance", "type", "money_in", "money_out", "amount"] as const;
  for (const field of order) {
    let bestIndex = -1;
    let bestScore = 0;
    headers.forEach((header, index) => {
      if (used.has(index)) return;
      const score = aliasScore(header, ALIASES[field]);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && bestScore > 0) {
      map[field] = bestIndex;
      used.add(bestIndex);
    }
  }
  return map;
}

function detectDelimiter(text: string): string {
  const sample = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).slice(0, 8);
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestScore = -1;
  for (const delimiter of candidates) {
    const counts = sample.map((line) => line.split(delimiter).length - 1);
    const positive = counts.filter((count) => count > 0);
    if (!positive.length) continue;
    const common = Math.max(...positive.map((count) => positive.filter((v) => v === count).length));
    const score = common * 10 + Math.max(...positive);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }
  return best;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((cellValue) => String(cellValue).trim() !== ""));
}

export function parseStatementAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let s = String(value ?? "").trim();
  if (!s || s === "-" || s === "—") return 0;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/^-/.test(s)) negative = true;
  if (/(?:\bDR\b|\bDEBIT\b)$/i.test(s)) negative = true;
  s = s
    .replace(/[−–—]/g, "-")
    .replace(/\b(?:CR|DR|CREDIT|DEBIT)\b/gi, "")
    .trim();

  const parsed = parseAmount(s);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -Math.abs(parsed) : parsed;
}

export function parseStatementDate(value: unknown): string | null {
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + Math.floor(value) * 86400000).toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const known = parseDate(text);
  if (known) return known;
  if (/[A-Za-z]{3,}/.test(text)) {
    const parsed = Date.parse(text);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  }
  return null;
}

function pickObjectValue(record: Record<string, any>, aliases: string[]): any {
  const entries = Object.entries(record || {});
  let best: any = undefined;
  let bestScore = 0;
  for (const [key, value] of entries) {
    const score = aliasScore(key, aliases);
    if (score > bestScore) {
      best = value;
      bestScore = score;
    }
  }
  return best;
}

function isInType(value: unknown): boolean {
  const t = normKey(value);
  return ["credit", "cr", "deposit", "deposits", "moneyin", "inflow", "received", "receipt", "paidin"].some(
    (token) => t === token || t.includes(token)
  );
}

function isOutType(value: unknown): boolean {
  const t = normKey(value);
  return ["debit", "dr", "withdrawal", "withdrawals", "moneyout", "outflow", "payment", "paidout"].some(
    (token) => t === token || t.includes(token)
  );
}

export function normalizeStatementRecord(record: Record<string, any>): StatementRow | null {
  const date = parseStatementDate(pickObjectValue(record, ALIASES.date));
  if (!date) return null;

  const description = String(pickObjectValue(record, ALIASES.description) ?? "").trim();
  const reference = String(pickObjectValue(record, ALIASES.reference) ?? "").trim();
  const type = pickObjectValue(record, ALIASES.type);

  let moneyIn = Math.abs(parseStatementAmount(pickObjectValue(record, ALIASES.money_in)));
  let moneyOut = Math.abs(parseStatementAmount(pickObjectValue(record, ALIASES.money_out)));

  if (moneyIn === 0 && moneyOut === 0) {
    const amount = parseStatementAmount(pickObjectValue(record, ALIASES.amount));
    if (amount !== 0) {
      if (isOutType(type)) moneyOut = Math.abs(amount);
      else if (isInType(type)) moneyIn = Math.abs(amount);
      else if (amount < 0) moneyOut = Math.abs(amount);
      else moneyIn = amount;
    }
  }

  if (!(moneyIn > 0 || moneyOut > 0)) return null;
  if (moneyIn > 0 && moneyOut > 0) {
    if (moneyIn >= moneyOut) moneyOut = 0;
    else moneyIn = 0;
  }

  const balanceValue = pickObjectValue(record, ALIASES.balance);
  const runningBalance =
    balanceValue === undefined || balanceValue === null || String(balanceValue).trim() === ""
      ? null
      : parseStatementAmount(balanceValue);

  return {
    date,
    description,
    reference,
    money_in: moneyIn,
    money_out: moneyOut,
    running_balance: runningBalance,
    suggested_category: String(pickObjectValue(record, ALIASES.suggested_category) ?? "").trim(),
  };
}

function tabularRowsToRecords(rows: any[][]): Record<string, any>[] {
  if (!rows.length) return [];
  const headers = rows[0].map((value) => String(value ?? "").replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header || "column_" + (index + 1), row[index] ?? ""]))
  );
}

function scoreHeaderRow(row: string[]): number {
  const mapping = detectStatementColumns(row);
  const hasAmount =
    mapping.money_in !== undefined ||
    mapping.money_out !== undefined ||
    mapping.amount !== undefined;
  return (mapping.date !== undefined ? 5 : 0) + (hasAmount ? 5 : 0) + (mapping.description !== undefined ? 2 : 0);
}

export function parseStatementCsv(text: string): StatementRow[] {
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (rows.length < 2) return [];

  let headerIndex = 0;
  let bestScore = -1;
  rows.slice(0, 20).forEach((row, index) => {
    const score = scoreHeaderRow(row);
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  });
  if (bestScore < 10) return [];

  return tabularRowsToRecords(rows.slice(headerIndex))
    .map(normalizeStatementRecord)
    .filter((row): row is StatementRow => !!row)
    .slice(0, 1000);
}

function extractCandidateRecords(value: any, depth = 0): Record<string, any>[] {
  if (depth > 5 || value === null || value === undefined) return [];

  if (typeof value === "string") {
    try {
      return extractCandidateRecords(JSON.parse(value), depth + 1);
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    if (!value.length) return [];
    if (Array.isArray(value[0])) return tabularRowsToRecords(value as any[][]);
    if (typeof value[0] === "object") return value as Record<string, any>[];
    return [];
  }

  if (typeof value === "object") {
    if (Array.isArray(value.headers) && Array.isArray(value.rows)) {
      return (value.rows as any[][]).map((row) =>
        Object.fromEntries(value.headers.map((header: any, index: number) => [String(header), row[index] ?? ""]))
      );
    }

    const preferredKeys = [
      "transactions",
      "rows",
      "data",
      "records",
      "items",
      "statement_rows",
      "statementRows",
      "transaction_rows",
      "transactionRows",
    ];
    for (const key of preferredKeys) {
      if (value[key] !== undefined) {
        const nested = extractCandidateRecords(value[key], depth + 1);
        if (nested.length) return nested;
      }
    }

    const keys = Object.keys(value).map(normKey);
    const hasDate = keys.some((key) => ALIASES.date.includes(key));
    const hasAmount = keys.some(
      (key) =>
        ALIASES.money_in.includes(key) ||
        ALIASES.money_out.includes(key) ||
        ALIASES.amount.includes(key)
    );
    if (hasDate && hasAmount) return [value];
  }
  return [];
}

export function normalizeExtractedStatement(output: any): StatementRow[] {
  return extractCandidateRecords(output)
    .map(normalizeStatementRecord)
    .filter((row): row is StatementRow => !!row)
    .slice(0, 1000);
}

export function detectStatementFileKind({
  fileName,
  mimeType,
  fileUrl,
}: {
  fileName?: string;
  mimeType?: string;
  fileUrl?: string;
}): "csv" | "pdf" | "xls" | "xlsx" | "txt" | "unknown" {
  const name = String(fileName || "").toLowerCase();
  const match = name.match(/\.([a-z0-9]+)$/);
  const ext = match?.[1];
  if (["csv", "pdf", "xls", "xlsx", "txt"].includes(ext || "")) return ext as any;

  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("csv")) return "csv";
  if (mime.includes("spreadsheetml")) return "xlsx";
  if (mime.includes("ms-excel")) return "xls";
  if (mime.startsWith("text/")) return "txt";

  try {
    const path = new URL(String(fileUrl || "")).pathname.toLowerCase();
    const urlExt = path.match(/\.([a-z0-9]+)$/)?.[1];
    if (["csv", "pdf", "xls", "xlsx", "txt"].includes(urlExt || "")) return urlExt as any;
  } catch {
  }
  return "unknown";
}
