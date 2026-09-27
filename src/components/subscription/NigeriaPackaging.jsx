import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  GraduationCap,
  Church as ChurchIcon,
  Crown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/subscriptionPricing";

// FADS Nigeria subscription packaging — a clear, presentational overview of the
// three customer solution paths (FADS Business, FADS for Schools, FADS for
// Churches) plus FADS Enterprise, with NGN pricing.
//
// This is PACKAGING ONLY. It reuses the existing single-plan-per-org-type
// subscription architecture and does NOT introduce tiered checkout or feature
// gating. The user's actual plan, price and checkout remain handled by the
// existing plan card on the Subscription page.
//
// Shown only for organisations configured for the Nigeria market (country NG),
// so the experience for other regions is unchanged.

const NGN = "NGN";

const BUSINESS_TIERS = [
  {
    name: "Starter",
    price: 5000,
    url: "http://thefadsai.com/store/starter",
    tagline: "For micro businesses",
    features: [
      "Income & expenses",
      "Invoices",
      "Receipts",
      "Customers / basic CRM",
      "Basic financial reports",
      "Basic Ask FADS access",
      "Limited voice-to-text bookkeeping",
    ],
  },
  {
    name: "Business",
    price: 12500,
    url: "http://thefadsai.com/store/fads-business",
    tagline: "The primary SME package",
    primary: true,
    features: [
      "Everything in Starter, plus:",
      "Inventory",
      "Suppliers",
      "Bank reconciliation",
      "Advanced reports",
      "Full voice-to-text bookkeeping",
      "Fuller Ask FADS / business assistant",
      "Limited additional team access",
    ],
  },
  {
    name: "Professional",
    price: 25000,
    url: "http://thefadsai.com/store/fads-professional",
    tagline: "For growing teams",
    features: [
      "Everything in Business, plus:",
      "HR / employee management",
      "Team functionality",
      "Advanced business reporting",
      "Advanced AI / business intelligence",
      "Greater team / user access",
      "Priority-level functionality",
    ],
  },
];

const SCHOOL_FEATURES = [
  "Student records",
  "Parent / guardian records",
  "School fees",
  "Outstanding balances",
  "Receipts",
  "School finance (income & expenses)",
  "Staff / HR",
  "Report cards",
  "CRM / enquiries",
  "Communications / messages",
  "Ask FADS / AI assistance",
  "Voice-to-text bookkeeping",
];

const CHURCH_FEATURES = [
  "Member management",
  "Giving / donations",
  "Finance (income & expenses)",
  "Receipts",
  "Groups / departments",
  "Events",
  "Volunteers",
  "Staff / HR",
  "Fundraising",
  "Communications / messages",
  "Ask FADS / AI assistance",
  "Voice-to-text bookkeeping",
];

function TierCard({ tier }) {
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col ${
        tier.primary
          ? "border-brand-teal bg-brand-mint/40 shadow-sm"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-brand-navy">{tier.name}</h4>
        {tier.primary && (
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-teal text-white rounded-full px-2 py-0.5">
            Primary
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{tier.tagline}</p>
      <p className="text-2xl font-bold text-brand-navy mt-3">
        {formatPrice(tier.price, NGN)}
        <span className="text-sm font-normal text-muted-foreground">/month</span>
      </p>
      <ul className="mt-3 space-y-1.5 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-xs text-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a href={tier.url} target="_blank" rel="noopener noreferrer" className="mt-4">
        <Button className="w-full h-10 gap-1.5">
          Choose {tier.name} <ArrowRight className="w-4 h-4" />
        </Button>
      </a>
    </div>
  );
}

function FeatureList({ features }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-1.5 text-xs text-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export default function NigeriaPackaging({ org }) {
  if (!org || org.country !== "NG") return null;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-navy to-brand-teal/90 text-white p-5 sm:p-6">
        <div className="flex items-center gap-2 text-brand-teal text-sm font-medium mb-1">
          <Sparkles className="w-4 h-4" />
          <span>FADS Nigeria</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">FADS AI Business Suite — Subscription Offers</h2>
        <p className="text-white/70 text-sm mt-1">
          One platform, three solution paths. Prices in Nigerian Naira (₦).
        </p>
      </div>

      {/* FADS Business — three tiers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h3 className="font-bold text-brand-navy">FADS Business</h3>
            <p className="text-xs text-muted-foreground">For micro and small businesses · From {formatPrice(5000, NGN)}/month</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BUSINESS_TIERS.map((t) => (
            <TierCard key={t.name} tier={t} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Tap a plan to subscribe via FADS checkout.
        </p>
      </div>

      {/* FADS for Schools & FADS for Churches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-brand-teal" />
            </div>
            <div>
              <h3 className="font-bold text-brand-navy">FADS for Schools</h3>
              <p className="text-xs text-muted-foreground">School Management + Finance + AI</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-brand-navy mt-3">
            {formatPrice(30000, NGN)}
            <span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <FeatureList features={SCHOOL_FEATURES} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-teal/15 flex items-center justify-center shrink-0">
              <ChurchIcon className="w-5 h-5 text-brand-teal" />
            </div>
            <div>
              <h3 className="font-bold text-brand-navy">FADS for Churches</h3>
              <p className="text-xs text-muted-foreground">Church Management + Finance + AI</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-brand-navy mt-3">
            {formatPrice(30000, NGN)}
            <span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <FeatureList features={CHURCH_FEATURES} />
        </div>
      </div>

      {/* FADS Enterprise */}
      <div className="rounded-2xl border border-brand-navy/30 bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h3 className="font-bold text-brand-navy">FADS Enterprise</h3>
            <p className="text-xs text-muted-foreground">Larger or multi-branch organisations, custom implementation</p>
          </div>
        </div>
        <div className="sm:ml-auto flex items-center gap-3">
          <p className="text-lg font-bold text-brand-navy">Custom Pricing</p>
          <Link to="/support">
            <Button variant="outline" className="h-10 gap-1.5">
              Contact us <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}