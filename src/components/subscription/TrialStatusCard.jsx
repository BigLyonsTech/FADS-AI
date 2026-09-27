import React from "react";
import { Link } from "react-router-dom";
import { Clock, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  computeTrialStatus,
  TRIAL_STATE_LABELS,
  TRIAL_STATE_TONE,
} from "@/lib/trialStatus";

// Reusable trial status card for the ₦5,000 / 5-day paid trial.
// Reuses the existing subscription record — no new trial engine.
//
// compact  → small status + days-remaining card (for the Account page)
// full     → status card, plus the "trial ended" screen with a continue
//            CTA when the trial has ended (data is preserved, same account)
export default function TrialStatusCard({ subscription, monthlyPriceLabel, compact = false }) {
  const t = computeTrialStatus(subscription);
  if (t.state === "none") return null;

  const label = TRIAL_STATE_LABELS[t.state];
  const tone = TRIAL_STATE_TONE[t.state];
  const Icon = t.state === "paid_subscriber" ? CheckCircle2 : t.state === "ended" ? AlertCircle : Clock;

  // ---- Trial ended screen (full mode only) ----
  if (t.state === "ended" && !compact) {
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="bg-brand-navy p-5 text-white">
          <div className="flex items-center gap-2 text-brand-teal text-sm font-medium mb-1">
            <Sparkles className="w-4 h-4" />
            <span>FADS AI</span>
          </div>
          <h2 className="text-xl font-bold">Your FADS trial has ended.</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Your information is safe — your business profile, finance, CRM, HR, school and church records
            are all preserved. Continue with FADS AI to keep using your workspace with the same account.
          </p>
          <Link to="/subscription">
            <Button className="w-full h-12 min-h-touch text-base">
              Continue with FADS — {monthlyPriceLabel || "₦30,000/month"}
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground text-center">
            You won't be charged automatically — continue whenever you're ready.
          </p>
        </div>
      </div>
    );
  }

  // ---- Status card (active / ending / paid subscriber, or compact ended) ----
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-lg ${tone.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${tone.color}`} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-brand-navy">FADS Trial</p>
          <p className="text-xs text-muted-foreground">
            {t.state === "paid_subscriber"
              ? "You're on a paid subscription."
              : t.state === "ended"
                ? "Your trial has ended."
                : `${t.daysRemaining} day${t.daysRemaining === 1 ? "" : "s"} remaining`}
          </p>
        </div>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tone.bg} ${tone.color} shrink-0`}>
        {label}
      </span>
    </div>
  );
}