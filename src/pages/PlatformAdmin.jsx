import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, ShieldAlert, CreditCard, Bot, FlaskConical, Package, Building2, Car } from "lucide-react";
import DriverVisualManager from "@/components/admin/DriverVisualManager";

const STATUS_STYLES = {
  trial: "bg-status-warn/15 text-status-warn",
  active: "bg-status-ok/15 text-status-ok",
  paused: "bg-status-bad/15 text-status-bad",
  cancelled: "bg-status-bad/15 text-status-bad",
};

function StatusPill({ status }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        STATUS_STYLES[status] || ""
      }`}
    >
      {status}
    </span>
  );
}

export default function PlatformAdmin() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [driverVisualsOpen, setDriverVisualsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setForbidden(false);
    setError("");
    try {
      const res = await base44.functions.invoke("platformAdmin", { action: "list_orgs" });
      setOrgs(res.data.organisations || []);
    } catch (e) {
      const status = e.response?.status || e.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setError(e.response?.data?.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    const key = id + status;
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      await base44.functions.invoke("platformAdmin", {
        action: "set_access_status",
        organisation_id: id,
        access_status: status,
      });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading organisations…</div>;
  }

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-status-bad/15 mb-4">
          <ShieldAlert className="w-7 h-7 text-status-bad" />
        </div>
        <h2 className="text-xl font-bold text-brand-navy mb-1">Access denied</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You must be a Platform Owner to view this page.
        </p>
        <Link to="/">
          <Button>Go to home</Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-xl p-6">
        <h3 className="font-semibold text-status-bad mb-1">Platform access required</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const STATUSES = ["trial", "active", "paused", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-brand-teal" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-navy">Platform administration</h1>
          <p className="text-muted-foreground text-sm">Approve and manage organisation access status.</p>
        </div>
      </div>

      {/* Admin navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/affiliate/admin" className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">Affiliate Management</p>
            <p className="text-xs text-muted-foreground">Review applications, attributions, payouts</p>
          </div>
        </Link>
        <Link to="/subscription/admin" className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">Subscription Plans</p>
            <p className="text-xs text-muted-foreground">Configure monthly prices, view subscriptions</p>
          </div>
        </Link>
        <Link to="/admin/customer-subscriptions" className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">Customer Subscriptions</p>
            <p className="text-xs text-muted-foreground">Verify bank transfers, activate & manage access</p>
          </div>
        </Link>
        <Link to="/finance-officer/admin" className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">Finance Officer</p>
            <p className="text-xs text-muted-foreground">Enable/disable, set question limits</p>
          </div>
        </Link>
        <Link to="/beta-readiness" className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">Beta Readiness</p>
            <p className="text-xs text-muted-foreground">Full-suite audit and mobile QA status</p>
          </div>
        </Link>
        <Link to="/beta-packaging" className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">Beta Packaging</p>
            <p className="text-xs text-muted-foreground">Google Play internal testing preparation</p>
          </div>
        </Link>
        <button type="button" onClick={() => setDriverVisualsOpen(true)} className="text-left bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">FADS Driver Visuals</p>
            <p className="text-xs text-muted-foreground">Manage approved driver car/scene images</p>
          </div>
        </button>
        <Link to="/platform-admin" className="bg-brand-mint/40 rounded-xl border border-brand-teal/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-brand-navy" />
          </div>
          <div>
            <p className="font-medium text-brand-navy">Organisation Access</p>
            <p className="text-xs text-muted-foreground">Current view — manage access status</p>
          </div>
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-mint/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Set status</th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No organisations yet.
                  </td>
                </tr>
              )}
              {orgs.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-brand-navy">{o.name}</td>
                  <td className="px-4 py-3 capitalize">{o.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{o.country}</td>
                  <td className="px-4 py-3 capitalize">{o.data_mode}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={o.access_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {STATUSES.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={o.access_status === s ? "default" : "outline"}
                          disabled={busy[o.id + s]}
                          onClick={() => setStatus(o.id, s)}
                          className="capitalize"
                        >
                          {busy[o.id + s] && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          {s}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {orgs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-border">
            No organisations yet.
          </div>
        )}
        {orgs.map((o) => (
          <div key={o.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-brand-navy truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {o.type.replace(/_/g, " ")} · {o.country} · {o.data_mode}
                </div>
              </div>
              <StatusPill status={o.access_status} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={o.access_status === s ? "default" : "outline"}
                  disabled={busy[o.id + s]}
                  onClick={() => setStatus(o.id, s)}
                  className="h-11 min-h-touch capitalize"
                >
                  {busy[o.id + s] && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <DriverVisualManager open={driverVisualsOpen} onClose={() => setDriverVisualsOpen(false)} />
    </div>
  );
}