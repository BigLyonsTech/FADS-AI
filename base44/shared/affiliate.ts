// Shared affiliate helpers — platform-level logic used by the affiliate and
// workspace backend functions. All mutations go through the service role;
// RLS blocks direct app-user writes on every affiliate entity.

// Throw a 403-style error if the caller is not a Platform Owner (admin).
export function requireAdmin(user) {
  if (!user || user.role !== "admin") {
    throw new Error("Platform Owner access required");
  }
}

// Generate a unique 8-char affiliate code (no ambiguous chars).
export async function generateUniqueCode(svc) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = await svc.entities.AffiliateProfile.filter({ affiliate_code: code });
    if (existing.length === 0) return code;
  }
  throw new Error("Failed to generate unique affiliate code");
}

// Get the singleton programme settings, creating defaults on first access.
export async function getProgrammeSettings(svc) {
  const existing = await svc.entities.AffiliateProgrammeSettings.filter({ singleton_key: "global" });
  if (existing.length > 0) return existing[0];
  return await svc.entities.AffiliateProgrammeSettings.create({
    singleton_key: "global",
    default_commission_type: "percentage",
    default_commission_value: 30,
    default_commission_frequency: "recurring",
    supported_countries: ["NG", "IE", "GB", "FR", "US"],
    default_payout_currency: "EUR",
    terms_version: "1.0",
    is_programme_active: true,
    min_payout_amount: 50,
    payout_methods: ["bank_transfer", "paypal"],
  });
}

// Format a money amount with the given currency code.
export function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `${currency || ""} ${Number(amount || 0).toFixed(2)}`;
  }
}

// Calculate commission amount from type (percentage or fixed) and value.
export function calculateCommissionAmount(type, value, baseAmount) {
  if (type === "percentage") {
    return Number(((baseAmount * value) / 100).toFixed(2));
  }
  return Number(value) || 0;
}

// Create a referral attribution with self-referral and duplicate guards.
// Called from the workspace function after org creation.
export async function attributeReferral(svc, params) {
  const {
    referral_code,
    referred_user_id,
    organisation_id,
    organisation_name,
    organisation_status,
    data_mode,
  } = params;

  if (!referral_code) return { skipped: true, reason: "No referral code provided" };

  const affiliates = await svc.entities.AffiliateProfile.filter({ affiliate_code: referral_code });
  if (affiliates.length === 0) return { skipped: true, reason: "Code not found" };

  const aff = affiliates[0];
  if (aff.status !== "active" && aff.status !== "approved") {
    return { skipped: true, reason: "Affiliate not active" };
  }

  // Prevent self-referral
  if (aff.user_id === referred_user_id) {
    return { skipped: true, reason: "Self-referral prevented" };
  }

  // Prevent duplicate attribution — one org, one affiliate, once
  const existing = await svc.entities.ReferralAttribution.filter({ referred_organisation_id: organisation_id });
  if (existing.length > 0) {
    return { skipped: true, reason: "Organisation already attributed" };
  }

  await svc.entities.ReferralAttribution.create({
    user_id: aff.user_id,
    affiliate_id: aff.id,
    referred_user_id,
    referred_organisation_id: organisation_id,
    referred_organisation_name: organisation_name,
    referred_organisation_status: organisation_status || "trial",
    code_used: referral_code,
    status: "active",
    attributed_date: new Date().toISOString(),
    data_mode: data_mode || "live",
  });

  await recalcAffiliateTotals(svc, aff.id);

  return { ok: true, affiliate_id: aff.id };
}

// Recalculate denormalized totals on an affiliate profile.
export async function recalcAffiliateTotals(svc, affiliate_id) {
  const attributions = await svc.entities.ReferralAttribution.filter({ affiliate_id, status: "active" });
  const commissions = await svc.entities.Commission.filter({ affiliate_id });

  const pending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const approved = commissions
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const paid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const conversions = commissions.filter((c) => c.status === "approved" || c.status === "paid").length;

  await svc.entities.AffiliateProfile.update(affiliate_id, {
    total_signups: attributions.length,
    total_conversions: conversions,
    total_pending_commission: Number(pending.toFixed(2)),
    total_approved_commission: Number(approved.toFixed(2)),
    total_paid_commission: Number(paid.toFixed(2)),
  });
}

// Cancel the commission tied to a specific conversion reference (e.g. a
// refunded payment). Only pending/approved commissions are cancelled; paid
// commissions are left untouched (already settled). Used by the refund path.
export async function cancelCommissionByReference(svc, organisation_id, conversionReference, reason) {
  if (!conversionReference) return { cancelled: 0 };
  const attributions = await svc.entities.ReferralAttribution.filter({
    referred_organisation_id: organisation_id,
    status: "active",
  });
  if (attributions.length === 0) return { cancelled: 0 };
  const attribution = attributions[0];
  const commissions = await svc.entities.Commission.filter({
    attribution_id: attribution.id,
    conversion_reference: conversionReference,
  });
  let cancelled = 0;
  for (const c of commissions) {
    if (c.status === "pending" || c.status === "approved") {
      await svc.entities.Commission.update(c.id, {
        status: "cancelled",
        description: (c.description || "") + ` [Cancelled: ${reason}]`,
      });
      cancelled++;
    }
  }
  if (cancelled > 0) {
    await recalcAffiliateTotals(svc, attribution.affiliate_id);
    await writeAffiliateAuditLog(svc, {
      organisation_id,
      actor_type: "system",
      action: "affiliate.commission_cancelled_refund",
      entity_type: "Commission",
      after: { cancelled, conversion_reference: conversionReference, reason },
    });
  }
  return { cancelled };
}

// Write a platform-level audit log entry for affiliate actions.
export async function writeAffiliateAuditLog(svc, entry) {
  await svc.entities.AuditLog.create({
    organisation_id: entry.organisation_id || "platform",
    actor_type: entry.actor_type || "user",
    actor_user_id: entry.actor_user_id || null,
    actor_user_email: entry.actor_user_email || null,
    action: entry.action,
    entity_type: entry.entity_type || null,
    entity_id: entry.entity_id || null,
    before: entry.before || null,
    after: entry.after || null,
    result: entry.result || "success",
  });
}