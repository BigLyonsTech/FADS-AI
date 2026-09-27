import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useHr } from "@/lib/useHr";
import { useFinance } from "@/lib/useFinance";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { usePayroll } from "@/lib/usePayroll";
import { computeItem, computeRunTotals, PAY_FREQUENCIES } from "@/lib/payrollCalc";
import { formatMoney } from "@/lib/financeWording";
import { canAccessHr } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2, AlertCircle, Save, ChevronLeft, Check } from "lucide-react";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default function PayrollRunEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, activeRole } = useWorkspace();
  const { dataMode } = useDataMode();
  const { employees, loading: hrLoading } = useHr();
  const { accounts } = useFinance();
  const { createRun, updateRun, getRun } = usePayroll();
  const isEdit = Boolean(id);

  const range = useMemo(() => currentMonthRange(), []);
  const [form, setForm] = useState({
    pay_period_start: range.start,
    pay_period_end: range.end,
    pay_frequency: "monthly",
    account_id: "",
  });
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const run = await getRun(id);
          setForm({
            pay_period_start: run.pay_period_start || range.start,
            pay_period_end: run.pay_period_end || range.end,
            pay_frequency: run.pay_frequency || "monthly",
            account_id: run.account_id || "",
          });
          setSelected((run.items || []).map((i) => i.employee_id));
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const canAccess = canAccessHr(activeRole);

  const eligibleEmployees = useMemo(
    () =>
      employees.filter(
        (e) => e.employment_status === "active" || e.employment_status === "on_leave"
      ),
    [employees]
  );

  const items = useMemo(
    () => selected.map((eid) => computeItem(eligibleEmployees.find((e) => e.id === eid))).filter(Boolean),
    [selected, eligibleEmployees]
  );
  const totals = useMemo(() => computeRunTotals(items), [items]);
  const currency = activeOrg?.currency || "";

  const toggle = (eid) =>
    setSelected((s) => (s.includes(eid) ? s.filter((x) => x !== eid) : [...s, eid]));

  const selectAll = () => setSelected(eligibleEmployees.map((e) => e.id));
  const clearAll = () => setSelected([]);

  const handleSave = async () => {
    setError(null);
    if (!form.pay_period_start || !form.pay_period_end) {
      setError("Select a pay period");
      return;
    }
    if (!form.account_id) {
      setError("Select an account to post salaries to");
      return;
    }
    if (!items.length) {
      setError("Select at least one employee");
      return;
    }
    setSaving(true);
    try {
      const account = accounts.find((a) => a.id === form.account_id);
      const payload = {
        organisation_id: activeOrg.id,
        pay_period_start: form.pay_period_start,
        pay_period_end: form.pay_period_end,
        pay_frequency: form.pay_frequency,
        account_id: form.account_id,
        account_name: account?.name || null,
        status: "draft",
        items,
        ...totals,
        data_mode: dataMode,
      };
      if (isEdit) {
        await updateRun(id, payload);
        navigate(`/payroll/${id}`);
      } else {
        const r = await createRun(payload);
        navigate(`/payroll/${r.id}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold mb-1">HR Access Required</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You need an HR-authorised role to build a payroll run from employee records.
        </p>
      </div>
    );
  }

  if (loading || hrLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
        <ChevronLeft className="w-4 h-4" /> Back to Payroll
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">
        {isEdit ? "Edit Payroll Run" : "New Payroll Run"}
      </h1>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <Card className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Period Start</Label>
            <Input type="date" value={form.pay_period_start} onChange={(e) => setForm({ ...form, pay_period_start: e.target.value })} />
          </div>
          <div>
            <Label>Period End</Label>
            <Input type="date" value={form.pay_period_end} onChange={(e) => setForm({ ...form, pay_period_end: e.target.value })} />
          </div>
          <div>
            <Label>Pay Frequency</Label>
            <ResponsiveSelect
              value={form.pay_frequency}
              onValueChange={(v) => setForm({ ...form, pay_frequency: v })}
              options={PAY_FREQUENCIES}
            />
          </div>
        </div>
        <div>
          <Label>Salary Account</Label>
          <ResponsiveSelect
            value={form.account_id || ""}
            onValueChange={(v) => setForm({ ...form, account_id: v })}
            placeholder="Select account"
            options={[
              { value: "", label: "Select account" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
      </Card>

      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Select Employees</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
          </div>
        </div>
        {eligibleEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No active employees. Add staff and set their pay configuration first.
          </p>
        ) : (
          <div className="space-y-2">
            {eligibleEmployees.map((e) => {
              const item = computeItem(e);
              const checked = selected.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggle(e.id)}
                  className={`w-full flex items-center justify-between gap-3 border rounded-lg p-3 text-left transition-colors ${
                    checked ? "border-brand-teal bg-brand-mint/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${checked ? "bg-brand-teal text-white" : "border border-border"}`}>
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-brand-navy truncate">{item.employee_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Basic {formatMoney(item.basic_pay, currency)} · Net {formatMoney(item.net, currency)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground">
                    <p>Gross {formatMoney(item.gross, currency)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-medium mb-3">Run Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Summary label="Employees" value={totals.employee_count} />
          <Summary label="Gross" value={formatMoney(totals.total_gross, currency)} />
          <Summary label="Deductions" value={formatMoney(totals.total_deductions, currency)} />
          <Summary label="Net" value={formatMoney(totals.total_net, currency)} />
        </div>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/payroll")} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? "Save Changes" : "Save Draft"}
        </Button>
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-brand-navy">{value}</div>
    </div>
  );
}