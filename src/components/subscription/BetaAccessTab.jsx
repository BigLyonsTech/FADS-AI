import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, KeyRound, XCircle, CheckCircle2, Clock, Calendar } from "lucide-react";

export default function BetaAccessTab() {
  const [orgs, setOrgs] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [orgsRes, subsRes] = await Promise.all([
        base44.functions.invoke("subscription", { action: "admin_get_organisations" }),
        base44.functions.invoke("subscription", { action: "admin_get_subscriptions" }),
      ]);
      setOrgs(orgsRes.data.organisations || []);
      setSubscriptions((subsRes.data.subscriptions || []).filter((s) => s.access_type === "beta_manual"));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async () => {
    if (!selectedOrg) return;
    setGranting(true);
    setError("");
    setSuccess("");
    try {
      await base44.functions.invoke("subscription", {
        action: "admin_grant_beta_access",
        organisation_id: selectedOrg,
      });
      setSuccess("5-day beta access granted successfully.");
      setSelectedOrg("");
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (orgId) => {
    if (!confirm("Revoke beta access for this organisation? Access will end immediately.")) return;
    setRevoking(orgId);
    setError("");
    try {
      await base44.functions.invoke("subscription", {
        action: "admin_revoke_beta_access",
        organisation_id: orgId,
      });
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-teal" /></div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 rounded-lg p-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="bg-status-ok/10 rounded-lg p-3 text-sm text-status-ok flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-brand-teal" />
          <h3 className="font-semibold text-brand-navy">Grant 5-Day Beta Access</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Grant manual beta access without payment. This is <strong>not</strong> a paid trial and does
          <strong> not</strong> generate affiliate commission. Access expires automatically after 5 days.
        </p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger><SelectValue placeholder="Select an organisation..." /></SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGrant} disabled={!selectedOrg || granting} className="min-h-touch">
            {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Grant Access
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-brand-navy">Beta Access Grants</h3>
        </div>
        {subscriptions.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No beta access grants yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {subscriptions.map((s) => {
              const trialEnd = new Date(s.trial_end);
              const trialStart = new Date(s.trial_start);
              const isExpired = s.status === "cancelled" || s.status === "expired" || trialEnd < new Date();
              return (
                <div key={s.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <p className="font-medium text-brand-navy">{s.organisation_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Started: {trialStart.toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires: {trialEnd.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isExpired ? "bg-muted text-muted-foreground" : "bg-status-ok/15 text-status-ok"}`}>
                      {isExpired ? "Expired/Revoked" : "Active"}
                    </span>
                    {!isExpired && (
                      <Button size="sm" variant="outline" onClick={() => handleRevoke(s.organisation_id)} disabled={revoking === s.organisation_id}>
                        {revoking === s.organisation_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}