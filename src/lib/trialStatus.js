// Trial status logic + prepared reminder message strings for the
// Nigeria ₦5,000 / 5-day paid trial (and any paid trial).
//
// This REUSES the existing subscription system — it adds display/status
// logic and prepared messages, not a new trial engine. The ₦5,000 / 5-day
// pricing itself is already configured in the existing regional pricing
// (DEFAULT_REGIONAL_PRICES.NGN in base44/shared/subscription.ts).

export const TRIAL_DURATION_DAYS = 5;

// Compute the trial state from an existing subscription record.
// States: "active" | "ending" | "ended" | "paid_subscriber" | "none"
export function computeTrialStatus(subscription) {
  if (!subscription) return { state: "none", daysRemaining: 0, trialStart: null, trialEnd: null };

  const status = subscription.status;
  const trialStart = subscription.trial_start ? new Date(subscription.trial_start) : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
  const now = new Date();

  // Paid subscriber (verified, active subscription)
  if (status === "active") {
    return { state: "paid_subscriber", daysRemaining: 0, trialStart, trialEnd };
  }

  // Formally cancelled / expired
  if (status === "cancelled" || status === "expired") {
    return { state: "ended", daysRemaining: 0, trialStart, trialEnd };
  }

  // Trial period — check whether the end date has passed
  if (trialEnd && trialEnd < now) {
    return { state: "ended", daysRemaining: 0, trialStart, trialEnd };
  }

  // Active trial (status trial / payment_pending / past_due / incomplete)
  const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : 0;
  if (daysRemaining <= 2) {
    return { state: "ending", daysRemaining, trialStart, trialEnd };
  }
  return { state: "active", daysRemaining, trialStart, trialEnd };
}

export const TRIAL_STATE_LABELS = {
  active: "Trial Active",
  ending: "Trial Ending",
  ended: "Trial Ended",
  paid_subscriber: "Paid Subscriber",
};

export const TRIAL_STATE_TONE = {
  active: { color: "text-status-warn", bg: "bg-status-warn/15", icon: "clock" },
  ending: { color: "text-status-warn", bg: "bg-status-warn/15", icon: "clock" },
  ended: { color: "text-status-bad", bg: "bg-status-bad/15", icon: "alert" },
  paid_subscriber: { color: "text-status-ok", bg: "bg-status-ok/15", icon: "check" },
};

// ---- Prepared reminder message strings ----
// The existing "Renewal Reminders" workflow already sends a 24h reminder.
// These additional states (started, 2 days left, final day, ended) are
// prepared here for later wiring without building new messaging
// infrastructure in V1. `monthlyPriceLabel` e.g. "₦30,000/month".
export function trialReminderMessage(state, { monthlyPriceLabel } = {}) {
  const price = monthlyPriceLabel || "₦30,000/month";
  switch (state) {
    case "started":
      return {
        subject: "Welcome to FADS AI — your 5-day trial has started",
        body: "Welcome to FADS AI — your 5-day trial has started. Explore FADS AI and see how it can simplify your business, school or church administration.",
      };
    case "two_days_left":
      return {
        subject: "You have 2 days left to explore FADS AI",
        body: `You have 2 days left to explore FADS AI. Continue with FADS for ${price} when you're ready.`,
      };
    case "final_day":
      return {
        subject: "Your FADS trial ends today",
        body: `Your FADS trial ends today. Continue with FADS for ${price} to keep using your workspace.`,
      };
    case "ended":
      return {
        subject: "Your FADS trial has ended",
        body: `Your trial has ended, but your FADS workspace is still here. Continue for ${price}.`,
      };
    default:
      return null;
  }
}