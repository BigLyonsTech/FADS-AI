// Shared invoice/receipt helpers used by the Phase 1C backend function.
// Totals computation, org-specific numbering, wording and org snapshots.
// Runs with the service-role client (svc) passed in by callers.

import { financeWording } from "./finance.ts";

export const INVOICE_STATUSES = ["draft", "issued", "part_paid", "paid", "cancelled"];

// Org-type-aware wording for invoices and receipts. Mirrors the client-side
// invoiceWording in src/lib/financeWording.js so server audit labels and UI
// labels stay in sync.
export function invoiceWording(orgType) {
  const base = financeWording(orgType);
  switch (orgType) {
    case "school":
      return {
        ...base,
        invoiceNoun: "Fee Statement",
        invoicePlural: "Fee Statements",
        receiptNoun: "Payment Receipt",
        receiptPlural: "Payment Receipts",
        invoicesEnabled: true,
        receiptKinds: [
          { value: "school_fee", label: "School Fee" },
          { value: "payment", label: "Payment" },
          { value: "general", label: "General" },
        ],
        defaultReceiptKind: "school_fee",
        customerNoun: "Parent/Guardian",
      };
    case "church":
      return {
        ...base,
        invoiceNoun: "Invoice",
        invoicePlural: "Invoices",
        receiptNoun: "Receipt",
        receiptPlural: "Receipts",
        invoicesEnabled: false,
        receiptKinds: [
          { value: "donation", label: "Donation" },
          { value: "tithe", label: "Tithe" },
          { value: "offering", label: "Offering" },
          { value: "general", label: "General" },
        ],
        defaultReceiptKind: "donation",
        customerNoun: "Member/Donor",
      };
    default: // small_business
      return {
        ...base,
        invoiceNoun: "Invoice",
        invoicePlural: "Invoices",
        receiptNoun: "Receipt",
        receiptPlural: "Receipts",
        invoicesEnabled: true,
        receiptKinds: [
          { value: "payment", label: "Payment" },
          { value: "general", label: "General" },
        ],
        defaultReceiptKind: "payment",
        customerNoun: "Customer",
      };
  }
}

// Compute per-line totals and invoice-level totals from raw line items.
// Each line: gross = qty * price; net = max(0, gross - discount);
// tax = round(net * rate) / 100; total = net + tax.
export function computeInvoiceTotals(lineItems, defaultTaxRate) {
  const items = (lineItems || []).map((li) => {
    const qty = Number(li.quantity) || 1;
    const price = Number(li.unit_price) || 0;
    const discount = Number(li.discount) || 0;
    const rate = li.tax_rate != null ? Number(li.tax_rate) : Number(defaultTaxRate) || 0;
    const gross = qty * price;
    const net = Math.max(0, gross - discount);
    const tax_amount = Math.round(net * rate) / 100;
    const total = Math.round((net + tax_amount) * 100) / 100;
    return {
      description: li.description || "",
      inventory_item_id: li.inventory_item_id || null,
      quantity: qty,
      unit_price: price,
      discount,
      tax_rate: rate,
      tax_amount,
      total,
    };
  });
  const subtotal = Math.round(items.reduce((s, li) => s + li.quantity * li.unit_price, 0) * 100) / 100;
  const discount_total = Math.round(items.reduce((s, li) => s + li.discount, 0) * 100) / 100;
  const tax_total = Math.round(items.reduce((s, li) => s + li.tax_amount, 0) * 100) / 100;
  const total = Math.round((subtotal - discount_total + tax_total) * 100) / 100;
  return { line_items: items, subtotal, discount_total, tax_total, total };
}

export function invoiceNumberPrefix(orgType) {
  if (orgType === "school") return "FEE";
  return "INV";
}

export function nextInvoiceNumber(existingCount, orgType) {
  const year = new Date().getFullYear();
  const seq = String((existingCount || 0) + 1).padStart(4, "0");
  return `${invoiceNumberPrefix(orgType)}-${year}-${seq}`;
}

export function nextReceiptNumber(existingCount) {
  const year = new Date().getFullYear();
  const seq = String((existingCount || 0) + 1).padStart(4, "0");
  return `RCT-${year}-${seq}`;
}

// Derive display status: "overdue" when issued/part_paid, past due, balance > 0.
export function deriveInvoiceStatus(invoice, todayStr) {
  if (!invoice) return "draft";
  if (invoice.status === "cancelled") return "cancelled";
  if (invoice.status === "paid") return "paid";
  const balance = Number(invoice.balance);
  if (balance > 0 && invoice.due_date && invoice.due_date < todayStr) {
    return "overdue";
  }
  if (invoice.status === "part_paid") return "part_paid";
  return invoice.status || "draft";
}

// Snapshot org details onto the invoice/receipt so the PDF is historically
// accurate even if the org later changes its name or tax settings.
export function buildOrgSnapshot(org) {
  return {
    name: org.name,
    address: org.address || null,
    phone: org.phone || null,
    email: org.email || null,
    currency: org.currency,
    tax_label: org.tax_label || "Tax",
    tax_id_label: org.tax_id_label || null,
    tax_id_value: org.tax_id_value || null,
    country: org.country,
  };
}