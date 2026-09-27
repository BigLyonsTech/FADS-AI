import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInvoices } from "@/lib/useInvoices";
import { useFinance } from "@/lib/useFinance";
import { useDataMode } from "@/lib/useDataMode";
import { invoiceWording, formatMoney, canManageInvoices } from "@/lib/financeWording";
import { deriveInvoiceStatus, paymentMethodLabel } from "@/lib/invoiceUtils";
import InvoiceStatusBadge from "@/components/finance/InvoiceStatusBadge";
import RecordPaymentDialog from "@/components/finance/RecordPaymentDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Download, Printer, Ban, CreditCard, CheckCircle2, MessageCircle, Mail } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoicePdf";
import DraftWhatsAppReminderDialog from "@/components/finance/DraftWhatsAppReminderDialog";
import DocumentEmailDialog from "@/components/finance/DocumentEmailDialog";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, activeRole } = useWorkspace();
  const inv = useInvoices();
  const fin = useFinance();
  const { dataMode } = useDataMode();
  const w = invoiceWording(activeOrg?.type);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const invoice = inv.invoices.find((i) => i.id === id);
  const payments = inv.payments.filter((p) => p.invoice_id === id);
  const incomeCategories = fin.categories.filter((c) => c.kind === "income");

  if (inv.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!invoice) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Invoice not found.</p>
        </div>
      </div>
    );
  }

  const status = deriveInvoiceStatus(invoice);
  const org = invoice.org_snapshot || {};
  const canEdit = invoice.status === "draft" || invoice.status === "issued";
  const canPay = invoice.status !== "paid" && invoice.status !== "cancelled" && Number(invoice.balance) > 0;
  const canIssue = invoice.status === "draft";
  const isOverdue = status === "overdue";
  const customerContact = fin.contacts.find((c) => c.id === invoice.customer_id);
  const reminderPhone = customerContact?.phone || "";
  const reminderReceivable = {
    recipientName: invoice.customer_name || "there",
    outstandingAmount: Number(invoice.balance) || 0,
    currency: invoice.currency,
    dueDate: invoice.due_date,
    issueDate: invoice.issue_date,
    reference: invoice.invoice_number,
    description: (invoice.line_items || []).map((li) => li.description).filter(Boolean).join(", "),
  };
  const invoiceEmailSubject = `${w.invoiceNoun} ${invoice.invoice_number} from ${org.name || activeOrg?.name || "FADS"}`;
  const invoiceEmailBody = [
    `Hi ${invoice.customer_name || "there"},`,
    "",
    `Your ${w.invoiceNoun.toLowerCase()} ${invoice.invoice_number} is ready.`,
    `Total: ${formatMoney(invoice.total, invoice.currency)}`,
    `Due: ${invoice.due_date}`,
    "",
    "Please reply to this email if you have any questions.",
    "",
    "Regards,",
    org.name || activeOrg?.name || "FADS",
  ].join("\n");

  const issue = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("invoices", {
        action: "issue_invoice",
        organisation_id: invoice.organisation_id,
        invoice_id: invoice.id,
      });
      await inv.reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("invoices", {
        action: "cancel_invoice",
        organisation_id: invoice.organisation_id,
        invoice_id: invoice.id,
        reason: cancelReason,
      });
      setCancelOpen(false);
      await inv.reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = () => generateInvoicePDF(invoice, payments);

  return (
    <div className="max-w-3xl mx-auto space-y-4 print:max-w-none print:mx-0">
      <div className="flex items-center justify-between print:hidden">
        <BackToFinance />
        <InvoiceStatusBadge status={status} />
      </div>

      {/* Printable invoice document */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 print:border-0 print:p-0 print:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">{org.name || activeOrg?.name}</h1>
            {org.address && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{org.address}</p>}
            <p className="text-sm text-muted-foreground">
              {[org.phone, org.email].filter(Boolean).join(" · ")}
            </p>
            {org.tax_id_label && org.tax_id_value && (
              <p className="text-sm text-muted-foreground">{org.tax_id_label}: {org.tax_id_value}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-navy">{invoice.invoice_number}</p>
            <p className="text-sm text-muted-foreground">Issued: {invoice.issue_date}</p>
            <p className="text-sm text-muted-foreground">Due: {invoice.due_date}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill To</p>
          <p className="font-semibold text-brand-navy mt-1">{invoice.customer_name}</p>
          {invoice.customer_email && <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>}
          {invoice.customer_address && <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.customer_address}</p>}
        </div>

        {/* Line items */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-navy text-white text-left">
                <th className="p-2.5 font-medium rounded-l-lg">Description</th>
                <th className="p-2.5 font-medium text-right">Qty</th>
                <th className="p-2.5 font-medium text-right">Price</th>
                <th className="p-2.5 font-medium text-right">Disc</th>
                <th className="p-2.5 font-medium text-right rounded-r-lg">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.line_items || []).map((li, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="p-2.5">{li.description}</td>
                  <td className="p-2.5 text-right">{li.quantity}</td>
                  <td className="p-2.5 text-right">{formatMoney(li.unit_price, invoice.currency)}</td>
                  <td className="p-2.5 text-right">{formatMoney(li.discount || 0, invoice.currency)}</td>
                  <td className="p-2.5 text-right font-medium">{formatMoney(li.total, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full sm:w-64 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(invoice.subtotal, invoice.currency)}</span></div>
            {Number(invoice.discount_total) > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(invoice.discount_total, invoice.currency)}</span></div>
            )}
            {Number(invoice.tax_total) > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">{org.tax_label || "Tax"}</span><span>{formatMoney(invoice.tax_total, invoice.currency)}</span></div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-border font-bold text-brand-navy"><span>Total</span><span>{formatMoney(invoice.total, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span>{formatMoney(invoice.amount_paid, invoice.currency)}</span></div>
            <div className="flex justify-between font-bold text-status-warn"><span>Balance Due</span><span>{formatMoney(invoice.balance, invoice.currency)}</span></div>
          </div>
        </div>

        {invoice.payment_instructions && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Instructions</p>
            <p className="text-sm mt-1 whitespace-pre-line">{invoice.payment_instructions}</p>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="text-sm mt-1 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payments history */}
      {payments.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 print:hidden">
          <h2 className="font-semibold text-brand-navy mb-3">Payments Received</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-brand-navy">{formatMoney(p.amount, p.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.date} · {paymentMethodLabel(p.payment_method)}{p.reference ? " · " + p.reference : ""}
                  </p>
                </div>
                <Link to="/finance/receipts" className="text-xs text-brand-teal hover:underline">Receipt</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {canEdit && (
          <Button variant="outline" className="h-11" onClick={() => navigate(`/finance/invoices/${invoice.id}/edit`)}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        )}
        {canIssue && (
          <Button className="h-11" onClick={issue} disabled={busy}>
            <CheckCircle2 className="w-4 h-4" /> Issue
          </Button>
        )}
        {canPay && (
          <Button className="h-11" onClick={() => setPayOpen(true)}>
            <CreditCard className="w-4 h-4" /> Record Payment
          </Button>
        )}
        {isOverdue && (
          <Button variant="outline" className="h-11" onClick={() => setReminderOpen(true)}>
            <MessageCircle className="w-4 h-4" /> Draft WhatsApp Reminder
          </Button>
        )}
        <Button variant="outline" className="h-11" onClick={downloadPdf}>
          <Download className="w-4 h-4" /> Download PDF
        </Button>
        {canManageInvoices(activeRole) && (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setEmailOpen(true)}
            disabled={!invoice.customer_email}
            title={!invoice.customer_email ? "Add an email address to this customer first" : undefined}
          >
            <Mail className="w-4 h-4" /> Email to Customer
          </Button>
        )}
        <Button variant="outline" className="h-11" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print
        </Button>
        {invoice.status !== "cancelled" && invoice.status !== "paid" && (
          <Button variant="ghost" className="h-11 text-status-bad" onClick={() => setCancelOpen(true)}>
            <Ban className="w-4 h-4" /> Cancel
          </Button>
        )}
      </div>

      <RecordPaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSaved={async () => {
          setPayOpen(false);
          await inv.reload();
          await fin.reload();
        }}
        invoice={invoice}
        accounts={fin.accounts}
        incomeCategories={incomeCategories}
        currency={invoice.currency}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {w.invoiceNoun}</DialogTitle>
          </DialogHeader>
          <textarea
            className="w-full rounded-md border border-input p-3 text-sm min-h-20"
            placeholder="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setCancelOpen(false)}>Keep</Button>
            <Button variant="destructive" className="h-11" onClick={cancel} disabled={busy}>
              Cancel {w.invoiceNoun}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftWhatsAppReminderDialog
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        organisationId={invoice.organisation_id}
        receivable={reminderReceivable}
        phone={reminderPhone}
      />

      <DocumentEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        organisationId={invoice.organisation_id}
        dataMode={dataMode}
        endpoint="invoices"
        action="email_invoice"
        idField="invoice_id"
        recordId={invoice.id}
        documentLabel={w.invoiceNoun}
        documentNumber={invoice.invoice_number}
        customerName={invoice.customer_name}
        customerEmail={invoice.customer_email}
        totalLabel={formatMoney(invoice.total, invoice.currency)}
        defaultSubject={invoiceEmailSubject}
        defaultBody={invoiceEmailBody}
      />
    </div>
  );
}