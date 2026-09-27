import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";
import { ACCOUNT_CLASSES, getCategoriesForClass, getCategory } from "@/lib/chartOfAccounts";
import { Loader2, ChevronRight, ChevronLeft, Wallet, Landmark, Scale, TrendingUp, TrendingDown } from "lucide-react";

const CLASS_ICONS = {
  asset: Wallet,
  liability: Landmark,
  equity: Scale,
  income: TrendingUp,
  expense: TrendingDown,
};

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "savings", label: "Savings" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "petty_cash", label: "Petty Cash" },
  { value: "other", label: "Other" },
];

// Guided 3-step account creation: Class → Category → Name & details.
// FADS guides with plain-English explanations and suggestions but never
// makes the accounting decision for the user — they confirm every step.
// onSaved receives the created account id so callers (e.g. TransactionForm)
// can auto-select the new account without losing in-progress work.
export default function AccountDialog({ open, onClose, onSaved, record, orgId, initialMoneyAccountType = "" }) {
  const isEdit = !!record;
  const { dataMode } = useDataMode();
  const [step, setStep] = useState(0); // 0 = class, 1 = category, 2 = details
  const [accountClass, setAccountClass] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("cash");
  const [number, setNumber] = useState("");
  const [opening, setOpening] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    submitInFlightRef.current = false;
    setBusy(false);
    setError("");
    if (record) {
      setAccountClass(record.account_class || "");
      setCategory(record.account_category || "");
      setName(record.name || "");
      setType(record.account_type || "cash");
      setNumber(record.account_number || "");
      setOpening(String(record.opening_balance ?? 0));
      // Editing jumps straight to the details step so existing accounts
      // aren't forced through the guided flow again.
      setStep(record.account_class ? 2 : 2);
    } else if (initialMoneyAccountType === "cash" || initialMoneyAccountType === "bank") {
      setAccountClass("asset");
      setCategory("Cash & Bank");
      setName(initialMoneyAccountType === "cash" ? "Cash" : "Business Bank Account");
      setType(initialMoneyAccountType);
      setNumber("");
      setOpening("0");
      setStep(2);
    } else {
      setAccountClass("");
      setCategory("");
      setName("");
      setType("cash");
      setNumber("");
      setOpening("0");
      setStep(0);
    }
  }, [open, record, initialMoneyAccountType]);

  const categories = useMemo(() => getCategoriesForClass(accountClass), [accountClass]);
  const selectedCategory = useMemo(() => getCategory(accountClass, category), [accountClass, category]);
  const suggestions = selectedCategory?.suggestions || [];
  const accountTypeOptions =
    accountClass === "asset" && category === "Cash & Bank"
      ? ACCOUNT_TYPES
      : ACCOUNT_TYPES.filter((option) => option.value === "other");

  const chooseClass = (cls) => {
    setAccountClass(cls);
    setCategory("");
    setName("");
    setType(getCategoriesForClass(cls)[0]?.defaultType || "other");
    setStep(1);
  };

  const chooseCategory = (cat) => {
    setCategory(cat);
    const c = getCategory(accountClass, cat);
    // A bank/cash account is an Asset. Expense categories such as Utilities
    // and Supplies must never inherit a stale Bank kind from an earlier step.
    const nextType =
      accountClass === "asset" && cat === "Cash & Bank"
        ? (c?.defaultType || "bank")
        : "other";
    setType(nextType);
    setName("");
    setStep(2);
  };

  const pickSuggestion = (s) => setName(s);

  const submit = async () => {
    if (submitInFlightRef.current) return;
    setError("");
    if (!name) {
      setError("Account name is required");
      return;
    }
    if (!isEdit && !accountClass) {
      setError("Choose an account type first");
      return;
    }
    submitInFlightRef.current = true;
    setBusy(true);
    try {
      const payload = {
        organisation_id: orgId,
        data_mode: dataMode,
        name,
        account_class: accountClass || null,
        account_category: category || null,
        account_type: type,
        account_number: number,
        opening_balance: Number(opening) || 0,
      };
      let newId;
      if (isEdit) {
        await base44.functions.invoke("finance", {
          action: "update_account",
          account_id: record.id,
          ...payload,
        });
        newId = record.id;
      } else {
        const res = await base44.functions.invoke("finance", {
          action: "create_account",
          ...payload,
        });
        const responseData = res?.data ?? res;
        newId = responseData?.id;
      }
      onSaved?.(newId, {
        id: newId,
        organisation_id: orgId,
        data_mode: dataMode,
        name,
        account_type: type,
        account_class: accountClass,
        account_category: category,
      });
      onClose?.();
    } catch (e) {
      const response = e?.response?.data || e?.data || {};
      setError(response.error || response.message || response.detail || e?.message || "Failed");
    } finally {
      submitInFlightRef.current = false;
      setBusy(false);
    }
  };

  const ClassIcon = accountClass ? CLASS_ICONS[accountClass] : Wallet;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {accountClass && !isEdit && step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {isEdit ? "Edit Account" : "Add Account"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator for new accounts */}
        {!isEdit && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {["Type", "Category", "Details"].map((label, i) => (
              <React.Fragment key={label}>
                <span className={i === step ? "font-semibold text-brand-navy" : i < step ? "text-brand-teal" : ""}>
                  {label}
                </span>
                {i < 2 && <ChevronRight className="w-3 h-3" />}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {!isEdit && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              This account will be created for this workspace in{" "}
              <strong className="text-brand-navy">{dataMode === "demo" ? "Demo" : "Live"} mode</strong>.
            </div>
          )}
          {error && (
            <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          {/* Step 0: Account class */}
          {!isEdit && step === 0 && (
            <div className="space-y-2">
              <Label>What type of account is this?</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Choose the broad category this account belongs to. You can hover each option for an explanation.
              </p>
              <div className="grid gap-2">
                {ACCOUNT_CLASSES.map((cls) => {
                  const Icon = CLASS_ICONS[cls.value];
                  return (
                    <button
                      key={cls.value}
                      type="button"
                      onClick={() => chooseClass(cls.value)}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border text-left hover:border-brand-teal hover:bg-brand-mint/40 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-medium text-brand-navy">{cls.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{cls.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Category */}
          {!isEdit && step === 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ClassIcon className="w-4 h-4 text-brand-teal" />
                <Label className="mb-0">{ACCOUNT_CLASSES.find((c) => c.value === accountClass)?.label} category</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Pick the category that best fits this account. Each one is explained in plain English.
              </p>
              <div className="grid gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => chooseCategory(cat.value)}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border text-left hover:border-brand-teal hover:bg-brand-mint/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-brand-navy">{cat.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{cat.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {(isEdit || step === 2) && (
            <>
              {!isEdit && (
                <div className="rounded-lg bg-brand-mint/50 border border-brand-mint p-3 text-sm">
                  <div className="font-medium text-brand-navy">
                    {selectedCategory?.value || category}
                  </div>
                  {selectedCategory?.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">{selectedCategory.description}</div>
                  )}
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Suggested names — tap to use, or type your own below</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${
                          name === s
                            ? "bg-brand-teal text-white border-brand-teal"
                            : "bg-card border-border text-brand-navy hover:border-brand-teal"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Account name</Label>
                <Input
                  className="h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Main Bank Account"
                />
              </div>
              <div>
                <Label>Account kind</Label>
                <ResponsiveSelect
                  value={type}
                  onValueChange={setType}
                  placeholder="Select kind"
                  triggerClassName="h-11"
                  options={accountTypeOptions}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for cash/bank handling. Most non-cash accounts use "Other".
                </p>
              </div>
              <div>
                <Label>Account number (optional)</Label>
                <Input className="h-11" value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
              <div>
                <Label>Opening balance</Label>
                <Input
                  className="h-11"
                  type="number"
                  step="0.01"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {(isEdit || step === 2) && (
            <Button className="h-11" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Create account"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}