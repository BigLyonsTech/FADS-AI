import React from "react";
import {
  Wallet, Users, Package, FileCheck, Mic, Zap, Brain, Bot, Sparkles,
} from "lucide-react";

// "Why Promote FADS?" recruitment section for the Affiliate Centre.
// Static, customer-focused messaging explaining what FADS gives growing
// organisations and why affiliates are recommending something businesses
// can actually use every day.
export default function WhyPromoteFads() {
  const capabilities = [
    { icon: Wallet, label: "Finance" },
    { icon: Users, label: "HR" },
    { icon: Sparkles, label: "CRM & customer follow-up" },
    { icon: Package, label: "Inventory" },
    { icon: FileCheck, label: "Tax readiness" },
    { icon: Mic, label: "Transcription & meeting notes" },
    { icon: Zap, label: "Workflow automation" },
    { icon: Brain, label: "Business intelligence" },
    { icon: Bot, label: "AI management support" },
  ];

  return (
    <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-brand-teal" />
        <h2 className="text-lg font-bold">Why Promote FADS?</h2>
      </div>

      <p className="text-lg font-semibold text-brand-teal">
        "Big businesses have departments. Small businesses have FADS."
      </p>

      <p className="text-sm text-white/80">
        FADS gives growing organisations access to AI-powered:
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {capabilities.map((c) => (
          <div key={c.label} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <c.icon className="w-4 h-4 text-brand-teal shrink-0" />
            <span className="text-sm text-white/90">{c.label}</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-white/80">
        Affiliates are introducing businesses to a practical system designed to reduce admin,
        improve visibility and help owners make better decisions.
      </p>

      <p className="text-sm font-medium text-white border-t border-white/10 pt-3">
        Recommend something businesses can actually use every day.
      </p>
    </div>
  );
}