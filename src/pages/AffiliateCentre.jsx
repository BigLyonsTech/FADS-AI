import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAffiliate, useAffiliateSettings } from "@/lib/useAffiliate";
import { Button } from "@/components/ui/button";
import {
  Loader2, Clock, CheckCircle2, XCircle, Pause,
  AlertCircle, FileText, Wallet, ChevronRight, Sparkles,
} from "lucide-react";
import ReferralLinkCard from "@/components/affiliate/ReferralLinkCard";
import CommissionDashboard from "@/components/affiliate/CommissionDashboard";
import ReferredOrgsList from "@/components/affiliate/ReferredOrgsList";
import PayoutHistory from "@/components/affiliate/PayoutHistory";
import AffiliateApplyForm from "@/components/affiliate/AffiliateApplyForm";
import PayoutRequestDialog from "@/components/affiliate/PayoutRequestDialog";
import WhyPromoteFads from "@/components/affiliate/WhyPromoteFads";
import FadsAffiliateHero from "@/components/affiliate/FadsAffiliateHero";
import FadsEarningsPlayer from "@/components/affiliate/FadsEarningsPlayer";
import HelpMePromoteFads from "@/components/affiliate/HelpMePromoteFads";
import AffiliateResources from "@/components/affiliate/AffiliateResources";

export default function AffiliateCentre() {
  const { data, loading, error, reload } = useAffiliate();
  const { settings } = useAffiliateSettings();
  const [showPayout, setShowPayout] = useState(false);

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

  const {
    profile, referralLink, attributions, commissions, payoutRequests, payoutRecords, termsAcceptance,
  } = data || {};

  // No profile → show application form with hero + earnings player
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <FadsAffiliateHero referralLink={null} profile={null} />
        <FadsEarningsPlayer settings={settings} />
        <WhyPromoteFads />
        <AffiliateApplyForm settings={settings} onApplied={reload} />
        <div className="text-center">
          <Link to="/affiliate/terms" className="text-sm text-brand-teal hover:underline">
            Read the Affiliate Programme Terms
          </Link>
        </div>
      </div>
    );
  }

  // Status-specific banners for non-active statuses
  const statusConfig = {
    pending: { icon: Clock, title: "Application Under Review", msg: "Your application is being reviewed. You'll get access to your referral link once approved.", color: "text-status-warn" },
    rejected: { icon: XCircle, title: "Application Rejected", msg: profile.rejection_reason ? `Reason: ${profile.rejection_reason}` : "Your application was not approved.", color: "text-destructive" },
    paused: { icon: Pause, title: "Account Paused", msg: "Your affiliate account is paused. Contact the Platform Owner for details.", color: "text-status-warn" },
    closed: { icon: XCircle, title: "Account Closed", msg: "Your affiliate account has been closed.", color: "text-destructive" },
  };

  if (statusConfig[profile.status]) {
    const cfg = statusConfig[profile.status];
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <FadsAffiliateHero referralLink={referralLink} profile={profile} />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <cfg.icon className={`w-12 h-12 ${cfg.color} mx-auto mb-3`} />
          <h2 className="text-lg font-semibold text-brand-navy">{cfg.title}</h2>
          <p className="text-sm text-muted-foreground mt-2">{cfg.msg}</p>
        </div>
      </div>
    );
  }

  // Active/approved → full dashboard
  const trials = (attributions || []).filter((a) => a.referred_organisation_status === "trial").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <FadsAffiliateHero referralLink={referralLink} profile={profile} />

      {/* Payout button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowPayout(true)}
          disabled={(profile.total_approved_commission || 0) < (settings?.min_payout_amount || 0)}
          className="bg-brand-teal hover:bg-brand-teal/90 min-h-touch"
        >
          <Wallet className="w-4 h-4" /> Request Payout
        </Button>
      </div>

      {/* Referral Link */}
      <ReferralLinkCard link={referralLink} profile={profile} />

      {/* Earnings Player */}
      <FadsEarningsPlayer settings={settings} />

      {/* My Results */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-brand-navy">My Results</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Signups</p>
            <p className="text-2xl font-bold text-brand-navy mt-1 font-mono">{profile.total_signups || 0}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Trials</p>
            <p className="text-2xl font-bold text-status-warn mt-1 font-mono">{trials}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Conversions</p>
            <p className="text-2xl font-bold text-status-ok mt-1 font-mono">{profile.total_conversions || 0}</p>
          </div>
        </div>
        <CommissionDashboard
          profile={profile}
          commissions={commissions}
          attributions={attributions}
        />
      </div>

      {/* FADS Affiliate Resource Centre */}
      <Link to="/affiliate/resources" className="block">
        <div className="bg-gradient-to-r from-brand-navy to-brand-teal/90 text-white rounded-2xl p-5 flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">FADS Affiliate Resource Centre</p>
            <p className="text-xs text-white/70">Everything you need to introduce FADS to businesses, schools and churches — posts, messages, emails and graphics.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
        </div>
      </Link>

      {/* Help Me Promote */}
      <HelpMePromoteFads referralLink={referralLink} />

      {/* Resources */}
      <AffiliateResources referralLink={referralLink} profile={profile} />

      {/* Why Share FADS */}
      <WhyPromoteFads />

      {/* Referred Orgs */}
      <ReferredOrgsList attributions={attributions} />

      {/* Payout History */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-brand-navy">Payout History</h2>
        <PayoutHistory payoutRequests={payoutRequests} payoutRecords={payoutRecords} />
      </div>

      {/* Terms */}
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-brand-teal" />
          <div>
            <p className="font-medium text-brand-navy">Affiliate Terms</p>
            <p className="text-xs text-muted-foreground">
              {termsAcceptance
                ? `Accepted v${termsAcceptance.terms_version} on ${new Date(termsAcceptance.accepted_date).toLocaleDateString()}`
                : "Not yet accepted"}
            </p>
          </div>
        </div>
        <Link to="/affiliate/terms">
          <Button variant="outline" size="sm">View Terms</Button>
        </Link>
      </div>

      {profile.data_mode === "demo" && (
        <div className="bg-status-warn/10 rounded-lg p-3 text-sm text-status-warn text-center">
          This is fictional demo data — not a live affiliate account.
        </div>
      )}

      <PayoutRequestDialog
        open={showPayout}
        onClose={() => setShowPayout(false)}
        profile={profile}
        settings={settings}
        onRequested={() => { setShowPayout(false); reload(); }}
      />
    </div>
  );
}