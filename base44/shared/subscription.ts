// Shared subscription helpers — used by the subscription backend function.
// All mutations go through the service role; RLS blocks direct app-user writes
// on every subscription entity.

import Stripe from "npm:stripe";
import { secrets } from "base44:runtime";
import {
  calculateCommissionAmount,
  recalcAffiliateTotals,
  writeAffiliateAuditLog,
  cancelCommissionByReference,
} from "./affiliate.ts";

// ── Stripe client ──────────────────────────────────────────────────
export function createStripeClient() {
  const key = secrets.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Stripe not configured — set STRIPE_SECRET_KEY secret to enable checkout");
  return new Stripe(key);
}

export function getWebhookSecret() {
  return secrets.get("STRIPE_WEBHOOK_SECRET");
}

export function isStripeConfigured() {
  return !!(secrets.get("STRIPE_SECRET_KEY") && secrets.get("STRIPE_WEBHOOK_SECRET"));
}

// ── Plans ──────────────────────────────────────────────────────────

// Billing currencies supported by the international pricing selector.
// Each currency maps to a country or regional group.
export const BILLING_CURRENCIES = [
  { code: "NGN", label: "Nigerian Naira", region_label: "Nigeria" },
  { code: "EUR", label: "Euro", region_label: "Eurozone (Ireland, France)" },
  { code: "GBP", label: "British Pound", region_label: "United Kingdom" },
  { code: "USD", label: "US Dollar", region_label: "United States" },
];

// Map organisation country code → suggested billing currency.
export function countryToCurrency(country) {
  const map = { NG: "NGN", IE: "EUR", GB: "GBP", FR: "EUR", US: "USD" };
  return map[country] || "USD";
}

// Default regional pricing for every plan. NGN is active with configured
// prices; EUR, GBP and USD are "coming_soon" until the Platform Owner
// enters and activates their fixed regional prices.
const DEFAULT_REGIONAL_PRICES = {
  NGN: {
    label: "Nigeria",
    currency: "NGN",
    trial_price: 5000,
    trial_days: 5,
    monthly_price: 30000,
    status: "active",
    indicative_converted_value: null,
    exchange_rate_timestamp: null,
    updated_date: null,
  },
  EUR: {
    label: "Eurozone (Ireland, France)",
    currency: "EUR",
    trial_price: 5,
    trial_days: 5,
    monthly_price: 55,
    status: "active",
    indicative_converted_value: null,
    exchange_rate_timestamp: null,
    updated_date: null,
  },
  GBP: {
    label: "United Kingdom",
    currency: "GBP",
    trial_price: 5,
    trial_days: 5,
    monthly_price: 55,
    status: "active",
    indicative_converted_value: null,
    exchange_rate_timestamp: null,
    updated_date: null,
  },
  USD: {
    label: "United States",
    currency: "USD",
    trial_price: 5,
    trial_days: 5,
    monthly_price: 55,
    status: "active",
    indicative_converted_value: null,
    exchange_rate_timestamp: null,
    updated_date: null,
  },
};

const PLAN_CONFIGS = [
  { org_type: "small_business", plan_name: "Small Business" },
  { org_type: "school", plan_name: "School" },
  { org_type: "church", plan_name: "Church" },
];

// FADS Business tiers — three small_business plans, one per tier, with NGN
// pricing. Idempotent: matched by org_type + tier so re-running ensureDefaultPlans
// never duplicates them. School/church/university plans have no tier (full access).
const BUSINESS_TIER_CONFIGS = [
  { org_type: "small_business", plan_name: "Starter", tier: "starter", ngn_monthly: 5000 },
  { org_type: "small_business", plan_name: "Business", tier: "business", ngn_monthly: 12500 },
  { org_type: "small_business", plan_name: "Professional", tier: "professional", ngn_monthly: 25000 },
];

export async function ensureDefaultPlans(svc) {
  for (const cfg of PLAN_CONFIGS) {
    const existing = await svc.entities.SubscriptionPlan.filter({ org_type: cfg.org_type });
    if (existing.length === 0) {
      await svc.entities.SubscriptionPlan.create({
        ...cfg,
        monthly_price: 0,
        currency: "USD",
        trial_price: 1,
        trial_days: 5,
        is_active: true,
        terms_version: "1.0",
        regional_prices: DEFAULT_REGIONAL_PRICES,
        exchange_rate_service_connected: false,
      });
    } else {
      const plan = existing[0];
      const rp = plan.regional_prices || {};
      const hasNewFormat = ["NGN", "EUR", "GBP", "USD"].some((c) => rp[c]);
      const hasOldFormat = ["NG", "IE", "GB", "FR", "US"].some((c) => rp[c]);
      if (!hasNewFormat) {
        // Seed or migrate to the new currency-keyed format.
        const merged = JSON.parse(JSON.stringify(DEFAULT_REGIONAL_PRICES));
        if (hasOldFormat && rp.NG && rp.NG.monthly_price > 0) {
          // Preserve any previously-configured NGN values from the old country-keyed format.
          merged.NGN = {
            ...merged.NGN,
            monthly_price: rp.NG.monthly_price,
            currency: rp.NG.currency || "NGN",
            trial_price: rp.NG.trial_price !== undefined ? rp.NG.trial_price : merged.NGN.trial_price,
            status: "active",
            updated_date: new Date().toISOString(),
          };
        }
        await svc.entities.SubscriptionPlan.update(plan.id, { regional_prices: merged });
      }
    }
  }

  // Seed the three FADS Business tier plans (small_business only).
  for (const cfg of BUSINESS_TIER_CONFIGS) {
    const existing = await svc.entities.SubscriptionPlan.filter({ org_type: cfg.org_type, tier: cfg.tier });
    if (existing.length === 0) {
      const regional = JSON.parse(JSON.stringify(DEFAULT_REGIONAL_PRICES));
      regional.NGN = {
        ...regional.NGN,
        monthly_price: cfg.ngn_monthly,
        trial_price: 5000,
        status: "active",
        updated_date: new Date().toISOString(),
      };
      await svc.entities.SubscriptionPlan.create({
        org_type: cfg.org_type,
        plan_name: cfg.plan_name,
        tier: cfg.tier,
        monthly_price: 0,
        currency: "USD",
        trial_price: 1,
        trial_days: 5,
        is_active: true,
        terms_version: "1.0",
        regional_prices: regional,
        exchange_rate_service_connected: false,
      });
    }
  }
}

// Resolve a plan for an org type. For small_business, prefers a specific tier
// when provided; otherwise defaults to the "business" tier (primary SME
// package). For school/church/university, returns the single (non-tiered) plan.
export async function getPlan(svc, org_type, tier) {
  const plans = await svc.entities.SubscriptionPlan.filter({ org_type });
  if (org_type === "small_business") {
    if (tier) {
      const byTier = plans.find((p) => p.tier === tier);
      if (byTier) return byTier;
    }
    const business = plans.find((p) => p.tier === "business");
    if (business) return business;
  }
  return plans.find((p) => !p.tier) || plans[0] || null;
}

export async function getAllPlans(svc) {
  await ensureDefaultPlans(svc);
  return await svc.entities.SubscriptionPlan.list();
}

// Resolve the effective regional pricing for a given organisation country.
// Returns the currency-keyed entry (including status) for the matching billing currency.
export function resolvePlanPrice(plan, country) {
  const fallback = {
    monthly_price: 0, currency: "USD", trial_price: 1, trial_days: 5,
    status: "coming_soon", label: "", indicative_converted_value: null, exchange_rate_timestamp: null,
  };
  if (!plan) return fallback;
  const currency = countryToCurrency(country);
  const regional = (plan.regional_prices || {})[currency];
  if (regional) {
    return {
      monthly_price: regional.monthly_price || 0,
      currency: regional.currency || currency,
      trial_price: regional.trial_price !== undefined && regional.trial_price !== null ? regional.trial_price : (plan.trial_price || 1),
      trial_days: regional.trial_days || plan.trial_days || 5,
      status: regional.status || "coming_soon",
      label: regional.label || "",
      indicative_converted_value: regional.indicative_converted_value || null,
      exchange_rate_timestamp: regional.exchange_rate_timestamp || null,
    };
  }
  return fallback;
}

// Return all regional pricing entries for a plan, keyed by billing currency,
// merged with defaults so every supported currency is always present.
export function getRegionalPricingEntries(plan) {
  const defaults = JSON.parse(JSON.stringify(DEFAULT_REGIONAL_PRICES));
  if (!plan || !plan.regional_prices) return defaults;
  const merged = { ...defaults };
  for (const cur of Object.keys(defaults)) {
    if (plan.regional_prices[cur]) {
      merged[cur] = { ...defaults[cur], ...plan.regional_prices[cur] };
    }
  }
  return merged;
}

// Platform Owner sets a regional price for a specific billing currency.
// Does NOT require Stripe — this is pricing configuration only.
export async function setRegionalPrice(svc, user, org_type, currency, params) {
  await ensureDefaultPlans(svc);
  const plan = await getPlan(svc, org_type);
  if (!plan) throw new Error("Plan not found for org_type: " + org_type);

  const { label, trial_price, trial_days, monthly_price, status } = params;
  if (monthly_price !== undefined && monthly_price < 0) throw new Error("Monthly price must be >= 0");
  if (trial_price !== undefined && trial_price !== null && trial_price < 0) throw new Error("Introductory price must be >= 0");
  if (status && !["active", "coming_soon", "hidden"].includes(status)) {
    throw new Error("Status must be active, coming_soon, or hidden");
  }

  const regionalPrices = plan.regional_prices || {};
  const existing = regionalPrices[currency] || DEFAULT_REGIONAL_PRICES[currency] || {};
  const entry = {
    ...existing,
    currency,
    label: label !== undefined ? label : (existing.label || DEFAULT_REGIONAL_PRICES[currency]?.label || ""),
    trial_price: trial_price !== undefined ? trial_price : existing.trial_price,
    trial_days: trial_days !== undefined ? trial_days : (existing.trial_days || 5),
    monthly_price: monthly_price !== undefined ? monthly_price : (existing.monthly_price || 0),
    status: status || existing.status || "coming_soon",
    updated_date: new Date().toISOString(),
  };
  regionalPrices[currency] = entry;

  await svc.entities.SubscriptionPlan.update(plan.id, {
    regional_prices: regionalPrices,
    updated_by: user.id,
    updated_date: new Date().toISOString(),
  });

  await writeBillingAuditLog(svc, {
    organisation_id: "platform",
    actor_type: "user",
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "subscription.regional_price_set",
    entity_type: "SubscriptionPlan",
    entity_id: plan.id,
    before: { currency, regional_prices: plan.regional_prices },
    after: { currency, monthly_price: entry.monthly_price, status: entry.status, trial_price: entry.trial_price, trial_days: entry.trial_days },
  });

  return await svc.entities.SubscriptionPlan.get(plan.id);
}

// Platform Owner sets the monthly price for a plan. Creates/updates the
// Stripe Price object and stores the price_id.
export async function setPlanPrice(svc, user, org_type, monthly_price) {
  await ensureDefaultPlans(svc);
  const plan = await getPlan(svc, org_type);
  if (!plan) throw new Error("Plan not found for org_type: " + org_type);
  if (monthly_price < 0) throw new Error("Monthly price must be >= 0");

  const stripe = createStripeClient();

  // Deactivate old Stripe price if it exists (Stripe doesn't allow updating amount)
  if (plan.stripe_price_id) {
    try { await stripe.prices.update(plan.stripe_price_id, { active: false }); } catch (e) {}
  }

  // Create new monthly recurring price
  const newPrice = await stripe.prices.create({
    unit_amount: Math.round(monthly_price * 100),
    currency: "usd",
    recurring: { interval: "month" },
    product_data: { name: "FADS AI " + plan.plan_name + " — Monthly" },
  });

  // Create or reuse the $1 trial price (shared one-time price)
  let trialPriceId = plan.stripe_trial_price_id;
  if (!trialPriceId) {
    const trialPrice = await stripe.prices.create({
      unit_amount: 100,
      currency: "usd",
      product_data: { name: "FADS AI — 5-Day Introductory Trial" },
    });
    trialPriceId = trialPrice.id;
  }

  await svc.entities.SubscriptionPlan.update(plan.id, {
    monthly_price,
    stripe_price_id: newPrice.id,
    stripe_trial_price_id: trialPriceId,
    updated_by: user.id,
    updated_date: new Date().toISOString(),
  });

  await writeBillingAuditLog(svc, {
    organisation_id: "platform",
    actor_type: "user",
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "subscription.plan_price_set",
    entity_type: "SubscriptionPlan",
    entity_id: plan.id,
    before: { monthly_price: plan.monthly_price },
    after: { monthly_price, stripe_price_id: newPrice.id },
  });

  return await svc.entities.SubscriptionPlan.get(plan.id);
}

// ── Trial eligibility ──────────────────────────────────────────────
// One introductory trial per customer (user) and per organisation.
export async function checkTrialEligibility(svc, user_id, organisation_id) {
  const userSubs = await svc.entities.Subscription.filter({ user_id });
  const hasUserTrial = userSubs.some(
    (s) => s.status === "trial" || s.status === "active" || s.status === "cancelled" || s.status === "past_due"
  );
  if (hasUserTrial) {
    return { eligible: false, reason: "You have already used the introductory access on another organisation." };
  }
  const orgSubs = await svc.entities.Subscription.filter({ organisation_id });
  if (orgSubs.length > 0) {
    return { eligible: false, reason: "This organisation already has a subscription." };
  }
  return { eligible: true };
}

// ── Checkout ──────────────────────────────────────────────────────
export async function createCheckoutSession(svc, user, org, plan, referral_code, app_url) {
  if (!plan.stripe_price_id || plan.monthly_price <= 0) {
    throw new Error("Checkout is not available — the monthly price has not been configured yet.");
  }

  const eligibility = await checkTrialEligibility(svc, user.id, org.id);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  // Prevent self-referral: if the referral code belongs to this user, drop it
  let safeReferralCode = referral_code || "";
  if (safeReferralCode) {
    const affiliates = await svc.entities.AffiliateProfile.filter({ affiliate_code: safeReferralCode });
    if (affiliates.length > 0 && affiliates[0].user_id === user.id) {
      safeReferralCode = ""; // Self-referral prevented
    }
  }

  const stripe = createStripeClient();
  const trialEnd = Math.floor(Date.now() / 1000) + plan.trial_days * 86400;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    subscription_data: {
      trial_period_days: plan.trial_days,
      add_invoice_items: [{ price: plan.stripe_trial_price_id, quantity: 1 }],
      metadata: {
        organisation_id: org.id,
        user_id: user.id,
        plan_id: plan.id,
        org_type: plan.org_type,
        referral_code: safeReferralCode,
      },
    },
    success_url: app_url + "/subscription/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: app_url + "/subscription?cancelled=1",
    customer_email: user.email,
  });

  // Create an incomplete subscription record to track the checkout
  await svc.entities.Subscription.create({
    organisation_id: org.id,
    organisation_name: org.name,
    user_id: user.id,
    user_email: user.email,
    plan_id: plan.id,
    org_type: plan.org_type,
    tier: plan.tier || "",
    stripe_checkout_session_id: session.id,
    stripe_customer_id: session.customer || "",
    status: "incomplete",
    trial_start: new Date().toISOString(),
    trial_end: new Date(trialEnd * 1000).toISOString(),
    monthly_price: plan.monthly_price,
    currency: plan.currency,
    referral_code_used: safeReferralCode,
    data_mode: org.data_mode || "live",
  });

  await writeBillingAuditLog(svc, {
    organisation_id: org.id,
    actor_type: "user",
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "subscription.checkout_created",
    entity_type: "Subscription",
    after: { checkout_session_id: session.id, plan_id: plan.id, referral_code: safeReferralCode },
    stripe_reference: session.id,
  });

  return { checkout_url: session.url };
}

// ── Cancel ─────────────────────────────────────────────────────────
export async function cancelUserSubscription(svc, user, organisation_id) {
  const subs = await svc.entities.Subscription.filter({ organisation_id, user_id: user.id });
  if (subs.length === 0) throw new Error("No subscription found for this organisation");
  const sub = subs[0];

  if (sub.status !== "trial" && sub.status !== "active") {
    throw new Error("Subscription cannot be cancelled in its current state: " + sub.status);
  }

  // Cancel at period end via Stripe — maintains access until trial expires
  if (sub.stripe_subscription_id) {
    const stripe = createStripeClient();
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }

  await svc.entities.Subscription.update(sub.id, {
    cancel_at_period_end: true,
    cancelled_date: new Date().toISOString(),
    cancellation_reason: "User cancelled",
  });

  await writeBillingAuditLog(svc, {
    organisation_id,
    actor_type: "user",
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "subscription.cancelled_by_user",
    entity_type: "Subscription",
    entity_id: sub.id,
    before: { status: sub.status },
    after: { cancel_at_period_end: true },
    stripe_reference: sub.stripe_subscription_id,
  });

  return { ok: true };
}

// ── Get subscription for org ──────────────────────────────────────
export async function getSubscriptionForOrg(svc, organisation_id) {
  const subs = await svc.entities.Subscription.filter({ organisation_id });
  const valid = subs.filter((s) => s.status !== "incomplete");
  if (valid.length > 0) return valid[0];
  return subs[0] || null;
}

// ── Webhook event processing ──────────────────────────────────────
export async function processStripeEvent(svc, event) {
  // Idempotency: skip already-processed events
  const existing = await svc.entities.PaymentEvent.filter({ stripe_event_id: event.id });
  if (existing.length > 0 && existing[0].processed) {
    return { ok: true, duplicate: true };
  }

  let result = { ok: true };

  switch (event.type) {
    case "checkout.session.completed":
      result = await handleCheckoutCompleted(svc, event);
      break;
    case "invoice.payment_succeeded":
      result = await handlePaymentSucceeded(svc, event);
      break;
    case "invoice.payment_failed":
      result = await handlePaymentFailed(svc, event);
      break;
    case "customer.subscription.updated":
      result = await handleSubscriptionUpdated(svc, event);
      break;
    case "customer.subscription.deleted":
      result = await handleSubscriptionDeleted(svc, event);
      break;
    case "charge.refunded":
      result = await handleChargeRefunded(svc, event);
      break;
    default:
      result = { ok: true, unhandled: event.type };
  }

  return result;
}

async function handleCheckoutCompleted(svc, event) {
  const session = event.data.object;
  const metadata = session.metadata || {};
  const organisation_id = metadata.organisation_id;

  const subs = await svc.entities.Subscription.filter({ stripe_checkout_session_id: session.id });
  if (subs.length === 0) return { ok: false, error: "Subscription not found for checkout session" };
  const sub = subs[0];

  const trialEnd = sub.trial_end;

  await svc.entities.Subscription.update(sub.id, {
    status: "trial",
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    trial_start: new Date().toISOString(),
  });

  await grantEntitlement(svc, {
    organisation_id,
    subscription_id: sub.id,
    channel: "web_stripe",
    external_id: session.subscription,
    status: "active",
    entitlement_type: "trial_access",
    granted_date: new Date().toISOString(),
    expires_date: trialEnd,
    data_mode: sub.data_mode,
  });

  await updateOrgAccessStatus(svc, organisation_id, "trial");

  await recordPaymentEvent(svc, {
    organisation_id,
    subscription_id: sub.id,
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: session.customer,
    amount: 1,
    currency: "usd",
    status: "paid",
    processed: true,
    processed_date: new Date().toISOString(),
  });

  await writeBillingAuditLog(svc, {
    organisation_id,
    actor_type: "stripe",
    action: "subscription.trial_started",
    entity_type: "Subscription",
    entity_id: sub.id,
    after: { status: "trial", trial_end: trialEnd },
    stripe_reference: session.id,
  });

  return { ok: true };
}

async function handlePaymentSucceeded(svc, event) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  const billingReason = invoice.billing_reason;

  const subs = await svc.entities.Subscription.filter({ stripe_subscription_id: subscriptionId });
  if (subs.length === 0) return { ok: false, error: "Subscription not found" };
  const sub = subs[0];

  const isTrialPayment = billingReason === "subscription_create";
  const amount = (invoice.amount_paid || 0) / 100;

  await recordPaymentEvent(svc, {
    organisation_id: sub.organisation_id,
    subscription_id: sub.id,
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: invoice.customer,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent,
    amount,
    currency: invoice.currency,
    status: "paid",
    billing_reason: billingReason,
    processed: true,
    processed_date: new Date().toISOString(),
  });

  if (isTrialPayment) {
    // Introductory payment — access already granted in checkout.session.completed.
    // No affiliate commission is earned on introductory access.
    return { ok: true, trial: true };
  }

  // Regular renewal payment — activate subscription and generate commission
  await svc.entities.Subscription.update(sub.id, {
    status: "active",
    current_period_start: new Date((invoice.period_start || 0) * 1000).toISOString(),
    current_period_end: new Date((invoice.period_end || 0) * 1000).toISOString(),
  });

  await updateEntitlementForSubscription(svc, sub, "full_access", "active",
    new Date((invoice.period_end || 0) * 1000).toISOString());

  await updateOrgAccessStatus(svc, sub.organisation_id, "active");

  // Generate affiliate commission on verified successful renewal payment.
  // The Stripe invoice ID is the conversion reference (idempotency: one
  // commission per invoice, even if the webhook is replayed).
  if (sub.referral_code_used) {
    await generateAffiliateCommission(svc, sub, amount, {
      conversionReference: invoice.id,
      paymentCurrency: (invoice.currency || "").toUpperCase() || sub.currency || "USD",
      description: "Subscription renewal — verified " + (invoice.currency || "").toUpperCase() + " " + amount + " payment",
    });
  }

  await writeBillingAuditLog(svc, {
    organisation_id: sub.organisation_id,
    actor_type: "stripe",
    action: "subscription.payment_succeeded",
    entity_type: "Subscription",
    entity_id: sub.id,
    after: { status: "active", amount, currency: invoice.currency },
    stripe_reference: invoice.id,
  });

  return { ok: true, renewal: true };
}

async function handlePaymentFailed(svc, event) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;

  const subs = await svc.entities.Subscription.filter({ stripe_subscription_id: subscriptionId });
  if (subs.length === 0) return { ok: false, error: "Subscription not found" };
  const sub = subs[0];

  await svc.entities.Subscription.update(sub.id, { status: "past_due" });
  await updateOrgAccessStatus(svc, sub.organisation_id, "paused");

  await recordPaymentEvent(svc, {
    organisation_id: sub.organisation_id,
    subscription_id: sub.id,
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: invoice.customer,
    stripe_invoice_id: invoice.id,
    amount: (invoice.amount_due || 0) / 100,
    currency: invoice.currency,
    status: "failed",
    billing_reason: invoice.billing_reason,
    processed: true,
    processed_date: new Date().toISOString(),
  });

  await writeBillingAuditLog(svc, {
    organisation_id: sub.organisation_id,
    actor_type: "stripe",
    action: "subscription.payment_failed",
    entity_type: "Subscription",
    entity_id: sub.id,
    after: { status: "past_due" },
    stripe_reference: invoice.id,
  });

  return { ok: true };
}

async function handleSubscriptionUpdated(svc, event) {
  const subObj = event.data.object;
  const subscriptionId = subObj.id;

  const subs = await svc.entities.Subscription.filter({ stripe_subscription_id: subscriptionId });
  if (subs.length === 0) return { ok: false, error: "Subscription not found" };
  const sub = subs[0];

  const updates = {};
  if (subObj.status === "active") updates.status = "active";
  if (subObj.status === "past_due") updates.status = "past_due";
  if (subObj.status === "canceled") updates.status = "cancelled";
  if (subObj.cancel_at_period_end !== undefined) updates.cancel_at_period_end = subObj.cancel_at_period_end;
  if (subObj.current_period_start) updates.current_period_start = new Date(subObj.current_period_start * 1000).toISOString();
  if (subObj.current_period_end) updates.current_period_end = new Date(subObj.current_period_end * 1000).toISOString();

  await svc.entities.Subscription.update(sub.id, updates);

  await recordPaymentEvent(svc, {
    organisation_id: sub.organisation_id,
    subscription_id: sub.id,
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: subObj.customer,
    status: subObj.status,
    processed: true,
    processed_date: new Date().toISOString(),
  });

  return { ok: true };
}

async function handleSubscriptionDeleted(svc, event) {
  const subObj = event.data.object;
  const subscriptionId = subObj.id;

  const subs = await svc.entities.Subscription.filter({ stripe_subscription_id: subscriptionId });
  if (subs.length === 0) return { ok: false, error: "Subscription not found" };
  const sub = subs[0];

  await svc.entities.Subscription.update(sub.id, {
    status: "cancelled",
    cancelled_date: new Date().toISOString(),
  });

  await revokeEntitlement(svc, sub);
  await updateOrgAccessStatus(svc, sub.organisation_id, "cancelled");

  await recordPaymentEvent(svc, {
    organisation_id: sub.organisation_id,
    subscription_id: sub.id,
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: subObj.customer,
    status: "deleted",
    processed: true,
    processed_date: new Date().toISOString(),
  });

  await writeBillingAuditLog(svc, {
    organisation_id: sub.organisation_id,
    actor_type: "stripe",
    action: "subscription.deleted",
    entity_type: "Subscription",
    entity_id: sub.id,
    after: { status: "cancelled" },
    stripe_reference: subscriptionId,
  });

  return { ok: true };
}

async function handleChargeRefunded(svc, event) {
  const charge = event.data.object;
  const subscriptionId = charge.subscription;
  if (!subscriptionId) return { ok: true, no_subscription: true };

  const subs = await svc.entities.Subscription.filter({ stripe_subscription_id: subscriptionId });
  if (subs.length === 0) return { ok: false, error: "Subscription not found" };
  const sub = subs[0];

  await svc.entities.Subscription.update(sub.id, {
    status: "cancelled",
    cancelled_date: new Date().toISOString(),
    cancellation_reason: "Refunded",
  });

  await revokeEntitlement(svc, sub);
  await updateOrgAccessStatus(svc, sub.organisation_id, "cancelled");

  await recordPaymentEvent(svc, {
    organisation_id: sub.organisation_id,
    subscription_id: sub.id,
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: charge.customer,
    stripe_payment_intent_id: charge.payment_intent,
    amount: (charge.amount_refunded || 0) / 100,
    currency: charge.currency,
    status: "refunded",
    processed: true,
    processed_date: new Date().toISOString(),
  });

  await writeBillingAuditLog(svc, {
    organisation_id: sub.organisation_id,
    actor_type: "stripe",
    action: "subscription.refunded",
    entity_type: "Subscription",
    entity_id: sub.id,
    after: { status: "cancelled" },
    stripe_reference: charge.id,
  });

  // Cancel the affiliate commission tied to the refunded payment (if any).
  // The Stripe charge carries the invoice ID, which matches the commission's
  // conversion_reference. Only pending/approved commissions are cancelled.
  if (sub.referral_code_used && charge.invoice) {
    try {
      await cancelCommissionByReference(svc, sub.organisation_id, charge.invoice, "Refunded payment");
    } catch (e) {
      // Non-fatal — refund still processed.
    }
  }

  return { ok: true };
}

// ── Entitlements ───────────────────────────────────────────────────
export async function grantEntitlement(svc, params) {
  const existing = await svc.entities.SubscriptionEntitlement.filter({
    organisation_id: params.organisation_id,
    subscription_id: params.subscription_id,
    channel: params.channel,
  });
  if (existing.length > 0) {
    await svc.entities.SubscriptionEntitlement.update(existing[0].id, {
      external_id: params.external_id,
      status: params.status,
      entitlement_type: params.entitlement_type,
      expires_date: params.expires_date,
      revoked_date: null,
    });
    return existing[0];
  }
  return await svc.entities.SubscriptionEntitlement.create({
    organisation_id: params.organisation_id,
    subscription_id: params.subscription_id,
    channel: params.channel,
    external_id: params.external_id,
    status: params.status,
    entitlement_type: params.entitlement_type,
    granted_date: params.granted_date || new Date().toISOString(),
    expires_date: params.expires_date,
    data_mode: params.data_mode || "live",
  });
}

async function updateEntitlementForSubscription(svc, sub, type, status, expires) {
  const entitlements = await svc.entities.SubscriptionEntitlement.filter({
    organisation_id: sub.organisation_id,
    subscription_id: sub.id,
  });
  for (const e of entitlements) {
    await svc.entities.SubscriptionEntitlement.update(e.id, {
      entitlement_type: type,
      status,
      expires_date: expires,
    });
  }
}

export async function revokeEntitlement(svc, sub) {
  const entitlements = await svc.entities.SubscriptionEntitlement.filter({
    organisation_id: sub.organisation_id,
    subscription_id: sub.id,
  });
  for (const e of entitlements) {
    await svc.entities.SubscriptionEntitlement.update(e.id, {
      status: "revoked",
      revoked_date: new Date().toISOString(),
    });
  }
}

// ── Org access status ──────────────────────────────────────────────
export async function updateOrgAccessStatus(svc, organisation_id, status) {
  try {
    await svc.entities.Organisation.update(organisation_id, { access_status: status });
  } catch (e) {
    // Non-fatal — org might not exist in test scenarios
  }
}

// ── Affiliate commission on renewal ───────────────────────────────
async function generateAffiliateCommission(svc, subscription, paymentAmount, opts = {}) {
  if (!subscription.referral_code_used) return;

  const conversionReference = opts.conversionReference || subscription.stripe_subscription_id || subscription.id;
  const paymentCurrency = opts.paymentCurrency || subscription.currency || "USD";

  const attributions = await svc.entities.ReferralAttribution.filter({
    referred_organisation_id: subscription.organisation_id,
    status: "active",
  });
  if (attributions.length === 0) return;
  const attribution = attributions[0];

  const affiliate = await svc.entities.AffiliateProfile.get(attribution.affiliate_id);
  if (!affiliate || (affiliate.status !== "active" && affiliate.status !== "approved")) return;

  // Idempotency: skip if a commission already exists for this conversion
  // reference (one commission per verified payment, even on webhook replay or
  // re-verification of the same manual payment).
  const existing = await svc.entities.Commission.filter({
    attribution_id: attribution.id,
    conversion_reference: conversionReference,
  });
  if (existing.length > 0) return { skipped: true, reason: "duplicate" };

  const commissionAmount = calculateCommissionAmount(
    affiliate.commission_type,
    affiliate.commission_value,
    paymentAmount
  );

  // Commission is recorded in the verified customer-payment currency. No
  // approximate currency conversion is applied — amount and currency both
  // come from the verified payment (Stripe event or manual verification).
  const commission = await svc.entities.Commission.create({
    user_id: affiliate.user_id,
    affiliate_id: affiliate.id,
    attribution_id: attribution.id,
    organisation_id: subscription.organisation_id,
    organisation_name: subscription.organisation_name,
    type: affiliate.commission_type,
    value: affiliate.commission_value,
    frequency: affiliate.commission_frequency,
    amount: commissionAmount,
    currency: paymentCurrency,
    status: "pending",
    is_manually_verified: false,
    description: opts.description || ("Subscription payment — verified " + paymentCurrency + " " + paymentAmount),
    conversion_reference: conversionReference,
    data_mode: subscription.data_mode || "live",
  });

  await recalcAffiliateTotals(svc, affiliate.id);

  await writeAffiliateAuditLog(svc, {
    organisation_id: subscription.organisation_id,
    actor_type: "system",
    action: "affiliate.commission_auto_generated",
    entity_type: "Commission",
    entity_id: commission.id,
    after: { amount: commissionAmount, subscription_id: subscription.id, conversion_reference: conversionReference },
  });

  return { ok: true, commission };
}

// ── Beta access (manual, no payment, no commission) ───────────────
// Platform Owner grants a 5-day beta access window without collecting
// payment. This is NOT a paid trial and does NOT generate affiliate
// commission. Start date, expiry date, status and admin action are
// recorded in BillingAuditLog.
export async function grantBetaAccess(svc, adminUser, organisation_id, days = 5) {
  const existing = await getSubscriptionForOrg(svc, organisation_id);
  if (existing && existing.status !== "cancelled" && existing.status !== "expired") {
    throw new Error("This organisation already has an active subscription or beta access.");
  }

  const org = await svc.entities.Organisation.get(organisation_id).catch(() => null);
  if (!org) throw new Error("Organisation not found");

  const plan = await getPlan(svc, org.type);
  const now = new Date();
  const expiry = new Date(now.getTime() + days * 86400000);

  const sub = await svc.entities.Subscription.create({
    organisation_id: org.id,
    organisation_name: org.name,
    user_id: org.owner_user_id || adminUser.id,
    user_email: adminUser.email,
    plan_id: plan?.id || "",
    org_type: org.type,
    tier: plan?.tier || "",
    status: "trial",
    access_type: "beta_manual",
    trial_start: now.toISOString(),
    trial_end: expiry.toISOString(),
    monthly_price: plan?.monthly_price || 0,
    currency: plan?.currency || "USD",
    data_mode: org.data_mode || "live",
  });

  await grantEntitlement(svc, {
    organisation_id: org.id,
    subscription_id: sub.id,
    channel: "manual",
    external_id: "beta_manual",
    status: "active",
    entitlement_type: "beta_access",
    granted_date: now.toISOString(),
    expires_date: expiry.toISOString(),
    data_mode: org.data_mode || "live",
  });

  await updateOrgAccessStatus(svc, org.id, "trial");

  await writeBillingAuditLog(svc, {
    organisation_id: org.id,
    actor_type: "user",
    actor_user_id: adminUser.id,
    actor_user_email: adminUser.email,
    action: "subscription.beta_access_granted",
    entity_type: "Subscription",
    entity_id: sub.id,
    after: {
      access_type: "beta_manual",
      trial_start: now.toISOString(),
      trial_end: expiry.toISOString(),
      days,
    },
  });

  return sub;
}

export async function revokeBetaAccess(svc, adminUser, organisation_id) {
  const subs = await svc.entities.Subscription.filter({
    organisation_id,
    access_type: "beta_manual",
  });
  if (subs.length === 0) throw new Error("No beta access found for this organisation");

  const sub = subs[0];
  const now = new Date().toISOString();

  await svc.entities.Subscription.update(sub.id, {
    status: "cancelled",
    cancelled_date: now,
    cancellation_reason: "Beta access revoked by Platform Owner",
  });

  await revokeEntitlement(svc, sub);
  await updateOrgAccessStatus(svc, organisation_id, "cancelled");

  await writeBillingAuditLog(svc, {
    organisation_id,
    actor_type: "user",
    actor_user_id: adminUser.id,
    actor_user_email: adminUser.email,
    action: "subscription.beta_access_revoked",
    entity_type: "Subscription",
    entity_id: sub.id,
    before: { status: sub.status },
    after: { status: "cancelled", cancelled_date: now },
  });

  return { ok: true };
}

// ── Payment event record ──────────────────────────────────────────
async function recordPaymentEvent(svc, params) {
  return await svc.entities.PaymentEvent.create({
    organisation_id: params.organisation_id,
    subscription_id: params.subscription_id,
    stripe_event_id: params.stripe_event_id,
    event_type: params.event_type,
    stripe_customer_id: params.stripe_customer_id || null,
    stripe_invoice_id: params.stripe_invoice_id || null,
    stripe_payment_intent_id: params.stripe_payment_intent_id || null,
    amount: params.amount || 0,
    currency: params.currency || null,
    status: params.status || null,
    billing_reason: params.billing_reason || null,
    processed: params.processed || false,
    processed_date: params.processed_date || null,
  });
}

// ── Billing audit log ─────────────────────────────────────────────
export async function writeBillingAuditLog(svc, entry) {
  await svc.entities.BillingAuditLog.create({
    organisation_id: entry.organisation_id || "platform",
    actor_type: entry.actor_type || "system",
    actor_user_id: entry.actor_user_id || null,
    actor_user_email: entry.actor_user_email || null,
    action: entry.action,
    entity_type: entry.entity_type || null,
    entity_id: entry.entity_id || null,
    before: entry.before || null,
    after: entry.after || null,
    result: entry.result || "success",
    payment_provider: entry.payment_provider || null,
    stripe_reference: entry.stripe_reference || null,
    provider_reference: entry.provider_reference || null,
  });
}

// ── Org access status sync ──────────────────────────────────────────
// Maps a Subscription status to the Organisation.access_status that
// controls whether the organisation can access FADS AI. Used by the
// manual verification workflow and (future) external provider webhooks.
export function subscriptionStatusToAccessStatus(status) {
  switch (status) {
    case "active":
      return "active";
    case "past_due":
      return "paused";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "payment_pending":
      // Payment reported but not yet verified — do NOT activate.
      // Keep the organisation in its current (trial) access state.
      return "trial";
    case "trial":
    case "incomplete":
    default:
      return "trial";
  }
}

export async function syncOrgAccessFromSubscription(svc, sub) {
  const accessStatus = subscriptionStatusToAccessStatus(sub.status);
  await updateOrgAccessStatus(svc, sub.organisation_id, accessStatus);
}

// ── Admin: customer subscriptions overview ───────────────────────────
// Returns all organisations joined with their owner user and the
// subscription record (if any). Platform Owner only — caller checks.
export async function getCustomerSubscriptions(svc) {
  const [orgs, subscriptions, users] = await Promise.all([
    svc.entities.Organisation.list("-created_date", 500),
    svc.entities.Subscription.list("-created_date", 500),
    svc.entities.User.list(),
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const subByOrg = new Map();
  for (const s of subscriptions) {
    // Prefer a non-incomplete subscription per organisation.
    const existing = subByOrg.get(s.organisation_id);
    if (!existing || (existing.status === "incomplete" && s.status !== "incomplete")) {
      subByOrg.set(s.organisation_id, s);
    }
  }

  return orgs.map((org) => {
    const owner = org.owner_user_id ? userById.get(org.owner_user_id) : null;
    const sub = subByOrg.get(org.id) || null;
    return {
      organisation_id: org.id,
      organisation_name: org.name,
      organisation_type: org.type,
      country: org.country,
      data_mode: org.data_mode,
      access_status: org.access_status,
      owner_id: org.owner_user_id || "",
      owner_name: owner?.full_name || "",
      owner_email: owner?.email || "",
      subscription: sub,
    };
  });
}

// ── Admin: record a manual bank-transfer payment ────────────────────
// Records the payment details a FADS admin enters against an organisation
// and sets the subscription status to payment_pending. Does NOT activate
// access — a bank transfer never auto-activates. Payment must be verified
// separately via verifyManualPayment.
export async function recordManualPayment(svc, adminUser, organisation_id, params) {
  const org = await svc.entities.Organisation.get(organisation_id).catch(() => null);
  if (!org) throw new Error("Organisation not found");

  const plan = await getPlan(svc, org.type);
  let sub = await getSubscriptionForOrg(svc, organisation_id);

  const paymentFields = {
    payment_provider: "manual",
    payment_method: params.payment_method || "bank_transfer",
    payment_amount: Number(params.payment_amount) || 0,
    payment_currency: params.payment_currency || org.currency || "USD",
    payment_reference: params.payment_reference || "",
    payment_date: params.payment_date || null,
    payment_verified: false,
    payment_verified_by: null,
    payment_verified_by_email: null,
    payment_verified_date: null,
  };

  const before = sub ? { status: sub.status, payment_verified: sub.payment_verified } : null;

  if (!sub) {
    sub = await svc.entities.Subscription.create({
      organisation_id: org.id,
      organisation_name: org.name,
      user_id: org.owner_user_id || adminUser.id,
      user_email: adminUser.email,
      plan_id: plan?.id || "",
      plan_name: plan?.plan_name || "",
      org_type: org.type,
      tier: plan?.tier || "",
      status: "payment_pending",
      currency: org.currency || "USD",
      monthly_price: plan?.monthly_price || 0,
      data_mode: org.data_mode || "live",
      ...paymentFields,
    });
  } else {
    await svc.entities.Subscription.update(sub.id, {
      status: "payment_pending",
      ...paymentFields,
    });
    sub = await svc.entities.Subscription.get(sub.id);
  }

  await syncOrgAccessFromSubscription(svc, sub);

  await writeBillingAuditLog(svc, {
    organisation_id: org.id,
    actor_type: "user",
    actor_user_id: adminUser.id,
    actor_user_email: adminUser.email,
    action: "subscription.manual_payment_recorded",
    entity_type: "Subscription",
    entity_id: sub.id,
    before,
    after: {
      payment_method: paymentFields.payment_method,
      payment_amount: paymentFields.payment_amount,
      payment_currency: paymentFields.payment_currency,
      payment_reference: paymentFields.payment_reference,
      payment_date: paymentFields.payment_date,
      status: "payment_pending",
    },
    payment_provider: "manual",
    provider_reference: paymentFields.payment_reference || null,
  });

  return sub;
}

// ── Admin: verify a manual payment and activate ─────────────────────
// Marks the recorded payment as verified by the FADS admin and moves the
// subscription from payment_pending (or trial) to active. Sets the
// subscription start / renewal / expiry dates supplied by the admin.
export async function verifyManualPayment(svc, adminUser, organisation_id, params) {
  const org = await svc.entities.Organisation.get(organisation_id).catch(() => null);
  if (!org) throw new Error("Organisation not found");

  let sub = await getSubscriptionForOrg(svc, organisation_id);
  if (!sub) throw new Error("No subscription record found — record a payment first");

  const before = {
    status: sub.status,
    payment_verified: sub.payment_verified,
  };

  const updates = {
    payment_verified: true,
    payment_verified_by: adminUser.id,
    payment_verified_by_email: adminUser.email,
    payment_verified_date: new Date().toISOString(),
    status: "active",
    payment_provider: sub.payment_provider || "manual",
  };
  if (params.subscription_start_date) updates.subscription_start_date = params.subscription_start_date;
  if (params.current_period_start) updates.current_period_start = params.current_period_start;
  if (params.current_period_end) updates.current_period_end = params.current_period_end;
  if (params.trial_end !== undefined) updates.trial_end = params.trial_end;

  await svc.entities.Subscription.update(sub.id, updates);
  sub = await svc.entities.Subscription.get(sub.id);

  await syncOrgAccessFromSubscription(svc, sub);

  await writeBillingAuditLog(svc, {
    organisation_id: org.id,
    actor_type: "user",
    actor_user_id: adminUser.id,
    actor_user_email: adminUser.email,
    action: "subscription.manual_payment_verified",
    entity_type: "Subscription",
    entity_id: sub.id,
    before,
    after: {
      status: "active",
      payment_verified: true,
      payment_verified_by: adminUser.email,
      subscription_start_date: updates.subscription_start_date || null,
      current_period_end: updates.current_period_end || null,
    },
    payment_provider: "manual",
    provider_reference: sub.payment_reference || null,
  });

  // Generate affiliate commission on verified manual payment (V1 bank-transfer
  // path). The admin verification IS the payment confirmation for manual
  // subscriptions. Idempotency is enforced via the payment reference, so
  // re-verifying the same payment does not create a duplicate commission; each
  // new monthly payment (new reference) generates a new recurring commission.
  if (sub.referral_code_used && (sub.payment_amount || 0) > 0) {
    try {
      await generateAffiliateCommission(svc, sub, sub.payment_amount, {
        conversionReference: sub.payment_reference || ("manual-" + sub.id + "-" + (sub.payment_verified_date || new Date().toISOString())),
        paymentCurrency: sub.payment_currency || sub.currency || "USD",
        description: "Manual payment verified — " + (sub.payment_currency || "") + " " + (sub.payment_amount || 0) + " (" + (sub.payment_method || "bank_transfer") + ")",
      });
    } catch (e) {
      // Non-fatal — payment verification still succeeds; commission failure is logged separately.
    }
  }

  return sub;
}

// ── Admin: change subscription status / dates ────────────────────────
// Lets a FADS admin suspend (past_due/cancelled/expired) or reactivate
// (active) an organisation's subscription, and adjust the start / renewal
// / expiry dates. All transitions are audited. This is the same path a
// future authenticated HBA/Paystack webhook will use to move statuses
// (Payment Pending → Active, Active → Past Due, Active → Cancelled/Expired).
export async function setSubscriptionStatus(svc, adminUser, organisation_id, params) {
  const org = await svc.entities.Organisation.get(organisation_id).catch(() => null);
  if (!org) throw new Error("Organisation not found");

  const allowed = ["trial", "payment_pending", "active", "past_due", "cancelled", "expired"];
  if (!allowed.includes(params.status)) {
    throw new Error("Invalid subscription status: " + params.status);
  }

  let sub = await getSubscriptionForOrg(svc, organisation_id);
  if (!sub) throw new Error("No subscription record found — record a payment first");

  const before = {
    status: sub.status,
    subscription_start_date: sub.subscription_start_date,
    current_period_end: sub.current_period_end,
    cancelled_date: sub.cancelled_date,
  };

  const updates = { status: params.status };
  if (params.subscription_start_date !== undefined) updates.subscription_start_date = params.subscription_start_date || null;
  if (params.current_period_start !== undefined) updates.current_period_start = params.current_period_start || null;
  if (params.current_period_end !== undefined) updates.current_period_end = params.current_period_end || null;
  if (params.trial_end !== undefined) updates.trial_end = params.trial_end || null;
  if (params.status === "cancelled" || params.status === "expired") {
    updates.cancelled_date = new Date().toISOString();
    if (params.cancellation_reason) updates.cancellation_reason = params.cancellation_reason;
  }

  await svc.entities.Subscription.update(sub.id, updates);
  sub = await svc.entities.Subscription.get(sub.id);

  await syncOrgAccessFromSubscription(svc, sub);

  await writeBillingAuditLog(svc, {
    organisation_id: org.id,
    actor_type: "user",
    actor_user_id: adminUser.id,
    actor_user_email: adminUser.email,
    action: "subscription.status_changed",
    entity_type: "Subscription",
    entity_id: sub.id,
    before,
    after: {
      status: params.status,
      subscription_start_date: updates.subscription_start_date,
      current_period_end: updates.current_period_end,
      cancelled_date: updates.cancelled_date || null,
    },
    payment_provider: sub.payment_provider || "manual",
    provider_reference: sub.provider_subscription_reference || sub.payment_reference || null,
  });

  return sub;
}