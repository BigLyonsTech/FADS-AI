import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScanLine, AlertTriangle, Check, X, Camera, Upload, RotateCcw, Sparkles, Plus, CheckCircle2, List } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useFinance } from "@/lib/useFinance";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { PAYMENT_METHODS } from "@/lib/financeConstants";
import AccountDialog from "@/components/finance/AccountDialog";
import FadsRobotLoader from "@/components/FadsRobotLoader";

const RECEIPT_CURRENCIES = [
  { value: "NGN", label: "NGN (₦)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "USD", label: "USD ($)" },
];

// AI Receipt Scanner. Upload or photograph a receipt, extract key fields
// with AI, review/edit on screen, then create a Finance expense transaction.
// Never silently creates records — user confirms everything.
//
// Reuses: receiptScan backend function, finance create_transaction, UploadFile.
// Preserves: Demo/Live separation, existing Finance architecture.
export default function ReceiptScanDialog({ open, onClose, onSaved }) {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const fin = useFinance();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [extraAccounts, setExtraAccounts] = useState([]);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [savedTransactionId, setSavedTransactionId] = useState("");
  const isDemo = dataMode === "demo";
  const validPaymentMethods = PAYMENT_METHODS.map((method) => method.value);

  const normalisePaymentMethod = (value) => {
    const key = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const aliases = {
      credit_card: "card", debit_card: "card", visa: "card", mastercard: "card",
      transfer: "bank_transfer", bank: "bank_transfer", banktransfer: "bank_transfer",
      mobile: "mobile_money", mobilemoney: "mobile_money", check: "cheque",
    };
    const normalised = aliases[key] || key;
    return validPaymentMethods.includes(normalised) ? normalised : "";
  };

  const reset = () => {
    setFile(null);
    setFileUrl("");
    setExtracted(null);
    setError("");
    setCameraError("");
    setAccountId("");
    setExtraAccounts([]);
    setAccountDialogOpen(false);
    setSavedTransactionId("");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  // Real extraction: upload file, call receiptScan backend, show review form.
  const handleFile = async (f) => {
    if (!f) return;
    reset();
    setFile(f);
    setScanning(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);
      const res = await base44.functions.invoke("receiptScan", {
        organisation_id: activeOrg.id,
        file_url,
      });
      const payload = res?.data ?? res;
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.extracted) throw new Error("No data extracted.");
      const paymentMethod = normalisePaymentMethod(payload.extracted.payment_method);
      const defaultAccount = fin.accounts.find((account) =>
        account.account_type === "cash" || account.account_type === "bank"
      ) || fin.accounts[0];
      setAccountId(defaultAccount?.id || "");
      setExtracted({
        ...payload.extracted,
        payment_method: paymentMethod,
        _missing: [
          ...(payload.extracted._missing || []),
          ...(!paymentMethod ? ["payment_method"] : []),
        ],
        _low_confidence: payload.extracted._low_confidence || !paymentMethod,
      });
    } catch (e) {
      setError(e.message || "I couldn't read everything on this receipt. You can enter or correct the details below.");
      // Still show the review form with empty fields so the user can enter manually
      setExtracted({
        supplier: "", date: "", total_amount: "", tax_amount: "",
        currency: activeOrg?.currency || "", receipt_number: "",
        payment_method: "card", description: "", category_id: "",
        _low_confidence: true,
      });
    } finally {
      setScanning(false);
    }
  };

  // Demo extraction: populate with safe sample data, no backend call, no Live record.
  const handleDemoSample = () => {
    reset();
    setScanning(true);
    setError("");
    setTimeout(() => {
      const defaultAccount = fin.accounts.find((account) =>
        account.account_type === "cash" || account.account_type === "bank"
      ) || fin.accounts[0];
      setAccountId(defaultAccount?.id || "");
      setExtracted({
        supplier: "Demo Office Supplies",
        date: new Date().toISOString().slice(0, 10),
        total_amount: "45.99",
        tax_amount: "8.50",
        currency: activeOrg?.currency || "EUR",
        receipt_number: "DEMO-001",
        payment_method: "card",
        description: "Demo receipt — stationery purchase",
        category_id: "",
        _low_confidence: false,
        _demo: true,
      });
      setScanning(false);
    }, 800);
  };

  // If the camera input change fires but no file was selected (user cancelled
  // or camera unavailable), show a helpful message.
  const onCameraChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setCameraError("Camera isn't available here. You can upload a receipt instead.");
      return;
    }
    handleFile(f);
  };

  const expenseCategories = (fin.categories || []).filter((c) => c.kind === "expense");
  const availableAccounts = [...fin.accounts, ...extraAccounts].filter(
    (account, index, all) =>
      account.organisation_id === activeOrg?.id &&
      account.data_mode === dataMode &&
      all.findIndex((candidate) => candidate.id === account.id) === index
  );

  const confirm = async () => {
    if (!extracted || saving) return;
    setSaving(true);
    setError("");
    try {
      const account = availableAccounts.find((candidate) => candidate.id === accountId);
      if (!account) {
        setError(`Choose an available ${dataMode === "demo" ? "Demo" : "Live"} Finance account before saving.`);
        setSaving(false);
        return;
      }
      const amount = Number(extracted.total_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter a valid total amount before confirming.");
        setSaving(false);
        return;
      }
      const transactionDate = String(extracted.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
        setError("Enter the receipt date in YYYY-MM-DD format before confirming.");
        setSaving(false);
        return;
      }
      const paymentMethod = normalisePaymentMethod(extracted.payment_method);
      if (!paymentMethod) {
        setError("Select a valid payment method before confirming.");
        setSaving(false);
        return;
      }
      const contact = (fin.contacts || []).find(
        (c) => (c.name || "").toLowerCase() === (extracted.supplier || "").toLowerCase()
      );

      // Demo mode: don't create a Live financial record. Just close and notify.
      if (isDemo && extracted._demo) {
        setSaving(false);
        if (onSaved) onSaved();
        close();
        return;
      }

      const response = await base44.functions.invoke("finance", {
        action: "create_transaction",
        organisation_id: activeOrg.id,
        data_mode: dataMode,
        direction: "out",
        account_id: account.id,
        category_id: extracted.category_id || null,
        contact_id: contact?.id || null,
        amount,
        currency: extracted.currency || activeOrg.currency,
        date: transactionDate,
        description: extracted.description || extracted.supplier || "Scanned receipt",
        payment_method: paymentMethod,
        receipt_file_url: fileUrl,
        reference: extracted.receipt_number || "",
      });
      const result = response?.data ?? response;
      if (!result?.id) throw new Error("Receipt saved, but the new transaction could not be opened.");
      if (onSaved) await onSaved(result.id);
      setSavedTransactionId(result.id);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to create transaction.");
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, opts = {}) => (
    <div key={key}>
      <Label className="mb-1 block text-xs">{label}</Label>
      <Input
        className={`h-9 text-sm ${extracted?._missing?.includes(key) ? "border-amber-500 ring-1 ring-amber-500/30" : ""}`}
        aria-invalid={extracted?._missing?.includes(key) || undefined}
        value={extracted?.[key] ?? ""}
        onChange={(e) => setExtracted({ ...extracted, [key]: e.target.value })}
        {...opts}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-brand-teal" /> Scan a receipt
          </DialogTitle>
          <DialogDescription>
            Photograph or upload a receipt and FADS will extract the details for your review.
          </DialogDescription>
        </DialogHeader>

        {!extracted && !savedTransactionId && (
          <div className="space-y-3">
            {/* Demo badge */}
            {isDemo && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-brand-teal/5 border border-brand-teal/20 text-xs">
                <Badge variant="outline" className="bg-brand-teal/10 text-brand-teal border-brand-teal/30">Demo</Badge>
                <span className="text-muted-foreground">You're in Demo mode. Try a sample receipt — no Live data will be changed.</span>
              </div>
            )}

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3">
              <Camera className="w-8 h-8 text-muted-foreground mx-auto" />
              {!scanning && (
                <p className="text-sm text-muted-foreground">
                  Take a photo or upload a receipt to begin.
                </p>
              )}

              {/* File inputs — label-associated and sr-only (NOT display:none) so
                  the native label→input trigger works in mobile/web wrappers,
                  where programmatic .click() on a hidden file input is blocked. */}
              <input
                ref={cameraRef}
                id="receipt-camera"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={onCameraChange}
              />
              <input
                ref={fileRef}
                id="receipt-upload"
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              {scanning ? (
                <FadsRobotLoader compact message="FADS is reading your receipt…" />
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild className="h-12 gap-1.5">
                    <label htmlFor="receipt-camera">
                      <Camera className="w-5 h-5" /> Take Photo
                    </label>
                  </Button>
                  <Button asChild variant="outline" className="h-11 gap-1.5">
                    <label htmlFor="receipt-upload">
                      <Upload className="w-4 h-4" /> Upload Receipt
                    </label>
                  </Button>
                  {isDemo && (
                    <Button
                      variant="ghost"
                      className="h-10 gap-1.5 text-brand-teal"
                      onClick={handleDemoSample}
                    >
                      <Sparkles className="w-4 h-4" /> Try a sample receipt
                    </Button>
                  )}
                </div>
              )}
              {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
            </div>

            {cameraError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p>{cameraError}</p>
                  <p className="text-xs mt-0.5">Use <strong>Upload Receipt</strong> to select an image from your device.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}
          </div>
        )}

        {extracted && !savedTransactionId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <Check className="w-3 h-3 text-status-ok" /> Review Receipt
              </Badge>
              {extracted._demo && (
                <Badge variant="outline" className="text-xs bg-brand-teal/10 text-brand-teal border-brand-teal/30">Demo</Badge>
              )}
              {extracted._low_confidence && !extracted._demo && (
                <Badge variant="outline" className="text-xs text-status-warn border-status-warn/30 gap-1">
                  <AlertTriangle className="w-3 h-3" /> Check details
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {extracted._demo
                ? "This is sample data for demonstration. No Live financial record will be created."
                : extracted._low_confidence
                ? "FADS read most of this receipt. Please check the highlighted fields and correct anything needed."
                : "FADS extracted the receipt details. Please review them before saving."}
            </p>

            {field("supplier", "Supplier / vendor")}
            {field("date", "Date", { type: "date" })}
            <div className="grid grid-cols-2 gap-2">
              {field("total_amount", "Total amount", { type: "number" })}
              {field("tax_amount", "Tax / VAT amount", { type: "number" })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field("receipt_number", "Receipt / invoice no.")}
              <div>
                <Label className="mb-1 block text-xs">Currency</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={extracted.currency || activeOrg?.currency || ""}
                  onChange={(e) => setExtracted({
                    ...extracted,
                    currency: e.target.value,
                    _currency_source: "user",
                  })}
                >
                  {RECEIPT_CURRENCIES.map((currency) => (
                    <option key={currency.value} value={currency.value}>{currency.label}</option>
                  ))}
                </select>
                {extracted._currency_source === "organisation_default" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Currency was not explicit on the receipt, so your organisation default is proposed. Please check it.
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Paid from</Label>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">— Select Finance account —</option>
                  {availableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({String(account.account_type || "account").replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 gap-1"
                  onClick={() => setAccountDialogOpen(true)}
                >
                  <Plus className="w-4 h-4" /> New
                </Button>
              </div>
              {availableAccounts.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No {dataMode === "demo" ? "Demo" : "Live"} Finance account exists for this organisation yet. Add one to keep this receipt in the correct workspace.
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-xs">Expense category</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={extracted.category_id || ""}
                onChange={(e) => setExtracted({ ...extracted, category_id: e.target.value })}
              >
                <option value="">— Select category —</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Payment method</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={extracted.payment_method || ""}
                aria-invalid={extracted?._missing?.includes("payment_method") || undefined}
                onChange={(e) => setExtracted({
                  ...extracted,
                  payment_method: e.target.value,
                  _missing: (extracted._missing || []).filter((key) => key !== "payment_method"),
                })}
              >
                <option value="">— Select payment method —</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>

            {field("description", "Description (optional)")}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {extracted._low_confidence && !extracted._demo && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Some fields could not be read confidently. Please check the details before saving.
              </div>
            )}

            <p className="text-xs text-muted-foreground">Review and edit the details below before saving.</p>
            <div className="flex flex-col gap-2 pt-1 sticky bottom-0 bg-background z-10">
                            <div className="flex gap-2">
                <Button variant="outline" className="h-11 gap-1" onClick={() => { setExtracted(null); reset(); }}>
                  <RotateCcw className="w-4 h-4" /> Back
                </Button>
                <Button variant="outline" className="h-11 flex-1 gap-1" onClick={close}>
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
              <Button className="h-11 gap-1" onClick={confirm} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {extracted._demo ? "Finish Demo" : "Confirm & Save"}
              </Button>
            </div>
          </div>
        )}

        {savedTransactionId && (
          <div className="space-y-5 py-2">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-status-ok/15 text-status-ok flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-brand-navy">Receipt saved</h3>
              <p className="text-sm text-muted-foreground">
                The expense was added once to this organisation&apos;s {dataMode === "demo" ? "Demo" : "Live"} Finance records.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-12 gap-2"
                onClick={() => {
                  const id = savedTransactionId;
                  close();
                  navigate(`/finance/transactions/${id}`);
                }}
              >
                <List className="w-4 h-4" /> View Transaction
              </Button>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => {
                  close();
                  navigate("/finance");
                }}
              >
                Back to Finance
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {accountDialogOpen && (
        <AccountDialog
          open
          orgId={activeOrg.id}
          onClose={() => setAccountDialogOpen(false)}
          onSaved={(newId, account) => {
            if (newId && account) {
              setExtraAccounts((current) => [...current, account]);
              setAccountId(newId);
            }
            setAccountDialogOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}