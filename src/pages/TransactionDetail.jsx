import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useFinance } from "@/lib/useFinance";
import { financeWording, canManageFinance, formatMoney } from "@/lib/financeWording";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Paperclip } from "lucide-react";
import TransactionDialog from "@/components/finance/TransactionDialog";
import ConfirmDialog from "@/components/finance/ConfirmDialog";
import BackToFinance from "@/components/finance/BackToFinance";
import { base44 } from "@/api/base44Client";

const STATUS_STYLE = {
  cleared: "bg-status-ok/15 text-status-ok",
  pending: "bg-status-warn/15 text-status-warn",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const PAYMENT_LABEL = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  other: "Other",
};

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-brand-navy text-right break-words">{value || "—"}</span>
    </div>
  );
}

export default function TransactionDetail() {
  const { id } = useParams();
  const { activeOrg, activeRole } = useWorkspace();
  const fin = useFinance();
  const w = financeWording(activeOrg?.type);
  const canManage = canManageFinance(activeRole);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const t = fin.transactions.find((x) => x.id === id);
  const accountName = (aid) => fin.accounts.find((a) => a.id === aid)?.name || "—";
  const categoryName = (cid) => fin.categories.find((c) => c.id === cid)?.name || "—";
  const contactName = (cid) => fin.contacts.find((c) => c.id === cid)?.name || "—";

  const remove = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("finance", {
        action: "delete_transaction",
        organisation_id: activeOrg.id,
        transaction_id: t.id,
      });
      await fin.reload();
      navigate("/finance/transactions");
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  if (fin.loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!t) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <BackToFinance />
        <p className="text-sm text-muted-foreground py-10 text-center">Transaction not found.</p>
      </div>
    );
  }

  const taxText = formatMoney(t.tax_amount, t.currency) + " (" + (t.tax_rate || 0) + "%)";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackToFinance />
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${t.direction === "in" ? "bg-status-ok/15 text-status-ok" : "bg-status-bad/15 text-status-bad"}`}>
              {t.direction === "in" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-navy">
                {t.description || t.reference || (t.direction === "in" ? w.moneyIn : w.moneyOut)}
              </h1>
              <p className="text-xs text-muted-foreground">{t.date} · {t.direction === "in" ? w.moneyIn : w.moneyOut}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${t.direction === "in" ? "text-status-ok" : "text-brand-navy"}`}>
              {t.direction === "in" ? "+" : "−"}{formatMoney(t.amount, t.currency)}
            </p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status] || ""}`}>
              {t.status}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <Field label="Account" value={accountName(t.account_id)} />
        <Field label="Category" value={categoryName(t.category_id)} />
        <Field label={t.direction === "in" ? w.contactIn : w.contactOut} value={contactName(t.contact_id)} />
        <Field label="Payment method" value={PAYMENT_LABEL[t.payment_method] || t.payment_method} />
        <Field label="Reference" value={t.reference} />
        <Field label="Date" value={t.date} />
        <Field label="Tax" value={taxText} />
        <Field label="Recurring" value={t.is_recurring ? "Yes" + (t.recurring_frequency ? " · " + t.recurring_frequency : "") : "No"} />
        {t.internal_notes && (
          <div className="pt-3">
            <p className="text-xs text-muted-foreground mb-1">Internal notes</p>
            <p className="text-sm text-brand-navy whitespace-pre-wrap">{t.internal_notes}</p>
          </div>
        )}
      </div>

      {(t.receipt_file_url || (t.attachment_urls && t.attachment_urls.length > 0)) && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-medium text-brand-navy mb-2">Files</h2>
          {t.receipt_file_url && (
            <a href={t.receipt_file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-teal hover:underline py-1">
              <Paperclip className="w-4 h-4" /> Receipt
            </a>
          )}
          {t.attachment_urls?.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-teal hover:underline py-1">
              <Paperclip className="w-4 h-4" /> Attachment {i + 1}
            </a>
          ))}
        </div>
      )}

      {canManage && (
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 flex-1" onClick={() => setDialog({ type: "txn", record: t })}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button variant="outline" className="h-11 flex-1 text-status-bad" onClick={() => setConfirm(true)}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      )}

      {dialog?.type === "txn" && (
        <TransactionDialog
          open
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); fin.reload(); }}
          direction={t.direction}
          accounts={fin.accounts}
          categories={fin.categories}
          contacts={fin.contacts}
          record={t}
          orgId={activeOrg.id}
          wording={w}
          currency={activeOrg.currency}
        />
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        title="Delete transaction?"
        description="This permanently removes the record. This action cannot be undone."
        busy={busy}
      />
    </div>
  );
}