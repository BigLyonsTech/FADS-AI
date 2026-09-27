import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePayroll } from "@/lib/usePayroll";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { formatMoney, canManageFinance } from "@/lib/financeWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, ChevronLeft, CheckCircle2, Banknote, FileText, Trash2, Printer } from "lucide-react";

const STATUS_STYLE = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-status-ok/15 text-status-ok",
  paid: "bg-brand-teal/15 text-brand-teal",
};

export default function PayrollRunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, activeRole } = useWorkspace();
  const { reload: reloadFinance } = useFinance();
  const { getRun, postRun, markPaid, deleteRun } = usePayroll();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const currency = activeOrg?.currency || "";
  const canManage = canManageFinance(activeRole);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getRun(id);
      setRun(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handlePost = async () => {
    setBusy(true);
    setError(null);
    try {
      await postRun(id);
      await reloadFinance();
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    setBusy(true);
    setError(null);
    try {
      await markPaid(id);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this draft payroll run? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteRun(id);
      navigate("/payroll");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error && !run) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }
  if (!run) return null;

  const items = run.items || [];

  return (
    <div className="space-y-4 max-w-3xl">
      <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
        <ChevronLeft className="w-4 h-4" /> Back to Payroll
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">
            Payroll Run
          </h1>
          <p className="text-sm text-muted-foreground">
            {run.pay_period_start} → {run.pay_period_end} · {run.pay_frequency}
          </p>
        </div>
        <Badge className={`${STATUS_STYLE[run.status] || ""} capitalize`} variant="secondary">
          {run.status}
        </Badge>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Employees" value={run.employee_count || items.length} />
        <Stat label="Gross" value={formatMoney(run.total_gross, currency)} />
        <Stat label="Deductions" value={formatMoney(run.total_deductions, currency)} />
        <Stat label="Net" value={formatMoney(run.total_net, currency)} />
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-medium mb-3">Payslips</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.employee_id} className="flex items-center justify-between border-b last:border-0 border-border pb-2 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium text-sm text-brand-navy truncate">{item.employee_name}</p>
                <p className="text-xs text-muted-foreground">
                  Basic {formatMoney(item.basic_pay, currency)} · Net {formatMoney(item.net, currency)}
                </p>
              </div>
              <Link to={`/payroll/${id}/payslip/${item.employee_id}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Payslip
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {run.status === "draft" && canManage && (
          <>
            <Button onClick={handlePost} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve & Post to Finance
            </Button>
            <Button variant="outline" onClick={() => navigate(`/payroll/${id}/edit`)} disabled={busy}>Edit</Button>
            <Button variant="outline" onClick={handleDelete} disabled={busy} className="gap-1.5 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </>
        )}
        {run.status === "approved" && canManage && (
          <Button onClick={handleMarkPaid} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
            Mark as Paid
          </Button>
        )}
        {run.status === "paid" && (
          <div className="flex items-center gap-2 text-sm text-status-ok">
            <CheckCircle2 className="w-4 h-4" /> This run has been paid.
          </div>
        )}
      </div>

      {run.status !== "draft" && run.posted_finance_transaction_ids?.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          {run.posted_finance_transaction_ids.length} salary expense(s) posted to Finance
          {run.posted_date ? ` on ${run.posted_date}` : ""}. Reference: PAYROLL:{run.id}.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-brand-navy">{value}</div>
    </Card>
  );
}