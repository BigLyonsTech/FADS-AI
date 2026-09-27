import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireFinanceManager,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/finance.ts";
import { writeAuditLog } from "../../shared/workspace.ts";
import {
  computeInvoiceTotals,
  nextInvoiceNumber,
  nextReceiptNumber,
  buildOrgSnapshot,
} from "../../shared/invoices.ts";

// Organisation-isolated invoice, payment and receipt operations. Every
// action requires a finance-manager role in the target org (verified
// server-side). Reads go through the client SDK (RLS-enforced); all writes
// go through this function so they are authorised and audited.
//
// Actions:
//   create_invoice / update_invoice / issue_invoice / cancel_invoice
//   record_payment   (creates Money In + InvoicePayment + Receipt, updates balance)
//   create_receipt   (standalone receipt from a cleared Money In transaction)
//   cancel_receipt
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, organisation_id } = body;
    const svc = base44.asServiceRole;

    if (!organisation_id) {
      return Response.json({ error: "Missing organisation_id" }, { status: 400 });
    }

    await requireFinanceManager(svc, user.id, organisation_id);
    const org = await getOrgConfig(svc, organisation_id);
    assertOrgWritable(org);
    const requestedMode = body.data_mode === "demo" || body.data_mode === "live"
      ? body.data_mode
      : (org.data_mode || "live");

    const audit = (act, entity_type, entity_id, before, after) =>
      writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: act,
        entity_type,
        entity_id,
        before,
        after,
      });

    const ownRecord = (rec) => rec && rec.organisation_id === organisation_id;

    const validateInventoryLinks = async (lineItems = []) => {
      const itemIds = [...new Set(
        (lineItems || []).map((line) => line?.inventory_item_id).filter(Boolean)
      )];
      if (!itemIds.length) return null;
      if (org.type !== "small_business") {
        return "Inventory-linked invoice lines are only supported for Small Business";
      }
      for (const itemId of itemIds) {
        const item = await svc.entities.InventoryItem.get(itemId);
        if (!item || item.organisation_id !== organisation_id || item.data_mode !== requestedMode) {
          return "Invalid inventory item on invoice";
        }
      }
      return null;
    };

    const createInvoiceRecord = async ({
      customer_id,
      issue_date,
      due_date,
      line_items,
      payment_instructions,
      notes,
      status,
      source_quotation_id = null,
    }) => {
      if (!customer_id || !issue_date || !due_date) {
        return { error: "Customer, issue date and due date are required", status: 400 };
      }
      const customer = await svc.entities.FinanceContact.get(customer_id);
      if (
        !customer ||
        customer.organisation_id !== organisation_id ||
        customer.data_mode !== requestedMode
      ) {
        return { error: "Invalid customer", status: 400 };
      }
      const inventoryLinkError = await validateInventoryLinks(line_items);
      if (inventoryLinkError) return { error: inventoryLinkError, status: 400 };

      const totals = computeInvoiceTotals(line_items, org.default_tax_rate);
      if (!totals.line_items.length) {
        return { error: "At least one line item is required", status: 400 };
      }
      if (totals.total <= 0) {
        return { error: "Invoice total must be greater than zero", status: 400 };
      }

      const existing = await svc.entities.Invoice.filter({ organisation_id, data_mode: requestedMode });
      const invoice_number = nextInvoiceNumber(existing.length, org.type);
      const st = status === "issued" ? "issued" : "draft";
      const rec = await svc.entities.Invoice.create({
        organisation_id,
        invoice_number,
        customer_id,
        customer_name: customer.name,
        customer_email: customer.email || null,
        customer_address: customer.address || null,
        issue_date,
        due_date,
        currency: org.currency,
        line_items: totals.line_items,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        tax_total: totals.tax_total,
        total: totals.total,
        amount_paid: 0,
        balance: totals.total,
        status: st,
        payment_instructions: payment_instructions || null,
        notes: notes || null,
        source_quotation_id,
        org_snapshot: buildOrgSnapshot(org),
        logo_url: org.logo_url || null,
        data_mode: requestedMode,
      });
      await audit("invoice.created", "Invoice", rec.id, null, {
        invoice_number,
        total: totals.total,
        status: st,
        source_quotation_id,
      });
      return { rec, invoice_number, totals, invoice_status: st };
    };

    // ---------------- create invoice ----------------
    if (action === "create_invoice") {
      const result = await createInvoiceRecord({ ...body, source_quotation_id: null });
      if (result.error) {
        return Response.json({ error: result.error }, { status: result.status });
      }
      return Response.json({
        ok: true,
        id: result.rec.id,
        invoice_number: result.invoice_number,
      });
    }

    // ---------------- create invoice from accepted quotation ----------------
    if (action === "create_from_quotation") {
      const { quotation_id, issue_date, due_date } = body;
      if (!quotation_id || !due_date) {
        return Response.json({ error: "Quotation and invoice due date are required" }, { status: 400 });
      }
      if (org.type !== "small_business") {
        return Response.json({ error: "Quotation conversion is only available for Small Business" }, { status: 400 });
      }

      const quote = await svc.entities.Quotation.get(quotation_id);
      if (
        !quote ||
        quote.organisation_id !== organisation_id ||
        quote.data_mode !== requestedMode
      ) {
        return Response.json({ error: "Quotation not found" }, { status: 404 });
      }

      // Idempotency repair path: if an invoice already exists for this quote,
      // return it instead of creating another, and repair the quotation link.
      if (quote.converted_invoice_id) {
        const linked = await svc.entities.Invoice.get(quote.converted_invoice_id);
        if (
          linked &&
          linked.organisation_id === organisation_id &&
          linked.data_mode === requestedMode &&
          linked.source_quotation_id === quote.id
        ) {
          return Response.json({
            ok: true,
            id: linked.id,
            invoice_number: linked.invoice_number,
            already_converted: true,
          });
        }
      }

      const existingFromQuote = await svc.entities.Invoice.filter({
        organisation_id,
        source_quotation_id: quote.id,
        data_mode: requestedMode,
      });
      if (existingFromQuote.length) {
        const existingInvoice = existingFromQuote[0];
        if (quote.converted_invoice_id !== existingInvoice.id || quote.status !== "converted") {
          await svc.entities.Quotation.update(quote.id, {
            converted_invoice_id: existingInvoice.id,
            status: "converted",
          });
        }
        return Response.json({
          ok: true,
          id: existingInvoice.id,
          invoice_number: existingInvoice.invoice_number,
          already_converted: true,
        });
      }

      if (quote.status !== "accepted") {
        return Response.json({ error: "Only accepted quotations can be converted to an invoice" }, { status: 400 });
      }

      const invoiceIssueDate = issue_date || new Date().toISOString().slice(0, 10);
      if (due_date < invoiceIssueDate) {
        return Response.json({ error: "Invoice due date cannot be before the issue date" }, { status: 400 });
      }

      const convertedNotes = [
        quote.notes || "",
        quote.terms ? `Quotation terms: ${quote.terms}` : "",
        `Converted from ${quote.quotation_number}`,
      ].filter(Boolean).join("\n\n");

      const result = await createInvoiceRecord({
        customer_id: quote.customer_id,
        issue_date: invoiceIssueDate,
        due_date,
        line_items: quote.line_items,
        payment_instructions: null,
        notes: convertedNotes,
        status: "draft",
        source_quotation_id: quote.id,
      });
      if (result.error) {
        return Response.json({ error: result.error }, { status: result.status });
      }

      // A second conversion request may arrive before the first request has
      // written converted_invoice_id. Re-query by the durable source link and
      // keep the earliest draft invoice as the canonical conversion.
      const conversionInvoices = await svc.entities.Invoice.filter({
        organisation_id,
        source_quotation_id: quote.id,
        data_mode: requestedMode,
      });
      const canonical = conversionInvoices
        .slice()
        .sort((a, b) => {
          const aKey = `${a.created_date || ""}:${a.id}`;
          const bKey = `${b.created_date || ""}:${b.id}`;
          return aKey.localeCompare(bKey);
        })[0] || result.rec;

      if (canonical.id !== result.rec.id && result.rec.status === "draft" && Number(result.rec.amount_paid || 0) === 0) {
        await svc.entities.Invoice.delete(result.rec.id);
      }

      await svc.entities.Quotation.update(quote.id, {
        converted_invoice_id: canonical.id,
        status: "converted",
      });
      await audit(
        "quotation.converted",
        "Quotation",
        quote.id,
        { status: quote.status, converted_invoice_id: quote.converted_invoice_id || null },
        { status: "converted", converted_invoice_id: canonical.id }
      );

      return Response.json({
        ok: true,
        id: canonical.id,
        invoice_number: canonical.invoice_number,
        already_converted: canonical.id !== result.rec.id,
      });
    }

    // ---------------- update invoice ----------------
    if (action === "update_invoice") {
      const { invoice_id, line_items, ...patch } = body;
      if (!invoice_id) return Response.json({ error: "Missing invoice_id" }, { status: 400 });
      const rec = await svc.entities.Invoice.get(invoice_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      if (rec.status === "paid" || rec.status === "cancelled") {
        return Response.json({ error: "Cannot edit a paid or cancelled invoice" }, { status: 400 });
      }
      const before = { status: rec.status, total: rec.total, balance: rec.balance, customer_id: rec.customer_id };
      delete patch.invoice_id;
      delete patch.organisation_id;
      delete patch.invoice_number;
      delete patch.currency;
      delete patch.amount_paid;
      delete patch.balance;
      delete patch.status;
      delete patch.org_snapshot;
      delete patch.source_quotation_id;
      if (line_items) {
        const inventoryLinkError = await validateInventoryLinks(line_items);
        if (inventoryLinkError) return Response.json({ error: inventoryLinkError }, { status: 400 });
        const totals = computeInvoiceTotals(line_items, org.default_tax_rate);
        if (!totals.line_items.length) {
          return Response.json({ error: "At least one line item is required" }, { status: 400 });
        }
        patch.line_items = totals.line_items;
        patch.subtotal = totals.subtotal;
        patch.discount_total = totals.discount_total;
        patch.tax_total = totals.tax_total;
        patch.total = totals.total;
        // If no payments recorded yet, reset balance to the new total.
        const payments = await svc.entities.InvoicePayment.filter({ organisation_id, invoice_id, data_mode: requestedMode });
        if (payments.length === 0) {
          patch.balance = totals.total;
        }
      }
      if (patch.customer_id) {
        const customer = await svc.entities.FinanceContact.get(patch.customer_id);
        if (!ownRecord(customer)) return Response.json({ error: "Invalid customer" }, { status: 400 });
        patch.customer_name = customer.name;
        patch.customer_email = customer.email || null;
        patch.customer_address = customer.address || null;
      }
      await svc.entities.Invoice.update(invoice_id, patch);
      await audit("invoice.updated", "Invoice", invoice_id, before, patch);
      return Response.json({ ok: true });
    }

    // ---------------- issue invoice (draft -> issued) ----------------
    if (action === "issue_invoice") {
      const { invoice_id } = body;
      if (!invoice_id) return Response.json({ error: "Missing invoice_id" }, { status: 400 });
      const rec = await svc.entities.Invoice.get(invoice_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      if (rec.status !== "draft") {
        return Response.json({ error: "Only draft invoices can be issued" }, { status: 400 });
      }
      await svc.entities.Invoice.update(invoice_id, { status: "issued" });
      await audit("invoice.issued", "Invoice", invoice_id, { status: "draft" }, { status: "issued" });
      return Response.json({ ok: true });
    }

    // ---------------- cancel invoice ----------------
    if (action === "cancel_invoice") {
      const { invoice_id, reason } = body;
      if (!invoice_id) return Response.json({ error: "Missing invoice_id" }, { status: 400 });
      const rec = await svc.entities.Invoice.get(invoice_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      if (rec.status === "paid") {
        return Response.json({ error: "Cannot cancel a paid invoice" }, { status: 400 });
      }
      const before = { status: rec.status, balance: rec.balance };
      const notes = reason ? (rec.notes ? rec.notes + "\n" + reason : reason) : rec.notes;
      await svc.entities.Invoice.update(invoice_id, { status: "cancelled", notes });
      await audit("invoice.cancelled", "Invoice", invoice_id, before, { status: "cancelled" });
      return Response.json({ ok: true });
    }

    // ---------------- email invoice ----------------
    // Uses the existing Base44 SendEmail integration. This action is deliberately
    // read-only with respect to invoice financial/document status.
    if (action === "email_invoice") {
      const { invoice_id, subject, message } = body;
      if (!invoice_id) return Response.json({ error: "Missing invoice_id" }, { status: 400 });
      const inv = await svc.entities.Invoice.get(invoice_id);
      if (
        !inv ||
        inv.organisation_id !== organisation_id ||
        inv.data_mode !== requestedMode
      ) {
        return Response.json({ error: "Invoice not found" }, { status: 404 });
      }

      const to = String(inv.customer_email || "").trim();
      const emailSubject = String(subject || "").trim();
      const emailBody = String(message || "").trim();
      if (!to) return Response.json({ error: "This customer does not have an email address" }, { status: 400 });
      if (!emailSubject || !emailBody) {
        return Response.json({ error: "Subject and message are required" }, { status: 400 });
      }

      try {
        await svc.integrations.Core.SendEmail({
          to,
          subject: emailSubject,
          body: emailBody,
          from_name: org.name || "FADS",
        });
      } catch (error) {
        return Response.json({ error: error.message || "Unable to send email" }, { status: 502 });
      }

      await audit("invoice.emailed", "Invoice", invoice_id, null, {
        to,
        subject: emailSubject.slice(0, 100),
      });
      return Response.json({ ok: true });
    }

    // ---------------- record payment ----------------
    // Creates a Money In transaction, an InvoicePayment allocation, updates
    // the invoice balance/status, and issues a receipt — all in one action.
    if (action === "record_payment") {
      const { invoice_id, account_id, category_id, amount, date, payment_method, reference, notes } = body;
      if (!invoice_id || !account_id || !amount || !date) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }
      const inv = await svc.entities.Invoice.get(invoice_id);
      if (!ownRecord(inv)) return Response.json({ error: "Not found" }, { status: 404 });
      if (inv.status === "cancelled" || inv.status === "paid") {
        return Response.json({ error: "Invoice is " + inv.status }, { status: 400 });
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return Response.json({ error: "Amount must be positive" }, { status: 400 });
      }
      const balance = Number(inv.balance);
      if (amt > balance + 0.01) {
        return Response.json({ error: "Payment exceeds outstanding balance" }, { status: 400 });
      }
      const acct = await svc.entities.FinanceAccount.get(account_id);
      if (!ownRecord(acct)) return Response.json({ error: "Invalid account" }, { status: 400 });

      // 1. Money In transaction
      const txn = await svc.entities.FinanceTransaction.create({
        organisation_id,
        direction: "in",
        account_id,
        category_id: category_id || null,
        amount: amt,
        currency: org.currency,
        tax_rate: 0,
        tax_amount: 0,
        tax_label: org.tax_label || "Tax",
        contact_id: inv.customer_id,
        date,
        reference: reference || inv.invoice_number,
        description: `Payment for ${inv.invoice_number}`,
        payment_method: payment_method || "cash",
        internal_notes: notes || null,
        is_recurring: false,
        attachment_urls: [],
        status: "cleared",
        data_mode: requestedMode,
      });

      // 2. InvoicePayment allocation
      const pay = await svc.entities.InvoicePayment.create({
        organisation_id,
        invoice_id,
        finance_transaction_id: txn.id,
        amount: amt,
        currency: org.currency,
        date,
        payment_method: payment_method || "cash",
        reference: reference || null,
        notes: notes || null,
        data_mode: requestedMode,
      });

      // 3. Update invoice balance + status
      const newPaid = Math.round((Number(inv.amount_paid) + amt) * 100) / 100;
      const newBalance = Math.max(0, Math.round((Number(inv.total) - newPaid) * 100) / 100);
      const newStatus = newBalance <= 0.01 ? "paid" : "part_paid";
      await svc.entities.Invoice.update(invoice_id, {
        amount_paid: newPaid,
        balance: newBalance,
        status: newStatus,
      });

      // 4. Receipt
      const existingReceipts = await svc.entities.Receipt.filter({ organisation_id, data_mode: requestedMode });
      const receipt_number = nextReceiptNumber(existingReceipts.length);
      const kind = org.type === "school" ? "school_fee" : "payment";
      const receipt = await svc.entities.Receipt.create({
        organisation_id,
        receipt_number,
        kind,
        invoice_id,
        invoice_payment_id: pay.id,
        finance_transaction_id: txn.id,
        payer_name: inv.customer_name,
        payer_email: inv.customer_email,
        amount: amt,
        currency: org.currency,
        date,
        payment_method: payment_method || "cash",
        description: `Payment for ${inv.invoice_number}`,
        reference: reference || inv.invoice_number,
        org_snapshot: buildOrgSnapshot(org),
        logo_url: org.logo_url || null,
        data_mode: requestedMode,
      });

      await audit("invoice.payment_recorded", "Invoice", invoice_id, { balance, status: inv.status }, { amount_paid: newPaid, balance: newBalance, status: newStatus });
      await audit("receipt.created", "Receipt", receipt.id, null, { receipt_number, kind, amount: amt });
      return Response.json({ ok: true, invoice_status: newStatus, balance: newBalance, receipt_id: receipt.id });
    }

    // ---------------- create receipt (standalone) ----------------
    // For church donations/tithes/offerings and other non-invoiced money in.
    if (action === "create_receipt") {
      const { finance_transaction_id, kind, description } = body;
      if (!finance_transaction_id) {
        return Response.json({ error: "Missing finance_transaction_id" }, { status: 400 });
      }
      const txn = await svc.entities.FinanceTransaction.get(finance_transaction_id);
      if (!ownRecord(txn)) return Response.json({ error: "Not found" }, { status: 404 });
      if (txn.direction !== "in") {
        return Response.json({ error: "Receipts can only be issued for money received" }, { status: 400 });
      }
      if (txn.status !== "cleared") {
        return Response.json({ error: "Receipts can only be issued for cleared transactions" }, { status: 400 });
      }
      const existing = await svc.entities.Receipt.filter({ organisation_id, finance_transaction_id, data_mode: requestedMode });
      if (existing.length) {
        return Response.json({ error: "A receipt already exists for this transaction" }, { status: 400 });
      }
      const validKinds = org.type === "church" ? ["donation", "tithe", "offering", "general"] : ["payment", "general"];
      const rKind = validKinds.includes(kind) ? kind : validKinds[0];
      const contact = txn.contact_id ? await svc.entities.FinanceContact.get(txn.contact_id) : null;
      const existingReceipts = await svc.entities.Receipt.filter({ organisation_id, data_mode: requestedMode });
      const receipt_number = nextReceiptNumber(existingReceipts.length);
      const rec = await svc.entities.Receipt.create({
        organisation_id,
        receipt_number,
        kind: rKind,
        finance_transaction_id,
        invoice_id: null,
        invoice_payment_id: null,
        payer_name: contact?.name || null,
        payer_email: contact?.email || null,
        amount: Number(txn.amount),
        currency: txn.currency,
        date: txn.date,
        payment_method: txn.payment_method || "cash",
        description: description || txn.description || rKind,
        reference: txn.reference || null,
        org_snapshot: buildOrgSnapshot(org),
        logo_url: org.logo_url || null,
        data_mode: requestedMode,
      });
      await audit("receipt.created", "Receipt", rec.id, null, { receipt_number, kind: rKind, amount: txn.amount });
      return Response.json({ ok: true, id: rec.id, receipt_number });
    }

    // ---------------- record reminder ----------------
    // Records that a collection reminder was sent for an invoice. Updates
    // last_reminder_date and last_reminder_channel so the Money Owed page
    // can show "last reminder" per account. Does NOT mark the invoice as paid.
    if (action === "record_reminder") {
      const { invoice_id, channel } = body;
      if (!invoice_id) return Response.json({ error: "Missing invoice_id" }, { status: 400 });
      const validChannels = ["whatsapp", "email", "dm"];
      const ch = validChannels.includes(channel) ? channel : "whatsapp";
      const inv = await svc.entities.Invoice.get(invoice_id);
      if (!ownRecord(inv)) return Response.json({ error: "Not found" }, { status: 404 });
      const now = new Date().toISOString();
      await svc.entities.Invoice.update(invoice_id, {
        last_reminder_date: now,
        last_reminder_channel: ch,
      });
      await audit("invoice.reminder_recorded", "Invoice", invoice_id, null, {
        invoice_number: inv.invoice_number,
        channel: ch,
        date: now,
      });
      return Response.json({ ok: true });
    }

    // ---------------- cancel receipt ----------------
    if (action === "cancel_receipt") {
      const { receipt_id } = body;
      if (!receipt_id) return Response.json({ error: "Missing receipt_id" }, { status: 400 });
      const rec = await svc.entities.Receipt.get(receipt_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.Receipt.delete(receipt_id);
      await audit("receipt.cancelled", "Receipt", receipt_id, { receipt_number: rec.receipt_number }, null);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
}