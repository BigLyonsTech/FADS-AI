import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Bot,
  Shield,
  Loader2,
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATUS_STYLES = {
  trial: "bg-status-warn/15 text-status-warn",
  active: "bg-status-ok/15 text-status-ok",
  paused: "bg-status-bad/15 text-status-bad",
  cancelled: "bg-status-bad/15 text-status-bad",
};

export default function FinanceOfficerAdmin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalAllowance, setGlobalAllowance] = useState(50);
  const [orgOverrides, setOrgOverrides] = useState({});

  const load = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await base44.functions.invoke("financeOfficer", {
        action: "get_admin_settings",
      });
      setData(res.data);
      setGlobalEnabled(res.data.settings.is_enabled);
      setGlobalAllowance(res.data.settings.default_monthly_allowance);
    } catch (e) {
      if (e.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveGlobal = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("financeOfficer", {
        action: "update_admin_settings",
        is_enabled: globalEnabled,
        default_monthly_allowance: Number(globalAllowance),
      });
      setSavedFlash("Global settings saved");
      setTimeout(() => setSavedFlash(""), 2000);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveOrgConfig = async (orgId) => {
    const o = orgOverrides[orgId];
    if (!o) return;
    setSaving(true);
    try {
      await base44.functions.invoke("financeOfficer", {
        action: "update_org_config",
        organisation_id: orgId,
        is_enabled_override: o.is_enabled_override,
        monthly_allowance_override:
          o.monthly_allowance_override === "" ? null : Number(o.monthly_allowance_override),
      });
      setSavedFlash("Organisation config saved");
      setTimeout(() => setSavedFlash(""), 2000);
      setOrgOverrides((prev) => ({ ...prev, [orgId]: { ...prev[orgId], editing: false } }));
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (org) => {
    setOrgOverrides((prev) => ({
      ...prev,
      [org.organisation_id]: {
        is_enabled_override: org.is_enabled_override,
        monthly_allowance_override: org.monthly_allowance_override ?? "",
        editing: true,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
        <p className="text-sm text-muted-foreground">Loading admin settings…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-brand-navy mb-1">Access denied</h2>
        <p className="text-sm text-muted-foreground mb-6">You must be a Platform Owner to view this page.</p>
        <Link to="/platform-admin"><Button>Back to admin</Button></Link>
      </div>
    );
  }

  const orgs = data?.organisations || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/platform-admin">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Finance Officer Controls</h1>
          <p className="text-sm text-muted-foreground">Enable/disable and set monthly question allowances.</p>
        </div>
      </div>

      {savedFlash && (
        <div className="bg-status-ok/10 border border-status-ok/30 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-status-ok" />
          <p className="text-sm text-status-ok">{savedFlash}</p>
        </div>
      )}

      {/* Global settings */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-teal" />
          <h2 className="font-semibold text-brand-navy">Global Settings</h2>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Finance Officer enabled</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Master switch for all organisations. Per-org overrides can further restrict.
            </p>
          </div>
          <Switch checked={globalEnabled} onCheckedChange={setGlobalEnabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Default monthly question allowance</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Applies to all organisations without a per-org override.
          </p>
          <Input
            type="number"
            min="0"
            value={globalAllowance}
            onChange={(e) => setGlobalAllowance(e.target.value)}
            className="max-w-[160px]"
          />
        </div>
        <Button onClick={saveGlobal} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save global settings
        </Button>
      </div>

      {/* Per-org configs */}
      <div className="space-y-3">
        <h2 className="font-semibold text-brand-navy">Per-Organisation Configuration</h2>

        {/* Desktop table */}
        <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-mint/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Organisation</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Enabled</th>
                  <th className="px-4 py-3 font-medium">Allowance</th>
                  <th className="px-4 py-3 font-medium text-right">Used</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => {
                  const editing = orgOverrides[o.organisation_id]?.editing;
                  const override = orgOverrides[o.organisation_id] || {};
                  return (
                    <tr key={o.organisation_id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-brand-navy truncate max-w-[200px]">{o.organisation_name}</td>
                      <td className="px-4 py-3 capitalize">{o.org_type?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 capitalize">{o.data_mode}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[o.access_status] || ""}`}>
                          {o.access_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <ResponsiveSelect
                            value={override.is_enabled_override === null ? "inherit" : override.is_enabled_override ? "on" : "off"}
                            onValueChange={(v) => {
                              setOrgOverrides((prev) => ({
                                ...prev,
                                [o.organisation_id]: {
                                  ...override,
                                  is_enabled_override: v === "inherit" ? null : v === "on",
                                },
                              }));
                            }}
                            placeholder="Select"
                            triggerClassName="h-8 text-xs w-[150px]"
                            options={[
                              { value: "inherit", label: `Inherit (${o.effective_enabled ? "On" : "Off"})` },
                              { value: "on", label: "Force On" },
                              { value: "off", label: "Force Off" },
                            ]}
                          />
                        ) : (
                          <span className={`text-xs font-medium ${o.effective_enabled ? "text-status-ok" : "text-status-bad"}`}>
                            {o.effective_enabled ? "Enabled" : "Disabled"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <Input
                            type="number"
                            min="0"
                            value={override.monthly_allowance_override}
                            onChange={(e) =>
                              setOrgOverrides((prev) => ({
                                ...prev,
                                [o.organisation_id]: { ...override, monthly_allowance_override: e.target.value },
                              }))
                            }
                            placeholder={String(o.effective_allowance)}
                            className="h-8 w-20 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{o.effective_allowance}/mo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {o.used_this_month}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => saveOrgConfig(o.organisation_id)} disabled={saving}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setOrgOverrides((prev) => ({ ...prev, [o.organisation_id]: { ...override, editing: false } }))}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(o)}>
                            Override
                          </Button>
                        )}
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
          {orgs.map((o) => {
            const editing = orgOverrides[o.organisation_id]?.editing;
            const override = orgOverrides[o.organisation_id] || {};
            return (
              <div key={o.organisation_id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-navy truncate">{o.organisation_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {o.org_type?.replace(/_/g, " ")} · {o.data_mode} · {o.access_status}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${o.effective_enabled ? "text-status-ok" : "text-status-bad"}`}>
                    {o.effective_enabled ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Allowance: {o.effective_allowance}/mo</span>
                  <span className="text-muted-foreground">Used: {o.used_this_month}</span>
                </div>
                {editing ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div>
                      <Label className="text-xs text-muted-foreground">Enabled override</Label>
                      <ResponsiveSelect
                        value={override.is_enabled_override === null ? "inherit" : override.is_enabled_override ? "on" : "off"}
                        onValueChange={(v) => {
                          setOrgOverrides((prev) => ({
                            ...prev,
                            [o.organisation_id]: { ...override, is_enabled_override: v === "inherit" ? null : v === "on" },
                          }));
                        }}
                        placeholder="Select"
                        triggerClassName="h-9 text-xs mt-1"
                        options={[
                          { value: "inherit", label: `Inherit (${o.effective_enabled ? "On" : "Off"})` },
                          { value: "on", label: "Force On" },
                          { value: "off", label: "Force Off" },
                        ]}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Allowance override (blank = inherit)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={override.monthly_allowance_override}
                        onChange={(e) =>
                          setOrgOverrides((prev) => ({
                            ...prev,
                            [o.organisation_id]: { ...override, monthly_allowance_override: e.target.value },
                          }))
                        }
                        placeholder={String(o.effective_allowance)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveOrgConfig(o.organisation_id)} disabled={saving} className="flex-1">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setOrgOverrides((prev) => ({ ...prev, [o.organisation_id]: { ...override, editing: false } }))}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => startEdit(o)}>
                    Configure override
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}