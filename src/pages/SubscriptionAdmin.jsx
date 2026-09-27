import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BetaAccessTab from "@/components/subscription/BetaAccessTab";
import PricingTab from "@/components/subscription/PricingTab";
import {
  CreditCard, Loader2, ShieldAlert, Users, FileText, Info, KeyRound, DollarSign,
} from "lucide-react";

export default function SubscriptionAdmin() {
  const [tab, setTab] = useState("pricing");
  const [subscriptions, setSubscriptions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    setError("");
    try {
      await base44.functions.invoke("subscription", { action: "admin_get_dashboard" });
    } catch (e) {
      const status = e.response?.status || e.status;
      if (status === 403) setForbidden(true);
      else setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadSubscriptions = async () => {
    try {
      const res = await base44.functions.invoke("subscription", { action: "admin_get_subscriptions" });
      setSubscriptions(res.data.subscriptions || []);
    } catch (e) { /* ignore */ }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await base44.functions.invoke("subscription", { action: "admin_get_audit_logs" });
      setAuditLogs(res.data.logs || []);
    } catch (e) { /* ignore */ }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-status-bad/15 mb-4">
          <ShieldAlert className="w-7 h-7 text-status-bad" />
        </div>
        <h2 className="text-xl font-bold text-brand-navy mb-1">Access denied</h2>
        <p className="text-sm text-muted-foreground mb-6">You must be a Platform Owner to view this page.</p>
        <Link to="/"><Button>Go to home</Button></Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-xl p-6">
        <h3 className="font-semibold text-status-bad mb-1">Error</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
          <CreditCard className="w-6 h-6 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Subscription Management</h1>
          <p className="text-muted-foreground text-sm">Manage beta access and monitor subscriptions</p>
        </div>
      </div>

      <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-brand-teal">Payment connection deferred</p>
          <p className="text-muted-foreground mt-1">
            Checkout is disabled and labeled "Coming soon — payment connection required."
            Regional pricing is configured per billing currency (NGN active now; EUR, GBP and USD
            coming soon) and the full Stripe-ready architecture is preserved for future activation.
            Grant manual 5-day beta access below for testing.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="pricing" className="text-xs sm:text-sm">
            <DollarSign className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="beta" className="text-xs sm:text-sm">
            <KeyRound className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Beta Access</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" onClick={loadSubscriptions} className="text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Subs</span>
          </TabsTrigger>
          <TabsTrigger value="audit" onClick={loadAuditLogs} className="text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <PricingTab />
        </TabsContent>

        <TabsContent value="beta">
          <BetaAccessTab />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTable subscriptions={subscriptions} onLoad={loadSubscriptions} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTable logs={auditLogs} onLoad={loadAuditLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubscriptionsTable({ subscriptions, onLoad }) {
  useEffect(() => { onLoad(); }, []);
  const statusColor = {
    trial: "text-status-warn", active: "text-status-ok",
    cancelled: "text-status-bad", past_due: "text-status-bad",
    expired: "text-muted-foreground", incomplete: "text-status-warn",
  };
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-mint/60 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Organisation</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Access</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No subscriptions yet.</td></tr>
            )}
            {subscriptions.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-brand-navy">{s.organisation_name || s.organisation_id}</td>
                <td className="px-4 py-3 capitalize">{(s.org_type || "").replace(/_/g, " ")}</td>
                <td className={`px-4 py-3 font-medium ${statusColor[s.status] || ""}`}>{s.status}</td>
                <td className="px-4 py-3">{s.trial_end ? new Date(s.trial_end).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {s.access_type === "beta_manual" ? (
                    <span className="px-2 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal font-medium">Beta</span>
                  ) : s.access_type === "paid_trial" ? (
                    <span className="text-muted-foreground">Paid trial</span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTable({ logs, onLoad }) {
  useEffect(() => { onLoad(); }, []);
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-mint/60 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No audit logs yet.</td></tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-3">{l.actor_type}{l.actor_user_email ? ` · ${l.actor_user_email}` : ""}</td>
                <td className={`px-4 py-3 ${l.result === "failure" ? "text-status-bad" : "text-status-ok"}`}>{l.result}</td>
                <td className="px-4 py-3">{new Date(l.created_date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}