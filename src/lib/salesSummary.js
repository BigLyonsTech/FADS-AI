const SALE_CATEGORY_NAMES = new Set(["sales", "service income"]);

function num(value) {
  return Number(value) || 0;
}

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function mondayOfWeek(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const offset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - offset);
  return isoDate(d);
}

function monthStart(now) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function deriveSalesSummary({
  transactions = [],
  invoices = [],
  payments = [],
  categories = [],
  contacts = [],
  now = new Date(),
} = {}) {
  const categoryById = new Map(categories.map((c) => [c.id, normalise(c.name)]));
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const invoicePaymentTxnIds = new Set(
    payments.map((p) => p.finance_transaction_id).filter(Boolean)
  );

  const directSales = transactions.filter((t) => {
    if (t.direction !== "in" || t.status !== "cleared") return false;
    if (invoicePaymentTxnIds.has(t.id)) return false;
    return SALE_CATEGORY_NAMES.has(categoryById.get(t.category_id) || "");
  });

  const invoiceSales = invoices.filter((invoice) =>
    ["issued", "part_paid", "paid"].includes(invoice.status)
  );

  const today = isoDate(now);
  const weekStart = mondayOfWeek(now);
  const currentMonthStart = monthStart(now);

  const saleDate = (sale) => sale.kind === "invoice" ? sale.issue_date : sale.date;
  const saleAmount = (sale) => num(sale.amount);

  const saleRows = [
    ...invoiceSales.map((invoice) => ({
      id: invoice.id,
      kind: "invoice",
      date: invoice.issue_date,
      issue_date: invoice.issue_date,
      customer: invoice.customer_name || "Customer",
      description:
        invoice.line_items?.map((item) => item.description).filter(Boolean).join(", ") ||
        invoice.invoice_number ||
        "Invoice",
      reference: invoice.invoice_number || "",
      amount: num(invoice.total),
      amount_received: num(invoice.amount_paid),
      outstanding: Math.max(0, num(invoice.balance)),
      payment_status: num(invoice.balance) > 0 ? "owed" : "paid",
      href: `/finance/invoices/${invoice.id}`,
    })),
    ...directSales.map((transaction) => {
      const contact = transaction.contact_id ? contactById.get(transaction.contact_id) : null;
      return {
        id: transaction.id,
        kind: "direct",
        date: transaction.date,
        customer: contact?.name || "Walk-in / no customer",
        description: transaction.description || "Sale",
        reference: transaction.reference || "",
        amount: num(transaction.amount),
        amount_received: num(transaction.amount),
        outstanding: 0,
        payment_status: "paid",
        payment_method: transaction.payment_method || "",
        href: `/finance/transactions/${transaction.id}`,
      };
    }),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const sumFrom = (start, end = today) =>
    saleRows
      .filter((sale) => {
        const date = saleDate(sale);
        return date && date >= start && date <= end;
      })
      .reduce((sum, sale) => sum + saleAmount(sale), 0);

  const moneyReceived =
    directSales.reduce((sum, transaction) => sum + num(transaction.amount), 0) +
    invoiceSales.reduce((sum, invoice) => sum + num(invoice.amount_paid), 0);

  const moneyStillOwed = invoiceSales.reduce(
    (sum, invoice) => sum + Math.max(0, num(invoice.balance)),
    0
  );

  return {
    directSales,
    invoiceSales,
    invoicePaymentTxnIds,
    salesToday: sumFrom(today),
    salesThisWeek: sumFrom(weekStart),
    salesThisMonth: sumFrom(currentMonthStart),
    moneyReceived,
    moneyStillOwed,
    salesRows: saleRows,
    recentSales: saleRows.slice(0, 20),
  };
}
