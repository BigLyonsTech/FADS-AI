import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/useWorkspace";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FadsRobot from "@/components/FadsRobot";
import { PAYMENT_METHODS } from "@/lib/financeConstants";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck,
  Check,
  Heart,
  Landmark,
  Package,
  School,
  Sparkles,
  Store,
  Users,
  Wallet,
} from "lucide-react";

const HELP_OPTIONS = {
  small_business: [
    { value: "Set up my business", label: "Set up my business", icon: Store, to: "/settings" },
    { value: "Record my first sale", label: "Record my first sale", icon: BadgeDollarSign, to: "/finance/sales?record=1" },
    { value: "Record an expense", label: "Record an expense", icon: Wallet, to: "/finance/money-out" },
    { value: "Add my products", label: "Add my products", icon: Package, to: "/inventory/new" },
    { value: "Add a customer", label: "Add a customer", icon: Users, to: "/finance/contacts" },
    { value: "Add an employee", label: "Add an employee", icon: Users, to: "/hr/employees/new" },
    { value: "Scan a receipt", label: "Scan a receipt", icon: Wallet, to: "/finance?scan=1" },
    { value: "Show me around", label: "Show me around", icon: Sparkles, to: "/help" },
    { value: "I'm not sure — guide me", label: "I'm not sure — guide me", icon: Sparkles, to: "/" },
  ],
  school: [
    { value: "School details", label: "Set up school details", icon: School, to: "/settings" },
    { value: "Add a student", label: "Add a student", icon: Users, to: "/crm/contacts" },
    { value: "Add a parent or guardian", label: "Add a parent / guardian", icon: Users, to: "/crm/contacts" },
    { value: "Record fees", label: "Record fees / a payment", icon: Wallet, to: "/finance/money-in" },
    { value: "Attendance", label: "Manage attendance", icon: CalendarCheck, to: "/hr/attendance" },
    { value: "Staff", label: "Add staff", icon: Users, to: "/hr/employees/new" },
    { value: "Communication", label: "Send communication", icon: Sparkles, to: "/messages" },
    { value: "School records", label: "Open school records", icon: School, to: "/school/reports" },
    { value: "I'm not sure — guide me", label: "I'm not sure — guide me", icon: Sparkles, to: "/" },
  ],
  church: [
    { value: "Church details", label: "Set up church details", icon: Landmark, to: "/settings" },
    { value: "Add a member", label: "Add a member", icon: Users, to: "/crm/contacts" },
    { value: "Attendance", label: "Manage attendance", icon: CalendarCheck, to: "/hr/attendance" },
    { value: "Giving", label: "Record giving / offering / tithes", icon: Heart, to: "/church/giving" },
    { value: "Events", label: "Manage events and reminders", icon: CalendarCheck, to: "/crm/tasks" },
    { value: "Volunteers", label: "Add staff or volunteers", icon: Users, to: "/hr/employees/new" },
    { value: "Communication", label: "Send communication", icon: Sparkles, to: "/messages" },
    { value: "I'm not sure — guide me", label: "I'm not sure — guide me", icon: Sparkles, to: "/" },
  ],
};

const WORKSPACE_CHOICES = [
  { value: "small_business", label: "Business", icon: Store },
  { value: "school", label: "School", icon: School },
  { value: "church", label: "Church", icon: Landmark },
];

const PAYMENT_CHOICES = PAYMENT_METHODS.filter((method) =>
  ["cash", "bank_transfer", "card", "other"].includes(method.value)
);

function workspaceFamily(orgType) {
  if (orgType === "school" || orgType === "university") return "school";
  if (orgType === "church") return "church";
  return "small_business";
}

function workspaceName(family) {
  if (family === "school") return "School";
  if (family === "church") return "Church";
  return "Business";
}

function ChoiceButton({ selected, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 w-full rounded-xl border px-4 py-3 text-left transition-colors flex items-center gap-3 ${
        selected
          ? "border-brand-teal bg-brand-mint/50"
          : "border-border bg-card hover:border-brand-teal hover:bg-muted/30"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand-teal" />
      </div>
      <span className="font-medium text-brand-navy flex-1">{children}</span>
      {selected && <Check className="w-5 h-5 text-brand-teal shrink-0" />}
    </button>
  );
}

export default function GettingStarted() {
  const { user, checkUserAuth } = useAuth();
  const { activeOrg, loading } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orgType = activeOrg?.type || "small_business";
  const family = workspaceFamily(orgType);
  const onboardingRoot = user?.onboarding_state || {};
  // New onboarding progress is scoped to the active organisation. Keep the
  // legacy global state as a fallback so existing users are not re-onboarded.
  const saved = onboardingRoot.by_organisation?.[activeOrg?.id]
    || (!onboardingRoot.by_organisation ? onboardingRoot : {});
  const guideMode = searchParams.get("guide") === "1";

  const steps = useMemo(
    () => family === "small_business"
      ? ["welcome", "help", "payments", "ready"]
      : ["welcome", "help", "ready"],
    [family]
  );

  const [stepIndex, setStepIndex] = useState(() => guideMode ? 1 : 0);
  const [helpWith, setHelpWith] = useState(saved.help_with_first || "");
  const [paymentMethods, setPaymentMethods] = useState(
    Array.isArray(saved.usual_payment_methods) ? saved.usual_payment_methods : []
  );
  const [saving, setSaving] = useState(false);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isCompleted = !!saved.completed;
  const helpOptions = HELP_OPTIONS[family] || HELP_OPTIONS.small_business;
  const selectedHelp = helpOptions.find((option) => option.value === helpWith);

  useEffect(() => {
    const allowedHelpValues = new Set(helpOptions.map((option) => option.value));
    setStepIndex(guideMode ? 1 : 0);
    setHelpWith(
      saved.help_with_first && allowedHelpValues.has(saved.help_with_first)
        ? saved.help_with_first
        : ""
    );
    setPaymentMethods(
      family === "small_business" && Array.isArray(saved.usual_payment_methods)
        ? saved.usual_payment_methods
        : []
    );
  }, [activeOrg?.id, family, guideMode]);

  const persist = async (patch) => {
    const currentRoot = user?.onboarding_state || {};
    const currentOrg = currentRoot.by_organisation?.[activeOrg.id] || {};
    const nextOrg = { ...currentOrg, ...patch };
    const next = {
      ...currentRoot,
      by_organisation: {
        ...(currentRoot.by_organisation || {}),
        [activeOrg.id]: nextOrg,
      },
      last_organisation_id: activeOrg.id,
    };
    await base44.auth.updateMe({ onboarding_state: next });
    if (checkUserAuth) await checkUserAuth();
    return nextOrg;
  };

  const moveNext = async () => {
    if (step === "help") {
      await persist({ help_with_first: helpWith || null });
    }
    if (step === "payments") {
      await persist({ usual_payment_methods: paymentMethods });
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const doLater = async () => {
    if (!isCompleted) {
      await persist({ skipped: true });
    }
    navigate("/");
  };

  const complete = async () => {
    setSaving(true);
    try {
      await persist({
        completed: true,
        skipped: false,
        help_with_first: helpWith || saved.help_with_first || null,
        ...(family === "small_business"
          ? { usual_payment_methods: paymentMethods }
          : {}),
      });
      navigate(selectedHelp?.to || "/");
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = (value) => {
    setPaymentMethods((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  if (loading || !activeOrg) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 px-1 sm:px-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Getting Started</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isCompleted ? "Come back anytime for a quick refresher." : "A few simple choices, then you're ready."}
          </p>
        </div>
        <Button
          variant="ghost"
          className="min-h-11 shrink-0 text-muted-foreground"
          onClick={doLater}
        >
          {isCompleted ? "Back home" : "Do this later"}
        </Button>
      </div>

      <div className="flex gap-2" aria-label="Getting started progress">
        {steps.map((name, index) => (
          <div
            key={name}
            className={`h-2 flex-1 rounded-full ${
              index <= stepIndex ? "bg-brand-teal" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6 min-h-[360px] flex flex-col">
          {step === "welcome" && (
            <div className="flex-1 flex flex-col justify-center space-y-5">
              <div className="text-center space-y-3">
                <FadsRobot className="mx-auto" />
                <h2 className="text-2xl font-bold text-brand-navy">Welcome to FADS 👋</h2>
                <p className="text-sm text-muted-foreground">
                  Let’s get your {workspaceName(family).toLowerCase()} workspace set up together. You don’t need to know how FADS works yet — I’ll guide you.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-brand-navy">What do you run?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    FADS already knows this from your current workspace, so you don’t need to set it up again.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {WORKSPACE_CHOICES.map((choice) => {
                    const selected = family === choice.value;
                    const Icon = choice.icon;
                    return (
                      <div
                        key={choice.value}
                        className={`min-h-24 rounded-xl border p-3 flex flex-col items-center justify-center gap-2 text-center ${
                          selected
                            ? "border-brand-teal bg-brand-mint/50"
                            : "border-border bg-muted/20 opacity-45"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${selected ? "text-brand-teal" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium text-brand-navy">{choice.label}</span>
                        {selected && <Check className="w-4 h-4 text-brand-teal" />}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Using your existing <strong>{workspaceName(family)}</strong> workspace: {activeOrg.name}
                </p>
              </div>
            </div>
          )}

          {step === "help" && (
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-3">
                <FadsRobot className="shrink-0" />
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-brand-navy">
                    What would you like FADS to help with first?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    This only helps FADS guide your first experience. Nothing gets hidden or switched off.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {helpOptions.map((option) => (
                  <ChoiceButton
                    key={option.value}
                    selected={helpWith === option.value}
                    icon={option.icon}
                    onClick={() => setHelpWith(option.value)}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Not sure? Choose <strong>Everything</strong> or <strong>I’m not sure — guide me</strong>.
              </p>
            </div>
          )}

          {step === "payments" && (
            <div className="flex-1 space-y-5">
              <div className="flex items-start gap-3">
                <FadsRobot className="shrink-0" />
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-brand-navy">
                    How do customers usually pay you?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose any that are common for you. This is optional and uses FADS’ existing payment methods.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {PAYMENT_CHOICES.map((method) => (
                  <ChoiceButton
                    key={method.value}
                    selected={paymentMethods.includes(method.value)}
                    icon={method.value === "cash" ? Wallet : method.value === "bank_transfer" ? Landmark : BadgeDollarSign}
                    onClick={() => togglePaymentMethod(method.value)}
                  >
                    {method.label}
                  </ChoiceButton>
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full min-h-12 text-muted-foreground"
                onClick={() => {
                  setStepIndex((current) => Math.min(current + 1, steps.length - 1));
                }}
              >
                Skip this for now
              </Button>
            </div>
          )}

          {step === "ready" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-4">
              <FadsRobot />
              <div>
                <h2 className="text-2xl font-bold text-brand-navy">You’re ready 🎉</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  You don’t need to learn everything at once. Your Home will show simple actions for your {workspaceName(family).toLowerCase()} workspace.
                </p>
              </div>

              <div className="w-full rounded-xl bg-brand-mint/40 border border-brand-teal/20 p-4">
                <p className="font-semibold text-brand-navy">
                  {selectedHelp?.label || "I’m not sure — guide me"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  FADS will open the existing tool for this job and keep guiding you there.
                </p>
              </div>

              <Button
                className="w-full min-h-12 bg-brand-navy hover:bg-brand-navy/90"
                onClick={complete}
                disabled={saving}
              >
                {saving ? "Saving…" : selectedHelp?.label || "Keep exploring FADS"}
                {!saving && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {step !== "ready" && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="min-h-12 min-w-28"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <Button
            className="min-h-12 min-w-32 bg-brand-navy hover:bg-brand-navy/90"
            onClick={moveNext}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
