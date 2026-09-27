import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  CreditCard, Loader2, AlertCircle, CheckCircle2, Clock,
  XCircle, Calendar, DollarSign, RefreshCw, TrendingUp, KeyRound,
} from "lucide-react";
import { formatPrice } from "@/lib/subscriptionPricing";
import TrialStatusCard from "@/components/subscription/TrialStatusCard";

const STATUS_CONFIG = {
  trial: { icon: Clock, label: "Trial Active", color: "text-status-warn", bg: "bg-status-warn/15" },
  payment_pending: { icon: Clock, label: "Payment Being Verified", color: "text-status-warn", bg: "bg-status-warn/15" },
  active: { icon: CheckCircle2, label: "Subscription Active", color: "text-status-ok", bg: "bg-status-ok/15" },
  past_due: { icon: AlertCircle, label: "Past Due", color: "text-status-bad", bg: "bg-status-bad/15" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-status-bad", bg: "bg-status-bad/15" },
  expired: { icon: XCircle, label: "Expired", color: "text-muted-foreground", bg: "bg-muted" },
  incomplete: { icon: AlertCircle, label: "Incomplete", color: "text-status-warn", bg: "bg-status-warn/15" },
};

export default function SubscriptionManage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("subscription", { action: "get_subscription_status" });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 rounded-xl p-6 text-center max-w-2xl mx-auto">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button onClick={load} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  const { subscription, plan, org, regional_price } = data || {};
  const isBeta = subscription?.access_type === "beta_manual";

  if (!subscription || subscription.status === "incomplete") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Header />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-brand-navy">No active subscription</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Checkout is coming soon. Contact the Platform Owner to request beta access.
          </p>
          <Link to="/subscription" className="mt-4 inline-block">
            <Button>View Plans</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[subscription.status] || STATUS_CONFIG.incomplete;
  const trialStart = subscription.trial_start ? new Date(subscription.trial_start) : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
  const renewalDate = subscription.current_period_end ? new Date(subscription.current_period_end) : trialEnd;
  const isExpired = subscription.status === "cancelled" || subscription.status === "expired" || (trialEnd && trialEnd < new Date());
  const monthlyPriceLabel = formatPrice(subscription.monthly_price || regional_price?.monthly_price || plan?.monthly_price || 0, subscription.currency || regional_price?.currency || plan?.currency || "USD");
  const showTrialCard = !isBeta && subscription.status !== "active";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Header />

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-brand-navy">{isBeta ? "Beta Access Status" : "Subscription Status"}</h3>
            <p className="text-sm text-muted-foreground">{plan?.plan_name} · {org?.name}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${isBeta ? "bg-brand-teal/15 text-brand-teal" : `${cfg.bg} ${cfg.color}`}`}>
            {isBeta ? <KeyRound className="w-4 h-4" /> : <cfg.icon className="w-4 h-4" />}
            {isBeta ? "Beta Access" : cfg.label}
          </span>
        </div>

        <div className="border-t border-border p-5 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-teal" />
            <div>
              <p className="text-xs text-muted-foreground">{isBeta ? "Granted on" : "Trial ends"}</p>
              <p className="font-medium text-brand-navy text-sm">
                {isBeta ? (trialStart?.toLocaleDateString() || "—") : (trialEnd?.toLocaleDateString() || "—")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-brand-teal" />
            <div>
              <p className="text-xs text-muted-foreground">{isBeta ? "Expires on" : "Next renewal"}</p>
              <p className="font-medium text-brand-navy text-sm">
                {isBeta ? (trialEnd?.toLocaleDateString() || "—") : (renewalDate?.toLocaleDateString() || "—")}
              </p>
            </div>
          </div>
          {!isBeta && (
            <>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-brand-teal" />
                <div>
                  <p className="text-xs text-muted-foreground">Monthly price</p>
                  <p className="font-medium text-brand-navy text-sm">{formatPrice(subscription.monthly_price || regional_price?.monthly_price || plan?.monthly_price || 0, subscription.currency || regional_price?.currency || plan?.currency || "USD")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-brand-teal" />
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-medium text-brand-navy text-sm capitalize">{subscription.org_type?.replace(/_/g, " ")}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showTrialCard && (
        <TrialStatusCard subscription={subscription} monthlyPriceLabel={monthlyPriceLabel} />
      )}

      {subscription.status === "payment_pending" && (
        <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-4 text-sm">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-status-warn" />
            <div>
              <p className="font-medium text-status-warn">Payment being verified</p>
              <p className="text-muted-foreground mt-1">
                Thanks — your payment is awaiting verification. We’ll activate your FADS AI subscription
                once your payment has been confirmed.
              </p>
            </div>
          </div>
        </div>
      )}

      {subscription.status === "active" && !isBeta && (
        <div className="bg-status-ok/10 border border-status-ok/30 rounded-xl p-4 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-status-ok" />
            <div>
              <p className="font-medium text-status-ok">Subscription Active</p>
              <p className="text-muted-foreground mt-1">
                Your organisation can access the modules included in your subscription, subject to your
                individual role and permissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {isBeta && (
        <div className="bg-brand-teal/10 rounded-xl p-4 text-sm text-brand-teal">
          <div className="flex items-start gap-2">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Beta access — no payment collected</p>
              <p className="text-muted-foreground mt-1">
                This access was manually granted by the Platform Owner for testing. It is not a paid
                trial and will expire automatically on {trialEnd?.toLocaleDateString()}.
                {isExpired ? " This beta access has expired." : " Contact the Platform Owner to extend or revoke access."}
              </p>
            </div>
          </div>
        </div>
      )}

      {subscription.cancel_at_period_end && !isBeta && (
        <div className="bg-status-warn/10 rounded-xl p-4 text-sm text-status-warn">
          <strong>Subscription cancelled.</strong> Access continues until {renewalDate?.toLocaleDateString()}.
          No further charges will be made.
        </div>
      )}

      {subscription.referral_code_used && !isBeta && (
        <div className="bg-brand-mint/30 rounded-xl p-4 text-sm">
          <p className="text-muted-foreground">
            This subscription was attributed to affiliate code{" "}
            <span className="font-mono font-medium text-brand-navy">{subscription.referral_code_used}</span>
          </p>
        </div>
      )}

      <div className="text-center">
        <Link to="/subscription" className="text-sm text-muted-foreground hover:underline">
          ← Back to plans
        </Link>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
        <CreditCard className="w-6 h-6 text-brand-teal" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Manage Subscription</h1>
        <p className="text-muted-foreground text-sm">View and manage your FADS AI plan</p>
      </div>
    </div>
  );
}