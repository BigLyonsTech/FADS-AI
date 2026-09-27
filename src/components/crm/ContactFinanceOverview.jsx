import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useFinance } from "@/lib/useFinance";
import { useInvoices } from "@/lib/useInvoices";
import { formatMoney } from "@/lib/financeWording";
import { FileText, TrendingUp, TrendingDown, AlertCircle, Receipt } from "lucide-react";

const norm = (s) => (s || "").trim().toLowerCase();

// Read-only financial overview for a CRM contact. Matches the CRMContact to
// a FinanceContact by email (preferred) or full name, then surfaces existing
// invoices, transactions, outstanding amounts and payment history from the
// Finance module. Does NOT create or duplicate any financial records.
export default function ContactFinanceOverview({ contact, currency }) {
  const fin = useFinance();
  const inv = useInvoices();

  const match = useMemo(() => {
    if (!contact) return null;
    if (contact.email) {
      const byEmail = fin.contacts.find((c) => norm(c.email) === norm(contact.email));
      if (byEmail) return byEmail;
    }
    const fullName = `${contact.first_name} ${contact.last_name || ""}`.trim().toLowerCase();
    return fin.contacts.find((c) => norm(c.name) === fullName) || null;
  }, [contact, fin.contacts]);

  const isCustomer = match && ["customer", "parent", "member", "donor"].includes(match.kind);
  const isSupplier = match && match.kind === "supplier";

  const contactInvoices = useMemo(() => {
    if (!match) return [];
    return inv.invoices.filter((i) => i.customer_id === match.id);
  }, [match, inv.invoices]);

  const contactPayments = useMemo(() => {
    if (!match) return [];
    const invIds = new Set(contactInvoices.map((i) => i.id));
    return inv.payments.filter((p) => invIds.has(p.invoice_id));
  }, [match, contactInvoices, inv.payments]);

  const contactTxns = useMemo(() => {
    if (!match) return [];
    return fin.transactions.filter((t) => t.contact_id === match.id);
  }, [match, fin.transactions]);

  const outstanding = contactInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);
  const totalInvoiced = contactInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalPaid = contactPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalSpent = contactTxns
    .filter((t) => t.direction === "out")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  if (fin.loading || inv.loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading financial overview…
        </CardContent>
      </Card>
    );
  }

  if (!match) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm space-y-1">
          <AlertCircle className="w-5 h-5 mx-auto opacity-50" />
          <p>No linked finance record found for this contact.</p>
          <p className="text-xs">
            When you create an invoice or transaction for this person in Finance,
            it will appear here automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isCustomer && (
          <>
            <SummaryCard label="Total Invoiced" value={formatMoney(totalInvoiced, currency)} icon={FileText} />
            <SummaryCard label="Total Paid" value={formatMoney(totalPaid, currency)} icon={TrendingUp} tone="ok" />
            <SummaryCard
              label="Outstanding"
              value={formatMoney(outstanding, currency)}
              icon={AlertCircle}
              tone={outstanding > 0.01 ? "warn" : "ok"}
            />
            <SummaryCard label="Invoices" value={String(contactInvoices.length)} icon={Receipt} />
          </>
        )}
        {isSupplier && (
          <>
            <SummaryCard label="Total Spent" value={formatMoney(totalSpent, currency)} icon={TrendingDown} />
            <SummaryCard label="Transactions" value={String(contactTxns.length)} icon={Receipt} />
          </>
        )}
      </div>

      {/* Invoices */}
      {isCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {contactInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No invoices for this contact yet.
              </p>
            ) : (
              <div className="space-y-2">
                {contactInvoices.map((i) => (
                  <Link
                    key={i.id}
                    to={`/finance/invoices/${i.id}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{i.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">
                        Due {i.due_date}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm">
                        {formatMoney(i.total, currency)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          i.status === "paid"
                            ? "border-status-ok text-status-ok"
                            : i.status === "part_paid"
                            ? "border-status-warn text-status-warn"
                            : i.status === "cancelled"
                            ? "border-muted-foreground text-muted-foreground"
                            : "border-brand-teal text-brand-teal"
                        }`}
                      >
                        {i.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      {isCustomer && contactPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contactPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {formatMoney(p.amount, currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.date} · {p.payment_method}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </div>
                  </div>
                  <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {contactTxns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transactions for this contact.
            </p>
          ) : (
            <div className="space-y-2">
              {contactTxns.slice(0, 20).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {t.description || t.reference || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.date} · {t.payment_method}
                    </div>
                  </div>
                  <div
                    className={`font-semibold text-sm shrink-0 ${
                      t.direction === "in" ? "text-status-ok" : "text-status-bad"
                    }`}
                  >
                    {t.direction === "in" ? "+" : "−"}
                    {formatMoney(t.amount, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  const toneClass =
    tone === "ok"
      ? "text-status-ok"
      : tone === "warn"
      ? "text-status-warn"
      : "text-brand-navy";
  return (
    <div className="bg-card rounded-lg border border-border p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}