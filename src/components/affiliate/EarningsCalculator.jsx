import React, { useState } from "react";
import { Calculator, TrendingUp, Users, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/subscriptionPricing";

// Fixed FADS subscription prices per billing currency. These are intentional
// fixed market prices — no live currency conversion.
const PRICES = { NGN: 30000, EUR: 55, GBP: 55, USD: 55 };
const CURRENCY_LABELS = {
  NGN: "Nigeria ₦",
  EUR: "Euro €",
  GBP: "UK £",
  USD: "USA $",
};
const CURRENCY_SYMBOLS = { NGN: "₦", EUR: "€", GBP: "£", USD: "$" };

const QUICK_VALUES = [1, 5, 10, 20, 50];

// Simple visual earnings calculator for prospective/existing affiliates.
// Uses the configured FADS subscription price and the affiliate commission
// rate from programme settings. All figures are clearly labelled as estimates.
export default function EarningsCalculator({ settings }) {
  const [customers, setCustomers] = useState(10);
  const [customCustomers, setCustomCustomers] = useState("");
  const [currency, setCurrency] = useState("EUR");

  const commissionRate = settings?.default_commission_type === "percentage"
    ? (settings?.default_commission_value || 30) / 100
    : 0; // fixed_amount not supported in this simple calculator V1
  const commissionPct = settings?.default_commission_value || 30;

  const effectiveCustomers = customCustomers ? Math.max(0, parseInt(customers) || 0) : customers;
  const monthlyPrice = PRICES[currency] || 0;
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  const fmt = (n) => `${symbol}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const commissionPerSub = monthlyPrice * commissionRate;
  const monthlyEarnings = effectiveCustomers * commissionPerSub;
  const annualEarnings = monthlyEarnings * 12;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-brand-teal" />
        <h2 className="font-semibold text-brand-navy">Earnings Calculator</h2>
        <span className="text-xs text-muted-foreground ml-auto">Estimates only</span>
      </div>
      <p className="text-sm text-muted-foreground">How much could I earn promoting FADS?</p>

      {/* Customers input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Customers referred</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_VALUES.map((v) => (
            <button
              key={v}
              onClick={() => { setCustomers(v); setCustomCustomers(""); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !customCustomers && customers === v
                  ? "bg-brand-navy text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {v}
            </button>
          ))}
          <input
            type="number"
            min="0"
            placeholder="Custom"
            value={customCustomers}
            onChange={(e) => setCustomCustomers(e.target.value)}
            className="w-20 px-3 py-1.5 rounded-lg text-sm border border-input bg-transparent"
          />
        </div>
      </div>

      {/* Currency selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Market / currency</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(CURRENCY_LABELS).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currency === c
                  ? "bg-brand-navy text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {CURRENCY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-muted/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <p className="text-xs">Customers referred</p>
          </div>
          <p className="text-lg font-bold text-brand-navy mt-1">{effectiveCustomers}</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Subscription value</p>
          <p className="text-lg font-bold text-brand-navy mt-1">{fmt(monthlyPrice)}/mo</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Commission per sub</p>
          <p className="text-lg font-bold text-brand-navy mt-1">{fmt(commissionPerSub)}/mo</p>
          <p className="text-xs text-muted-foreground/70">{commissionPct}% recurring</p>
        </div>
        <div className="bg-brand-teal/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-brand-teal">
            <TrendingUp className="w-3.5 h-3.5" />
            <p className="text-xs">Est. monthly earnings</p>
          </div>
          <p className="text-lg font-bold text-brand-navy mt-1">{fmt(monthlyEarnings)}</p>
        </div>
      </div>

      {/* Annual */}
      <div className="bg-brand-navy text-white rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-teal" />
          <div>
            <p className="text-xs text-white/70">Est. annual earnings</p>
            <p className="text-xs text-white/50">if customers remain subscribed</p>
          </div>
        </div>
        <p className="text-xl font-bold">{fmt(annualEarnings)}</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        These are estimates based on the current FADS subscription price and {commissionPct}% recurring
        commission rate. Actual earnings depend on successful referrals and continued subscriptions.
        This is not a guarantee of income.
      </p>
    </div>
  );
}