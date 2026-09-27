import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  createStripeClient,
  getWebhookSecret,
  isStripeConfigured,
  ensureDefaultPlans,
  getAllPlans,
  getPlan,
  setPlanPrice,
  checkTrialEligibility,
  createCheckoutSession,
  cancelUserSubscription,
  getSubscriptionForOrg,
  processStripeEvent,
  writeBillingAuditLog,
  grantBetaAccess,
  revokeBetaAccess,
  resolvePlanPrice,
  setRegionalPrice,
  getRegionalPricingEntries,
  countryToCurrency,
  BILLING_CURRENCIES,
  getCustomerSubscriptions,
  recordManualPayment,
  verifyManualPayment,
  setSubscriptionStatus,
} from "../../shared/subscription.ts";

// Subscription backend.
//
// Actions:
//   Webhook   — handle_webhook (no auth, verified via Stripe signature)
//   User      — get_plans, get_subscription_status, create_checkout, cancel_subscription
//   Admin     — admin_* (Platform Owner only)
export default async function (req) {
  try {
    // ── Webhook endpoint (identified by stripe-signature header) ────
    const stripeSignature = req.headers.get("stripe-signature");
    if (stripeSignature) {
      const rawBody = await req.text();
      const base44 = createClientFromRequest(req);
      const svc = base44.asServiceRole;
      try {
        const stripe = createStripeClient();
        const event = await stripe.webhooks.constructEventAsync(
          rawBody,
          stripeSignature,
          getWebhookSecret()
        );
        const result = await processStripeEvent(svc, event);
        return Response.json(result);
      } catch (e) {
        await writeBillingAuditLog(svc, {
          organisation_id: "platform",
          actor_type: "stripe",
          action: "subscription.webhook_error",
          after: { error: e.message },
          result: "failure",
        });
        return Response.json({ error: e.message }, { status: 400 });
      }
    }

    // ── Normal JSON API ─────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const svc = base44.asServiceRole;

    // ── Public: check if Stripe is configured ──────────────────────
    if (body.action === "get_config") {
      return Response.json({
        stripe_configured: isStripeConfigured(),
      });
    }

    // ── User: get available plans ──────────────────────────────────
    if (body.action === "get_plans") {
      const plans = await getAllPlans(svc);
      return Response.json({ plans, stripe_configured: isStripeConfigured() });
    }

    // ── All other actions require authentication ───────────────────
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // ── User: get subscription status for active org ───────────────
    if (body.action === "get_subscription_status") {
      const orgId = body.organisation_id || user.active_organisation_id;
      if (!orgId) return Response.json({ subscription: null, plan: null });

      const [subscription, plans] = await Promise.all([
        getSubscriptionForOrg(svc, orgId),
        getAllPlans(svc),
      ]);

      const org = await svc.entities.Organisation.get(orgId).catch(() => null);
      // Resolve the plan from the subscription's plan_id when available (so the
      // user's actual FADS Business tier is returned), otherwise fall back to the
      // primary plan for the org type.
      let plan = null;
      if (subscription?.plan_id) {
        plan = await svc.entities.SubscriptionPlan.get(subscription.plan_id).catch(() => null);
      }
      if (!plan && org) {
        plan = await getPlan(svc, org.type);
      }
      const regional_price = plan && org ? resolvePlanPrice(plan, org.country) : null;
      const regional_pricing = plan ? getRegionalPricingEntries(plan) : null;
      const suggested_currency = org ? countryToCurrency(org.country) : "USD";

      let eligibility = null;
      if (!subscription) {
        eligibility = await checkTrialEligibility(svc, user.id, orgId);
      }

      return Response.json({
        subscription,
        plan,
        org,
        tier: subscription?.tier || plan?.tier || null,
        eligibility,
        regional_price,
        regional_pricing,
        suggested_currency,
        billing_currencies: BILLING_CURRENCIES,
        stripe_configured: isStripeConfigured(),
      });
    }

    // ── User: create checkout session ─────────────────────────────
    if (body.action === "create_checkout") {
      if (!isStripeConfigured()) {
        return Response.json({ error: "Coming soon — payment connection required" }, { status: 400 });
      }
      const orgId = body.organisation_id || user.active_organisation_id;
      if (!orgId) return Response.json({ error: "No active organisation" }, { status: 400 });
      const org = await svc.entities.Organisation.get(orgId);
      const tier = body.tier || "";
      const plan = await getPlan(svc, org.type, tier || undefined);
      if (!plan) return Response.json({ error: "No plan found for your organisation type" }, { status: 400 });

      const referral_code = body.referral_code || "";
      const app_url = body.app_url || "https://app.base44.com";

      const result = await createCheckoutSession(svc, user, org, plan, referral_code, app_url);
      return Response.json(result);
    }

    // ── User: cancel subscription ──────────────────────────────────
    if (body.action === "cancel_subscription") {
      const orgId = body.organisation_id || user.active_organisation_id;
      if (!orgId) return Response.json({ error: "No active organisation" }, { status: 400 });
      const result = await cancelUserSubscription(svc, user, orgId);
      return Response.json(result);
    }

    // ════════════════════════════════════════════════════════════════
    // ── Admin actions (Platform Owner only) ─────────────────────────
    // ════════════════════════════════════════════════════════════════
    if (body.action?.startsWith("admin_")) {
      if (user.role !== "admin") {
        return Response.json({ error: "Platform Owner access required" }, { status: 403 });
      }
    }

    // ── Admin: set plan monthly price ──────────────────────────────
    if (body.action === "admin_set_plan_price") {
      if (!isStripeConfigured()) {
        return Response.json({ error: "Coming soon — payment connection required" }, { status: 400 });
      }
      const { org_type, monthly_price } = body;
      if (!org_type || monthly_price === undefined) {
        return Response.json({ error: "org_type and monthly_price are required" }, { status: 400 });
      }
      const plan = await setPlanPrice(svc, user, org_type, Number(monthly_price));
      return Response.json({ ok: true, plan });
    }

    // ── Admin: get all plans ───────────────────────────────────────
    if (body.action === "admin_get_plans") {
      const plans = await getAllPlans(svc);
      return Response.json({ plans, stripe_configured: isStripeConfigured() });
    }

    // ── Admin: get all subscriptions ───────────────────────────────
    if (body.action === "admin_get_subscriptions") {
      const subscriptions = await svc.entities.Subscription.list("-created_date", 100);
      return Response.json({ subscriptions });
    }

    // ── Admin: get payment events ──────────────────────────────────
    if (body.action === "admin_get_payment_events") {
      const events = await svc.entities.PaymentEvent.list("-created_date", 100);
      return Response.json({ events });
    }

    // ── Admin: get billing audit logs ──────────────────────────────
    if (body.action === "admin_get_audit_logs") {
      const logs = await svc.entities.BillingAuditLog.list("-created_date", 100);
      return Response.json({ logs });
    }

    // ── Admin: get dashboard summary ───────────────────────────────
    if (body.action === "admin_get_dashboard") {
      const [plans, subscriptions, events] = await Promise.all([
        getAllPlans(svc),
        svc.entities.Subscription.list(),
        svc.entities.PaymentEvent.list("-created_date", 50),
      ]);
      const trialCount = subscriptions.filter((s) => s.status === "trial").length;
      const activeCount = subscriptions.filter((s) => s.status === "active").length;
      const cancelledCount = subscriptions.filter((s) => s.status === "cancelled").length;
      const pastDueCount = subscriptions.filter((s) => s.status === "past_due").length;
      return Response.json({
        plans,
        stripe_configured: isStripeConfigured(),
        totals: { total: subscriptions.length, trial: trialCount, active: activeCount, cancelled: cancelledCount, past_due: pastDueCount },
        recentEvents: events,
      });
    }

    // ── Admin: set regional price for a billing currency ───────────
    if (body.action === "admin_set_regional_price") {
      const { org_type, currency, label, trial_price, trial_days, monthly_price, status } = body;
      if (!org_type || !currency) {
        return Response.json({ error: "org_type and currency are required" }, { status: 400 });
      }
      const plan = await setRegionalPrice(svc, user, org_type, currency, {
        label,
        trial_price: trial_price !== undefined && trial_price !== "" ? Number(trial_price) : undefined,
        trial_days: trial_days !== undefined && trial_days !== "" ? Number(trial_days) : undefined,
        monthly_price: monthly_price !== undefined && monthly_price !== "" ? Number(monthly_price) : undefined,
        status,
      });
      return Response.json({ ok: true, plan });
    }

    // ── Admin: get all organisations (for beta access UI) ──────────
    if (body.action === "admin_get_organisations") {
      const orgs = await svc.entities.Organisation.list("-created_date", 200);
      return Response.json({ organisations: orgs });
    }

    // ── Admin: grant 5-day beta access (no payment, no commission) ─
    if (body.action === "admin_grant_beta_access") {
      const { organisation_id } = body;
      if (!organisation_id) return Response.json({ error: "organisation_id is required" }, { status: 400 });
      const sub = await grantBetaAccess(svc, user, organisation_id, 5);
      return Response.json({ ok: true, subscription: sub });
    }

    // ── Admin: revoke beta access ──────────────────────────────────
    if (body.action === "admin_revoke_beta_access") {
      const { organisation_id } = body;
      if (!organisation_id) return Response.json({ error: "organisation_id is required" }, { status: 400 });
      const result = await revokeBetaAccess(svc, user, organisation_id);
      return Response.json(result);
    }

    // ── Admin: list all customer organisations + subscription status ──
    if (body.action === "admin_get_customer_subscriptions") {
      const customers = await getCustomerSubscriptions(svc);
      return Response.json({ customers });
    }

    // ── Admin: record a manual bank-transfer payment ────────────────
    if (body.action === "admin_record_payment") {
      const { organisation_id, payment_method, payment_amount, payment_currency, payment_reference, payment_date } = body;
      if (!organisation_id) return Response.json({ error: "organisation_id is required" }, { status: 400 });
      if (!payment_method) return Response.json({ error: "payment_method is required" }, { status: 400 });
      const sub = await recordManualPayment(svc, user, organisation_id, {
        payment_method,
        payment_amount,
        payment_currency,
        payment_reference,
        payment_date,
      });
      return Response.json({ ok: true, subscription: sub });
    }

    // ── Admin: verify a manual payment and activate ─────────────────
    if (body.action === "admin_verify_payment") {
      const { organisation_id, subscription_start_date, current_period_start, current_period_end, trial_end } = body;
      if (!organisation_id) return Response.json({ error: "organisation_id is required" }, { status: 400 });
      const sub = await verifyManualPayment(svc, user, organisation_id, {
        subscription_start_date,
        current_period_start,
        current_period_end,
        trial_end,
      });
      return Response.json({ ok: true, subscription: sub });
    }

    // ── Admin: change subscription status / dates (suspend/reactivate) ─
    if (body.action === "admin_update_subscription") {
      const { organisation_id, status, subscription_start_date, current_period_start, current_period_end, trial_end, cancellation_reason } = body;
      if (!organisation_id) return Response.json({ error: "organisation_id is required" }, { status: 400 });
      if (!status) return Response.json({ error: "status is required" }, { status: 400 });
      const sub = await setSubscriptionStatus(svc, user, organisation_id, {
        status,
        subscription_start_date,
        current_period_start,
        current_period_end,
        trial_end,
        cancellation_reason,
      });
      return Response.json({ ok: true, subscription: sub });
    }

    // ── System: send renewal reminders (called by scheduled workflow) ─
    if (body.action === "send_renewal_reminders") {
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 3600000);
      const trialSubs = await svc.entities.Subscription.filter({ status: "trial", reminder_sent: false });
      let sent = 0;
      for (const sub of trialSubs) {
        if (sub.access_type === "beta_manual") continue;
        const trialEnd = new Date(sub.trial_end);
        if (trialEnd <= twentyFourHoursFromNow && trialEnd > now) {
          try {
            const daysLeft = Math.ceil((trialEnd - now) / 86400000);
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: sub.user_email,
              subject: "Your FADS AI trial ends soon — " + daysLeft + " day" + (daysLeft === 1 ? "" : "s") + " left",
              body: "Your 5-day introductory trial for " + (sub.organisation_name || "your organisation") +
                " ends on " + trialEnd.toLocaleDateString() + ".\n\n" +
                "Your first regular payment of " + (sub.currency || "USD") + " " + (sub.monthly_price || 0) + "/month will be charged on that date.\n\n" +
                "If you'd like to cancel, go to Settings → Subscription → Manage Subscription.\n\n" +
                "FADS AI Business Suite",
            });
            await svc.entities.Subscription.update(sub.id, { reminder_sent: true });
            sent++;
            await writeBillingAuditLog(svc, {
              organisation_id: sub.organisation_id,
              actor_type: "system",
              action: "subscription.renewal_reminder_sent",
              entity_type: "Subscription",
              entity_id: sub.id,
              after: { days_left: daysLeft },
            });
          } catch (e) {
            // Non-fatal — continue with next subscription
          }
        }
      }
      return Response.json({ ok: true, reminders_sent: sent });
    }

    return Response.json({ error: "Unknown action: " + body.action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}