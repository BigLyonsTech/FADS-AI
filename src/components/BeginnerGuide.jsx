import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, MessageCircle } from "lucide-react";
import FadsRobot from "@/components/FadsRobot";

// Reusable, dismissible beginner guidance card featuring the FADS robot.
// The robot is the visual identity of the FADS Assistant — friendly,
// calm, and professional. Shows a short intro, plain-English actions
// that map to existing routes, and an "I'm not sure — guide me" button
// that opens the existing FADS Assistant (no new chatbot).
// Dismissed state is stored in localStorage per module.
const GUIDE_CONFIG = {
  home: {
    intro: "What would you like help with today?",
    actions: [
      { label: "How is my business doing?", to: "/intelligence" },
      { label: "Ask FADS", to: "/assistant" },
      { label: "Getting started", to: "/getting-started" },
    ],
  },
  finance: {
    intro: "What happened with your money today?",
    actions: [
      { label: "Money came in", to: "/finance/money-in" },
      { label: "I bought something", to: "/finance/money-out" },
      { label: "Send an invoice", to: "/finance/invoices/new" },
      { label: "Scan a receipt", to: "/finance?scan=1" },
      { label: "Someone owes me money", to: "/finance/invoices" },
    ],
  },
  crm: {
    intro: {
      small_business: "Who would you like to add or follow up with?",
      school: "Which student, parent or guardian would you like to add or follow up with?",
      university: "Which student or contact would you like to add or follow up with?",
      church: "Which member or visitor would you like to add or follow up with?",
    },
    actions: [
      { label: "Add someone", to: "/crm/contacts" },
      { label: "Import my existing contacts", to: "/crm/contacts" },
      { label: "Who should I follow up with?", to: "/crm/contacts" },
      { label: "Show me who owes money", to: "/finance/invoices" },
    ],
  },
  hr: {
    intro: "What would you like to do with your team?",
    actions: [
      { label: "Add a staff member", to: "/hr/employees/new" },
      { label: "Import my staff", to: "/hr/employees" },
      { label: "Someone is off today", to: "/hr/leave" },
      { label: "Check leave requests", to: "/hr/leave" },
      { label: "What needs my attention?", to: "/hr/compliance" },
    ],
  },
  inventory: {
    intro: "What happened with your stock?",
    actions: [
      { label: "Add a product", to: "/inventory/new" },
      { label: "What is running low?", action: "filter_low" },
      { label: "What should I reorder?", action: "filter_out" },
      { label: "What is selling?", to: "/inventory" },
      { label: "What isn't moving?", to: "/inventory" },
    ],
  },
  tax: {
    intro: "Not sure where to start? I can guide you.",
    actions: [
      { label: "Am I Tax Ready?", action: "tax_ready" },
      { label: "What am I missing?", action: "what_missing" },
      { label: "Help me understand this", action: "help_understand" },
      { label: "Prepare my records", action: "prepare_records" },
    ],
  },
  transcribe: {
    intro: "Got a meeting? I can turn it into useful notes.",
    actions: [
      { label: "Start recording", to: "/transcribe/studio" },
      { label: "Upload audio", to: "/transcribe/studio" },
      { label: "Create meeting notes", to: "/transcribe/studio" },
      { label: "Find action points", to: "/transcribe" },
      { label: "Summarise this meeting", to: "/transcribe" },
    ],
  },
};

export default function BeginnerGuide({ module, orgType, onAction }) {
  const [dismissed, setDismissed] = useState(
    typeof localStorage !== "undefined" && localStorage.getItem(`fads-guide-dismissed-${module}`) === "1"
  );

  const config = GUIDE_CONFIG[module];
  if (!config) return null;

  if (dismissed) {
    return (
      <button
        className="text-xs text-brand-teal hover:underline flex items-center gap-1"
        onClick={() => {
          localStorage.removeItem(`fads-guide-dismissed-${module}`);
          setDismissed(false);
        }}
      >
        <MessageCircle className="w-3 h-3" /> Show beginner guide
      </button>
    );
  }

  const intro = typeof config.intro === "object"
    ? (config.intro[orgType] || config.intro.small_business)
    : config.intro;

  const dismiss = () => {
    localStorage.setItem(`fads-guide-dismissed-${module}`, "1");
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-br from-brand-navy to-brand-navy/95 text-white rounded-2xl p-4 sm:p-5 relative">
      <button
        className="absolute top-3 right-3 text-white/50 hover:text-white"
        onClick={dismiss}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex items-start gap-3 sm:gap-4">
        <FadsRobot className="shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3 min-w-0">
          <p className="text-sm font-medium">{intro}</p>
          <div className="flex flex-wrap gap-2">
            {config.actions.map((a) =>
              a.action && onAction ? (
                <Button
                  key={a.label}
                  variant="outline"
                  className="h-9 gap-1.5 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => onAction(a.action)}
                >
                  {a.label} <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Link key={a.label} to={a.to}>
                  <Button
                    variant="outline"
                    className="h-9 gap-1.5 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    {a.label} <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )
            )}
            <Link to="/getting-started?guide=1">
              <Button className="h-9 gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90">
                <MessageCircle className="w-4 h-4" /> I'm not sure — guide me
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}