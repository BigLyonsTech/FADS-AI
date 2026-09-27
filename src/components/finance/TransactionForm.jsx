import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";
import { Loader2, Upload, X, Paperclip, Plus } from "lucide-react";
import AccountDialog from "@/components/finance/AccountDialog";
import { useFinanceDictation } from "@/lib/useFinanceDictation";
import VoiceDictationPanel from "@/components/shared/VoiceDictationPanel";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "cleared", label: "Cleared" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

export default function TransactionForm({
  direction: dirPreset,
  accounts,
  categories,
  contacts,
  orgId,
  wording,
  currency,
  record,
  onSaved,
  onCancel,
  submitLabel,
  autoDictate,
}) {
  const isEdit = !!record;
  const { dataMode } = useDataMode();
  const [direction, setDirection] = useState("in");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [contactId, setContactId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [internalNotes, setInternalNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("");
  const [status, setStatus] = useState("cleared");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extraAccounts, setExtraAccounts] = useState([]);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  // Voice dictation: speak a transaction, FADS populates the fields below for
  // the user to review and save. Nothing is saved automatically — the existing
  // submit button still requires a manual tap.
  const dictation = useFinanceDictation({
    autoStart: autoDictate,
    onParsed: (t) => {
      if (t.direction) setDirection(t.direction);
      if (t.amount) setAmount(String(t.amount));
      if (t.description) setDescription(t.description);
      if (t.date) setDate(t.date);
      if (t.payment_method) setPaymentMethod(t.payment_method);
      // Use the canonical account id matched server-side. If FADS could not
      // confidently determine an account, leave Account unselected (empty) so
      // the user explicitly chooses one — never fall back to a name string.
      if (t.account_id) setAccountId(t.account_id);
      if (t.contact_id) setContactId(t.contact_id);
      if (t.category_id) setCategoryId(t.category_id);
      if (t.reference) setReference(t.reference);
      if (t.notes) setInternalNotes(t.notes);
    },
  });

  // Accounts available in the selector: the parent's accounts plus any
  // accounts created inline during this transaction (so the user never has
  // to leave and lose their entered data).
  const allAccounts = [...accounts, ...extraAccounts];

  useEffect(() => {
    setError("");
    if (record) {
      setDirection(record.direction);
      setAccountId(record.account_id || "");
      setCategoryId(record.category_id || "");
      setContactId(record.contact_id || "");
      setAmount(String(record.amount ?? ""));
      setDate(record.date || new Date().toISOString().slice(0, 10));
      setReference(record.reference || "");
      setDescription(record.description || "");
      setPaymentMethod(record.payment_method || "cash");
      setInternalNotes(record.internal_notes || "");
      setIsRecurring(!!record.is_recurring);
      setRecurringFrequency(record.recurring_frequency || "");
      setStatus(record.status || "cleared");
      setReceiptUrl(record.receipt_file_url || "");
      setAttachments(Array.isArray(record.attachment_urls) ? record.attachment_urls : []);
    } else {
      setDirection(dirPreset || "in");
      // For Speak a Record, leave Account unselected unless the dictation
      // confidently matched one — the user must choose a valid account. For
      // manual entry, default to the first account for convenience.
      setAccountId(autoDictate ? "" : (accounts[0]?.id || ""));
      setCategoryId("");
      setContactId("");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setReference("");
      setDescription("");
      setPaymentMethod("cash");
      setInternalNotes("");
      setIsRecurring(false);
      setRecurringFrequency("");
      setStatus("cleared");
      setReceiptUrl("");
      setAttachments([]);
    }
  }, [record, dirPreset, accounts, autoDictate]);

  const filteredCategories = categories.filter(
    (c) => c.kind === (direction === "in" ? "income" : "expense")
  );
  const filteredContacts = contacts.filter((c) =>
    direction === "out" ? c.kind === "supplier" : c.kind !== "supplier"
  );

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch {
      setError("Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) setReceiptUrl(url);
  };

  const handleAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) setAttachments((prev) => [...prev, url]);
  };

  const submit = async () => {
    setError("");
    if (!accountId || !amount || !date) {
      setError("Account, amount and date are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        organisation_id: orgId,
        data_mode: dataMode,
        direction,
        account_id: accountId,
        category_id: categoryId || null,
        contact_id: contactId || null,
        amount: Number(amount),
        date,
        reference,
        description,
        payment_method: paymentMethod,
        internal_notes: internalNotes,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : null,
        receipt_file_url: receiptUrl || null,
        attachment_urls: attachments,
        status,
      };
      if (isEdit) {
        await base44.functions.invoke("finance", {
          action: "update_transaction",
          transaction_id: record.id,
          ...payload,
        });
      } else {
        await base44.functions.invoke("finance", {
          action: "create_transaction",
          ...payload,
        });
      }
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {dictation.micSupported && !isEdit && (
        <VoiceDictationPanel
          dictation={dictation}
          speakLabel="Speak record"
          preparingMessage="FADS is checking your numbers…"
          example='e.g. “Expense, €42 fuel, paid by card today”'
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <ResponsiveSelect
            value={direction}
            onValueChange={setDirection}
            placeholder="Select type"
            triggerClassName="h-11"
            options={[
              { value: "in", label: wording?.moneyIn || "Money In" },
              { value: "out", label: wording?.moneyOut || "Money Out" },
            ]}
          />
        </div>
        <div>
          <Label>Account</Label>
          <div className="flex gap-2">
            <ResponsiveSelect
              value={accountId}
              onValueChange={setAccountId}
              placeholder="Select account"
              triggerClassName="h-11 flex-1"
              options={allAccounts.map((a) => ({ value: a.id, label: a.name }))}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 gap-1"
              onClick={() => setAccountDialogOpen(true)}
              title="Create a new account without leaving this transaction"
            >
              <Plus className="w-4 h-4" /> New
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Amount ({currency})</Label>
          <Input
            className="h-11"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <Label>Date</Label>
          <Input
            className="h-11"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <ResponsiveSelect
            value={categoryId}
            onValueChange={setCategoryId}
            placeholder="Optional"
            triggerClassName="h-11"
            options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div>
          <Label>{direction === "in" ? wording?.contactIn : wording?.contactOut}</Label>
          <ResponsiveSelect
            value={contactId}
            onValueChange={setContactId}
            placeholder="Optional"
            triggerClassName="h-11"
            options={filteredContacts.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Payment method</Label>
          <ResponsiveSelect
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            placeholder="Select method"
            triggerClassName="h-11"
            options={PAYMENT_METHODS}
          />
        </div>
        <div>
          <Label>Status</Label>
          <ResponsiveSelect
            value={status}
            onValueChange={setStatus}
            placeholder="Select status"
            triggerClassName="h-11"
            options={STATUS_OPTIONS}
          />
        </div>
      </div>
      <div>
        <Label>Reference number</Label>
        <Input
          className="h-11"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Invoice / receipt no."
        />
      </div>
      <div>
        <Label>Description</Label>
        <Input
          className="h-11"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <Label>Internal notes</Label>
        <Textarea
          rows={2}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Private staff notes (not shown on receipts)"
        />
      </div>
      <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Checkbox
            id="is-recurring"
            checked={isRecurring}
            onCheckedChange={(v) => setIsRecurring(!!v)}
          />
          <Label htmlFor="is-recurring" className="mb-0 cursor-pointer">
            Recurring entry
          </Label>
        </div>
        {isRecurring && (
          <div>
            <Label>Frequency (indicator only — not automated)</Label>
            <Input
              className="h-11"
              value={recurringFrequency}
              onChange={(e) => setRecurringFrequency(e.target.value)}
              placeholder="e.g. Weekly, Monthly"
            />
          </div>
        )}
      </div>
      <div>
        <Label>Receipt / supporting file</Label>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => document.getElementById("receipt-upload")?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {receiptUrl ? "Replace receipt" : "Upload receipt"}
          </Button>
          <input id="receipt-upload" type="file" className="hidden" onChange={handleReceipt} />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => document.getElementById("attachment-upload")?.click()}
            disabled={uploading}
          >
            <Paperclip className="w-4 h-4" /> Add attachment
          </Button>
          <input id="attachment-upload" type="file" className="hidden" onChange={handleAttachment} />
        </div>
        {receiptUrl && (
          <div className="mt-2 flex items-center gap-2 text-xs text-status-ok">
            <Paperclip className="w-3 h-3" />
            <a href={receiptUrl} target="_blank" rel="noreferrer" className="underline truncate">
              Receipt
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setReceiptUrl("")}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((url, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="w-3 h-3" />
                <a href={url} target="_blank" rel="noreferrer" className="underline truncate">
                  Attachment {i + 1}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button variant="outline" className="h-11 flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button className="h-11 flex-1" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel || (isEdit ? "Save" : "Add")}
        </Button>
      </div>

      {accountDialogOpen && (
        <AccountDialog
          open
          onClose={() => setAccountDialogOpen(false)}
          orgId={orgId}
          onSaved={(newId, rec) => {
            if (newId && rec) {
              setExtraAccounts((prev) => [...prev, rec]);
              setAccountId(newId);
            }
            setAccountDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}