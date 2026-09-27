import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ShieldAlert, Loader2, Building2, RefreshCw, Filter } from "lucide-react";
import CustomerSubscriptionDialog from "@/components/admin/CustomerSubscriptionDialog";

const STATUS_STYLES = {
  none: "bg-muted text-muted-foreground",
  trial: "bg-status-warn/15 text-status-warn",
  payment_pending: "bg-status-warn/15 text-status-warn",
  active: "bg-status-ok/15 text-status-ok",
  past_due: "bg-status-bad/15 text-status-bad",
  cancelled: "bg-status-bad/15 text-status-bad",
  expired: "bg-muted text-muted-foreground",
  incomplete: "bg-status-warn/15 text-status-warn",
};

const STATUS_LABELS = {
  none: "No subscription",
  trial: "Trial",
  payment_pending: "Payment Pending",
  active: "Active",
  past_due: "Past Due",
  cancelled: "Cancelled",
  expired: "Expired",
  incomplete: "Incomplete",
};

const PROVIDER_LABELS = {
  none: "—",
  stripe: "Stripe",
  hba: "HBA",
  paystack: "Paystack",
  manual: "Manual",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatMoney(amount, currency) {
  if (amount === undefined || amount === null || amount === "") return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${currency || ""} ${Number(amount).toLocaleString()}`;
  }
}

export default function AdminCustomerSubscriptions() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    setError("");
    try {
      const res = await base44.functions.invoke("subscription", {
        action: "admin_get_customer_subscriptions",
      });
      setCustomers(res.data.customers || []);
    } catch (e) {
      const status = e.response?.status || e.status;
      if (status === 403) setForbidden(true);
      else setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const derivedStatus = (c) => {
    if (!c.subscription) return "none";
    if (c.subscription.status === "incomplete") return "incomplete";
    return c.subscription.status;
  };

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (c.organisation_name || "").toLowerCase().includes(q) ||
      (c.owner_email || "").toLowerCase().includes(q) ||
      (c.owner_name || "").toLowerCase().includes(q);
    const s = derivedStatus(c);
    const matchesStatus = statusFilter === "all" || s === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = customers.reduce((acc, c) => {
    const s = derivedStatus(c);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-status-bad/15 mb-4">
          <ShieldAlert className="w-7 h-7 text-status-bad" />
        </div>
        <h2 className="text-xl font-bold text-brand-navy mb-1">Access denied</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You must be a Platform Owner to view customer subscriptions.
        </p>
        <Link to="/"><Button>Go to home</Button></Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-xl p-6">
        <h3 className="font-semibold text-status-bad mb-1">Error</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={load} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Customer Subscriptions</h1>
            <p className="text-muted-foreground text-sm">
              Verify bank-transfer payments and manage subscription access for customer organisations.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-brand-teal">Manual verification (V1)</p>
          <p className="text-muted-foreground mt-1">
            Customers pay by bank transfer through the external HBA checkout. A bank transfer never
            activates access automatically — record the payment, then verify it to move an organisation
            from <strong>Payment Pending</strong> to <strong>Active</strong>. Automated HBA/Paystack
            verification will be connected later without rebuilding this system.
          </p>
        </div>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            statusFilter === "all" ? "bg-brand-navy text-white border-brand-navy" : "bg-card border-border text-muted-foreground hover:border-brand-teal"
          }`}
        >
          All · {customers.length}
        </button>
        {Object.keys(STATUS_LABELS).map((s) =>
          counts[s] ? (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === s ? "bg-brand-navy text-white border-brand-navy" : "bg-card border-border text-muted-foreground hover:border-brand-teal"
              }`}
            >
              {STATUS_LABELS[s]} · {counts[s]}
            </button>
          ) : null
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organisation, owner name or email…"
          className="pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-mint/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Plan / Provider</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Renewal</th>
                <th className="px-4 py-3 font-medium text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No organisations found.
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const s = derivedStatus(c);
                const sub = c.subscription;
                return (
                  <tr key={c.organisation_id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-brand-navy">{c.organisation_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-brand-navy">{c.owner_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.owner_email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{(c.organisation_type || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[s]}`}>
                        {STATUS_LABELS[s]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-navy">{sub?.plan_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{PROVIDER_LABELS[sub?.payment_provider] || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {sub?.payment_amount ? formatMoney(sub.payment_amount, sub.payment_currency) : (sub?.monthly_price ? formatMoney(sub.monthly_price, sub.currency) : "—")}
                    </td>
                    <td className="px-4 py-3">{formatDate(sub?.current_period_end || sub?.trial_end)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-border">
            No organisations found.
          </div>
        )}
        {filtered.map((c) => {
          const s = derivedStatus(c);
          const sub = c.subscription;
          return (
            <div key={c.organisation_id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-brand-navy truncate">{c.organisation_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.owner_email || "—"}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_STYLES[s]}`}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="text-brand-navy capitalize">{(c.organisation_type || "").replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="text-brand-navy">{PROVIDER_LABELS[sub?.payment_provider] || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="text-brand-navy">
                    {sub?.payment_amount ? formatMoney(sub.payment_amount, sub.payment_currency) : (sub?.monthly_price ? formatMoney(sub.monthly_price, sub.currency) : "—")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Renewal</p>
                  <p className="text-brand-navy">{formatDate(sub?.current_period_end || sub?.trial_end)}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => setSelected(c)}>
                Manage
              </Button>
            </div>
          );
        })}
      </div>

      {selected && (
        <CustomerSubscriptionDialog
          customer={selected}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}