import React from "react";
import { useParams } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInvoices } from "@/lib/useInvoices";
import { formatMoney } from "@/lib/financeWording";
import { receiptKindLabel, paymentMethodLabel } from "@/lib/invoiceUtils";
import BackToFinance from "@/components/finance/BackToFinance";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { generateReceiptPDF } from "@/lib/invoicePdf";

export default function ReceiptDetail() {
  const { id } = useParams();
  const { activeOrg } = useWorkspace();
  const inv = useInvoices();

  const receipt = inv.receipts.find((r) => r.id === id);

  if (inv.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!receipt) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Receipt not found.</p>
        </div>
      </div>
    );
  }

  const org = receipt.org_snapshot || {};

  return (
    <div className="max-w-md mx-auto space-y-4 print:max-w-none print:mx-0">
      <div className="print:hidden">
        <BackToFinance />
      </div>

      {/* Printable receipt */}
      <div className="bg-card rounded-2xl border border-border p-6 print:border-0 print:p-0 print:rounded-none">
        <div className="text-center">
          <h1 className="text-lg font-bold text-brand-navy">{org.name || activeOrg?.name}</h1>
          {org.address && <p className="text-sm text-muted-foreground whitespace-pre-line">{org.address}</p>}
          <p className="text-sm text-muted-foreground">{[org.phone, org.email].filter(Boolean).join(" · ")}</p>
        </div>

        <div className="mt-5 pt-4 border-t border-border text-center">
          <p className="text-xl font-bold text-brand-navy tracking-wide">RECEIPT</p>
          <p className="text-sm text-muted-foreground mt-1">{receipt.receipt_number}</p>
        </div>

        <div className="mt-5 space-y-2.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium text-brand-navy">{receipt.date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Received from</span><span className="font-medium text-brand-navy">{receipt.payer_name || "—"}</span></div>
          {receipt.payer_email && (
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium text-brand-navy">{receipt.payer_email}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Payment method</span><span className="font-medium text-brand-navy">{paymentMethodLabel(receipt.payment_method)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium text-brand-navy">{receiptKindLabel(receipt.kind)}</span></div>
          {receipt.reference && (
            <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-medium text-brand-navy">{receipt.reference}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="font-medium text-brand-navy text-right">{receipt.description}</span></div>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount Received</span>
            <span className="text-2xl font-bold text-status-ok">{formatMoney(receipt.amount, receipt.currency)}</span>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">Thank you for your payment.</p>
      </div>

      <div className="flex gap-2 print:hidden">
        <Button variant="outline" className="h-11 flex-1" onClick={() => generateReceiptPDF(receipt)}>
          <Download className="w-4 h-4" /> Download PDF
        </Button>
        <Button variant="outline" className="h-11 flex-1" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>
    </div>
  );
}