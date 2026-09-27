import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { usePayroll } from "@/lib/usePayroll";
import { useWorkspace } from "@/lib/useWorkspace";
import { formatMoney } from "@/lib/financeWording";
import { generatePayslipPDF } from "@/lib/payslipPdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ChevronLeft, Printer, FileDown, MessageCircle } from "lucide-react";

const STATUS_STYLE = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-status-ok/15 text-status-ok",
  paid: "bg-brand-teal/15 text-brand-teal",
};

export default function Payslip() {
  const { id, employeeId } = useParams();
  const { activeOrg } = useWorkspace();
  const { getRun } = usePayroll();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phone, setPhone] = useState("");
  const currency = activeOrg?.currency || "";

  useEffect(() => {
    (async () => {
      try {
        const r = await getRun(id);
        setRun(r);
        const item = (r.items || []).find((i) => i.employee_id === employeeId);
        if (item) setPhone(item.employee_phone || "");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-destructive">{error || "Payslip not found"}</p>
      </div>
    );
  }

  const item = (run.items || []).find((i) => i.employee_id === employeeId);
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Employee not found in this run.</p>
      </div>
    );
  }

  const fmt = (n) => formatMoney(n, currency);
  const allowancesTotal = (item.allowances || []).reduce((s, a) => s + (Number(a.amount) || 0), 0);

  const buildMessage = () => {
    return [
      `Payslip — ${activeOrg?.name || ""}`,
      `Period: ${run.pay_period_start} to ${run.pay_period_end}`,
      `Employee: ${item.employee_name}`,
      `Basic Pay: ${fmt(item.basic_pay)}`,
      ...(item.allowances || []).map((a) => `${a.label}: ${fmt(a.amount)}`),
      `Gross Pay: ${fmt(item.gross)}`,
      ...(item.deductions || []).map((d) => `${d.label}: ${fmt(d.amount)}`),
      `Total Deductions: ${fmt(item.deductions_total)}`,
      `Net Pay: ${fmt(item.net)}`,
      `Status: ${run.status}`,
    ].join("\n");
  };

  const handleWhatsApp = () => {
    const clean = (phone || "").replace(/[^\d]/g, "");
    const text = encodeURIComponent(buildMessage());
    if (clean) {
      window.open(`https://wa.me/${clean}?text=${text}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <Link to={`/payroll/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
          <ChevronLeft className="w-4 h-4" /> Back to Run
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 gap-1.5" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="outline" className="h-11 gap-1.5" onClick={() => generatePayslipPDF(run, item, activeOrg)}>
            <FileDown className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      <Card className="p-6 print:shadow-none print:border-0" id="payslip-print">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-brand-navy">{activeOrg?.name || "Organisation"}</h1>
            <p className="text-xs text-muted-foreground">Payslip</p>
          </div>
          <Badge className={`${STATUS_STYLE[run.status] || ""} capitalize`} variant="secondary">
            {run.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <div className="text-xs text-muted-foreground">Employee</div>
            <div className="font-medium">{item.employee_name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pay Period</div>
            <div className="font-medium">{run.pay_period_start} → {run.pay_period_end}</div>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <h2 className="text-sm font-semibold mb-2 text-brand-navy">Earnings</h2>
          <div className="space-y-1 text-sm">
            <Row label="Basic Pay" value={fmt(item.basic_pay)} />
            {(item.allowances || []).map((a, i) => (
              <Row key={i} label={a.label || "Allowance"} value={fmt(a.amount)} />
            ))}
            <Row label="Gross Pay" value={fmt(item.gross)} bold />
          </div>
        </div>

        <div className="border-t border-border pt-3 mt-3">
          <h2 className="text-sm font-semibold mb-2 text-brand-navy">Deductions</h2>
          <div className="space-y-1 text-sm">
            {(item.deductions || []).length === 0 && (
              <p className="text-xs text-muted-foreground">No deductions</p>
            )}
            {(item.deductions || []).map((d, i) => (
              <Row key={i} label={d.label || "Deduction"} value={fmt(d.amount)} />
            ))}
            <Row label="Total Deductions" value={fmt(item.deductions_total)} bold />
          </div>
        </div>

        <div className="mt-4 bg-brand-teal/10 rounded-lg p-4 flex items-center justify-between">
          <span className="font-semibold text-brand-navy">Net Pay</span>
          <span className="text-xl font-bold text-brand-teal">{fmt(item.net)}</span>
        </div>

        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          Generated by FADS AI Business Suite · Payroll V1 · {allowancesTotal ? `Allowances ${fmt(allowancesTotal)}` : ""}
        </p>
      </Card>

      {/* WhatsApp share — lightweight open-chat, no API */}
      <Card className="p-4 print:hidden">
        <h2 className="text-sm font-medium mb-2">Share via WhatsApp</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Opens WhatsApp with a pre-filled payslip summary. No bulk API — you review before sending.
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Recipient phone (with country code)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+353 87 000 0000" />
          </div>
          <Button onClick={handleWhatsApp} className="h-11 gap-1.5">
            <MessageCircle className="w-4 h-4" /> Open WhatsApp
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-brand-navy border-t border-border pt-1" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}