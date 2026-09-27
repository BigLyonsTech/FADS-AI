import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/lib/useSubscription";
import { Button } from "@/components/ui/button";
import {
  CreditCard, Loader2, AlertCircle, CheckCircle2, Clock,
  XCircle, Sparkles, FileText, KeyRound, Calendar, Globe,
} from "lucide-react";
import {
  formatPrice, resolveBillingCurrency, setStoredCurrency,
} from "@/lib/subscriptionPricing";
import CurrencySelector from "@/components/subscription/CurrencySelector";
import NigeriaPackaging from "@/components/subscription/NigeriaPackaging";

const STATUS_CONFIG = {
  trial: { icon: Clock, label: "Trial", color: "text-status-warn", bg: "bg-status-warn/15" },
  active: { icon: CheckCircle2, label: "Active", color: "text-status-ok", bg: "bg-status-ok/15" },
  past_due: { icon: AlertCircle, label: "Past Due", color: "text-status-bad", bg: "bg-status-bad/15" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-status-bad", bg: "bg-status-bad/15" },
  expired: { icon: XCircle, label: "Expired", color: "text-muted-foreground", bg: "bg-muted" },
  incomplete: { icon: AlertCircle, label: "Incomplete", color: "text-status-warn", bg: "bg-status-warn/15" },
};

export default function SubscriptionPlans() {
  const { data, loading, error, reload } = useSubscription();
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  const { org, suggested_currency, regional_pricing } = data || {};

  // Initialise the selector with the stored currency, or the suggested currency
  // based on the organisation's saved country. Never forces the choice.
  useEffect(() => {
    if (!selectedCurrency && suggested_currency) {
      setSelectedCurrency(resolveBillingCurrency(suggested_currency));
    }
  }, [suggested_currency, selectedCurrency]);

  const handleCurrencyChange = (currency) => {
    setSelectedCurrency(currency);
    setStoredCurrency(currency);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button onClick={reload} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  const { subscription, plan } = data || {};
  const isBeta = subscription?.access_type === "beta_manual";

  if (!org) {
    return (
      <div className="max-w-2xl mx-auto">
        <Header />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-brand-navy">No active organisation</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Create or select an organisation to view subscription plans.
          </p>
          <Link to="/" className="mt-4 inline-block">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Resolve the pricing entry for the user's selected currency.
  const currencyEntry = regional_pricing?.[selectedCurrency] || regional_pricing?.[suggested_currency];
  const displayCurrency = currencyEntry?.currency || selectedCurrency || "USD";
  const trialPrice = currencyEntry?.trial_price != null ? formatPrice(currencyEntry.trial_price, displayCurrency) : null;
  const trialDays = currencyEntry?.trial_days || plan?.trial_days || 5;
  const monthlyAmount = currencyEntry?.monthly_price || 0;
  const entryStatus = currencyEntry?.status || "coming_soon";
  const isActive = entryStatus === "active" && monthlyAmount > 0;
  const renewalDate = new Date(Date.now() + trialDays * 86400000);
  const exchangeRateConnected = plan?.exchange_rate_service_connected || false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Header />

      {subscription && subscription.status !== "incomplete" && (
        <CurrentSubscriptionCard subscription={subscription} isBeta={isBeta} />
      )}

      <NigeriaPackaging org={org} subscription={subscription} plan={plan} />

      {/* International pricing & currency selector */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-brand-navy">
          <Globe className="w-4 h-4 text-brand-teal" />
          <span>Billing currency</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Prices are shown in your selected billing currency, separate from your organisation's
          accounting currency. We suggest a currency based on your organisation's country — you can change it anytime.
        </p>
        <CurrencySelector
          value={selectedCurrency || suggested_currency || "USD"}
          onChange={handleCurrencyChange}
          regionalPricing={regional_pricing}
        />
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="bg-brand-navy p-6 text-white">
          <div className="flex items-center gap-2 text-brand-teal text-sm font-medium mb-1">
            <Sparkles className="w-4 h-4" />
            <span>{plan?.plan_name || "Your Plan"}</span>
          </div>
          <h2 className="text-2xl font-bold">FADS AI Business Suite</h2>
          <p className="text-white/60 text-sm mt-1">For {org.type.replace(/_/g, " ")}</p>
        </div>

        <div className="p-6 space-y-4">
          {isActive ? (
            <ActivePriceCard
              trialPrice={trialPrice}
              trialDays={trialDays}
              monthlyAmount={monthlyAmount}
              displayCurrency={displayCurrency}
              renewalDate={renewalDate}
              exchangeRateConnected={exchangeRateConnected}
              indicativeConvertedValue={currencyEntry?.indicative_converted_value}
              exchangeRateTimestamp={currencyEntry?.exchange_rate_timestamp}
            />
          ) : (
            <ComingSoonCard currency={displayCurrency} regionLabel={currencyEntry?.label} />
          )}

          {/* Features */}
          <div className="space-y-2">
            {[
              "Full access to finance, invoicing, and reconciliation",
              "Unlimited transactions and contacts",
              "Bank and cash reconciliation",
              "Team management and role-based access",
              "Subscribe via FADS checkout",
            ].map((feat) => (
              <div key={feat} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                <span className="text-foreground">{feat}</span>
              </div>
            ))}
          </div>

          {/* Action */}
          {!subscription || subscription.status === "incomplete" ? (
            org.country === "NG" ? (
              <div className="bg-brand-mint/40 rounded-lg p-3 text-sm text-brand-navy text-center">
                Choose a FADS Business plan above to subscribe.
              </div>
            ) : (
              <Link to="/support">
                <Button variant="outline" className="w-full h-12 min-h-touch">
                  Contact us to subscribe
                </Button>
              </Link>
            )
          ) : (
            <Link to="/subscription/manage">
              <Button variant="outline" className="w-full h-12 min-h-touch">
                {isBeta ? "Manage Beta Access" : "Manage Subscription"}
              </Button>
            </Link>
          )}

          <div className="text-center">
            <Link to="/terms" className="text-sm text-brand-teal hover:underline inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Read Subscription Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Active price card ──────────────────────────────────────────────
// Every active price displays: introductory cost, duration, regular
// recurring price, renewal date and cancellation wording.
function ActivePriceCard({
  trialPrice, trialDays, monthlyAmount, displayCurrency, renewalDate,
  exchangeRateConnected, indicativeConvertedValue, exchangeRateTimestamp,
}) {
  return (
    <div className="bg-brand-mint/40 rounded-xl p-5 space-y-2">
      <p className="text-lg font-bold text-brand-navy text-center">
        {monthlyAmount > 0 ? `${formatPrice(monthlyAmount, displayCurrency)}/month` : "Pricing to be confirmed"}
      </p>
      {monthlyAmount > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Choose a plan to subscribe via FADS checkout.
        </p>
      )}
      {/* Optional indicative converted value — disabled until a verified
          exchange-rate service is connected. No invented exchange rates. */}
      {exchangeRateConnected && indicativeConvertedValue != null && exchangeRateTimestamp && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Indicative reference ≈ {formatPrice(indicativeConvertedValue, displayCurrency)} (rate as of{" "}
          {new Date(exchangeRateTimestamp).toLocaleDateString()}).
        </p>
      )}
    </div>
  );
}

// ── Coming soon card ───────────────────────────────────────────────
// EUR, GBP and USD remain "Coming soon" until the Platform Owner enters
// and activates their fixed regional prices.
function ComingSoonCard({ currency, regionLabel }) {
  return (
    <div className="bg-muted/50 rounded-xl p-6 space-y-2 text-center">
      <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="text-lg font-semibold text-brand-navy">
        {currency} pricing — Coming soon
      </p>
      <p className="text-sm text-muted-foreground">
        {regionLabel ? `${regionLabel} pricing is ` : "Pricing is "}
        not yet activated. The Platform Owner will configure and activate fixed regional prices for this currency soon.
      </p>
      <p className="text-xs text-muted-foreground pt-1">
        Nigerian Naira (NGN) is available now — switch your billing currency to NGN to see active pricing.
      </p>
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
        <h1 className="text-2xl font-bold text-brand-navy">Subscription</h1>
        <p className="text-muted-foreground text-sm">Manage your FADS AI plan and billing</p>
      </div>
    </div>
  );
}

function CurrentSubscriptionCard({ subscription, isBeta }) {
  const cfg = STATUS_CONFIG[subscription.status] || STATUS_CONFIG.incomplete;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-brand-navy">{isBeta ? "Beta Access" : "Current Subscription"}</h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${isBeta ? "bg-brand-teal/15 text-brand-teal" : `${cfg.bg} ${cfg.color}`}`}>
          {isBeta ? <KeyRound className="w-3 h-3" /> : <cfg.icon className="w-3 h-3" />}
          {isBeta ? "Beta Access" : cfg.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">{isBeta ? "Granted" : "Trial ends"}</p>
          <p className="font-medium text-brand-navy">
            {subscription.trial_start ? new Date(subscription.trial_start).toLocaleDateString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{isBeta ? "Expires" : "Trial ends"}</p>
          <p className="font-medium text-brand-navy">{trialEnd ? trialEnd.toLocaleDateString() : "—"}</p>
        </div>
      </div>
      {isBeta && (
        <div className="bg-brand-teal/10 rounded-lg p-2 text-sm text-brand-teal">
          Beta access granted by the Platform Owner. No payment has been collected.
        </div>
      )}
    </div>
  );
}