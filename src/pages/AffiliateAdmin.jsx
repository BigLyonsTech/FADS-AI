import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import AdminApplications from "@/components/affiliate/AdminApplications";
import AdminAffiliatesList from "@/components/affiliate/AdminAffiliatesList";
import AdminProgrammeSettings from "@/components/affiliate/AdminProgrammeSettings";
import AdminPayoutReview from "@/components/affiliate/AdminPayoutReview";
import AdminConversionDialog from "@/components/affiliate/AdminConversionDialog";
import AdminAttributionDialog from "@/components/affiliate/AdminAttributionDialog";
import { useAffiliateAdmin } from "@/lib/useAffiliate";

export default function AffiliateAdmin() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAffiliateAdmin();
  const [attributions, setAttributions] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [showConversion, setShowConversion] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);

  const loadExtra = useCallback(async () => {
    try {
      const [attrRes, commRes] = await Promise.all([
        base44.functions.invoke("affiliate", { action: "admin_get_attributions" }),
        base44.functions.invoke("affiliate", { action: "admin_get_commissions" }),
      ]);
      setAttributions(attrRes.data.attributions || []);
      setCommissions(commRes.data.commissions || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.role === "admin") loadExtra();
  }, [user, loadExtra]);

  if (user?.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-brand-navy">Platform Owner Access Required</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The affiliate administration area is only available to Platform Owners.
          </p>
        </div>
      </div>
    );
  }

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

  const refreshAll = () => { reload(); loadExtra(); };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Affiliate Administration</h1>
            <p className="text-muted-foreground text-sm">Manage the referral programme</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowConversion(true)} variant="outline" className="min-h-touch">
            Record Conversion
          </Button>
          <Button onClick={() => setShowAttribution(true)} variant="outline" className="min-h-touch">
            Correct Attribution
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Affiliates</p>
          <p className="text-2xl font-bold text-brand-navy mt-1">{data?.totalAffiliates || 0}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-status-warn mt-1">{data?.pendingApplications?.length || 0}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Pending Payouts</p>
          <p className="text-2xl font-bold text-brand-teal mt-1">{data?.pendingPayouts?.length || 0}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Attributions</p>
          <p className="text-2xl font-bold text-brand-navy mt-1">{attributions.length}</p>
        </div>
      </div>

      <Tabs defaultValue="applications">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <AdminApplications
            applications={data?.pendingApplications || []}
            onAction={refreshAll}
          />
        </TabsContent>

        <TabsContent value="affiliates">
          <AdminAffiliatesList
            affiliates={data?.allProfiles || []}
            onAction={refreshAll}
          />
        </TabsContent>

        <TabsContent value="settings">
          <AdminProgrammeSettings
            settings={data?.settings}
            onSaved={refreshAll}
          />
        </TabsContent>

        <TabsContent value="payouts">
          <AdminPayoutReview
            payouts={data?.pendingPayouts || []}
            allProfiles={data?.allProfiles || []}
            onAction={refreshAll}
          />
        </TabsContent>

        <TabsContent value="commissions">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-brand-navy">All Commissions</h3>
            </div>
            <div className="divide-y divide-border">
              {commissions.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground text-sm">No commissions recorded yet.</p>
              ) : (
                commissions.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-brand-navy">
                        {c.currency} {(c.amount || 0).toFixed(2)}
                        {c.is_manually_verified && (
                          <span className="ml-2 text-xs text-status-warn">Manually verified</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.organisation_name} · {c.description}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      c.status === "approved" ? "bg-status-ok/10 text-status-ok" :
                      c.status === "pending" ? "bg-status-warn/10 text-status-warn" :
                      c.status === "paid" ? "bg-brand-teal/10 text-brand-teal" :
                      "bg-destructive/10 text-destructive"
                    }`}>{c.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AdminConversionDialog
        open={showConversion}
        onClose={() => setShowConversion(false)}
        attributions={attributions}
        onRecorded={() => { setShowConversion(false); refreshAll(); }}
      />
      <AdminAttributionDialog
        open={showAttribution}
        onClose={() => setShowAttribution(false)}
        attributions={attributions}
        affiliates={data?.allProfiles || []}
        onCorrected={() => { setShowAttribution(false); refreshAll(); }}
      />
    </div>
  );
}