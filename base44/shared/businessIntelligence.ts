// FADS Business Intelligence — server-side compact summary for the central
// Ask FADS assistant. Computes headline metrics from the finance + invoice data
// already gathered by the assistant backend, so "How is my business doing?"
// is answered with real numbers rather than invented figures. The full
// structured computation lives client-side in src/lib/businessIntelligence.js;
// this is a lightweight text block for LLM context only.

const DAY = 86400000;

function num(n: any): number {
  return Number(n) || 0;
}
function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function prevMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

// Build a compact text block of computed business intelligence for the assistant
// context. Reuses the finance data (transactions, invoices, accounts,
// categories) already gathered by the assistant backend.
export function buildIntelligenceBlock(
  org: any,
  finance: { transactions: any[]; invoices: any[]; accounts: any[]; categories?: any[] }
): string {
  const cur = org.currency || "";
  const cleared = finance.transactions.filter(
    (t: any) => t.status === "cleared" || t.status === "completed"
  );
  if (cleared.length < 3) return "";

  const lines: string[] = ["=== BUSINESS INTELLIGENCE (computed from FADS records) ==="];

  // --- Cash position & cashflow ---
  const net = cleared.reduce(
    (s: number, t: any) => s + (t.direction === "in" ? num(t.amount) : -num(t.amount)),
    0
  );
  const opening = (finance.accounts || []).reduce((s: number, a: any) => s + num(a.opening_balance), 0);
  const cashNow = opening + net;

  const now = Date.now();
  const w90 = cleared.filter((t: any) => {
    const d = t.date ? new Date(t.date.length === 10 ? t.date + "T00:00:00" : t.date) : null;
    return d && now - d.getTime() <= 90 * DAY;
  });
  const out90 = w90.filter((t: any) => t.direction === "out").reduce((s: number, t: any) => s + num(t.amount), 0);
  const in90 = w90.filter((t: any) => t.direction === "in").reduce((s: number, t: any) => s + num(t.amount), 0);
  const avgDailyOut = out90 / 90;
  const avgDailyIn = in90 / 90;
  const netBurnPerDay = avgDailyOut - avgDailyIn;

  const outstandingInv = (finance.invoices || []).filter(
    (inv: any) => num(inv.balance) > 0 && inv.status !== "paid" && inv.status !== "cancelled"
  );
  const expectedIn = outstandingInv.reduce((s: number, inv: any) => s + num(inv.balance), 0);

  lines.push(`Current cash position: ${cur} ${cashNow.toFixed(2)}`);
  lines.push(`Average daily inflow (90d): ${cur} ${avgDailyIn.toFixed(2)}`);
  lines.push(`Average daily outflow (90d): ${cur} ${avgDailyOut.toFixed(2)}`);
  lines.push(`Outstanding invoices (expected in): ${cur} ${expectedIn.toFixed(2)} across ${outstandingInv.length} invoice(s)`);
  if (netBurnPerDay > 0) {
    const daysToTight = Math.floor(cashNow / netBurnPerDay);
    lines.push(`Cash-flow outlook: at the current recorded rate, available cash may become tight in approximately ${daysToTight} day(s).`);
  } else {
    lines.push(`Cash-flow outlook: income is keeping pace with or exceeding spending based on recent records.`);
  }

  // --- Debt ageing ---
  const today = new Date().toISOString().slice(0, 10);
  const overdue = outstandingInv
    .map((inv: any) => {
      const due = inv.due_date ? new Date(inv.due_date + "T00:00:00") : null;
      const days = due ? Math.floor((new Date(today + "T00:00:00").getTime() - due.getTime()) / DAY) : 0;
      return { inv, days };
    })
    .filter((r: any) => r.days > 0);
  const totalOverdue = overdue.reduce((s: number, r: any) => s + num(r.inv.balance), 0);
  if (overdue.length > 0) {
    const b30 = overdue.filter((r: any) => r.days <= 30).reduce((s: number, r: any) => s + num(r.inv.balance), 0);
    const b60 = overdue.filter((r: any) => r.days > 30 && r.days <= 60).reduce((s: number, r: any) => s + num(r.inv.balance), 0);
    const b90 = overdue.filter((r: any) => r.days > 60 && r.days <= 90).reduce((s: number, r: any) => s + num(r.inv.balance), 0);
    const b90p = overdue.filter((r: any) => r.days > 90).reduce((s: number, r: any) => s + num(r.inv.balance), 0);
    lines.push(`Overdue customer debt: ${cur} ${totalOverdue.toFixed(2)} across ${overdue.length} invoice(s) — 1-30d: ${cur} ${b30.toFixed(2)}, 31-60d: ${cur} ${b60.toFixed(2)}, 61-90d: ${cur} ${b90.toFixed(2)}, 90+d: ${cur} ${b90p.toFixed(2)}`);
  }

  // --- Profitability ---
  const totalIn = cleared.filter((t: any) => t.direction === "in").reduce((s: number, t: any) => s + num(t.amount), 0);
  const totalOut = cleared.filter((t: any) => t.direction === "out").reduce((s: number, t: any) => s + num(t.amount), 0);
  const profit = totalIn - totalOut;
  lines.push(`Estimated profit (all cleared records): ${cur} ${profit.toFixed(2)} (income ${cur} ${totalIn.toFixed(2)} − expenses ${cur} ${totalOut.toFixed(2)})`);

  // --- Record completeness ---
  const categorised = cleared.filter((t: any) => t.category_id).length;
  const completeness = cleared.length > 0 ? Math.round((categorised / cleared.length) * 100) : 0;
  lines.push(`Record completeness: ${completeness}% of transactions categorised`);

  // --- Guardian: quick anomaly count ---
  const out = cleared.filter((t: any) => t.direction === "out");
  const avgOut = out.length > 0 ? out.reduce((s: number, t: any) => s + num(t.amount), 0) / out.length : 0;
  const largeCount = avgOut > 0 ? out.filter((t: any) => num(t.amount) > avgOut * 3).length : 0;
  const thisMk = monthKey();
  const thisMonthTotal = out.filter((t: any) => (t.date || "").slice(0, 7) === thisMk).reduce((s: number, t: any) => s + num(t.amount), 0);
  const lastMk = prevMonthKey();
  const lastMonthTotal = out.filter((t: any) => (t.date || "").slice(0, 7) === lastMk).reduce((s: number, t: any) => s + num(t.amount), 0);
  const spike = lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal * 1.3;
  if (largeCount > 0 || spike) {
    const notes: string[] = [];
    if (largeCount > 0) notes.push(`${largeCount} unusually large expense(s)`);
    if (spike) notes.push(`spending this month (${cur} ${thisMonthTotal.toFixed(2)}) is significantly higher than last month (${cur} ${lastMonthTotal.toFixed(2)})`);
    lines.push(`Business Guardian: ${notes.join("; ")} — worth reviewing.`);
  }

  lines.push("Intelligence guidance: Use these computed figures to answer 'How is my business doing?' with a concise Business Brief (revenue, expenses, estimated profit, cash position, outstanding debt, tax readiness, key warnings, recommended next action). Always say figures are based on the records currently available in FADS and are estimates, not guaranteed outcomes.");
  lines.push("");

  return lines.join("\n");
}