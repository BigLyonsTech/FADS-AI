import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording, EMPLOYMENT_STATUSES, CONTRACT_TYPES } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import BackToHR from "@/components/hr/BackToHR";
import { Loader2, AlertCircle, Save, Lock, Plus, X } from "lucide-react";
import { PAY_FREQUENCIES } from "@/lib/payrollCalc";

export default function EmployeeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg } = useWorkspace();
  const w = hrWording(activeOrg?.type);
  const {
    getEmployee, createEmployee, updateEmployee,
    departments, jobRoles, workLocations, employees, loadEmployees,
  } = useHr();

  const isEdit = Boolean(id);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", personal_email: "", phone: "",
    department_id: "", job_role_id: "", manager_id: "", work_location_id: "",
    employment_status: "onboarding", contract_type: "permanent",
    start_date: "", annual_salary: "", salary_currency: activeOrg?.currency || "",
    date_of_birth: "", home_address: "",
    pay_basic: "", pay_frequency: "monthly", pay_allowances: [], pay_deductions: [],
  });
  const [potentialManagers, setPotentialManagers] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const data = await getEmployee(id);
          const e = data.employee;
          setForm({
            first_name: e.first_name || "",
            last_name: e.last_name || "",
            email: e.email || "",
            personal_email: e.personal_email || "",
            phone: e.phone || "",
            department_id: e.department_id || "",
            job_role_id: e.job_role_id || "",
            manager_id: e.manager_id || "",
            work_location_id: e.work_location_id || "",
            employment_status: e.employment_status || "onboarding",
            contract_type: e.contract_type || "permanent",
            start_date: e.start_date || "",
            annual_salary: e.annual_salary != null ? String(e.annual_salary) : "",
            salary_currency: e.salary_currency || activeOrg?.currency || "",
            date_of_birth: e.date_of_birth || "",
            home_address: e.home_address || "",
            pay_basic: e.pay_basic != null ? String(e.pay_basic) : "",
            pay_frequency: e.pay_frequency || "monthly",
            pay_allowances: Array.isArray(e.pay_allowances) ? e.pay_allowances : [],
            pay_deductions: Array.isArray(e.pay_deductions) ? e.pay_deductions : [],
          });
          setPotentialManagers(data.potential_managers || []);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        annual_salary: form.annual_salary ? Number(form.annual_salary) : null,
        pay_basic: form.pay_basic ? Number(form.pay_basic) : 0,
        pay_allowances: (form.pay_allowances || []).filter((a) => a.label || a.amount),
        pay_deductions: (form.pay_deductions || []).filter((d) => d.label || d.amount),
        manager_id: form.manager_id || null,
        department_id: form.department_id || null,
        job_role_id: form.job_role_id || null,
        work_location_id: form.work_location_id || null,
      };
      if (isEdit) {
        await updateEmployee(id, payload);
      } else {
        await createEmployee(payload);
      }
      navigate(id ? `/hr/employees/${id}` : "/hr/employees");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <BackToHR label={isEdit ? "Back to Profile" : "Back to Directory"} />
      <h1 className="text-xl font-heading font-bold">
        {isEdit ? `Edit ${w.staffNoun.toLowerCase()}` : w.addEmployee}
      </h1>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <Card className="p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium mb-3">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium mb-3">Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Work Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium mb-3">Employment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Department</Label>
              <ResponsiveSelect
                value={form.department_id || ""}
                onValueChange={(v) => set("department_id", v)}
                placeholder="None"
                options={[
                  { value: "", label: "None" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
            <div>
              <Label>Job Role</Label>
              <ResponsiveSelect
                value={form.job_role_id || ""}
                onValueChange={(v) => set("job_role_id", v)}
                placeholder="None"
                options={[
                  { value: "", label: "None" },
                  ...jobRoles.map((r) => ({ value: r.id, label: r.title })),
                ]}
              />
            </div>
            <div>
              <Label>Reporting Manager</Label>
              <ResponsiveSelect
                value={form.manager_id || ""}
                onValueChange={(v) => set("manager_id", v)}
                placeholder="None"
                options={[
                  { value: "", label: "None" },
                  ...(isEdit ? potentialManagers : employees.map((e) => ({ id: e.id, name: [e.first_name, e.last_name].filter(Boolean).join(" ") }))).map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
            </div>
            <div>
              <Label>Work Location</Label>
              <ResponsiveSelect
                value={form.work_location_id || ""}
                onValueChange={(v) => set("work_location_id", v)}
                placeholder="None"
                options={[
                  { value: "", label: "None" },
                  ...workLocations.map((l) => ({ value: l.id, label: l.name })),
                ]}
              />
            </div>
            <div>
              <Label>Employment Status</Label>
              <ResponsiveSelect
                value={form.employment_status}
                onValueChange={(v) => set("employment_status", v)}
                placeholder="Select status"
                options={EMPLOYMENT_STATUSES}
              />
            </div>
            <div>
              <Label>Contract Type</Label>
              <ResponsiveSelect
                value={form.contract_type}
                onValueChange={(v) => set("contract_type", v)}
                placeholder="Select type"
                options={CONTRACT_TYPES}
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Pay configuration (Payroll V1) */}
        <div>
          <h2 className="text-sm font-medium mb-1">Pay Configuration</h2>
          <p className="text-xs text-muted-foreground mb-3">Used by Payroll V1 to calculate payslips. Basic pay is per pay period.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Basic Pay (per period)</Label>
              <Input type="number" value={form.pay_basic} onChange={(e) => set("pay_basic", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Pay Frequency</Label>
              <ResponsiveSelect
                value={form.pay_frequency}
                onValueChange={(v) => set("pay_frequency", v)}
                options={PAY_FREQUENCIES}
              />
            </div>
          </div>
          <AllowanceEditor title="Allowances / Bonuses" items={form.pay_allowances} onChange={(arr) => set("pay_allowances", arr)} />
          <AllowanceEditor title="Deductions" items={form.pay_deductions} onChange={(arr) => set("pay_deductions", arr)} />
        </div>

        {/* Restricted fields */}
        <div>
          <h2 className="text-sm font-medium mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Restricted Information
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Visible only to HR-authorised roles. Provide only if operationally necessary.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Annual Salary</Label>
              <Input type="number" value={form.annual_salary} onChange={(e) => set("annual_salary", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Salary Currency</Label>
              <Input value={form.salary_currency} onChange={(e) => set("salary_currency", e.target.value)} placeholder={activeOrg?.currency || "USD"} />
            </div>
            <div>
              <Label>Personal Email</Label>
              <Input type="email" value={form.personal_email} onChange={(e) => set("personal_email", e.target.value)} />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Home Address</Label>
              <Input value={form.home_address} onChange={(e) => set("home_address", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AllowanceEditor({ title, items, onChange }) {
  const add = () => onChange([...(items || []), { label: "", amount: "" }]);
  const update = (i, field, val) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <Label>{title}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={add} className="h-8 gap-1">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>
      {(items || []).length === 0 ? (
        <p className="text-xs text-muted-foreground">None</p>
      ) : (
        <div className="space-y-2">
          {(items || []).map((it, i) => (
            <div key={i} className="flex gap-2">
              <Input className="flex-1" placeholder="Label" value={it.label || ""} onChange={(e) => update(i, "label", e.target.value)} />
              <Input className="w-28" type="number" placeholder="Amount" value={it.amount || ""} onChange={(e) => update(i, "amount", e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="h-9 px-2 text-destructive">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}