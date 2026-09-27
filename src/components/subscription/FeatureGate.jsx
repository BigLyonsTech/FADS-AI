import React from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/lib/useSubscription";
import { isFeatureAvailable, requiredTierFor, TIER_LABELS } from "@/lib/subscriptionTiers";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lightweight plan gate. Renders children when the active organisation's
// FADS Business tier permits the feature; otherwise renders a simple upgrade
// state. Non-small-business orgs (school/church/university) are never gated.
// The feature itself never disappears from navigation — only its page shows
// the upgrade state.
export default function FeatureGate({ feature, children }) {
  const { data, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-teal animate-spin" />
      </div>
    );
  }

  const org = data?.org;
  const subscription = data?.subscription;
  const plan = data?.plan;

  if (isFeatureAvailable(feature, org, subscription, plan)) {
    return children;
  }

  const required = requiredTierFor(feature);
  const label = TIER_LABELS[required] || "Business";

  return (
    <div className="max-w-md mx-auto py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-teal/15 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-brand-teal" />
      </div>
      <h2 className="text-lg font-bold text-brand-navy">Available on FADS {label}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Upgrade your FADS plan to unlock this feature.
      </p>
      <Link to="/subscription" className="inline-block mt-5">
        <Button className="h-11 gap-1.5">
          Upgrade plan <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}