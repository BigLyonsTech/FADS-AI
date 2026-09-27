import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireFinanceManager,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/finance.ts";
import { writeAuditLog } from "../../shared/workspace.ts";
import {
  detectStatementFileKind,
  normalizeExtractedStatement,
  parseStatementCsv,
} from "../../shared/bankStatement.ts";

// AI Bank Statement reader. Receives an uploaded statement file URL
// (PDF/CSV/XLSX), extracts transaction rows with ExtractDataFromUploadedFile,
// then classifies each row against the org's existing Finance transactions:
//   matched / possible_match / new / possible_duplicate
// Never creates financial records — the caller creates transactions via the
// existing `finance` create_transaction action after the user reviews and
// approves each row. Reuses org finance-manager verification + audit logging.
//
// Action: parse_statement
function normaliseMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameStatementIdentity(transaction, row) {
  const transactionReference = normaliseMatchText(transaction.reference);
  const rowReference = normaliseMatchText(row.reference);
  if (transactionReference && rowReference && transactionReference === rowReference) {
    return true;
  }
  const transactionDescription = normaliseMatchText(transaction.description);
  const rowDescription = normaliseMatchText(row.description);
  return !!transactionDescription && transactionDescription === rowDescription;
}

function resolveSuggestedCategory(row, categories) {
  const direction = Number(row.money_in || 0) > 0 ? "in" : "out";
  const suggested = String(row.suggested_category || "").trim();
  const description = normaliseMatchText(row.description);
  const isSupplierPurchase =
    direction === "out" &&
    /\b(wholesale|wholesaler|supplier|stock|inventory|purchase|goods)\b/.test(description);

  if (isSupplierPurchase) {
    const purchaseCategory = categories.find((category) => {
      if (category.kind !== "expense") return false;
      const name = normaliseMatchText(category.name);
      return /\b(inventory|stock|purchases|supplies|cost of sales|cost of goods)\b/.test(name);
    });
    if (purchaseCategory) return purchaseCategory;
    // Never classify a clear supplier/stock purchase as payroll.
    if (/salar(y|ies)|payroll/i.test(suggested)) return null;
  }

  if (!suggested) return null;
  return categories.find(
    (category) =>
      category.kind === (direction === "in" ? "income" : "expense") &&
      normaliseMatchText(category.name) === normaliseMatchText(suggested)
  ) || null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, organisation_id } = body;
    if (!organisation_id) {
      return Response.json({ error: "Missing organisation_id" }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    await requireFinanceManager(svc, user.id, organisation_id);
    const org = await getOrgConfig(svc, organisation_id);
    assertOrgWritable(org);

    if (action === "parse_statement") {
      const { file_url, file_name, mime_type, csv_text, structured_rows } = body;
      const fileKind = detectStatementFileKind({
        fileName: file_name,
        mimeType: mime_type,
        fileUrl: file_url,
      });
      if (!["csv", "pdf", "xls", "xlsx", "txt"].includes(fileKind)) {
        return Response.json(
          { error: "Unsupported statement format. Use PDF, CSV, XLS or XLSX." },
          { status: 400 }
        );
      }
      const exportMode =
        body.data_mode === "demo" || body.data_mode === "live"
          ? body.data_mode
          : org.data_mode || "live";

      // Load existing transactions + categories for matching and suggestions.
      const [existingTxns, categories] = await Promise.all([
        svc.entities.FinanceTransaction.filter(
          { organisation_id, data_mode: exportMode },
          "-date",
          500
        ),
        svc.entities.FinanceCategory.filter({ organisation_id, data_mode: exportMode }),
      ]);
      const categoryNames = categories.map((c) => c.name).filter(Boolean);

      const jsonSchema = {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "Transaction/posting/value date as shown" },
                description: { type: "string", description: "Description, narrative, memo, payee or particulars" },
                reference: { type: "string", description: "Reference number if shown" },
                money_in: { type: "number", description: "Credit/deposit/money-in amount as a number; 0 if none" },
                money_out: { type: "number", description: "Debit/withdrawal/money-out amount as a number; 0 if none" },
                amount: { type: "number", description: "Single transaction amount if the statement uses one amount column" },
                type: { type: "string", description: "Debit/Credit, Withdrawal/Deposit, or other direction/type if shown" },
                running_balance: { type: "number", description: "Running balance as a number if present" },
                suggested_category: {
                  type: "string",
                  description: "Category name if clearly identifiable, otherwise empty string",
                },
              },
            },
          },
        },
      };

      let parsed = [];
      let parser = fileKind;

      if (
        (fileKind === "csv" || fileKind === "txt") &&
        typeof csv_text === "string" &&
        csv_text.trim()
      ) {
        parsed = parseStatementCsv(csv_text);
        parser = "deterministic_csv";
      } else if (
        fileKind === "xlsx" &&
        Array.isArray(structured_rows) &&
        structured_rows.length
      ) {
        parsed = normalizeExtractedStatement(structured_rows);
        parser = "deterministic_xlsx";
      } else {
        if (!file_url) {
          return Response.json(
            { error: "This statement format requires an uploaded file." },
            { status: 400 }
          );
        }

        let result;
        try {
          result = await svc.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: jsonSchema,
          });
        } catch (e) {
          const providerStatus =
            Number(e?.status || e?.originalError?.response?.status || 0) || null;
          const providerData =
            e?.data || e?.originalError?.response?.data || {};
          const providerMessage = String(
            providerData?.error ||
              providerData?.message ||
              providerData?.detail ||
              e?.message ||
              "Extraction failed"
          ).slice(0, 300);
          const providerCode = e?.code || providerData?.code || null;

          if (providerStatus === 429 || /rate limit/i.test(providerMessage)) {
            return Response.json(
              {
                error: "Base44 bank-statement extraction is temporarily rate limited.",
                stage: "extract",
                provider_status: providerStatus || 429,
                provider_code: providerCode,
                provider_message: providerMessage,
              },
              { status: 429 }
            );
          }

          return Response.json(
            {
              error: "Unable to read this statement. " + providerMessage,
              stage: "extract",
              provider_status: providerStatus,
              provider_code: providerCode,
            },
            { status: 502 }
          );
        }

        if (result.status !== "success" || !result.output) {
          const details = String(result.details || "no data found").slice(0, 300);
          if (/rate limit/i.test(details)) {
            return Response.json(
              {
                error: "Base44 bank-statement extraction is temporarily rate limited.",
                stage: "extract",
                provider_status: 429,
                provider_code: null,
                provider_message: details,
              },
              { status: 429 }
            );
          }
          return Response.json(
            { error: "Could not read the statement: " + details },
            { status: 422 }
          );
        }

        parsed = normalizeExtractedStatement(result.output);
        parser = `extracted_${fileKind}`;
      }

      if (!parsed.length) {
        return Response.json(
          {
            error:
              "FADS couldn't find any transaction rows with a valid date and amount in this statement.",
          },
          { status: 422 }
        );
      }

      // Classify each extracted row against existing transactions.
      const rows = parsed.map((p, i) => {
        const inAmt = Number(p.money_in || 0);
        const outAmt = Number(p.money_out || 0);
        const direction = inAmt > 0 ? "in" : "out";
        const amount = inAmt > 0 ? inAmt : outAmt;
        const dateStr = p.date || "";

        const suggestedCategory = resolveSuggestedCategory(p, categories);
        const category_id = suggestedCategory?.id || "";
        const suggested_category = suggestedCategory?.name || "";

        let classification = "new";
        let matched_txn_id = null;
        if (dateStr && amount > 0) {
          const exact = existingTxns.find(
            (t) =>
              t.date === dateStr &&
              Number(t.amount) === amount &&
              t.direction === direction &&
              sameStatementIdentity(t, p)
          );
          if (exact) {
            classification = "matched";
            matched_txn_id = exact.id;
          } else {
            const d1 = new Date(dateStr);
            const near = existingTxns.find((t) => {
              if (Number(t.amount) !== amount || t.direction !== direction) return false;
              if (!t.date) return false;
              const dd = Math.abs(new Date(t.date) - d1) / 86400000;
              return dd >= 0 && dd <= 2;
            });
            if (near) {
              classification = "possible_match";
              matched_txn_id = near.id;
            }
          }
        }

        return {
          key: String(i),
          date: dateStr,
          description: p.description || "",
          reference: p.reference || "",
          amount,
          direction,
          running_balance: p.running_balance ?? null,
          suggested_category,
          category_id,
          classification,
          matched_txn_id,
        };
      });

      // Detect possible duplicates among the parsed rows themselves.
      const seen = {};
      rows.forEach((r) => {
        const k = `${r.date}|${r.amount}|${r.direction}`;
        if (seen[k]) {
          if (r.classification === "new") r.classification = "possible_duplicate";
        } else {
          seen[k] = true;
        }
      });

      const summary = {
        found: rows.length,
        matched: rows.filter((r) => r.classification === "matched").length,
        possible_match: rows.filter((r) => r.classification === "possible_match").length,
        new: rows.filter((r) => r.classification === "new").length,
        duplicates: rows.filter((r) => r.classification === "possible_duplicate").length,
        need_category: rows.filter(
          (r) => !r.category_id && r.classification !== "matched"
        ).length,
      };

      await writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "bankStatement.parse",
        after: { found: summary.found, data_mode: exportMode, parser, file_kind: fileKind },
      });

      return Response.json({
        ok: true,
        rows,
        summary,
        categories: categoryNames,
        data_mode: exportMode,
        parser,
        file_kind: fileKind,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status =
      error.message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
}