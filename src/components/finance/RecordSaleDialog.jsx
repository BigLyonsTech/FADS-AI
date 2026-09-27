import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { PAYMENT_METHODS } from "@/lib/invoiceUtils";
import { formatMoney } from "@/lib/financeWording";
import { useToast } from "@/components/ui/use-toast";
import { useDataMode } from "@/lib/useDataMode";
import { useFinanceDictation } from "@/lib/useFinanceDictation";
import VoiceDictationPanel from "@/components/shared/VoiceDictationPanel";
import AccountDialog from "@/components/finance/AccountDialog";
import { Loader2, Mic, ReceiptText } from "lucide-react";

const normalise = (value) => String(value || "").trim().toLowerCase();
const MONEY_ACCOUNT_TYPES = new Set(["bank", "cash", "savings", "mobile_money", "petty_cash"]);

function newSaleRequestKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `sale:${crypto.randomUUID()}`;
  }
  return `sale:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-brand-navy text-right">{value || "—"}</span>
    </div>
  );
}

export default function RecordSaleDialog({
  open,
  onClose,
  onSaved,
  onCreateInvoice,
  onAccountsChanged,
  accounts = [],
  categories = [],
  contacts = [],
  inventoryItems = [],
  orgId,
  currency,
  autoDictate = false,
}) {
  const { dataMode } = useDataMode();
  const { toast } = useToast();
  const [paymentState, setPaymentState] = useState("paid");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [inventoryQuantity, setInventoryQuantity] = useState("1");
  const [contactId, setContactId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [date, setDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [requestKey, setRequestKey] = useState(newSaleRequestKey);
  const [error, setError] = useState("");
  const [setupAccountType, setSetupAccountType] = useState("");
  const [pendingAccountId, setPendingAccountId] = useState("");

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.organisation_id === orgId &&
          normalise(account.data_mode) === normalise(dataMode) &&
          account.is_active === true &&
          normalise(account.account_class) === "asset" &&
          normalise(account.account_category) === "cash & bank" &&
          MONEY_ACCOUNT_TYPES.has(normalise(account.account_type))
      ),
    [accounts, orgId, dataMode]
  );
  const customers = useMemo(
    () => contacts.filter((contact) => contact.kind !== "supplier"),
    [contacts]
  );
  const activeInventoryItems = useMemo(
    () => inventoryItems.filter((item) => item.is_active !== false),
    [inventoryItems]
  );
  const saleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.kind === "income" &&
          ["sales", "service income"].includes(normalise(category.name))
      ),
    [categories]
  );

  const dictation = useFinanceDictation({
    autoStart: open && autoDictate,
    onParsed: (transaction) => {
      if (transaction.direction && transaction.direction !== "in") return;
      if (transaction.amount) setAmount(String(transaction.amount));
      if (transaction.description) setDescription(transaction.description);
      if (transaction.date) setDate(transaction.date);
      if (transaction.payment_method) setPaymentMethod(transaction.payment_method);
      if (
        transaction.account_id &&
        activeAccounts.some((account) => account.id === transaction.account_id)
      ) {
        setAccountId(transaction.account_id);
      }
      if (
        transaction.contact_id &&
        customers.some((contact) => contact.id === transaction.contact_id)
      ) {
        setContactId(transaction.contact_id);
      }
      if (
        transaction.category_id &&
        saleCategories.some((category) => category.id === transaction.category_id)
      ) {
        setCategoryId(transaction.category_id);
      }
    },
  });

  useEffect(() => {
    if (!open) return;
    setPaymentState("paid");
    setAmount("");
    setDescription("");
    setInventoryItemId("");
    setInventoryQuantity("1");
    setContactId("");
    setPaymentMethod("");
    setDate(autoDictate ? "" : new Date().toISOString().slice(0, 10));
    setAccountId("");
    setCategoryId("");
    setSaving(false);
    setReviewing(false);
    setSetupAccountType("");
    setPendingAccountId("");
    setRequestKey(newSaleRequestKey());
    setError("");
  }, [open, autoDictate, orgId, dataMode]);

  // Account and category choices are always revalidated against the currently
  // loaded organisation + mode. This clears Demo/other-workspace IDs without
  // discarding the rest of an in-progress sale when Finance data reloads.
  useEffect(() => {
    if (!open) return;
    setAccountId((current) => {
      if (pendingAccountId && activeAccounts.some((account) => account.id === pendingAccountId)) {
        setPendingAccountId("");
        return pendingAccountId;
      }
      if (activeAccounts.some((account) => account.id === current)) return current;
      return activeAccounts.length === 1 ? activeAccounts[0].id : "";
    });
  }, [open, orgId, dataMode, activeAccounts, pendingAccountId]);

  useEffect(() => {
    if (!open) return;
    setCategoryId((current) => {
      if (saleCategories.some((category) => category.id === current)) return current;
      const preferred =
        saleCategories.find((category) => normalise(category.name) === "sales") ||
        saleCategories[0];
      return preferred?.id || "";
    });
  }, [open, orgId, dataMode, saleCategories]);

  const choosePaymentMethod = (value) => {
    setPaymentMethod(value);
    const preferredTypes =
      value === "cash"
        ? ["cash", "petty_cash"]
        : value === "mobile_money"
          ? ["mobile_money"]
          : ["bank", "savings"];
    const preferred = activeAccounts.find((account) =>
      preferredTypes.includes(account.account_type)
    );
    if (preferred) setAccountId(preferred.id);
  };

  const validate = () => {
    const saleAmount = Number(amount);
    const linkedQuantity = Number(inventoryQuantity);
    if (!Number.isFinite(saleAmount) || saleAmount <= 0) return "Enter how much the sale was.";
    if (!description.trim()) return "Tell FADS what the sale was for.";
    if (inventoryItemId && (!Number.isFinite(linkedQuantity) || linkedQuantity <= 0)) {
      return "Enter how many of the selected inventory item were sold.";
    }
    if (!paymentMethod) return "Choose how you were paid.";
    if (!date) return "Choose the sale date.";
    if (!accountId) return "Choose where the money was received.";
    if (!categoryId) return "A Sales or Service Income category is needed before this sale can be saved.";
    return "";
  };

  const reviewSale = (event) => {
    event.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (!validationError) setReviewing(true);
  };

  const confirmSave = async () => {
    const validationError = validate();
    setError(validationError);
    if (validationError || saving) return;

    const saleAmount = Number(amount);
    const linkedQuantity = Number(inventoryQuantity);
    setSaving(true);
    try {
      const response = await base44.functions.invoke("finance", {
        action: "create_transaction",
        organisation_id: orgId,
        data_mode: dataMode,
        direction: "in",
        account_id: accountId,
        category_id: categoryId,
        contact_id: contactId || null,
        amount: saleAmount,
        date,
        description: description.trim(),
        inventory_item_id: inventoryItemId || null,
        inventory_quantity: inventoryItemId ? linkedQuantity : null,
        payment_method: paymentMethod,
        status: "cleared",
        idempotency_key: requestKey,
      });
      await onSaved?.(response?.data || response);
      toast({
        title: "Sale recorded 🎉",
        description: inventoryItemId
          ? "Finance, reports and stock have been updated."
          : "Finance and reports have been updated.",
      });
      onClose();
    } catch (err) {
      const response = err.response?.data || err.data || {};
      const message = response.error || err.message || "Couldn't record the sale.";
      if (
        response.code === "INVALID_FINANCE_ACCOUNT" ||
        /Finance account is not available in the active workspace and data mode/i.test(message)
      ) {
        setAccountId("");
        setReviewing(false);
        setError(
          `That account is no longer available for this ${dataMode === "demo" ? "Demo" : "Live"} workspace. Choose or set up a Cash or Bank account, then try again.`
        );
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a Sale</DialogTitle>
          <DialogDescription>
            Keep it simple. FADS will use your existing Finance records.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={paymentState === "paid" ? "default" : "outline"}
            className="h-11"
            onClick={() => setPaymentState("paid")}
          >
            Paid now
          </Button>
          <Button
            type="button"
            variant={paymentState === "owed" ? "default" : "outline"}
            className="h-11"
            onClick={() => setPaymentState("owed")}
          >
            Money still owed
          </Button>
        </div>

        {paymentState === "owed" ? (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <div>
              <p className="font-semibold text-brand-navy">Use an invoice for this sale</p>
              <p className="text-sm text-muted-foreground mt-1">
                This keeps the full sale and the amount still owed together, so it is not counted twice when payment arrives later.
              </p>
            </div>
            <Button
              className="w-full h-11"
              onClick={() => {
                onClose();
                onCreateInvoice?.();
              }}
            >
              <ReceiptText className="w-4 h-4" /> Create Invoice
            </Button>
          </div>
        ) : reviewing ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <h3 className="font-semibold text-brand-navy">Review your sale</h3>
              <ReviewRow label="Product / service" value={description.trim()} />
              {inventoryItemId && (
                <ReviewRow
                  label="Inventory"
                  value={`${activeInventoryItems.find((item) => item.id === inventoryItemId)?.name || "Selected item"} × ${inventoryQuantity}`}
                />
              )}
              <ReviewRow label="Amount" value={formatMoney(Number(amount), currency)} />
              <ReviewRow
                label="Payment"
                value={PAYMENT_METHODS.find((method) => method.value === paymentMethod)?.label || paymentMethod}
              />
              <ReviewRow
                label="Customer"
                value={customers.find((contact) => contact.id === contactId)?.name || "No customer selected"}
              />
              <ReviewRow
                label="Money received into"
                value={activeAccounts.find((account) => account.id === accountId)?.name || "Not selected"}
              />
              <ReviewRow label="Date" value={date} />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setReviewing(false)} disabled={saving}>
                Change something
              </Button>
              <Button type="button" className="h-11 flex-1" onClick={confirmSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Confirm & Save"}
              </Button>
            </div>
          </div>
        ) : activeAccounts.length === 0 ? (
          <div className="space-y-4 rounded-xl border border-status-warn/30 bg-status-warn/10 p-4">
            <div>
              <p className="font-semibold text-brand-navy">Before you record your first sale, let’s set up where the money was received.</p>
              <p className="text-sm text-muted-foreground mt-1">
                This will create a Cash or Bank account for this organisation in {dataMode === "demo" ? "Demo" : "Live"} mode only.
              </p>
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" className="h-11" onClick={() => setSetupAccountType("cash")}>
                Set up Cash
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setSetupAccountType("bank")}>
                Set up Bank Account
              </Button>
            </div>
            <Button type="button" variant="ghost" className="w-full h-11" onClick={onClose}>
              Cancel
            </Button>
          </div>
        ) : saleCategories.length === 0 ? (
          <div className="space-y-4 rounded-xl border border-status-warn/30 bg-status-warn/10 p-4">
            <div>
              <p className="font-semibold text-brand-navy">One quick setup step is needed</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a Sales or Service Income category so FADS can report this correctly.
              </p>
            </div>
            <Button asChild className="w-full h-11" onClick={onClose}>
              <Link to="/finance/categories">Set up my sales category</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={reviewSale} className="space-y-4">
            {dictation.micSupported && (
              <VoiceDictationPanel
                dictation={dictation}
                speakLabel="Tell FADS About a Sale"
                example='e.g. “I sold catering services for ₦75,000 today and the customer paid by bank transfer.”'
              />
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <Label>How much was the sale?</Label>
              <Input
                type="number"
                min="0"
                step="any"
                className="h-11 mt-1.5"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>What was it for?</Label>
              <Input
                className="h-11 mt-1.5"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Catering services"
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
              <div>
                <Label>Inventory item <span className="text-muted-foreground">(optional)</span></Label>
                <ResponsiveSelect
                  value={inventoryItemId}
                  onValueChange={setInventoryItemId}
                  placeholder="Service / no inventory item"
                  triggerClassName="h-11 mt-1.5"
                  options={[
                    { value: "", label: "Service / no inventory item" },
                    ...activeInventoryItems.map((item) => ({
                      value: item.id,
                      label: `${item.name}${item.sku ? ` · ${item.sku}` : ""} · ${Number(item.current_quantity) || 0} in stock`,
                    })),
                  ]}
                />
              </div>

              {inventoryItemId && (
                <div>
                  <Label>Quantity sold</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    className="h-11 mt-1.5"
                    value={inventoryQuantity}
                    onChange={(event) => setInventoryQuantity(event.target.value)}
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Link an item only when this sale used inventory. Confirming the sale reduces its stock once.
              </p>
            </div>

            <div>
              <Label>Customer <span className="text-muted-foreground">(optional)</span></Label>
              <ResponsiveSelect
                value={contactId}
                onValueChange={setContactId}
                placeholder="No customer selected"
                triggerClassName="h-11 mt-1.5"
                options={customers.map((contact) => ({ value: contact.id, label: contact.name }))}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>How were you paid?</Label>
                <ResponsiveSelect
                  value={paymentMethod}
                  onValueChange={choosePaymentMethod}
                  placeholder="Choose method"
                  triggerClassName="h-11 mt-1.5"
                  options={PAYMENT_METHODS}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  className="h-11 mt-1.5"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Money went to</Label>
              <ResponsiveSelect
                value={accountId}
                onValueChange={setAccountId}
                placeholder="Choose account"
                triggerClassName="h-11 mt-1.5"
                options={activeAccounts.map((account) => ({ value: account.id, label: account.name }))}
              />
            </div>

            {saleCategories.length > 1 && (
              <div>
                <Label>What kind of sale was it?</Label>
                <ResponsiveSelect
                  value={categoryId}
                  onValueChange={setCategoryId}
                  placeholder="Choose sale type"
                  triggerClassName="h-11 mt-1.5"
                  options={saleCategories.map((category) => ({ value: category.id, label: category.name }))}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {autoDictate && <Mic className="w-3 h-3 inline mr-1" />}
              Review every field before saving. Voice never creates a financial record automatically.
            </p>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="h-11" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="h-11 flex-1" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Review Sale
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
    {setupAccountType && (
      <AccountDialog
        open
        orgId={orgId}
        initialMoneyAccountType={setupAccountType}
        onClose={() => setSetupAccountType("")}
        onSaved={(newId) => {
          if (newId) setPendingAccountId(newId);
          Promise.resolve(onAccountsChanged?.()).catch((reloadError) => {
            setError(reloadError?.message || "The account was created, but Finance could not refresh. Close and reopen this sale.");
          });
        }}
      />
    )}
    </>
  );
}
