import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Calendar, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/subscriptionPricing";

export default function SubscriptionSuccess() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Poll for the subscription to be created by the webhook
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await base44.functions.invoke("subscription", { action: "get_subscription_status" });
        if (res.data.subscription && res.data.subscription.status !== "incomplete") {
          setData(res.data);
          setLoading(false);
          return;
        }
      } catch (e) {}
      attempts++;
      if (attempts < 10) {
        setTimeout(poll, 1500);
      } else {
        setLoading(false);
      }
    };
    poll();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-brand-navy">Activating your trial...</h2>
        <p className="text-sm text-muted-foreground mt-2">This may take a few seconds while we confirm your payment.</p>
      </div>
    );
  }

  const subscription = data?.subscription;
  const regional_price = data?.regional_price;
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null;
  const monthlyAmount = subscription?.monthly_price || regional_price?.monthly_price || 0;
  const monthlyCurrency = subscription?.currency || regional_price?.currency || "USD";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-ok/15 mb-4">
          <CheckCircle2 className="w-8 h-8 text-status-ok" />
        </div>
        <h1 className="text-2xl font-bold text-brand-navy">Trial Started!</h1>
        <p className="text-muted-foreground mt-2">
          Your 5-day introductory trial is now active. You have full access to FADS AI Business Suite.
        </p>

        {trialEnd && (
          <div className="mt-6 bg-brand-mint/40 rounded-xl p-4 flex items-center justify-center gap-3">
            <Calendar className="w-5 h-5 text-brand-teal" />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Trial ends on</p>
              <p className="font-medium text-brand-navy">
                {trialEnd.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 bg-status-warn/10 rounded-lg p-3 text-sm text-status-warn">
          Your first regular payment of {formatPrice(monthlyAmount, monthlyCurrency)}/month will be charged on {trialEnd?.toLocaleDateString()}.
          You can cancel anytime before then to avoid this charge.
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/subscription/manage">
          <Button variant="outline" className="w-full sm:w-auto">Manage Subscription</Button>
        </Link>
        <Link to="/">
          <Button className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal/90">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}