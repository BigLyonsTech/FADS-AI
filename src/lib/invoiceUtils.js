// Client-side invoice/receipt helpers. Mirrors the server-side logic in
// base44/shared/invoices.ts so the form can live-compute totals and the UI
// can derive display status (overdue) consistently.

export const INVOICE_STATUSES = ["draft", "issued", "part_paid", "paid", "cancelled"];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export function paymentMethodLabel(value) {
  return PAYMENT_METHODS.find((p) => p.value === value)?.label || value || "";
}

// Compute per-line and invoice-level totals from raw line items.
export function computeInvoiceTotals(lineItems, defaultTaxRate) {
  const items = (lineItems || []).map((li) => {
    const qty = Number(li.quantity) || 1;
    const price = Number(li.unit_price) || 0;
    const discount = Number(li.discount) || 0;
    const rate = li.tax_rate != null && li.tax_rate !== "" ? Number(li.tax_rate) : Number(defaultTaxRate) || 0;
    const gross = qty * price;
    const net = Math.max(0, gross - discount);
    const tax_amount = Math.round(net * rate) / 100;
    const total = Math.round((net + tax_amount) * 100) / 100;
    return { ...li, quantity: qty, unit_price: price, discount, tax_rate: rate, tax_amount, total };
  });
  const subtotal = Math.round(items.reduce((s, li) => s + li.quantity * li.unit_price, 0) * 100) / 100;
  const discount_total = Math.round(items.reduce((s, li) => s + li.discount, 0) * 100) / 100;
  const tax_total = Math.round(items.reduce((s, li) => s + li.tax_amount, 0) * 100) / 100;
  const total = Math.round((subtotal - discount_total + tax_total) * 100) / 100;
  return { line_items: items, subtotal, discount_total, tax_total, total };
}

// Derive display status: "overdue" when issued/part_paid, past due, balance > 0.
export function deriveInvoiceStatus(invoice) {
  if (!invoice) return "draft";
  if (invoice.status === "cancelled") return "cancelled";
  if (invoice.status === "paid") return "paid";
  const balance = Number(invoice.balance);
  const today = new Date().toISOString().slice(0, 10);
  if (balance > 0 && invoice.due_date && invoice.due_date < today) {
    return "overdue";
  }
  if (invoice.status === "part_paid") return "part_paid";
  return invoice.status || "draft";
}

export function statusBadgeClass(status) {
  switch (status) {
    case "paid":
      return "bg-status-ok/15 text-status-ok border-status-ok/30";
    case "overdue":
      return "bg-status-bad/15 text-status-bad border-status-bad/30";
    case "part_paid":
      return "bg-status-warn/15 text-status-warn border-status-warn/30";
    case "issued":
      return "bg-brand-teal/15 text-brand-teal border-brand-teal/30";
    case "cancelled":
      return "bg-muted text-muted-foreground border-border";
    default: // draft
      return "bg-muted text-muted-foreground border-border";
  }
}

export function statusLabel(status) {
  const map = {
    draft: "Draft",
    issued: "Issued",
    part_paid: "Part Paid",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return map[status] || status;
}

export function receiptKindLabel(kind) {
  const map = {
    payment: "Payment",
    donation: "Donation",
    tithe: "Tithe",
    offering: "Offering",
    school_fee: "School Fee",
    general: "General",
  };
  return map[kind] || kind;
}