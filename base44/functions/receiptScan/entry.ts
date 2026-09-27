import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getActiveMembership, writeAuditLog } from "../../shared/workspace.ts";

// AI Receipt & Supplier Document Scanner. Receives an uploaded file URL,
// extracts key fields (supplier, date, total, tax, category, payment method,
// receipt number, currency) using ExtractDataFromUploadedFile, flags
// low-confidence/missing fields, and returns them for user review. Never
// creates financial records — the caller creates the transaction after the
// user confirms. Reuses org membership verification + audit logging.

const SUPPORTED_RECEIPT_CURRENCIES = ["NGN", "EUR", "GBP", "USD"];

function normaliseReceiptCurrency(value) {
  const raw = String(value || "").trim().toUpperCase();
  const explicit = {
    "€": "EUR",
    "EUR": "EUR",
    "EURO": "EUR",
    "EUROS": "EUR",
    "₦": "NGN",
    "NGN": "NGN",
    "NAIRA": "NGN",
    "£": "GBP",
    "GBP": "GBP",
  };
  const code = explicit[raw] || (SUPPORTED_RECEIPT_CURRENCIES.includes(raw) ? raw : "");
  // A bare $ is deliberately not mapped: it is shared by several currencies.
  return code;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const organisation_id = body.organisation_id;
    const file_url = body.file_url;
    if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });
    if (!file_url) return Response.json({ error: "file_url required" }, { status: 400 });

    const svc = base44.asServiceRole;
    const membership = await getActiveMembership(svc, user.id, organisation_id);
    if (!membership) return Response.json({ error: "Not a member of this organisation" }, { status: 403 });
    const org = await svc.entities.Organisation.get(organisation_id);
    if (!org) return Response.json({ error: "Organisation not found" }, { status: 404 });
    if (org.access_status === "paused" || org.access_status === "cancelled") {
      return Response.json({ error: "Organisation access is " + org.access_status }, { status: 403 });
    }

    // Load expense categories so the LLM can suggest one.
    const categories = await svc.entities.FinanceCategory.filter({ organisation_id, kind: "expense" });
    const categoryNames = categories.map((c) => c.name).filter(Boolean).slice(0, 30);

    const jsonSchema = {
      type: "object",
      properties: {
        supplier: { type: "string", description: "Supplier or vendor name" },
        date: { type: "string", description: "Document date (YYYY-MM-DD)" },
        total_amount: { type: "number", description: "Total amount" },
        tax_amount: { type: "number", description: "Tax or VAT amount if shown" },
        currency: { type: "string", description: "Three-letter ISO currency code only when explicitly visible on the document (for example EUR, NGN, GBP, USD). Do not infer currency from the amount. Do not map an ambiguous bare $ symbol to USD." },
        receipt_number: { type: "string", description: "Receipt or invoice number" },
        payment_method: { type: "string", description: "cash, card, bank_transfer, mobile_money, cheque, or other" },
        description: { type: "string", description: "Short description of the expense" },
        suggested_category: { type: "string", description: "Best-matching expense category name from the list" },
      },
    };

    let result;
    try {
      result = await svc.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema,
      });
    } catch (e) {
      return Response.json({ error: "Unable to read document. " + (e.message || "") }, { status: 502 });
    }

    // ExtractDataFromUploadedFile returns the extracted object directly in the
    // current SDK. Keep compatibility with the older { status, output }
    // envelope too, but do not reject a valid direct object as "no output".
    if (result && typeof result === "object" && "status" in result && result.status !== "success") {
      return Response.json({ error: "Extraction failed: " + (result.details || result.error || result.status) }, { status: 422 });
    }

    const output = result && typeof result === "object" && "output" in result
      ? result.output
      : result;
    const ex = Array.isArray(output) ? output[0] : output;
    if (!ex || typeof ex !== "object" || Array.isArray(ex)) {
      return Response.json({ error: "Extraction failed: no structured data returned" }, { status: 422 });
    }

    // Match suggested category to an actual category id.
    let category_id = "";
    if (ex.suggested_category) {
      const match = categories.find((c) => c.name.toLowerCase() === String(ex.suggested_category).toLowerCase());
      if (match) category_id = match.id;
    }

    const detectedCurrency = normaliseReceiptCurrency(ex.currency);
    const proposedCurrency = detectedCurrency || org.currency || "";

    // Flag low confidence if key fields are missing.
    const missing = [];
    if (!ex.supplier) missing.push("supplier");
    if (!ex.total_amount) missing.push("total_amount");
    if (!ex.date) missing.push("date");
    const low_confidence = missing.length > 0;

    await writeAuditLog(svc, {
      organisation_id,
      actor_type: "user",
      actor_user_id: user.id,
      actor_user_email: user.email,
      action: "receiptScan.scan",
      after: { supplier: ex.supplier || "", total: ex.total_amount || 0, low_confidence },
    });

    return Response.json({
      extracted: {
        supplier: ex.supplier || "",
        date: ex.date || "",
        total_amount: ex.total_amount || "",
        tax_amount: ex.tax_amount || "",
        currency: proposedCurrency,
        _currency_source: detectedCurrency ? "receipt" : "organisation_default",
        receipt_number: ex.receipt_number || "",
        payment_method: ex.payment_method || "",
        description: ex.description || "",
        category_id,
        _low_confidence: low_confidence,
        _missing: missing,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}