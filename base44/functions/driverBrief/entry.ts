import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// FADS Driver Daily Brief — scheduled backend action.
//
// Called each morning by the "Driver Daily Brief" workflow. For every
// taxi_driver / self_employed organisation with live data and active access,
// FADS emails the owner a short, non-accounting summary of yesterday's
// recorded earnings, running costs and net, plus a gentle nudge.
//
// Reuses the same FinanceTransaction data the rest of FADS uses — no new
// data model. Follows the same auth + service-role pattern as
// `send_renewal_reminders` in the subscription function.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const svc = base44.asServiceRole;
    const body = await req.json();

    if (body.action !== "send_driver_daily_brief") {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    // "Yesterday" in the user's calendar day. The workflow fires at 8am
    // Europe/Dublin (UTC+1 in summer), so UTC "yesterday" at that moment is
    // the previous calendar day — correct for the brief.
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);
    const dateLabel = yesterday.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const orgs = await svc.entities.Organisation.list("-created_date", 500);
    const driverOrgs = orgs.filter(
      (o) =>
        (o.type === "taxi_driver" || o.type === "self_employed") &&
        o.data_mode === "live" &&
        (o.access_status === "active" || o.access_status === "trial")
    );

    let sent = 0;
    let skipped = 0;

    for (const org of driverOrgs) {
      try {
        if (!org.owner_user_id) {
          skipped++;
          continue;
        }
        const owner = await svc.entities.User.get(org.owner_user_id).catch(() => null);
        if (!owner || !owner.email) {
          skipped++;
          continue;
        }

        // Yesterday's cleared/completed transactions for this org.
        const txns = await svc.entities.FinanceTransaction.filter({
          organisation_id: org.id,
          date: yesterdayIso,
        });
        const cleared = txns.filter(
          (t) => t.status === "cleared" || t.status === "completed"
        );
        const income = cleared
          .filter((t) => t.direction === "in")
          .reduce((s, t) => s + Number(t.amount || 0), 0);
        const expenses = cleared
          .filter((t) => t.direction === "out")
          .reduce((s, t) => s + Number(t.amount || 0), 0);
        const net = income - expenses;
        const currency = org.currency || "";
        const fmt = (n) =>
          `${currency} ${Number(n).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`;

        const subject = `FADS Driver — your brief for ${dateLabel}`;
        let body = `Hi ${owner.full_name || "there"},\n\nHere's your FADS Driver brief for ${dateLabel}.\n\n`;
        body += `Money earned: ${fmt(income)}\n`;
        body += `Running costs: ${fmt(expenses)}\n`;
        body += `Net for the day: ${fmt(net)}\n\n`;

        if (income === 0 && expenses === 0) {
          body +=
            "FADS didn't see any records for yesterday. When you're parked safely, record today's income and expenses and FADS will keep your books and tax readiness up to date.\n";
        } else if (net < 0) {
          body +=
            "Your running costs were higher than your income yesterday. Worth a quick look at your costs in FADS.\n";
        } else {
          body +=
            "Good day — you were in profit. Keep your receipts coming and FADS will do the rest.\n";
        }
        body +=
          "\nOpen FADS to record today, check your tax readiness, or prepare your year-end records.\n\nFADS AI — your driving co-pilot";

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: owner.email,
          subject,
          body,
        });
        sent++;
      } catch (_e) {
        // Non-fatal — continue with the next organisation.
        skipped++;
      }
    }

    return Response.json({
      ok: true,
      sent,
      skipped,
      total_orgs: driverOrgs.length,
      date: yesterdayIso,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}