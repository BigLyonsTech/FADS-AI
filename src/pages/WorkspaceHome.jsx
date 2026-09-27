import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { usePendingInvitations } from "@/lib/usePendingInvitations";
import { useFinance } from "@/lib/useFinance";
import { useInvoices } from "@/lib/useInvoices";
import { useCrm } from "@/lib/useCrm";
import { canAccessHr } from "@/lib/hrWording";
import PendingInvitationsCard from "@/components/PendingInvitationsCard";
import QuickActions from "@/components/QuickActions";
import BeginnerGuide from "@/components/BeginnerGuide";
import ManagementHub from "@/components/ManagementHub";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Shield, Globe, Coins, Calendar, Receipt, BadgeCheck,
  AlertTriangle, ArrowRightCircle, Briefcase, Wallet, ChevronRight, ChevronDown,
  Mic, Contact, Sparkles, Heart, GraduationCap, MessageCircle, Sun, FileText,
  CheckCircle, Users, AlertCircle,
} from "lucide-react";
import { resolveTerminology } from "@/lib/faithTerminology";
import MiniFadsTv from "@/components/intelligence/MiniFadsTv";
import BusinessIntelligenceCard from "@/components/intelligence/BusinessIntelligenceCard";
import SimpleHomeActions from "@/components/home/SimpleHomeActions";

export default function WorkspaceHome() {
  const { organisations, activeOrg, activeRole, loading, switchWorkspace } = useWorkspace();
  const { pending, loading: pendingLoading, accept, accepting } = usePendingInvitations();
  const { user, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const fin = useFinance();
  const invoiceData = useInvoices();
  const { invoices } = invoiceData;
  const crm = useCrm();
  const [showSetup, setShowSetup] = useState(false);

  const orgType = activeOrg?.type;
  const givingTerm = orgType === "church" ? resolveTerminology(activeOrg).giving : "Giving";

  useEffect(() => {
    if (!loading && !pendingLoading && organisations.length === 0 && pending.length === 0) {
      navigate("/onboarding", { replace: true });
    }
  }, [loading, pendingLoading, organisations.length, pending.length, navigate]);

  const handleAccept = async (id) => {
    await accept(id);
    window.location.reload();
  };

  if (loading || pendingLoading) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }

  if (organisations.length === 0 && pending.length > 0) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Welcome</h1>
          <p className="text-muted-foreground text-sm">
            You have been invited to join an organisation. Accept to continue.
          </p>
        </div>
        <PendingInvitationsCard pending={pending} onAccept={handleAccept} accepting={accepting} />
      </div>
    );
  }

  if (organisations.length === 0) return null;

  if (!activeOrg) {
    return (
      <div className="max-w-md mx-auto bg-card rounded-2xl border border-border p-8 text-center">
        <h2 className="text-xl font-semibold mb-2 text-brand-navy">Choose a workspace</h2>
        <p className="text-muted-foreground mb-6">Select an organisation to continue.</p>
        <div className="space-y-2">
          {organisations.map((o) => (
            <Button
              key={o.id}
              className="w-full justify-between"
              variant="outline"
              onClick={async () => {
                await switchWorkspace(o.id);
              }}
            >
              <span>{o.name}</span>
              <ArrowRightCircle className="w-4 h-4" />
            </Button>
          ))}
        </div>
        {pending.length > 0 && (
          <div className="mt-6 text-left">
            <PendingInvitationsCard pending={pending} onAccept={handleAccept} accepting={accepting} />
          </div>
        )}
      </div>
    );
  }

  // Time of day greeting
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const preferredName = user?.preferred_name?.trim();
  const fullName = user?.full_name?.trim() || "";
  const firstName = preferredName || (fullName.includes(" ") ? fullName.split(/\s+/)[0] : "") || "";
  const today = new Date().toISOString().slice(0, 10);

  // Compute snapshot from existing data (no fake values)
  const totalBalance = fin.totalBalance || 0;
  const outstandingInv = (invoices || []).filter(
    (inv) => Number(inv.balance) > 0 && inv.status !== "cancelled" && inv.status !== "paid"
  );
  const moneyOwed = outstandingInv.reduce((s, inv) => s + Number(inv.balance || 0), 0);
  const overdueInv = outstandingInv.filter((inv) => inv.due_date && inv.due_date < today);
  const openTasks = (crm.tasks || []).filter((t) => t.status === "open");
  const overdueFollowups = (crm.contacts || []).filter(
    (c) => c.next_follow_up_date && c.next_follow_up_date < today && c.status !== "inactive"
  );
  const needsAttention = overdueInv.length + overdueFollowups.length;

  // FADS Recommends — one insight from real data, never forced
  let recommendation;
  if (overdueInv.length > 0) {
    recommendation = {
      text: `${overdueInv.length} invoice${overdueInv.length > 1 ? "s are" : " is"} overdue.`,
      link: "/finance/invoices", label: "Review Invoices",
    };
  } else if (overdueFollowups.length > 0) {
    const followLabel =
      orgType === "church" ? "visitor" : orgType === "school" || orgType === "university" ? "parent" : "customer";
    recommendation = {
      text: `${overdueFollowups.length} ${followLabel}${overdueFollowups.length > 1 ? "s" : ""} need following up.`,
      link: "/crm/contacts", label: "Review Follow-Ups",
    };
  } else if (openTasks.length > 0) {
    recommendation = {
      text: `${openTasks.length} task${openTasks.length > 1 ? "s" : ""} open.`,
      link: "/crm/tasks", label: "Review Tasks",
    };
  } else {
    recommendation = { text: "Nothing urgent needs your attention right now.", link: null, label: null };
  }

  const onboardingRoot = user?.onboarding_state || {};
  const onboardingForOrg = onboardingRoot.by_organisation?.[activeOrg.id]
    || (!onboardingRoot.by_organisation ? onboardingRoot : {});
  const showOnboardingBanner = !onboardingForOrg.completed && !onboardingForOrg.skipped;
  const skipOnboarding = async () => {
    await base44.auth.updateMe({
      onboarding_state: {
        ...onboardingRoot,
        by_organisation: {
          ...(onboardingRoot.by_organisation || {}),
          [activeOrg.id]: { ...onboardingForOrg, skipped: true },
        },
        last_organisation_id: activeOrg.id,
      },
    });
    if (checkUserAuth) await checkUserAuth();
  };
  const blocked = activeOrg.access_status === "paused" || activeOrg.access_status === "cancelled";

  const fmt = (n) =>
    `${activeOrg.currency || ""} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // Workspace-aware snapshot cards
  const snapshotCards =
    orgType === "church"
      ? [
          { label: `${givingTerm} & Finances`, value: fmt(totalBalance), icon: Wallet, link: "/finance",
            tint: "bg-brand-mint/30 border-brand-teal/20", iconBg: "bg-brand-teal/15", iconColor: "text-brand-teal",
            helper: "Recorded in FADS" },
          { label: "Members & Visitors", value: (crm.contacts || []).length, icon: Users, link: "/crm/contacts",
            tint: "bg-brand-teal/5 border-brand-teal/20", iconBg: "bg-brand-teal/10", iconColor: "text-brand-teal",
            helper: "In your records" },
          { label: "Follow-Ups", value: overdueFollowups.length, icon: Contact, link: "/crm/contacts",
            tint: "bg-muted/40 border-border", iconBg: "bg-brand-navy/5", iconColor: "text-brand-navy",
            helper: "To be completed" },
          { label: "Needs Attention", value: needsAttention, icon: AlertCircle, link: "/intelligence",
            tint: "bg-status-warn/5 border-status-warn/20", iconBg: "bg-status-warn/15", iconColor: "text-status-warn",
            helper: "FADS found these for you", askFads: `What are the ${needsAttention} things that need attention?` },
        ]
      : orgType === "school" || orgType === "university"
      ? [
          { label: "School Finances", value: fmt(totalBalance), icon: Wallet, link: "/finance",
            tint: "bg-brand-mint/30 border-brand-teal/20", iconBg: "bg-brand-teal/15", iconColor: "text-brand-teal",
            helper: "Recorded in FADS" },
          { label: "Fees Outstanding", value: fmt(moneyOwed), icon: FileText, link: "/finance/invoices",
            tint: "bg-brand-teal/5 border-brand-teal/20", iconBg: "bg-brand-teal/10", iconColor: "text-brand-teal",
            helper: "Waiting to be collected" },
          { label: "Open Tasks", value: openTasks.length, icon: CheckCircle, link: "/crm/tasks",
            tint: "bg-muted/40 border-border", iconBg: "bg-brand-navy/5", iconColor: "text-brand-navy",
            helper: "To be completed" },
          { label: "Needs Attention", value: needsAttention, icon: AlertCircle, link: "/intelligence",
            tint: "bg-status-warn/5 border-status-warn/20", iconBg: "bg-status-warn/15", iconColor: "text-status-warn",
            helper: "FADS found these for you", askFads: `What are the ${needsAttention} things that need attention?` },
        ]
      : [
          { label: "Cash Balance", value: fmt(totalBalance), icon: Wallet, link: "/finance",
            tint: "bg-brand-mint/30 border-brand-teal/20", iconBg: "bg-brand-teal/15", iconColor: "text-brand-teal",
            helper: "Recorded in FADS" },
          { label: "Money Owed", value: fmt(moneyOwed), icon: FileText, link: "/finance/invoices",
            tint: "bg-brand-teal/5 border-brand-teal/20", iconBg: "bg-brand-teal/10", iconColor: "text-brand-teal",
            helper: "Waiting to be collected" },
          { label: "Open Tasks", value: openTasks.length, icon: CheckCircle, link: "/crm/tasks",
            tint: "bg-muted/40 border-border", iconBg: "bg-brand-navy/5", iconColor: "text-brand-navy",
            helper: "To be completed" },
          { label: "Needs Attention", value: needsAttention, icon: AlertCircle, link: "/intelligence",
            tint: "bg-status-warn/5 border-status-warn/20", iconBg: "bg-status-warn/15", iconColor: "text-status-warn",
            helper: "FADS found these for you", askFads: `What are the ${needsAttention} things that need attention?` },
        ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">
          {timeOfDay}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening in {activeOrg.name} today.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={activeOrg.access_status} />
          {activeOrg.data_mode === "demo" && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-status-warn/15 text-status-warn">
              Demo mode
            </span>
          )}
        </div>
      </div>

      <BeginnerGuide module="home" orgType={activeOrg?.type} />

      {showOnboardingBanner && (
        <div className="bg-brand-navy text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-brand-navy" />
            </div>
            <div>
              <p className="font-semibold">Welcome to FADS 👋</p>
              <p className="text-sm text-white/70">You don’t need to know how FADS works yet. I’ll guide you.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/getting-started"><Button className="bg-brand-teal text-brand-navy hover:bg-brand-teal/90 h-10">Start setup</Button></Link>
            <Button variant="ghost" className="text-white hover:bg-white/10 h-10" onClick={skipOnboarding}>Skip for now</Button>
          </div>
        </div>
      )}

      <PendingInvitationsCard pending={pending} onAccept={handleAccept} accepting={accepting} />

      {blocked ? (
        <div className="bg-status-bad/10 border border-status-bad/30 rounded-xl p-6 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-status-bad shrink-0" />
          <div>
            <h3 className="font-semibold text-status-bad capitalize">Access {activeOrg.access_status}</h3>
            <p className="text-sm text-muted-foreground">
              This organisation's access is currently {activeOrg.access_status}. Please contact the platform owner.
            </p>
          </div>
        </div>
      ) : (
        <>
          <SimpleHomeActions
            activeOrg={activeOrg}
            activeRole={activeRole}
            finance={fin}
            invoiceData={invoiceData}
            crm={crm}
          />

          {/* Ask FADS + Daily Brief */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/assistant">
              <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white rounded-2xl p-5 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-brand-navy" />
                  </div>
                  <p className="font-semibold text-lg">Ask FADS</p>
                </div>
                <p className="text-sm text-white/70">Ask anything about your business.</p>
              </div>
            </Link>
            <Link to="/intelligence">
              <div className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                    <Sun className="w-5 h-5 text-brand-teal" />
                  </div>
                  <p className="font-semibold text-lg text-brand-navy">Daily Brief</p>
                </div>
                <p className="text-sm text-muted-foreground">See what needs your attention today.</p>
              </div>
            </Link>
          </div>

          {/* Today in Your Business */}
          <div>
            <h2 className="font-semibold text-brand-navy mb-3">Today in Your Business</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {snapshotCards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => card.link && navigate(card.link)}
                  className={`rounded-xl border p-4 transition-all h-full touch-manipulation ${card.tint} ${card.link ? "cursor-pointer hover:shadow-sm active:scale-[0.98]" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}>
                      <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold text-brand-navy mt-0.5 break-words">{card.value}</p>
                  {card.helper && <p className="text-[11px] text-muted-foreground mt-1">{card.helper}</p>}
                  {card.askFads && (
                    <Link
                      to={`/assistant?q=${encodeURIComponent(card.askFads)}`}
                      className="text-[11px] text-brand-teal hover:underline mt-2 inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="w-3 h-3" /> Ask FADS
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FADS Business Intelligence — visible entry point to existing Intelligence */}
          <BusinessIntelligenceCard pick={recommendation} orgType={orgType} />

          {/* Mini FADS TV — compact 3-story business news preview */}
          <MiniFadsTv />

          {/* Departments / Management hub */}
          {orgType === "school" || orgType === "church" ? (
            <ManagementHub org={activeOrg} activeRole={activeRole} givingTerm={givingTerm} />
          ) : (
          <div>
            <h2 className="font-semibold text-brand-navy mb-3">Your Departments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/finance">
                <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <p className="font-medium text-brand-navy">Finance</p>
                      <p className="text-xs text-muted-foreground">Money, invoices & reports</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              {canAccessHr(activeRole) && (
                <Link to="/hr">
                  <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-brand-teal" />
                      </div>
                      <div>
                        <p className="font-medium text-brand-navy">HR</p>
                        <p className="text-xs text-muted-foreground">Your people & documents</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              )}
              <Link to="/transcribe">
                <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                      <Mic className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <p className="font-medium text-brand-navy">Transcribe</p>
                      <p className="text-xs text-muted-foreground">Turn conversations into useful notes</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <Link to="/crm">
                <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                      <Contact className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <p className="font-medium text-brand-navy">CRM</p>
                      <p className="text-xs text-muted-foreground">Customers, relationships & follow-ups</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              {orgType === "church" && (
                <Link to="/church/giving">
                  <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 text-brand-teal" />
                      </div>
                      <div>
                        <p className="font-medium text-brand-navy">{givingTerm} & Pledges</p>
                        <p className="text-xs text-muted-foreground">{givingTerm.toLowerCase()}, donations, pledges</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              )}
              {orgType === "school" && (
                <Link to="/school/reports">
                  <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-brand-teal" />
                      </div>
                      <div>
                        <p className="font-medium text-brand-navy">Student Report Cards</p>
                        <p className="text-xs text-muted-foreground">Create, print and export report cards</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              )}
            </div>
          </div>
          )}

          <QuickActions orgType={orgType} org={activeOrg} />

          {/* Business Setup — compact, collapsible */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setShowSetup(!showSetup)}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-brand-navy text-sm">Business Setup</h2>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showSetup ? "rotate-180" : ""}`} />
            </button>
            {showSetup && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <InfoCard icon={Shield} label="Your role" value={(activeRole || "").replace(/_/g, " ")} />
                <InfoCard icon={BadgeCheck} label="Data mode" value={activeOrg.data_mode} />
                <InfoCard icon={Globe} label="Country" value={activeOrg.country} />
                <InfoCard icon={Coins} label="Currency" value={activeOrg.currency} />
                <InfoCard icon={Calendar} label="Financial year starts" value={`Month ${activeOrg.financial_year_start}`} />
                <InfoCard icon={Receipt} label="Tax" value={`${activeOrg.tax_label} (${activeOrg.tax_regime})`} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    trial: "bg-status-warn/15 text-status-warn",
    active: "bg-status-ok/15 text-status-ok",
    paused: "bg-status-bad/15 text-status-bad",
    cancelled: "bg-status-bad/15 text-status-bad",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${map[status] || ""}`}>
      {status}
    </span>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-muted/30 rounded-xl border border-border p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand-teal" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium capitalize truncate text-sm">{value}</div>
      </div>
    </div>
  );
}