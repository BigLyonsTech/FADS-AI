import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireFinanceManager,
  getOrgConfig,
  assertOrgWritable,
} from "../../shared/finance.ts";
import { writeAuditLog } from "../../shared/workspace.ts";
import {
  computeRunTotals,
  findOrCreateSalariesCategory,
} from "../../shared/payroll.ts";

// Organisation-isolated Payroll V1. Drafts are created/edited client-side
// (PayrollRun RLS allows org members). Posting — which creates Finance
// salary expenses — is the only write that must run here, so it is
// authorised (finance-manager role), verified, audited, and idempotent.
//
// Actions:
//   post_run    Approve a draft run: create one Salaries FinanceTransaction
//               per employee, store the ids on the run, set status=approved.
//               Prevents duplicate posting.
//   mark_paid   Set an approved run to paid.
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

    // Posting creates finance records — require a finance-manager role.
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

    const ownRun = (run) => run && run.organisation_id === organisation_id;

    // ---------------- post run ----------------
    if (action === "post_run") {
      const { run_id } = body;
      if (!run_id) return Response.json({ error: "Missing run_id" }, { status: 400 });
      const run = await svc.entities.PayrollRun.get(run_id);
      if (!ownRun(run)) return Response.json({ error: "Not found" }, { status: 404 });

      // Prevent duplicate posting.
      if (run.status === "approved" || run.status === "paid") {
        return Response.json({ error: "Payroll run already posted" }, { status: 400 });
      }
      const items = Array.isArray(run.items) ? run.items : [];
      if (!items.length) {
        return Response.json({ error: "Payroll run has no employees" }, { status: 400 });
      }
      if (!run.account_id) {
        return Response.json({ error: "Select an account to post salaries to" }, { status: 400 });
      }
      const acct = await svc.entities.FinanceAccount.get(run.account_id);
      if (!acct || acct.organisation_id !== organisation_id) {
        return Response.json({ error: "Invalid account" }, { status: 400 });
      }

      // Recompute totals from stored items (don't trust client totals).
      const totals = computeRunTotals(items);
      const dataMode = run.data_mode || org.data_mode || "live";
      const postDate = run.pay_period_end || new Date().toISOString().slice(0, 10);
      const categoryId = await findOrCreateSalariesCategory(svc, organisation_id, dataMode);

      const txnIds = [];
      for (const item of items) {
        const gross = Number(item.gross) || 0;
        if (gross <= 0) continue;
        const txn = await svc.entities.FinanceTransaction.create({
          organisation_id,
          direction: "out",
          account_id: run.account_id,
          category_id: categoryId,
          amount: gross,
          currency: org.currency,
          tax_rate: 0,
          tax_amount: 0,
          tax_label: org.tax_label || "Tax",
          contact_id: null,
          date: postDate,
          // Link the finance record back to the run + employee (minimum link).
          reference: `PAYROLL:${run_id}:${item.employee_id}`,
          description: `Salary — ${item.employee_name} — ${run.pay_period_start} to ${run.pay_period_end}`,
          payment_method: "bank_transfer",
          internal_notes: `Payroll run ${run_id} · employee ${item.employee_id}`,
          is_recurring: false,
          status: "cleared",
          attachment_urls: [],
          data_mode: dataMode,
        });
        txnIds.push(txn.id);
      }

      await svc.entities.PayrollRun.update(run_id, {
        status: "approved",
        posted_finance_transaction_ids: txnIds,
        posted_date: postDate,
        total_gross: totals.total_gross,
        total_allowances: totals.total_allowances,
        total_deductions: totals.total_deductions,
        total_net: totals.total_net,
        employee_count: totals.employee_count,
      });

      await audit(
        "payrun.posted",
        "PayrollRun",
        run_id,
        { status: run.status },
        { status: "approved", transactions: txnIds.length, total_gross: totals.total_gross }
      );
      return Response.json({ ok: true, posted: txnIds.length, transaction_ids: txnIds, totals });
    }

    // ---------------- mark paid ----------------
    if (action === "mark_paid") {
      const { run_id } = body;
      if (!run_id) return Response.json({ error: "Missing run_id" }, { status: 400 });
      const run = await svc.entities.PayrollRun.get(run_id);
      if (!ownRun(run)) return Response.json({ error: "Not found" }, { status: 404 });
      if (run.status !== "approved") {
        return Response.json({ error: "Only approved runs can be marked paid" }, { status: 400 });
      }
      await svc.entities.PayrollRun.update(run_id, { status: "paid" });
      await audit("payrun.marked_paid", "PayrollRun", run_id, { status: "approved" }, { status: "paid" });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Not authorised for this organisation" ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
}