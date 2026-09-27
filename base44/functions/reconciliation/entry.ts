import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireFinanceManager,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/finance.ts";
import { writeAuditLog } from "../../shared/workspace.ts";
import {
  parseCSV,
  autoDetectColumns,
  parseDate,
  parseAmount,
  lineHash,
  scoreMatch,
  buildSummary,
} from "../../shared/reconciliation.ts";

// Organisation-isolated bank/cash reconciliation. Every action requires a
// finance-manager role (verified server-side). Reads go through the client
// SDK (RLS-enforced); all writes go through this function so they are
// authorised and audited.
//
// Actions:
//   preview_csv              Fetch + parse uploaded CSV, return preview (NO writes)
//   import_statement         Create Reconciliation + StatementLines after confirmation
//   suggest_matches          Recompute suggestions for unmatched lines
//   match_line               Confirm a suggested or manual match (never auto)
//   unmatch_line             Remove a match
//   ignore_line              Skip a line (excluded from completion check)
//   create_transaction_from_line  Create Money In/Out from an unmatched line + auto-match
//   complete_reconciliation  Finalise, compute difference, mark complete
//   seed_demo                Seed one fictional Demo reconciliation (Demo mode only)

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

    // Recompute + persist matched_count for a reconciliation.
    const refreshMatchedCount = async (reconciliation_id) => {
      const lines = await svc.entities.StatementLine.filter({ reconciliation_id });
      const matched = lines.filter((l) => l.status === "matched").length;
      await svc.entities.Reconciliation.update(reconciliation_id, { matched_count: matched });
      return matched;
    };

    // Parse a CSV file_url into structured rows using a column mapping.
    // Shared by preview_csv and import_statement so both see identical data.
    const parseFile = async (file_url, column_mapping) => {
      const resp = await fetch(file_url);
      if (!resp.ok) throw new Error("Could not fetch CSV file");
      const text = await resp.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV file is empty or has no data rows");
      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1).slice(0, 500); // cap at 500 rows
      const mapping =
        column_mapping && Object.keys(column_mapping).length > 0
          ? column_mapping
          : autoDetectColumns(headers);

      const col = (row, field) => {
        const idx = mapping[field];
        return idx !== undefined && idx !== null ? row[idx] : "";
      };

      const parsed = dataRows.map((row, i) => {
        const date = parseDate(col(row, "date"));
        const desc = col(row, "description").trim();
        const ref = col(row, "reference").trim();
        let amountIn = 0;
        let amountOut = 0;
        // Single "amount" column with sign
        if (mapping.amount !== undefined && mapping.amount_in === undefined && mapping.amount_out === undefined) {
          const amt = parseAmount(col(row, "amount"));
          if (amt >= 0) amountIn = amt;
          else amountOut = -amt;
        } else {
          amountIn = parseAmount(col(row, "amount_in"));
          amountOut = parseAmount(col(row, "amount_out"));
          // Fallback: some banks put a signed amount in one column even with two mapped
          if (amountIn === 0 && amountOut === 0 && mapping.amount !== undefined) {
            const amt = parseAmount(col(row, "amount"));
            if (amt >= 0) amountIn = amt;
            else amountOut = -amt;
          }
        }
        const balance = mapping.balance !== undefined ? parseAmount(col(row, "balance")) : 0;
        const hash = lineHash({ date: date || "", description: desc, amount_in: amountIn, amount_out: amountOut });
        const valid = !!date && (amountIn > 0 || amountOut > 0);
        return {
          row_index: i + 1,
          date,
          description: desc,
          reference: ref,
          amount_in: amountIn,
          amount_out: amountOut,
          balance,
          raw_hash: hash,
          valid,
          is_duplicate: false,
        };
      });

      // Duplicate detection within the file
      const hashCount = {};
      parsed.forEach((p) => {
        if (p.valid) hashCount[p.raw_hash] = (hashCount[p.raw_hash] || 0) + 1;
      });
      parsed.forEach((p) => {
        if (p.valid && hashCount[p.raw_hash] > 1) p.is_duplicate = true;
      });

      // Duplicate detection against existing statement lines for this org
      const existingLines = await svc.entities.StatementLine.filter({ organisation_id });
      const existingHashes = new Set(existingLines.map((l) => l.raw_hash));
      parsed.forEach((p) => {
        if (p.valid && existingHashes.has(p.raw_hash)) p.is_duplicate = true;
      });

      return { headers, mapping, parsed };
    };

    // ---------------- preview_csv ----------------
    // Validates and previews the file. NO records are created.
    if (action === "preview_csv") {
      const { file_url, column_mapping } = body;
      if (!file_url) return Response.json({ error: "Missing file_url" }, { status: 400 });
      const { headers, mapping, parsed } = await parseFile(file_url, column_mapping);
      const validRows = parsed.filter((p) => p.valid);
      const invalidRows = parsed.filter((p) => !p.valid);
      const dupRows = parsed.filter((p) => p.is_duplicate);
      return Response.json({
        ok: true,
        headers,
        detected_mapping: mapping,
        total_rows: parsed.length,
        valid_rows: validRows.length,
        invalid_rows: invalidRows.length,
        duplicate_rows: dupRows.length,
        preview: parsed,
        invalid_examples: invalidRows.slice(0, 10),
      });
    }

    // ---------------- import_statement ----------------
    // Creates the Reconciliation + StatementLines after the user confirms.
    if (action === "import_statement") {
      const {
        file_url,
        column_mapping,
        account_id,
        period_start,
        period_end,
        opening_balance,
        closing_balance,
        skip_duplicates,
      } = body;
      if (!file_url || !account_id || !period_start || !period_end) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }
      const acct = await svc.entities.FinanceAccount.get(account_id);
      if (!ownRecord(acct)) return Response.json({ error: "Invalid account" }, { status: 400 });

      const { parsed } = await parseFile(file_url, column_mapping);
      let toImport = parsed.filter((p) => p.valid);
      if (skip_duplicates) {
        toImport = toImport.filter((p) => !p.is_duplicate);
      }
      if (toImport.length === 0) {
        return Response.json({ error: "No valid rows to import" }, { status: 400 });
      }

      // Duplicate-statement detection: same account + same period
      const existingRecs = await svc.entities.Reconciliation.filter({ organisation_id, account_id });
      const dupStatement = existingRecs.find(
        (r) => r.period_start === period_start && r.period_end === period_end
      );
      if (dupStatement) {
        return Response.json(
          { error: "A reconciliation already exists for this account and period", duplicate_statement_id: dupStatement.id },
          { status: 400 }
        );
      }

      const rec = await svc.entities.Reconciliation.create({
        organisation_id,
        account_id,
        account_name: acct.name,
        period_start,
        period_end,
        opening_balance: Number(opening_balance) || 0,
        closing_balance: Number(closing_balance) || 0,
        currency: org.currency,
        status: "in_progress",
        imported_count: toImport.length,
        matched_count: 0,
        difference: 0,
        created_by_id: user.id,
        created_by_email: user.email,
      });

      const lines = await svc.entities.StatementLine.bulkCreate(
        toImport.map((p) => ({
          organisation_id,
          reconciliation_id: rec.id,
          row_index: p.row_index,
          date: p.date,
          description: p.description,
          reference: p.reference,
          amount_in: p.amount_in,
          amount_out: p.amount_out,
          balance: p.balance,
          status: "unmatched",
          raw_hash: p.raw_hash,
          is_duplicate: p.is_duplicate,
        }))
      );

      // Compute suggestions against cleared transactions for this account
      const txns = await svc.entities.FinanceTransaction.filter({
        organisation_id,
        account_id,
        status: "cleared",
      });
      const alreadyMatched = new Set(
        (await svc.entities.StatementLine.filter({ organisation_id, status: "matched" }))
          .map((l) => l.matched_transaction_id)
          .filter(Boolean)
      );

      const updates = [];
      for (const line of lines) {
        let best = null;
        for (const txn of txns) {
          if (alreadyMatched.has(txn.id)) continue;
          const result = scoreMatch(line, txn);
          if (result.confidence !== "none" && (!best || result.score > best.score)) {
            best = { ...result, txn_id: txn.id };
          }
        }
        if (best) {
          updates.push({
            id: line.id,
            status: "suggested",
            suggested_transaction_id: best.txn_id,
            suggestion_confidence: best.confidence,
          });
        }
      }
      if (updates.length > 0) await svc.entities.StatementLine.bulkUpdate(updates);

      await audit("reconciliation.created", "Reconciliation", rec.id, null, {
        account_name: acct.name,
        period: period_start + " to " + period_end,
        lines: toImport.length,
      });
      return Response.json({ ok: true, id: rec.id, imported_count: toImport.length });
    }

    // ---------------- suggest_matches ----------------
    // Recompute suggestions for unmatched lines (e.g. after new transactions created).
    if (action === "suggest_matches") {
      const { reconciliation_id } = body;
      if (!reconciliation_id) return Response.json({ error: "Missing reconciliation_id" }, { status: 400 });
      const rec = await svc.entities.Reconciliation.get(reconciliation_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      const lines = await svc.entities.StatementLine.filter({ organisation_id, reconciliation_id });
      const unmatched = lines.filter((l) => l.status === "unmatched");
      if (unmatched.length === 0) return Response.json({ ok: true, suggestions: 0 });

      const txns = await svc.entities.FinanceTransaction.filter({
        organisation_id,
        account_id: rec.account_id,
        status: "cleared",
      });
      const matchedTxnIds = new Set(
        lines.filter((l) => l.status === "matched" && l.matched_transaction_id).map((l) => l.matched_transaction_id)
      );

      const updates = [];
      for (const line of unmatched) {
        let best = null;
        for (const txn of txns) {
          if (matchedTxnIds.has(txn.id)) continue;
          const result = scoreMatch(line, txn);
          if (result.confidence !== "none" && (!best || result.score > best.score)) {
            best = { ...result, txn_id: txn.id };
          }
        }
        if (best) {
          updates.push({
            id: line.id,
            status: "suggested",
            suggested_transaction_id: best.txn_id,
            suggestion_confidence: best.confidence,
          });
        }
      }
      if (updates.length > 0) await svc.entities.StatementLine.bulkUpdate(updates);
      await audit("reconciliation.suggestions_refreshed", "Reconciliation", reconciliation_id, null, { count: updates.length });
      return Response.json({ ok: true, suggestions: updates.length });
    }

    // ---------------- match_line ----------------
    // Confirms a match. Never called automatically — always user-initiated.
    if (action === "match_line") {
      const { line_id, transaction_id } = body;
      if (!line_id || !transaction_id) {
        return Response.json({ error: "Missing line_id or transaction_id" }, { status: 400 });
      }
      const line = await svc.entities.StatementLine.get(line_id);
      if (!ownRecord(line)) return Response.json({ error: "Not found" }, { status: 404 });
      const txn = await svc.entities.FinanceTransaction.get(transaction_id);
      if (!ownRecord(txn)) return Response.json({ error: "Invalid transaction" }, { status: 400 });

      // Prevent double-matching a transaction
      const existing = await svc.entities.StatementLine.filter({
        organisation_id,
        matched_transaction_id: transaction_id,
        status: "matched",
      });
      if (existing.length > 0 && existing[0].id !== line_id) {
        return Response.json({ error: "Transaction is already matched to another line" }, { status: 400 });
      }

      const before = { status: line.status, matched_transaction_id: line.matched_transaction_id };
      await svc.entities.StatementLine.update(line_id, {
        status: "matched",
        matched_transaction_id: transaction_id,
        suggested_transaction_id: null,
        suggestion_confidence: null,
      });
      await refreshMatchedCount(line.reconciliation_id);
      await audit("reconciliation.line_matched", "StatementLine", line_id, before, { status: "matched", transaction_id });
      return Response.json({ ok: true });
    }

    // ---------------- unmatch_line ----------------
    if (action === "unmatch_line") {
      const { line_id } = body;
      if (!line_id) return Response.json({ error: "Missing line_id" }, { status: 400 });
      const line = await svc.entities.StatementLine.get(line_id);
      if (!ownRecord(line)) return Response.json({ error: "Not found" }, { status: 404 });
      if (line.status === "unmatched") {
        return Response.json({ error: "Line is already unmatched" }, { status: 400 });
      }
      const before = { status: line.status, matched_transaction_id: line.matched_transaction_id };
      // Works for matched (clears the link) and suggested/ignored (reset to unmatched).
      await svc.entities.StatementLine.update(line_id, {
        status: "unmatched",
        matched_transaction_id: null,
        suggested_transaction_id: null,
        suggestion_confidence: null,
      });
      await refreshMatchedCount(line.reconciliation_id);
      await audit("reconciliation.line_unmatched", "StatementLine", line_id, before, { status: "unmatched" });
      return Response.json({ ok: true });
    }

    // ---------------- ignore_line ----------------
    // Formally ignores a line with a mandatory recorded reason. The reason
    // is required for the reconciliation to be marked Reconciled later.
    if (action === "ignore_line") {
      const { line_id, reason } = body;
      if (!line_id) return Response.json({ error: "Missing line_id" }, { status: 400 });
      if (!reason || !String(reason).trim()) {
        return Response.json({ error: "A reason is required to formally ignore a line" }, { status: 400 });
      }
      const line = await svc.entities.StatementLine.get(line_id);
      if (!ownRecord(line)) return Response.json({ error: "Not found" }, { status: 404 });
      if (line.status === "matched") {
        return Response.json({ error: "Unmatch the line before ignoring" }, { status: 400 });
      }
      const before = { status: line.status };
      await svc.entities.StatementLine.update(line_id, {
        status: "ignored",
        ignore_reason: String(reason).trim(),
        suggested_transaction_id: null,
        suggestion_confidence: null,
      });
      await audit("reconciliation.line_ignored", "StatementLine", line_id, before, { status: "ignored", reason });
      return Response.json({ ok: true });
    }

    // ---------------- create_transaction_from_line ----------------
    // Creates a Money In or Money Out record from an unmatched statement line,
    // then auto-matches the line to the new transaction.
    if (action === "create_transaction_from_line") {
      const { line_id, category_id, contact_id, payment_method, description } = body;
      if (!line_id) return Response.json({ error: "Missing line_id" }, { status: 400 });
      const line = await svc.entities.StatementLine.get(line_id);
      if (!ownRecord(line)) return Response.json({ error: "Not found" }, { status: 404 });
      if (line.status === "matched") {
        return Response.json({ error: "Line is already matched" }, { status: 400 });
      }
      const rec = await svc.entities.Reconciliation.get(line.reconciliation_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      if (rec.status === "completed") {
        return Response.json({ error: "Reconciliation is completed" }, { status: 400 });
      }

      const direction = Number(line.amount_in) > 0 ? "in" : "out";
      const amount = direction === "in" ? Number(line.amount_in) : Number(line.amount_out);
      if (amount <= 0) return Response.json({ error: "Line has no amount" }, { status: 400 });

      const acct = await svc.entities.FinanceAccount.get(rec.account_id);
      const defaultMethod = acct?.account_type === "bank" || acct?.account_type === "savings" ? "bank_transfer" : "cash";

      const txn = await svc.entities.FinanceTransaction.create({
        organisation_id,
        direction,
        account_id: rec.account_id,
        category_id: category_id || null,
        amount,
        currency: org.currency,
        tax_rate: 0,
        tax_amount: 0,
        tax_label: org.tax_label || "Tax",
        contact_id: contact_id || null,
        date: line.date,
        reference: line.reference || null,
        description: description || line.description || "Imported from statement",
        payment_method: payment_method || defaultMethod,
        internal_notes: "Created from statement reconciliation",
        is_recurring: false,
        attachment_urls: [],
        status: "cleared",
      });

      await svc.entities.StatementLine.update(line_id, {
        status: "matched",
        matched_transaction_id: txn.id,
        suggested_transaction_id: null,
        suggestion_confidence: null,
      });
      await refreshMatchedCount(line.reconciliation_id);

      await audit("reconciliation.transaction_created", "FinanceTransaction", txn.id, null, {
        direction,
        amount,
        from_line: line_id,
      });
      await audit("reconciliation.line_matched", "StatementLine", line_id, { status: line.status }, { status: "matched", transaction_id: txn.id });
      return Response.json({ ok: true, transaction_id: txn.id });
    }

    // ---------------- complete_reconciliation ----------------
    if (action === "complete_reconciliation") {
      const { reconciliation_id } = body;
      if (!reconciliation_id) return Response.json({ error: "Missing reconciliation_id" }, { status: 400 });
      const rec = await svc.entities.Reconciliation.get(reconciliation_id);
      if (!ownRecord(rec)) return Response.json({ error: "Not found" }, { status: 404 });
      if (rec.status === "completed") {
        return Response.json({ error: "Already completed" }, { status: 400 });
      }

      const lines = await svc.entities.StatementLine.filter({ organisation_id, reconciliation_id });
      const unmatched = lines.filter((l) => l.status === "unmatched" || l.status === "suggested").length;
      if (unmatched > 0) {
        return Response.json(
          { error: `${unmatched} line(s) still need to be matched or ignored before completion.` },
          { status: 400 }
        );
      }

      // Ignored lines must have a recorded reason to be formally resolved.
      const ignoredWithoutReason = lines.filter((l) => l.status === "ignored" && !l.ignore_reason);
      if (ignoredWithoutReason.length > 0) {
        return Response.json(
          { error: `${ignoredWithoutReason.length} ignored line(s) are missing a recorded reason. Add a reason to each before completing.` },
          { status: 400 }
        );
      }

      const totalIn = lines.reduce((s, l) => s + (Number(l.amount_in) || 0), 0);
      const totalOut = lines.reduce((s, l) => s + (Number(l.amount_out) || 0), 0);
      const computed = Number(rec.opening_balance) + totalIn - totalOut;
      const difference = Math.round((Number(rec.closing_balance) - computed) * 100) / 100;

      // Reconciled requires a zero closing difference.
      if (Math.abs(difference) > 0.01) {
        return Response.json(
          { error: `Closing difference is ${difference.toFixed(2)} ${rec.currency}. The difference must be zero to mark this reconciliation as Reconciled.` },
          { status: 400 }
        );
      }
      const matched = lines.filter((l) => l.status === "matched").length;
      const summary = buildSummary({ ...rec, difference }, lines);
      const today = new Date().toISOString().slice(0, 10);

      await svc.entities.Reconciliation.update(reconciliation_id, {
        status: "completed",
        difference,
        completed_date: today,
        summary,
        matched_count: matched,
      });

      await audit("reconciliation.completed", "Reconciliation", reconciliation_id, { status: "in_progress" }, { status: "completed", difference });
      return Response.json({ ok: true, difference, summary });
    }

    // ---------------- seed_demo ----------------
    // Seeds one fictional Demo reconciliation with a mix of matchable,
    // suggested, and unmatched lines. Demo mode only; idempotent.
    if (action === "seed_demo") {
      if (org.data_mode !== "demo") {
        return Response.json({ error: "Demo seed is only available in Demo mode" }, { status: 400 });
      }
      const existing = await svc.entities.Reconciliation.filter({ organisation_id });
      if (existing.length > 0) {
        return Response.json({ ok: true, id: existing[0].id, already_exists: true });
      }

      const accounts = await svc.entities.FinanceAccount.filter({ organisation_id });
      const mainAccount = accounts.find((a) => a.account_type === "bank") || accounts[0];
      if (!mainAccount) {
        return Response.json({ error: "No accounts found. Seed finance data first." }, { status: 400 });
      }

      const txns = await svc.entities.FinanceTransaction.filter({
        organisation_id,
        account_id: mainAccount.id,
        status: "cleared",
      });

      const today = new Date();
      const iso = (offsetDays) => {
        const d = new Date(today);
        d.setDate(d.getDate() - offsetDays);
        return d.toISOString().slice(0, 10);
      };

      const demoLines = [
        { date: iso(10), description: "Product order #1042", reference: "TRX-001", amount_in: 1500, amount_out: 0, balance: 9500 },
        { date: iso(7), description: "Online sale - web order", reference: "WEB-0035", amount_in: 350, amount_out: 0, balance: 9850 },
        { date: iso(5), description: "Consulting engagement", reference: "TRX-002", amount_in: 800, amount_out: 0, balance: 10650 },
        { date: iso(4), description: "Office rent payment", reference: "DD-RENT", amount_in: 0, amount_out: 1200, balance: 9450 },
        { date: iso(3), description: "Bank fee - monthly", reference: "FEE-AUG", amount_in: 0, amount_out: 25, balance: 9425 },
        { date: iso(2), description: "Inventory restock", reference: "TRX-004", amount_in: 0, amount_out: 540, balance: 8885 },
      ];

      const opening = 8000;
      const totalIn = demoLines.reduce((s, l) => s + l.amount_in, 0);
      const totalOut = demoLines.reduce((s, l) => s + l.amount_out, 0);
      const closing = opening + totalIn - totalOut;

      const rec = await svc.entities.Reconciliation.create({
        organisation_id,
        account_id: mainAccount.id,
        account_name: mainAccount.name,
        period_start: iso(12),
        period_end: iso(1),
        opening_balance: opening,
        closing_balance: closing,
        currency: org.currency,
        status: "in_progress",
        imported_count: demoLines.length,
        matched_count: 0,
        difference: 0,
        created_by_id: user.id,
        created_by_email: user.email,
      });

      const lines = await svc.entities.StatementLine.bulkCreate(
        demoLines.map((l, i) => ({
          organisation_id,
          reconciliation_id: rec.id,
          row_index: i + 1,
          date: l.date,
          description: l.description,
          reference: l.reference,
          amount_in: l.amount_in,
          amount_out: l.amount_out,
          balance: l.balance,
          status: "unmatched",
          raw_hash: lineHash({ date: l.date, description: l.description, amount_in: l.amount_in, amount_out: l.amount_out }),
          is_duplicate: false,
        }))
      );

      // Compute suggestions
      const updates = [];
      for (const line of lines) {
        let best = null;
        for (const txn of txns) {
          const result = scoreMatch(line, txn);
          if (result.confidence !== "none" && (!best || result.score > best.score)) {
            best = { ...result, txn_id: txn.id };
          }
        }
        if (best) {
          updates.push({
            id: line.id,
            status: "suggested",
            suggested_transaction_id: best.txn_id,
            suggestion_confidence: best.confidence,
          });
        }
      }
      if (updates.length > 0) await svc.entities.StatementLine.bulkUpdate(updates);

      await audit("reconciliation.demo_seeded", "Reconciliation", rec.id, null, { lines: demoLines.length });
      return Response.json({ ok: true, id: rec.id, lines: demoLines.length });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
}