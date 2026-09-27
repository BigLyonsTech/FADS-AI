// FADS Business tier → feature entitlement configuration.
//
// Only small_business organisations are tier-gated. School, church and
// university workspaces have no business tier (plan.tier is null) and receive
// full access — they are separate FADS packages, not tiers.
//
// Feature keys map to module/feature entry points. A feature is available when
// the effective tier rank >= the feature's minimum tier rank.

export const TIER_ORDER = ["starter", "business", "professional"];
export const TIER_LABELS = {
  starter: "Starter",
  business: "Business",
  professional: "Professional",
};

// Feature key → minimum tier required.
// These are the hard module-level gates. Quality/quantity distinctions
// (basic vs fuller Ask FADS, basic vs advanced reports, suppliers, basic vs
// advanced team) have no clean single entry point and are intentionally NOT
// hard-gated — they remain visible to all small_business tiers.
export const FEATURE_MIN_TIER = {
  inventory: "business",
  reconciliation: "business",
  hr: "professional",
  intelligence: "professional",
};

export function tierRank(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? -1 : i;
}

// Resolve the effective FADS Business tier for gating.
// Returns null for non-small-business orgs (no gating / full access).
// Defaults to "business" (the primary SME package) when no tier is recorded.
export function getEffectiveTier(org, subscription, plan) {
  if (!org || org.type !== "small_business") return null;
  const tier = subscription?.tier || plan?.tier || "business";
  return TIER_ORDER.includes(tier) ? tier : "business";
}

export function requiredTierFor(feature) {
  return FEATURE_MIN_TIER[feature] || null;
}

export function isFeatureAvailable(feature, org, subscription, plan) {
  const tier = getEffectiveTier(org, subscription, plan);
  if (tier === null) return true; // school/church/university = full access
  const required = FEATURE_MIN_TIER[feature];
  if (!required) return true; // unknown/ungated feature = allow
  return tierRank(tier) >= tierRank(required);
}