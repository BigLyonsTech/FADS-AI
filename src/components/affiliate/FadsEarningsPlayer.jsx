import React, { useState } from "react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { Loader2 } from "lucide-react";

// Fixed FADS subscription prices per billing currency (no live conversion).
const PRICES = { NGN: 30000, EUR: 55, GBP: 55, USD: 55 };
const CURRENCY_LABELS = {
  NGN: "Nigeria ₦",
  EUR: "Ireland €",
  GBP: "UK £",
  USD: "USA $",
};
const CURRENCY_SYMBOLS = { NGN: "₦", EUR: "€", GBP: "£", USD: "$" };
const QUICK_VALUES = [1, 5, 10, 20, 50];

// FADS Earnings Player — a Y2K-style calculator that uses the EXISTING
// configured affiliate commission percentage/frequency from programme
// settings. No invented rates. Clearly labelled as an estimate.
export default function FadsEarningsPlayer({ settings }) {
  const [customers, setCustomers] = useState(10);
  const [currency, setCurrency] = useState("EUR");

  if (!settings) {
    return (
      <div id="calculator" className="bg-brand-navy rounded-2xl p-5 text-white text-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-teal mx-auto" />
        <p className="text-sm text-white/60">Loading commission settings…</p>
      </div>
    );
  }

  const isPercentage = settings.default_commission_type !== "fixed_amount";
  const commissionValue = settings.default_commission_value || 0;
  const isRecurring = settings.default_commission_frequency !== "one_time";

  const monthlyPrice = PRICES[currency] || 0;
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  const fmt = (n) => `${symbol}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const commissionPerSub = isPercentage
    ? monthlyPrice * (commissionValue / 100)
    : commissionValue;
  const monthlyEarnings = customers * commissionPerSub;

  return (
    <div id="calculator" className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white scroll-mt-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FadsRobotAvatar size="sm" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS EARNINGS PLAYER</p>
      </div>

      <h2 className="text-lg font-bold text-white">What could my referrals earn?</h2>

      {/* Market / currency selector */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Market / currency</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(CURRENCY_LABELS).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-touch ${
                currency === c ? "bg-brand-teal text-brand-navy" : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {CURRENCY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Customers selector */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Customers referred</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_VALUES.map((v) => (
            <button
              key={v}
              onClick={() => setCustomers(v)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-touch ${
                customers === v ? "bg-brand-teal text-brand-navy" : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {v}
            </button>
          ))}
          <input
            type="number"
            min="0"
            max="999"
            value={customers}
            onChange={(e) => setCustomers(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-20 px-3 py-2 rounded-lg text-sm bg-white/10 text-white border border-white/20 text-center"
          />
        </div>
      </div>

      {/* Results — 3 Y2K tiles */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1">Customers</p>
          <p className="text-xl font-bold font-mono text-white leading-none tabular-nums">{customers}</p>
          <p className="text-[9px] uppercase tracking-wider mt-1.5 text-brand-teal/60">People</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1">Subscription</p>
          <p className="text-xl font-bold font-mono text-white leading-none tabular-nums break-words">{fmt(monthlyPrice)}</p>
          <p className="text-[9px] uppercase tracking-wider mt-1.5 text-brand-teal/60">Per month</p>
        </div>
        <div className="bg-brand-teal/15 rounded-xl p-3 border border-brand-teal/20">
          <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium mb-1">Commission</p>
          <p className="text-xl font-bold font-mono text-white leading-none tabular-nums break-words">{fmt(monthlyEarnings)}</p>
          <p className="text-[9px] uppercase tracking-wider mt-1.5 text-brand-teal">{isRecurring ? "Per month" : "One-time"}</p>
        </div>
      </div>

      {/* Commission details */}
      <div className="bg-white/5 rounded-xl p-3 space-y-1">
        <p className="text-xs text-white/70">
          Based on current FADS pricing and your affiliate commission.
        </p>
        <p className="text-xs text-white/50">
          {isPercentage
            ? `${commissionValue}% ${isRecurring ? "recurring" : "one-time"} commission per qualifying paying customer.`
            : `Fixed amount per qualifying referral. `}
          This is an estimate, not a guarantee of income.
        </p>
      </div>

      {/* FADS says */}
      <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
        <FadsRobotAvatar size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-brand-teal font-medium mb-0.5">FADS says</p>
          <p className="text-xs text-white/80 leading-relaxed">
            &ldquo;This is an example based on the number of qualifying paying customers you selected. Actual commission depends on qualifying payments and the current FADS affiliate terms.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}