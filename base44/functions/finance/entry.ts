import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireFinanceManager,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/finance.ts";
import { writeAuditLog } from "../../shared/workspace.ts";
import { recomputeQuantity } from "../../shared/inventory.ts";

// Organisation-isolated finance operations. Every action requires the caller
// to hold a finance-manager role in the target organisation (verified
// server-side). Reads happen directly via the client SDK (RLS-enforced); all
// writes go through this function so they can be authorised and audited.
//
// Actions:
//   create_account / update_account / delete_account
//   create_category / update_category / delete_category
//   create_contact / update_contact / delete_contact
//   create_transaction / update_transaction / delete_transaction
//   export_data   export all finance data for the org (audited)
//   seed_demo     populate fictional demo data (Demo mode only, idempotent)
export default async function (req) {
  let requestedAction = "unknown";
  let failureStage = "initialise";
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, organisation_id } = body;
    requestedAction = action || "unknown";
    const svc = base44.asServiceRole;

    if (!organisation_id) {
      return Response.json({ error: "Missing organisation_id" }, { status: 400 });
    }

    // Every finance action requires a finance-manager role in the org.
    failureStage = "membership";
    await requireFinanceManager(svc, user.id, organisation_id);
    failureStage = "organisation";
    const org = await getOrgConfig(svc, organisation_id);
    assertOrgWritable(org);
    failureStage = "action";

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

    const ownRecord = (rec) =>
      rec && rec.organisation_id === organisation_id;

    const findActiveInventoryItem = async (itemId, dataMode) => {
      const matches = await svc.entities.InventoryItem.filter({
        id: String(itemId || "").trim(),
        organisation_id,
        data_mode: dataMode,
        is_active: true,
      }, undefined, 1);
      return matches[0] || null;
    };

    // ---------------- accounts ----------------
    if (action === "resolve_statement_account") {
      const requestedMode = body.data_mode === "demo" || body.data_mode === "live"
        ? body.data_mode
        : (org.data_mode || "live");
      const preferredAccountId = String(body.preferred_account_id || "").trim();
      const moneyAccountTypes = new Set(["bank", "cash", "savings", "mobile_money", "petty_cash"]);
      const accounts = await svc.entities.FinanceAccount.filter({
        organisation_id,
        data_mode: requestedMode,
      });
      const eligibleAccounts = accounts.filter(
        (account) =>
          account.is_active !== false &&
          moneyAccountTypes.has(account.account_type) &&
          (!account.account_class || account.account_class === "asset")
      );
      const account =
        eligibleAccounts.find((candidate) => candidate.id === preferredAccountId) ||
        eligibleAccounts.find((candidate) => candidate.account_type === "bank") ||
        eligibleAccounts.find((candidate) => candidate.account_type === "cash") ||
        eligibleAccounts[0];

      if (!account) {
        return Response.json({
          error: `No bank or cash Finance account exists for this workspace in ${requestedMode === "demo" ? "Demo" : "Live"} mode. Create or select an account, then approve the statement again.`,
          code: "NO_STATEMENT_ACCOUNT",
        }, { status: 400 });
      }

      return Response.json({
        ok: true,
        account: {
          id: account.id,
          name: account.name,
          account_type: account.account_type,
          organisation_id: account.organisation_id,
          data_mode: account.data_mode,
        },
      });
    }

    if (action === "create_account") {
      const { name, account_type, account_number, opening_balance, account_class, account_category } = body;
      const cleanName = String(name || "").trim();
      const requestedMode = body.data_mode || org.data_mode || "live";
      const cleanType = account_type || "cash";
      const cleanClass = account_class || null;
      const balance = opening_balance === "" || opening_balance == null ? 0 : Number(opening_balance);
      if (!cleanName) return Response.json({ error: "Name is required" }, { status: 400 });
      if (!["demo", "live"].includes(requestedMode)) {
        return Response.json({ error: "Invalid data mode" }, { status: 400 });
      }
      if (!["cash", "bank", "savings", "mobile_money", "petty_cash", "other"].includes(cleanType)) {
        return Response.json({ error: "Invalid account type" }, { status: 400 });
      }
      if (cleanClass && !["asset", "liability", "equity", "income", "expense"].includes(cleanClass)) {
        return Response.json({ error: "Invalid account class" }, { status: 400 });
      }
      const isMoneyAccount = ["cash", "bank", "savings", "mobile_money", "petty_cash"].includes(cleanType);
      if (
        cleanClass &&
        isMoneyAccount &&
        (cleanClass !== "asset" || account_category !== "Cash & Bank")
      ) {
        return Response.json({
          error: "Bank and cash accounts must use Asset → Cash & Bank. Expense categories such as Utilities or Supplies use Account kind: Other.",
        }, { status: 400 });
      }
      if (!Number.isFinite(balance)) {
        return Response.json({ error: "Opening balance must be a valid number" }, { status: 400 });
      }

      let rec;
      try {
        failureStage = "create_account";
        rec = await svc.entities.FinanceAccount.create({
          organisation_id,
          name: cleanName,
          account_class: cleanClass,
          account_category: account_category || null,
          account_type: cleanType,
          account_number: account_number || null,
          opening_balance: balance,
          currency: org.currency,
          is_active: true,
          data_mode: requestedMode,
        });
      } catch (createError) {
        console.error("finance.create_account entity failure", {
          organisation_id,
          data_mode: requestedMode,
          account_type: cleanType,
          account_class: cleanClass,
          message: createError?.message || String(createError),
        });
        const createMessage = createError?.message || "entity validation failed";
        if (/rate limit/i.test(createMessage)) {
          return Response.json({
            error: "The Finance account could not be created because the data service is temporarily busy. Your details have been kept; wait a moment, then press Create account once.",
            stage: "finance.create_account",
          }, { status: 429 });
        }
        return Response.json({
          error: "Finance account could not be created: " + createMessage,
        }, { status: 422 });
      }

      try {
        await audit("finance.account_created", "FinanceAccount", rec.id, null, { name: cleanName });
      } catch (auditError) {
        console.error("finance.account_created audit failure", {
          organisation_id,
          account_id: rec.id,
          message: auditError?.message || String(auditError),
        });
      }
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_account") {
      const { account_id, ...patch } = body;
      if (!account_id) return Response.json({ error: "Missing account_id" }, { status: 400 });
      const rec = await svc.entities.FinanceAccount.get(account_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      const before = { name: rec.name, account_type: rec.account_type, opening_balance: rec.opening_balance, is_active: rec.is_active };
      delete patch.account_id;
      delete patch.organisation_id;
      delete patch.currency; // currency is inherited and immutable post-create
      await svc.entities.FinanceAccount.update(account_id, patch);
      await audit("finance.account_updated", "FinanceAccount", account_id, before, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_account") {
      const { account_id } = body;
      if (!account_id) return Response.json({ error: "Missing account_id" }, { status: 400 });
      const rec = await svc.entities.FinanceAccount.get(account_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      const txns = await svc.entities.FinanceTransaction.filter({ organisation_id, account_id });
      if (txns.length) {
        return Response.json({ error: "Cannot delete an account that has transactions" }, { status: 400 });
      }
      await svc.entities.FinanceAccount.delete(account_id);
      await audit("finance.account_deleted", "FinanceAccount", account_id, { name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ---------------- categories ----------------
    if (action === "create_category") {
      const { name, kind, description, color } = body;
      if (!name || !kind) return Response.json({ error: "Name and kind are required" }, { status: 400 });
      if (!["income", "expense"].includes(kind)) return Response.json({ error: "Invalid kind" }, { status: 400 });
      const rec = await svc.entities.FinanceCategory.create({
        organisation_id, name, kind, description: description || null, color: color || null,
        data_mode: body.data_mode || org.data_mode || "live",
      });
      await audit("finance.category_created", "FinanceCategory", rec.id, null, { name, kind });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_category") {
      const { category_id, ...patch } = body;
      if (!category_id) return Response.json({ error: "Missing category_id" }, { status: 400 });
      const rec = await svc.entities.FinanceCategory.get(category_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      const before = { name: rec.name, kind: rec.kind };
      delete patch.category_id;
      delete patch.organisation_id;
      await svc.entities.FinanceCategory.update(category_id, patch);
      await audit("finance.category_updated", "FinanceCategory", category_id, before, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_category") {
      const { category_id } = body;
      if (!category_id) return Response.json({ error: "Missing category_id" }, { status: 400 });
      const rec = await svc.entities.FinanceCategory.get(category_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.FinanceCategory.delete(category_id);
      await audit("finance.category_deleted", "FinanceCategory", category_id, { name: rec.name, kind: rec.kind }, null);
      return Response.json({ ok: true });
    }

    // ---------------- contacts ----------------
    if (action === "create_contact") {
      const { kind, name, email, phone, address, notes } = body;
      if (!kind || !name) return Response.json({ error: "Kind and name are required" }, { status: 400 });
      const rec = await svc.entities.FinanceContact.create({
        organisation_id, kind, name, email: email || null, phone: phone || null, address: address || null, notes: notes || null,
        data_mode: body.data_mode || org.data_mode || "live",
      });
      await audit("finance.contact_created", "FinanceContact", rec.id, null, { kind, name });
      return Response.json({ ok: true, id: rec.id });
    }

    if (action === "update_contact") {
      const { contact_id, ...patch } = body;
      if (!contact_id) return Response.json({ error: "Missing contact_id" }, { status: 400 });
      const rec = await svc.entities.FinanceContact.get(contact_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      const before = { kind: rec.kind, name: rec.name };
      delete patch.contact_id;
      delete patch.organisation_id;
      await svc.entities.FinanceContact.update(contact_id, patch);
      await audit("finance.contact_updated", "FinanceContact", contact_id, before, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_contact") {
      const { contact_id } = body;
      if (!contact_id) return Response.json({ error: "Missing contact_id" }, { status: 400 });
      const rec = await svc.entities.FinanceContact.get(contact_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.FinanceContact.delete(contact_id);
      await audit("finance.contact_deleted", "FinanceContact", contact_id, { kind: rec.kind, name: rec.name }, null);
      return Response.json({ ok: true });
    }

    // ---------------- transactions ----------------
    if (action === "create_transaction") {
      const { direction, account_id, category_id, amount, tax_rate, contact_id, date, reference, description, inventory_item_id, inventory_quantity, receipt_file_url, attachment_urls, status, payment_method, internal_notes, is_recurring, recurring_frequency, source_import_key, idempotency_key } = body;
      if (!direction || !account_id || amount == null || !date) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }
      if (!["in", "out"].includes(direction)) return Response.json({ error: "Invalid direction" }, { status: 400 });
      if (status && !["cleared", "pending", "cancelled"].includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      if (payment_method && !["cash", "bank_transfer", "card", "mobile_money", "cheque", "other"].includes(payment_method)) {
        return Response.json({ error: "Invalid payment method" }, { status: 400 });
      }
      const requestedMode = body.data_mode === "demo" || body.data_mode === "live"
        ? body.data_mode
        : (org.data_mode || "live");
      const transactionCurrency = String(body.currency || org.currency || "").trim().toUpperCase();
      if (!["NGN", "EUR", "GBP", "USD"].includes(transactionCurrency)) {
        return Response.json({ error: "Select a supported transaction currency" }, { status: 400 });
      }
      const acct = await svc.entities.FinanceAccount.get(account_id);
      if (!ownRecord(acct) || acct.data_mode !== requestedMode || acct.is_active === false) {
        return Response.json({
          error: `That Finance account is no longer available for this workspace in ${requestedMode === "demo" ? "Demo" : "Live"} mode. Choose or create a Cash or Bank account and try again.`,
          code: "INVALID_FINANCE_ACCOUNT",
        }, { status: 400 });
      }
      if (category_id) {
        const category = await svc.entities.FinanceCategory.get(category_id);
        const expectedKind = direction === "in" ? "income" : "expense";
        if (!ownRecord(category) || category.data_mode !== requestedMode || category.kind !== expectedKind) {
          return Response.json({ error: `The selected ${expectedKind} category is not available in the active workspace and data mode` }, { status: 400 });
        }
      }
      if (contact_id) {
        const contact = await svc.entities.FinanceContact.get(contact_id);
        if (!ownRecord(contact) || contact.data_mode !== requestedMode) {
          return Response.json({ error: "The selected contact is not available in the active workspace and data mode" }, { status: 400 });
        }
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) return Response.json({ error: "Amount must be positive" }, { status: 400 });

      // Retries are idempotent within the active organisation and data mode.
      // Request keys are stored in private internal notes, avoiding a second
      // transaction system or schema solely for duplicate protection.
      const importKey = String(source_import_key || "").trim().slice(0, 200);
      const requestKey = String(idempotency_key || "").trim().slice(0, 200);
      const requestNote = importKey
        ? `Bank statement import: ${importKey}`
        : requestKey
          ? `FADS request: ${requestKey}`
          : null;
      if (requestNote) {
        const existing = await svc.entities.FinanceTransaction.filter({
          organisation_id,
          data_mode: requestedMode,
          internal_notes: requestNote,
        });
        if (existing.length > 0) {
          return Response.json({ ok: true, id: existing[0].id, duplicate: true });
        }
      }

      let linkedInventoryItemId = null;
      let linkedInventoryQuantity = null;
      let linkedInventoryItem = null;
      if (inventory_item_id) {
        if (org.type !== "small_business" || direction !== "in") {
          return Response.json({ error: "Inventory links are only supported for Small Business money-in sales" }, { status: 400 });
        }
        const linkedItem = await findActiveInventoryItem(inventory_item_id, requestedMode);
        if (!linkedItem) {
          return Response.json({ error: "Invalid inventory item" }, { status: 400 });
        }
        const qty = Number(inventory_quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          return Response.json({ error: "Inventory quantity must be greater than zero" }, { status: 400 });
        }
        const availableQuantity = Number(linkedItem.current_quantity) || 0;
        if (qty > availableQuantity) {
          return Response.json({
            error: `Only ${availableQuantity} ${linkedItem.name} currently in stock. Change the quantity or add stock before saving this sale.`,
          }, { status: 400 });
        }
        linkedInventoryItemId = linkedItem.id;
        linkedInventoryQuantity = qty;
        linkedInventoryItem = linkedItem;
      }

      const rate = tax_rate != null ? Number(tax_rate) : Number(org.default_tax_rate) || 0;
      const tax_amount = Math.round(amt * rate) / 100;
      let rec;
      let stockMovement;
      try {
        failureStage = "create_transaction";
        rec = await svc.entities.FinanceTransaction.create({
          organisation_id,
          direction,
          account_id,
          category_id: category_id || null,
          amount: amt,
          currency: transactionCurrency,
          tax_rate: rate,
          tax_amount,
          tax_label: org.tax_label || "Tax",
          contact_id: contact_id || null,
          date,
          reference: reference || null,
          data_mode: requestedMode,
          description: description || null,
          inventory_item_id: linkedInventoryItemId,
          inventory_quantity: linkedInventoryQuantity,
          payment_method: payment_method || "cash",
          internal_notes: requestNote || internal_notes || null,
          is_recurring: !!is_recurring,
          recurring_frequency: is_recurring ? (recurring_frequency || null) : null,
          receipt_file_url: receipt_file_url || null,
          attachment_urls: Array.isArray(attachment_urls) ? attachment_urls : [],
          status: status || "cleared",
        });

        if (linkedInventoryItemId) {
          failureStage = "create_stock_movement";
          stockMovement = await svc.entities.StockMovement.create({
            organisation_id,
            item_id: linkedInventoryItemId,
            item_name: linkedInventoryItem.name,
            type: "stock_out",
            quantity: linkedInventoryQuantity,
            date,
            reference: `Sale ${rec.id}`,
            note: description ? `Sold: ${description}` : "Recorded from direct sale",
            data_mode: requestedMode,
          });
          const movements = await svc.entities.StockMovement.filter(
            { item_id: linkedInventoryItemId, organisation_id, data_mode: requestedMode },
            "-date",
            5000
          );
          await svc.entities.InventoryItem.update(linkedInventoryItemId, {
            current_quantity: recomputeQuantity(movements),
          });
        }
      } catch (createError) {
        if (stockMovement?.id) {
          await svc.entities.StockMovement.delete(stockMovement.id).catch(() => {});
        }
        if (rec?.id) {
          await svc.entities.FinanceTransaction.delete(rec.id).catch(() => {});
        }
        throw createError;
      }

      try {
        await audit("finance.transaction_created", "FinanceTransaction", rec.id, null, {
          direction,
          amount: amt,
          currency: transactionCurrency,
          date,
          inventory_item_id: linkedInventoryItemId,
          inventory_quantity: linkedInventoryQuantity,
        });
      } catch (auditError) {
        console.error("finance.transaction_created audit failure", {
          organisation_id,
          transaction_id: rec.id,
          message: auditError?.message || String(auditError),
        });
      }
      return Response.json({
        ok: true,
        id: rec.id,
        inventory_updated: !!linkedInventoryItemId,
        stock_movement_id: stockMovement?.id || null,
      });
    }

    if (action === "update_transaction") {
      const { transaction_id, ...patch } = body;
      if (!transaction_id) return Response.json({ error: "Missing transaction_id" }, { status: 400 });
      const rec = await svc.entities.FinanceTransaction.get(transaction_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      const before = { direction: rec.direction, amount: rec.amount, date: rec.date, status: rec.status, account_id: rec.account_id };
      if (patch.status && !["cleared", "pending", "cancelled"].includes(patch.status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      if (patch.payment_method && !["cash", "bank_transfer", "card", "mobile_money", "cheque", "other"].includes(patch.payment_method)) {
        return Response.json({ error: "Invalid payment method" }, { status: 400 });
      }
      const nextDirection = patch.direction || rec.direction;
      const nextDataMode = patch.data_mode || rec.data_mode || org.data_mode || "live";
      const inventoryTouched =
        patch.inventory_item_id !== undefined || patch.inventory_quantity !== undefined;

      if (rec.inventory_item_id && patch.direction && patch.direction !== "in") {
        return Response.json({ error: "An inventory-linked sale must remain Money In" }, { status: 400 });
      }
      if (rec.inventory_item_id && patch.data_mode && patch.data_mode !== rec.data_mode) {
        return Response.json({ error: "An inventory-linked sale cannot move between Demo and Live" }, { status: 400 });
      }

      if (inventoryTouched) {
        const nextItemId = patch.inventory_item_id === "" ? null
          : (patch.inventory_item_id !== undefined ? patch.inventory_item_id : rec.inventory_item_id);
        if (!nextItemId) {
          patch.inventory_item_id = null;
          patch.inventory_quantity = null;
        } else {
          if (org.type !== "small_business" || nextDirection !== "in") {
            return Response.json({ error: "Inventory links are only supported for Small Business money-in sales" }, { status: 400 });
          }
          const linkedItem = await findActiveInventoryItem(nextItemId, nextDataMode);
          if (!linkedItem) {
            return Response.json({ error: "Invalid inventory item" }, { status: 400 });
          }
          const nextQty = patch.inventory_quantity !== undefined
            ? Number(patch.inventory_quantity)
            : Number(rec.inventory_quantity);
          if (!Number.isFinite(nextQty) || nextQty <= 0) {
            return Response.json({ error: "Inventory quantity must be greater than zero" }, { status: 400 });
          }
          patch.inventory_item_id = nextItemId;
          patch.inventory_quantity = nextQty;
        }
      }

      delete patch.transaction_id;
      delete patch.organisation_id;
      delete patch.currency; // immutable historical field
      // recompute tax if amount or rate changed
      if (patch.amount != null || patch.tax_rate != null) {
        const amt = Number(patch.amount != null ? patch.amount : rec.amount);
        const rate = Number(patch.tax_rate != null ? patch.tax_rate : rec.tax_rate);
        patch.amount = amt;
        patch.tax_rate = rate;
        patch.tax_amount = Math.round(amt * rate) / 100;
      }
      if (patch.account_id) {
        const acct = await svc.entities.FinanceAccount.get(patch.account_id);
        if (!ownRecord(acct)) return Response.json({ error: "Invalid account" }, { status: 400 });
      }
      await svc.entities.FinanceTransaction.update(transaction_id, patch);
      await audit("finance.transaction_updated", "FinanceTransaction", transaction_id, before, patch);
      return Response.json({ ok: true });
    }

    if (action === "delete_transaction") {
      const { transaction_id } = body;
      if (!transaction_id) return Response.json({ error: "Missing transaction_id" }, { status: 400 });
      const rec = await svc.entities.FinanceTransaction.get(transaction_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      await svc.entities.FinanceTransaction.delete(transaction_id);
      await audit("finance.transaction_deleted", "FinanceTransaction", transaction_id, { direction: rec.direction, amount: rec.amount, date: rec.date }, null);
      return Response.json({ ok: true });
    }

    // ---------------- export ----------------
    if (action === "export_data") {
      const exportMode = body.data_mode === "demo" || body.data_mode === "live"
        ? body.data_mode
        : (org.data_mode || "live");
      const exportScope = { organisation_id, data_mode: exportMode };
      const [accounts, categories, contacts, transactions, auditLogs] = await Promise.all([
        svc.entities.FinanceAccount.filter(exportScope),
        svc.entities.FinanceCategory.filter(exportScope),
        svc.entities.FinanceContact.filter(exportScope),
        svc.entities.FinanceTransaction.filter(exportScope),
        // AuditLog has no data_mode field; it remains organisation-scoped metadata.
        svc.entities.AuditLog.filter({ organisation_id }),
      ]);
      await audit("finance.exported", "FinanceExport", organisation_id, null, {
        accounts: accounts.length,
        transactions: transactions.length,
        data_mode: exportMode,
      });
      return Response.json({
        ok: true,
        data: {
          organisation: { id: org.id, name: org.name, type: org.type, currency: org.currency, data_mode: exportMode },
          accounts,
          categories,
          contacts,
          transactions,
          auditLogs,
        },
      });
    }

    // ---------------- csv export (filtered, org-only) ----------------
    if (action === "export_csv") {
      const { date_from, date_to, direction, category_id, account_id, contact_id, payment_method, status, search } = body;
      // Export only the selected Demo/Live mode — never mix the two.
      const exportMode = body.data_mode === "demo" || body.data_mode === "live" ? body.data_mode : (org.data_mode || "live");
      // Transactions are filtered by data_mode, mirroring useFinance().
      let txns = await svc.entities.FinanceTransaction.filter({ organisation_id, data_mode: exportMode }, "-date", 500);
      if (direction) txns = txns.filter((t) => t.direction === direction);
      if (category_id) txns = txns.filter((t) => t.category_id === category_id);
      if (account_id) txns = txns.filter((t) => t.account_id === account_id);
      if (contact_id) txns = txns.filter((t) => t.contact_id === contact_id);
      if (payment_method) txns = txns.filter((t) => t.payment_method === payment_method);
      if (status) txns = txns.filter((t) => t.status === status);
      if (date_from) txns = txns.filter((t) => t.date && t.date >= date_from);
      if (date_to) txns = txns.filter((t) => t.date && t.date <= date_to);
      if (search) {
        const q = String(search).toLowerCase();
        txns = txns.filter((t) =>
          (t.description || "").toLowerCase().includes(q) ||
          (t.reference || "").toLowerCase().includes(q)
        );
      }
      // Every exported finance source uses the same organisation/mode scope.
      const exportScope = { organisation_id, data_mode: exportMode };
      const [accounts, categories, contacts, invoices, payments] = await Promise.all([
        svc.entities.FinanceAccount.filter(exportScope),
        svc.entities.FinanceCategory.filter(exportScope),
        svc.entities.FinanceContact.filter(exportScope),
        svc.entities.Invoice.filter(exportScope, "-issue_date", 200),
        svc.entities.InvoicePayment.filter(exportScope, "-date", 500),
      ]);
      const { toCSV, invoicesToCSV, paymentsToCSV } = await import("../../shared/finance.ts");
      const txnCsv = toCSV(txns, { accounts, categories, contacts });
      const invCsv = invoicesToCSV(invoices);
      const payCsv = paymentsToCSV(payments, invoices);
      const csv = [txnCsv, invCsv, payCsv].filter(Boolean).join("\n\n");
      const count = txns.length + invoices.length + payments.length;
      await audit("finance.exported_csv", "FinanceExport", organisation_id, null, { transactions: txns.length, invoices: invoices.length, payments: payments.length, data_mode: exportMode });
      return Response.json({ ok: true, csv, count, transactions: txns.length, invoices: invoices.length, payments: payments.length, data_mode: exportMode });
    }

    // ---------------- demo seed ----------------
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Seeding is only available in Demo mode" }, { status: 400 });
      }
      const existing = await svc.entities.FinanceAccount.filter({
        organisation_id,
        data_mode: "demo",
      });
      if (existing.length) {
        return Response.json({ ok: true, seeded: false, message: "Finance data already exists" });
      }
      const { buildDemoSeed } = await import("../../shared/finance.ts");
      const seed = buildDemoSeed(org);

      const accounts = await svc.entities.FinanceAccount.bulkCreate(
        seed.accounts.map((a) => ({
          organisation_id,
          name: a.name,
          account_type: a.account_type,
          opening_balance: a.opening_balance,
          currency: org.currency,
          is_active: true,
          data_mode: "demo",
        }))
      );
      const accountMap = {};
      accounts.forEach((acc, i) => { accountMap[seed.accounts[i].key] = acc.id; });

      const categories = await svc.entities.FinanceCategory.bulkCreate(
        seed.categories.map((c) => ({ organisation_id, name: c.name, kind: c.kind, data_mode: "demo" }))
      );
      const categoryMap = {};
      categories.forEach((c, i) => { categoryMap[seed.categories[i].key] = c.id; });

      const contacts = await svc.entities.FinanceContact.bulkCreate(
        seed.contacts.map((c) => ({
          organisation_id, kind: c.kind, name: c.name,
          email: c.email || null, phone: c.phone || null,
          data_mode: "demo",
        }))
      );
      const contactMap = {};
      contacts.forEach((c, i) => { contactMap[seed.contacts[i].key] = c.id; });

      const rate = Number(org.default_tax_rate) || 0;
      const transactions = await svc.entities.FinanceTransaction.bulkCreate(
        seed.transactions.map((t) => {
          const amt = Number(t.amount);
          const seedAcct = seed.accounts.find((a) => a.key === t.accountKey);
          return {
            organisation_id,
            direction: t.direction,
            account_id: accountMap[t.accountKey],
            category_id: t.categoryKey ? categoryMap[t.categoryKey] : null,
            amount: amt,
            currency: org.currency,
            tax_rate: rate,
            tax_amount: Math.round(amt * rate) / 100,
            tax_label: org.tax_label || "Tax",
            contact_id: t.contactKey ? contactMap[t.contactKey] : null,
            date: t.date,
            description: t.description,
            payment_method: seedAcct?.account_type === "bank" ? "bank_transfer" : "cash",
            is_recurring: false,
            status: t.status,
            attachment_urls: [],
            data_mode: "demo",
          };
        })
      );

      await audit("finance.demo_seeded", "FinanceSeed", organisation_id, null, {
        accounts: accounts.length,
        categories: categories.length,
        contacts: contacts.length,
        transactions: transactions.length,
      });
      return Response.json({
        ok: true,
        seeded: true,
        counts: {
          accounts: accounts.length,
          categories: categories.length,
          contacts: contacts.length,
          transactions: transactions.length,
        },
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error?.message || "Finance request failed";
    if (/rate limit/i.test(message)) {
      return Response.json({
        error:
          requestedAction === "create_account"
            ? "The Finance account could not be created because the data service is temporarily busy. Your details have been kept; wait a moment, then press Create account once."
            : "This Finance operation could not be completed because the data service is temporarily busy. Please try the same action again shortly.",
        stage: `finance.${requestedAction}.${failureStage}`,
      }, { status: 429 });
    }
    const status = message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: message, stage: `finance.${requestedAction}.${failureStage}` }, { status });
  }
}