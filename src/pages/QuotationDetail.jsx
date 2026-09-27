import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useQuotations } from "@/lib/useQuotations";
import { useInvoices } from "@/lib/useInvoices";
import { useFinance } from "@/lib/useFinance";
import { openWhatsAppShare } from "@/lib/webviewCompat";
import { canManageInvoices, formatMoney } from "@/lib/financeWording";
import { deriveQuotationStatus } from "@/lib/quotationUtils";
import QuotationStatusBadge from "@/components/finance/QuotationStatusBadge";
import DocumentEmailDialog from "@/components/finance/DocumentEmailDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import { generateQuotationPDF } from "@/lib/quotationPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Mail,
  MessageCircle,
  Pencil,
  XCircle,
  Clock3,
  FileText,
  Loader2,
} from "lucide-react";

function datePlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, activeRole } = useWorkspace();
  const { dataMode } = useDataMode();
  const quotations = useQuotations();
  const invoices = useInvoices();
  const finance = useFinance();
  const { toast } = useToast();

  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [dueDate, setDueDate] = useState(datePlusDays(14));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const quotation = quotations.quotations.find((item) => item.id === id);

  if (activeOrg?.type !== "small_business") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Quotations are currently available in Small Business workspaces.
        </div>
      </div>
    );
  }

  if (!canManageInvoices(activeRole)) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          You do not have permission to manage quotations.
        </div>
      </div>
    );
  }

  if (quotations.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  if (!quotation) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <BackToFinance />
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Quotation not found.
        </div>
      </div>
    );
  }

  const effectiveStatus = deriveQuotationStatus(quotation);
  const org = quotation.org_snapshot || {};
  const editable = quotation.status === "draft" || quotation.status === "sent";
  const customerContact = finance.contacts.find((contact) =>
    contact.id === quotation.customer_id &&
    contact.organisation_id === activeOrg?.id &&
    contact.data_mode === dataMode
  );
  const customerPhone = customerContact?.phone || "";
  // Phone entry stores a selected international dial code. Never guess one.
  const whatsappNumber = /^\+\d[\d\s().-]*$/.test(customerPhone.trim())
    ? customerPhone.replace(/\D/g, "")
    : "";
  const orgName = org.name || activeOrg?.name || "FADS";
  const whatsAppDraft = [
    `Hi ${quotation.customer_name || "there"},`,
    "",
    `Here is quotation ${quotation.quotation_number} from ${orgName} for ${formatMoney(quotation.total, quotation.currency)}.`,
    `Valid until: ${quotation.valid_until}`,
    "",
    "Please let us know if you would like to proceed or have any questions.",
    "",
    "Regards,",
    orgName,
  ].join("\n");
  const canAccept =
    (quotation.status === "draft" || quotation.status === "sent") &&
    effectiveStatus !== "expired";

  const setStatus = async (status) => {
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("quotations", {
        action: "set_status",
        organisation_id: quotation.organisation_id,
        data_mode: dataMode,
        quotation_id: quotation.id,
        status,
      });
      await quotations.reload();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not update quotation.");
    } finally {
      setBusy(false);
    }
  };

  const convert = async () => {
    if (!dueDate) {
      setError("Choose an invoice due date.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await base44.functions.invoke("invoices", {
        action: "create_from_quotation",
        organisation_id: quotation.organisation_id,
        data_mode: dataMode,
        quotation_id: quotation.id,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate,
      });
      const result = response?.data ?? response;
      await Promise.all([quotations.reload(), invoices.reload()]);
      setConvertOpen(false);
      toast({
        title: result?.already_converted ? "Invoice already exists" : "Draft invoice created",
        description: result?.invoice_number || "",
      });
      if (result?.id) navigate(`/finance/invoices/${result.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not convert quotation.");
    } finally {
      setBusy(false);
    }
  };

  const emailSubject = `Quotation ${quotation.quotation_number} from ${org.name || activeOrg?.name || "FADS"}`;
  const emailBody = [
    `Hi ${quotation.customer_name || "there"},`,
    "",
    `Your quotation ${quotation.quotation_number} is ready.`,
    `Total: ${formatMoney(quotation.total, quotation.currency)}`,
    `Valid until: ${quotation.valid_until}`,
    "",
    "Please reply to this email if you would like to proceed or have any questions.",
    "",
    `Regards,`,
    org.name || activeOrg?.name || "FADS",
  ].join("\n");

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <BackToFinance />
        <QuotationStatusBadge status={effectiveStatus} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {quotation.logo_url && (
              <img
                src={quotation.logo_url}
                alt=""
                className="h-12 max-w-40 object-contain mb-3"
              />
            )}
            <h1 className="text-xl font-bold text-brand-navy">
              {org.name || activeOrg?.name}
            </h1>
            {org.address && (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {org.address}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {[org.phone, org.email].filter(Boolean).join(" · ")}
            </p>
            {org.tax_id_label && org.tax_id_value && (
              <p className="text-sm text-muted-foreground">
                {org.tax_id_label}: {org.tax_id_value}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Quotation</p>
            <p className="text-lg font-bold text-brand-navy">{quotation.quotation_number}</p>
            <p className="text-sm text-muted-foreground">Issued: {quotation.issue_date}</p>
            <p className="text-sm text-muted-foreground">Valid until: {quotation.valid_until}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prepared For</p>
          <p className="font-semibold text-brand-navy mt-1">{quotation.customer_name}</p>
          {quotation.customer_email && (
            <p className="text-sm text-muted-foreground">{quotation.customer_email}</p>
          )}
          {quotation.customer_address && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {quotation.customer_address}
            </p>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-navy text-white text-left">
                <th className="p-2.5 font-medium rounded-l-lg">Description</th>
                <th className="p-2.5 font-medium text-right">Qty</th>
                <th className="p-2.5 font-medium text-right">Price</th>
                <th className="p-2.5 font-medium text-right">Tax</th>
                <th className="p-2.5 font-medium text-right rounded-r-lg">Total</th>
              </tr>
            </thead>
            <tbody>
              {(quotation.line_items || []).map((line, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="p-2.5">{line.description}</td>
                  <td className="p-2.5 text-right">{line.quantity}</td>
                  <td className="p-2.5 text-right">
                    {formatMoney(line.unit_price, quotation.currency)}
                  </td>
                  <td className="p-2.5 text-right">{Number(line.tax_rate) || 0}%</td>
                  <td className="p-2.5 text-right font-medium">
                    {formatMoney(line.total, quotation.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full sm:w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(quotation.subtotal, quotation.currency)}</span>
            </div>
            {Number(quotation.discount_total) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatMoney(quotation.discount_total, quotation.currency)}</span>
              </div>
            )}
            {Number(quotation.tax_total) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{org.tax_label || "Tax"}</span>
                <span>{formatMoney(quotation.tax_total, quotation.currency)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-border font-bold text-brand-navy">
              <span>Total</span>
              <span>{formatMoney(quotation.total, quotation.currency)}</span>
            </div>
          </div>
        </div>

        {quotation.notes && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="text-sm mt-1 whitespace-pre-line">{quotation.notes}</p>
          </div>
        )}

        {quotation.terms && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Terms</p>
            <p className="text-sm mt-1 whitespace-pre-line">{quotation.terms}</p>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-brand-mint/40 border border-brand-teal/20 p-3 text-xs text-brand-navy">
          This quotation is not a sale, invoice or payment request. It does not affect Sales, money owed, money received or stock.
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-status-bad/30 bg-status-bad/10 p-3 text-sm text-status-bad">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
        {editable && (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => navigate(`/finance/quotations/${quotation.id}/edit`)}
          >
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        )}

        {quotation.status === "draft" && (
          <Button variant="outline" className="h-11" disabled={busy} onClick={() => setStatus("sent")}>
            <Mail className="w-4 h-4" /> Mark Sent
          </Button>
        )}

        {canAccept && (
          <Button className="h-11" disabled={busy} onClick={() => setStatus("accepted")}>
            <CheckCircle2 className="w-4 h-4" /> Mark Accepted
          </Button>
        )}

        {(quotation.status === "draft" || quotation.status === "sent") && (
          <Button
            variant="outline"
            className="h-11 text-status-bad"
            disabled={busy}
            onClick={() => setStatus("declined")}
          >
            <XCircle className="w-4 h-4" /> Mark Declined
          </Button>
        )}

        {effectiveStatus === "expired" && quotation.status !== "expired" && editable && (
          <Button
            variant="outline"
            className="h-11"
            disabled={busy}
            onClick={() => setStatus("expired")}
          >
            <Clock3 className="w-4 h-4" /> Mark Expired
          </Button>
        )}

        <Button
          variant="outline"
          className="h-11 w-full sm:w-auto"
          onClick={() => generateQuotationPDF(quotation)}
        >
          <Download className="w-4 h-4" /> Download PDF
        </Button>

        <Button
          variant="outline"
          className="h-11 w-full sm:w-auto"
          onClick={() => setEmailOpen(true)}
          disabled={!quotation.customer_email}
          title={!quotation.customer_email ? "Add an email address to this customer first" : undefined}
        >
          <Mail className="w-4 h-4" /> Email Quotation
        </Button>

        <Button
          variant="outline"
          className="h-11 w-full sm:w-auto"
          onClick={() => {
            setWhatsAppMessage(whatsAppDraft);
            setWhatsAppOpen(true);
          }}
        >
          <MessageCircle className="w-4 h-4" /> Share via WhatsApp
        </Button>

        {quotation.status === "accepted" && (
          <Button className="h-11 gap-2" onClick={() => setConvertOpen(true)}>
            <ArrowRight className="w-4 h-4" /> Convert to Invoice
          </Button>
        )}

        {quotation.status === "converted" && quotation.converted_invoice_id && (
          <Button
            className="h-11 gap-2"
            onClick={() => navigate(`/finance/invoices/${quotation.converted_invoice_id}`)}
          >
            <FileText className="w-4 h-4" /> View Invoice
          </Button>
        )}
      </div>

      <DocumentEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        organisationId={quotation.organisation_id}
        dataMode={dataMode}
        endpoint="quotations"
        action="email_quotation"
        idField="quotation_id"
        recordId={quotation.id}
        documentLabel="Quotation"
        documentNumber={quotation.quotation_number}
        customerName={quotation.customer_name}
        customerEmail={quotation.customer_email}
        totalLabel={formatMoney(quotation.total, quotation.currency)}
        defaultSubject={emailSubject}
        defaultBody={emailBody}
        onSent={() =>
          toast({
            title: "Quotation email sent",
            description: "The quotation status was not changed automatically.",
          })
        }
      />

      <Dialog open={whatsAppOpen} onOpenChange={setWhatsAppOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-brand-teal" /> Share Quotation via WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-brand-teal/20 bg-brand-mint/40 p-3 text-sm">
              <p className="font-medium text-brand-navy">{quotation.customer_name}</p>
              <p className="text-muted-foreground">{customerPhone || "No customer phone number"}</p>
            </div>
            {!whatsappNumber && (
              <p className="rounded-lg border border-status-warn/30 bg-status-warn/10 p-3 text-sm text-foreground">
                Add or select a customer mobile number with its country code in Finance Contacts before opening WhatsApp. The contact phone is never guessed.
              </p>
            )}
            <div>
              <Label htmlFor="quotation-whatsapp-message">Review message</Label>
              <textarea
                id="quotation-whatsapp-message"
                className="w-full rounded-md border border-input bg-background p-3 text-sm min-h-48 mt-1.5"
                value={whatsAppMessage}
                onChange={(event) => setWhatsAppMessage(event.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              WhatsApp opens with text only. You send it yourself. To share the PDF, use Download PDF separately and attach it in WhatsApp.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setWhatsAppOpen(false)}>Cancel</Button>
            <Button
              className="h-11 w-full sm:w-auto"
              disabled={!whatsappNumber || !whatsAppMessage.trim()}
              onClick={() => openWhatsAppShare(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsAppMessage.trim())}`)}
            >
              <MessageCircle className="w-4 h-4" /> Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-brand-mint/40 border border-brand-teal/20 p-3 text-sm text-brand-navy">
              FADS will create one <strong>draft invoice</strong> using this accepted quotation.
              You can review and issue the invoice normally afterwards.
            </div>
            <div>
              <Label>Invoice due date</Label>
              <Input
                type="date"
                className="h-11 mt-1.5"
                value={dueDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11" disabled={busy} onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button className="h-11 gap-2" disabled={busy} onClick={convert}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {busy ? "Creating…" : "Create Draft Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
