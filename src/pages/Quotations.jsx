import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useQuotations } from "@/lib/useQuotations";
import { canManageInvoices, formatMoney } from "@/lib/financeWording";
import { deriveQuotationStatus, quotationStatusLabel } from "@/lib/quotationUtils";
import QuotationStatusBadge from "@/components/finance/QuotationStatusBadge";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default function Quotations() {
  const { activeOrg, activeRole } = useWorkspace();
  const quotes = useQuotations();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const displayed = useMemo(() => {
    if (filter === "all") return quotes.quotations;
    return quotes.quotations.filter((quotation) => deriveQuotationStatus(quotation) === filter);
  }, [quotes.quotations, filter]);

  if (activeOrg?.type !== "small_business") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Quotations are currently available in Small Business workspaces.
          </p>
        </div>
      </div>
    );
  }

  if (!canManageInvoices(activeRole)) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage quotations.
          </p>
        </div>
      </div>
    );
  }

  if (quotes.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  const filters = ["all", "draft", "sent", "accepted", "declined", "expired", "converted"];

  return (
    <div className="space-y-4">
      <BackToFinance />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Quotations</h1>
          <p className="text-sm text-muted-foreground">
            Prepare prices for customers before creating an invoice.
          </p>
        </div>
        <Button className="h-11" onClick={() => navigate("/finance/quotations/new")}>
          <Plus className="w-4 h-4" /> New Quotation
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              filter === value
                ? "bg-brand-navy text-white border-brand-navy"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            {value === "all" ? "All" : quotationStatusLabel(value)}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-brand-navy">
            {filter === "all" ? "No quotations yet." : `No ${quotationStatusLabel(filter).toLowerCase()} quotations.`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a quotation without affecting sales, money owed or stock.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((quotation) => {
            const status = deriveQuotationStatus(quotation);
            return (
              <Link
                key={quotation.id}
                to={`/finance/quotations/${quotation.id}`}
                className="block rounded-xl border border-border bg-card p-4 hover:border-brand-teal transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-brand-navy">{quotation.quotation_number}</span>
                      <QuotationStatusBadge status={status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {quotation.customer_name} · Valid until {quotation.valid_until}
                    </p>
                  </div>
                  <p className="font-bold text-brand-navy shrink-0">
                    {formatMoney(quotation.total, quotation.currency)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
