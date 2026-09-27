import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireFinanceManager,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/finance.ts";
import { writeAuditLog } from "../../shared/workspace.ts";
import { computeInvoiceTotals, buildOrgSnapshot } from "../../shared/invoices.ts";

const EDITABLE_STATUSES = ["draft", "sent"];
const USER_STATUS_TRANSITIONS = {
  draft: ["sent", "accepted", "declined", "expired"],
  sent: ["accepted", "declined", "expired"],
  accepted: [],
  declined: [],
  expired: [],
  converted: [],
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function generateQuotationNumber(svc, organisation_id, data_mode) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const quotation_number = `QUO-${year}-${suffix}`;
    const existing = await svc.entities.Quotation.filter({
      organisation_id,
      quotation_number,
      data_mode,
    });
    if (!existing.length) return quotation_number;
  }
  throw new Error("Unable to generate quotation number");
}

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

    if (org.type !== "small_business") {
      return Response.json({ error: "Quotations are currently available for Small Business workspaces only" }, { status: 400 });
    }

    const requestedMode = body.data_mode === "demo" || body.data_mode === "live"
      ? body.data_mode
      : (org.data_mode || "live");

    const audit = (act, entity_id, before, after) =>
      writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: act,
        entity_type: "Quotation",
        entity_id,
        before,
        after,
      });

    const ownQuote = (rec) =>
      rec &&
      rec.organisation_id === organisation_id &&
      rec.data_mode === requestedMode;

    const loadCustomer = async (customer_id) => {
      if (!customer_id) return null;
      const customer = await svc.entities.FinanceContact.get(customer_id);
      if (
        !customer ||
        customer.organisation_id !== organisation_id ||
        customer.data_mode !== requestedMode
      ) {
        return null;
      }
      return customer;
    };

    const validateInventoryLinks = async (lineItems = []) => {
      const itemIds = [...new Set(
        (lineItems || []).map((line) => line?.inventory_item_id).filter(Boolean)
      )];
      for (const itemId of itemIds) {
        const item = await svc.entities.InventoryItem.get(itemId);
        if (
          !item ||
          item.organisation_id !== organisation_id ||
          item.data_mode !== requestedMode
        ) {
          return "Invalid inventory item on quotation";
        }
      }
      return null;
    };

    if (action === "create_quotation") {
      const { customer_id, issue_date, valid_until, line_items, notes, terms } = body;
      if (!customer_id || !issue_date || !valid_until) {
        return Response.json({ error: "Customer, issue date and valid-until date are required" }, { status: 400 });
      }
      if (valid_until < issue_date) {
        return Response.json({ error: "Valid-until date cannot be before the issue date" }, { status: 400 });
      }

      const customer = await loadCustomer(customer_id);
      if (!customer) return Response.json({ error: "Invalid customer" }, { status: 400 });

      const inventoryError = await validateInventoryLinks(line_items);
      if (inventoryError) return Response.json({ error: inventoryError }, { status: 400 });

      const totals = computeInvoiceTotals(line_items, org.default_tax_rate);
      if (!totals.line_items.length) {
        return Response.json({ error: "At least one line item is required" }, { status: 400 });
      }
      if (totals.total <= 0) {
        return Response.json({ error: "Quotation total must be greater than zero" }, { status: 400 });
      }

      const quotation_number = await generateQuotationNumber(svc, organisation_id, requestedMode);
      const rec = await svc.entities.Quotation.create({
        organisation_id,
        quotation_number,
        customer_id,
        customer_name: customer.name,
        customer_email: customer.email || null,
        customer_address: customer.address || null,
        issue_date,
        valid_until,
        currency: org.currency,
        line_items: totals.line_items,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        tax_total: totals.tax_total,
        total: totals.total,
        notes: notes || null,
        terms: terms || null,
        status: "draft",
        converted_invoice_id: null,
        org_snapshot: buildOrgSnapshot(org),
        logo_url: org.logo_url || null,
        data_mode: requestedMode,
      });

      await audit("quotation.created", rec.id, null, {
        quotation_number,
        total: totals.total,
        status: "draft",
      });

      return Response.json({ ok: true, id: rec.id, quotation_number });
    }

    if (action === "update_quotation") {
      const { quotation_id, line_items, ...rawPatch } = body;
      if (!quotation_id) return Response.json({ error: "Missing quotation_id" }, { status: 400 });

      const rec = await svc.entities.Quotation.get(quotation_id);
      if (!ownQuote(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      if (!EDITABLE_STATUSES.includes(rec.status)) {
        return Response.json({ error: "Only draft or sent quotations can be edited" }, { status: 400 });
      }

      const patch = { ...rawPatch };
      delete patch.action;
      delete patch.quotation_id;
      delete patch.organisation_id;
      delete patch.data_mode;
      delete patch.quotation_number;
      delete patch.currency;
      delete patch.status;
      delete patch.converted_invoice_id;
      delete patch.org_snapshot;
      delete patch.logo_url;
      delete patch.subtotal;
      delete patch.discount_total;
      delete patch.tax_total;
      delete patch.total;

      const issueDate = patch.issue_date || rec.issue_date;
      const validUntil = patch.valid_until || rec.valid_until;
      if (validUntil < issueDate) {
        return Response.json({ error: "Valid-until date cannot be before the issue date" }, { status: 400 });
      }

      if (line_items) {
        const inventoryError = await validateInventoryLinks(line_items);
        if (inventoryError) return Response.json({ error: inventoryError }, { status: 400 });
        const totals = computeInvoiceTotals(line_items, org.default_tax_rate);
        if (!totals.line_items.length || totals.total <= 0) {
          return Response.json({ error: "Quotation must contain at least one positive line item" }, { status: 400 });
        }
        patch.line_items = totals.line_items;
        patch.subtotal = totals.subtotal;
        patch.discount_total = totals.discount_total;
        patch.tax_total = totals.tax_total;
        patch.total = totals.total;
      }

      if (patch.customer_id) {
        const customer = await loadCustomer(patch.customer_id);
        if (!customer) return Response.json({ error: "Invalid customer" }, { status: 400 });
        patch.customer_name = customer.name;
        patch.customer_email = customer.email || null;
        patch.customer_address = customer.address || null;
      }

      const before = {
        customer_id: rec.customer_id,
        total: rec.total,
        status: rec.status,
        valid_until: rec.valid_until,
      };

      await svc.entities.Quotation.update(quotation_id, patch);
      await audit("quotation.updated", quotation_id, before, patch);
      return Response.json({ ok: true });
    }

    if (action === "set_status") {
      const { quotation_id, status } = body;
      if (!quotation_id || !status) {
        return Response.json({ error: "Quotation and status are required" }, { status: 400 });
      }
      const rec = await svc.entities.Quotation.get(quotation_id);
      if (!ownQuote(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      if (status === "converted") {
        return Response.json({ error: "Converted status is set only by Convert to Invoice" }, { status: 400 });
      }
      const allowed = USER_STATUS_TRANSITIONS[rec.status] || [];
      if (!allowed.includes(status)) {
        return Response.json({ error: `Cannot change quotation from ${rec.status} to ${status}` }, { status: 400 });
      }
      await svc.entities.Quotation.update(quotation_id, { status });
      await audit("quotation.status_changed", quotation_id, { status: rec.status }, { status });
      return Response.json({ ok: true, status });
    }

    if (action === "email_quotation") {
      const { quotation_id, subject, message } = body;
      if (!quotation_id) return Response.json({ error: "Missing quotation_id" }, { status: 400 });
      const rec = await svc.entities.Quotation.get(quotation_id);
      if (!ownQuote(rec)) return Response.json({ error: "Not found" }, { status: 404 });

      const to = String(rec.customer_email || "").trim();
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

      await audit("quotation.emailed", quotation_id, null, {
        to,
        subject: emailSubject.slice(0, 100),
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
