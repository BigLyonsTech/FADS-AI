import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import BackToSettings from "@/components/BackToSettings";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { Download, Trash2, Loader2, AlertTriangle, ShieldCheck, FileDown, Building2, Briefcase, School, GraduationCap, Church, Plus } from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";
import TrialStatusCard from "@/components/subscription/TrialStatusCard";
import { formatPrice } from "@/lib/subscriptionPricing";

const ENTRY_TYPES = [
  { id: "small_business", label: "Small Business", icon: Briefcase },
  { id: "school", label: "School", icon: School },
  { id: "university", label: "University", icon: GraduationCap },
  { id: "church", label: "Church", icon: Church },
];

export default function Account() {
  const { user } = useAuth();
  const { organisations, memberships } = useWorkspace();
  const { data: subData } = useSubscription();
  const primaryMembership = memberships.find((m) => m.is_default);
  const primaryOrg =
    organisations.find((o) => o.id === (primaryMembership?.organisation_id || user?.default_organisation_id)) ||
    organisations[0] ||
    null;
  const primaryType = primaryOrg?.type || null;
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await base44.functions.invoke("account", { action: "get_status" });
      setStatus(res.data);
    } catch {
      // non-fatal
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const exportData = async () => {
    setError("");
    setBusy("export");
    try {
      const res = await base44.functions.invoke("account", { action: "export_data" });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fads-ai-data-export-${(user?.email || "account").replace(/[^a-z0-9]/gi, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await loadStatus();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Export failed");
    } finally {
      setBusy("");
    }
  };

  const deleteAccount = async () => {
    setError("");
    setBusy("delete");
    try {
      await base44.functions.invoke("account", { action: "request_deletion" });
      base44.auth.logout(window.location.origin);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Request failed");
      setBusy("");
      setConfirmOpen(false);
      setConfirmText("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackToSettings />
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Account</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account data and deletion.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {subData?.subscription && (
        <TrialStatusCard
          subscription={subData.subscription}
          monthlyPriceLabel={formatPrice(subData?.regional_price?.monthly_price || subData?.plan?.monthly_price || 0, subData?.regional_price?.currency || subData?.plan?.currency || "USD")}
          compact
        />
      )}

      {/* Primary organisation type — locked after account creation */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-brand-teal" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-brand-navy">Your organisation type</h2>
            <p className="text-sm text-muted-foreground">
              Your primary organisation type is locked. Add more organisations from the workspace switcher.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ENTRY_TYPES.map(({ id, label, icon: Icon }) => {
            const selected = primaryType === id;
            return (
              <button
                key={id}
                type="button"
                disabled
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition ${
                  selected
                    ? "border-brand-teal bg-brand-mint text-brand-navy"
                    : "border-border text-muted-foreground opacity-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            );
          })}
        </div>
        <Link to="/onboarding">
          <Button variant="outline" className="w-full h-11 min-h-touch">
            <Plus className="w-4 h-4 mr-2" /> Add another organisation
          </Button>
        </Link>
      </div>

      {/* Data export */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
            <FileDown className="w-5 h-5 text-brand-teal" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-brand-navy">Export your data</h2>
            <p className="text-sm text-muted-foreground">
              Download a JSON copy of your profile, organisation memberships and
              related audit records.
            </p>
          </div>
        </div>
        {status?.export_requested && (
          <p className="text-xs text-status-ok flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Export previously requested
            {status.export_requested_date
              ? ` on ${new Date(status.export_requested_date).toLocaleDateString()}`
              : ""}
          </p>
        )}
        <Button
          onClick={exportData}
          disabled={busy === "export"}
          className="w-full h-11 min-h-touch"
        >
          {busy === "export" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing export…
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" /> Download my data
            </>
          )}
        </Button>
      </div>

      {/* Account deletion */}
      <div className="bg-status-bad/5 rounded-2xl border border-status-bad/30 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-status-bad/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-status-bad" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-status-bad">Delete account</h2>
            <p className="text-sm text-muted-foreground">
              This revokes all your organisation memberships and removes your
              access. The platform owner completes full data purge. This action
              cannot be undone.
            </p>
          </div>
        </div>
        {status?.deletion_requested && (
          <p className="text-xs text-status-warn">
            Deletion already requested
            {status.deletion_requested_date
              ? ` on ${new Date(status.deletion_requested_date).toLocaleDateString()}`
              : ""}
          </p>
        )}
        {!confirmOpen ? (
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={!!busy}
            className="w-full h-11 min-h-touch border-status-bad/40 text-status-bad hover:bg-status-bad/10"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Request account deletion
          </Button>
        ) : (
          <div className="space-y-3 rounded-xl border border-status-bad/30 p-4 bg-card">
            <p className="text-sm text-brand-navy font-medium">
              Type <span className="font-mono font-bold">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                }}
                disabled={busy === "delete"}
                className="flex-1 h-11 min-h-touch"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteAccount}
                disabled={busy === "delete" || confirmText !== "DELETE"}
                className="flex-1 h-11 min-h-touch"
              >
                {busy === "delete" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…
                  </>
                ) : (
                  "Confirm deletion"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {loadingStatus && (
        <p className="text-center text-xs text-muted-foreground">Loading account status…</p>
      )}
    </div>
  );
}