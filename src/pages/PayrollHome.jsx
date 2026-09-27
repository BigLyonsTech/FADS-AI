import React from "react";
import { Link } from "react-router-dom";
import { usePayroll } from "@/lib/usePayroll";
import { useWorkspace } from "@/lib/useWorkspace";
import { formatMoney } from "@/lib/financeWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Loader2, AlertCircle, ChevronRight } from "lucide-react";

const STATUS_STYLE = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-status-ok/15 text-status-ok",
  paid: "bg-brand-teal/15 text-brand-teal",
};

export default function PayrollHome() {
  const { activeOrg } = useWorkspace();
  const { runs, loading, error, reload } = usePayroll();
  const currency = activeOrg?.currency || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg?.name} · {currency} · {activeOrg?.data_mode === "demo" ? "Demo" : "Live"}
          </p>
        </div>
        <Link to="/payroll/new">
          <Button className="h-11 gap-1.5">
            <Plus className="w-4 h-4" /> New Payroll Run
          </Button>
        </Link>
      </div>

      <div className="bg-muted/40 rounded-xl border border-border p-3 text-xs text-muted-foreground">
        Payroll V1 records basic pay, allowances and deductions. Posting an approved run creates a
        Salaries expense in Finance for each employee. No tax or statutory calculations.
      </div>

      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" />
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 rounded-xl p-4 text-center">
          <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={reload}>Retry</Button>
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <Card className="p-8 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-semibold mb-1">No payroll runs yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set pay configuration on your staff, then create a payroll run.
          </p>
          <Link to="/payroll/new">
            <Button className="h-11 gap-1.5">
              <Plus className="w-4 h-4" /> Create your first run
            </Button>
          </Link>
        </Card>
      )}

      {!loading && !error && runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((r) => (
            <Link key={r.id} to={`/payroll/${r.id}`}>
              <Card className="p-4 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-brand-navy">
                      {r.pay_period_start} → {r.pay_period_end}
                    </p>
                    <Badge className={`${STATUS_STYLE[r.status] || ""} capitalize`} variant="secondary">
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.employee_count} employees · Net {formatMoney(r.total_net, currency)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}