import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2, CheckCircle2, Clock, AlertCircle, Banknote, ShieldCheck } from "lucide-react";
import { computeTrialStatus, TRIAL_STATE_LABELS } from "@/lib/trialStatus";

const STATUS_OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past Due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const CURRENCY_OPTIONS = [
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "USD", label: "USD — US Dollar" },
];

function fmtDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fmtDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function CustomerSubscriptionDialog({ customer, onClose, onSaved }) {
  const sub = customer.subscription;
  const [tab, setTab] = useState("record");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Record payment form
  const [paymentMethod, setPaymentMethod] = useState(sub?.payment_method && sub.payment_method !== "none" ? sub.payment_method : "bank_transfer");
  const [paymentAmount, setPaymentAmount] = useState(sub?.payment_amount || "");
  const [paymentCurrency, setPaymentCurrency] = useState(sub?.payment_currency || customer.currency || "USD");
  const [paymentReference, setPaymentReference] = useState(sub?.payment_reference || "");
  const [paymentDate, setPaymentDate] = useState(fmtDateInput(sub?.payment_date));

  // Verify form
  const [subscriptionStart, setSubscriptionStart] = useState(fmtDateInput(sub?.subscription_start_date));
  const [renewalDate, setRenewalDate] = useState(fmtDateInput(sub?.current_period_end));

  // Status form
  const [statusValue, setStatusValue] = useState(sub?.status || "payment_pending");
  const [statusStart, setStatusStart] = useState(fmtDateInput(sub?.subscription_start_date));
  const [statusRenewal, setStatusRenewal] = useState(fmtDateInput(sub?.current_period_end));
  const [cancelReason, setCancelReason] = useState(sub?.cancellation_reason || "");

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [tab]);

  const call = async (action, payload, successMsg) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await base44.functions.invoke("subscription", { action, ...payload });
      setSuccess(successMsg);
      onSaved?.();
      return true;
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleRecord = async () => {
    const ok = await call(
      "admin_record_payment",
      {
        organisation_id: customer.organisation_id,
        payment_method: paymentMethod,
        payment_amount: paymentAmount,
        payment_currency: paymentCurrency,
        payment_reference: paymentReference,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : null,
      },
      "Payment recorded. Status set to Payment Pending — not yet activated."
    );
    if (ok) setTimeout(onClose, 900);
  };

  const handleVerify = async () => {
    const ok = await call(
      "admin_verify_payment",
      {
        organisation_id: customer.organisation_id,
        subscription_start_date: subscriptionStart ? new Date(subscriptionStart).toISOString() : null,
        current_period_end: renewalDate ? new Date(renewalDate).toISOString() : null,
      },
      "Payment verified. Subscription is now Active."
    );
    if (ok) setTimeout(onClose, 900);
  };

  const handleStatus = async () => {
    const ok = await call(
      "admin_update_subscription",
      {
        organisation_id: customer.organisation_id,
        status: statusValue,
        subscription_start_date: statusStart ? new Date(statusStart).toISOString() : null,
        current_period_end: statusRenewal ? new Date(statusRenewal).toISOString() : null,
        cancellation_reason: cancelReason || null,
      },
      "Subscription updated."
    );
    if (ok) setTimeout(onClose, 900);
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === id ? "bg-brand-navy text-white" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-navy">{customer.organisation_name}</DialogTitle>
          <DialogDescription>
            Owner: {customer.owner_name || "—"} · {customer.owner_email || "—"} ·{" "}
            <span className="capitalize">{(customer.organisation_type || "").replace(/_/g, " ")}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Current status banner */}
        <div className="rounded-xl border border-border bg-brand-mint/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Current subscription status</span>
            <span className="font-medium text-brand-navy capitalize">
              {sub ? (sub.status || "").replace(/_/g, " ") : "No subscription record"}
            </span>
          </div>
          {sub?.payment_verified && (
            <div className="mt-1 text-xs text-status-ok flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified by {sub.payment_verified_by_email || "admin"} on {fmtDateTime(sub.payment_verified_date)}
            </div>
          )}
        </div>

        {sub && (() => {
          const t = computeTrialStatus(sub);
          if (t.state === "none") return null;
          return (
            <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Trial status</span>
                <span className="font-medium text-brand-navy">{TRIAL_STATE_LABELS[t.state]}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Trial start: <span className="text-brand-navy font-medium">{fmtDateTime(sub.trial_start)}</span></div>
                <div>Trial expiry: <span className="text-brand-navy font-medium">{fmtDateTime(sub.trial_end)}</span></div>
              </div>
              {t.state === "active" || t.state === "ending" ? (
                <div className="text-xs text-muted-foreground">{t.daysRemaining} day{t.daysRemaining === 1 ? "" : "s"} remaining</div>
              ) : t.state === "paid_subscriber" ? (
                <div className="text-xs text-status-ok flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Converted to paid</div>
              ) : (
                <div className="text-xs text-status-bad">Trial ended — no data deleted</div>
              )}
            </div>
          );
        })()}

        <div className="flex flex-wrap gap-2">
          <TabButton id="record" icon={Banknote} label="Record Payment" />
          <TabButton id="verify" icon={CheckCircle2} label="Verify & Activate" />
          <TabButton id="status" icon={AlertCircle} label="Status & Dates" />
        </div>

        {error && (
          <div className="bg-status-bad/10 border border-status-bad/30 rounded-lg p-3 text-sm text-status-bad">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-status-ok/10 border border-status-ok/30 rounded-lg p-3 text-sm text-status-ok flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {success}
          </div>
        )}

        {tab === "record" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Record the bank-transfer payment the customer reported. This sets the subscription to{" "}
              <strong>Payment Pending</strong> — it does <strong>not</strong> activate access. Verify the
              payment separately to activate.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <ResponsiveSelect
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  options={PAYMENT_METHOD_OPTIONS}
                  placeholder="Select method"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment currency</Label>
                <ResponsiveSelect
                  value={paymentCurrency}
                  onValueChange={setPaymentCurrency}
                  options={CURRENCY_OPTIONS}
                  placeholder="Select currency"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount paid</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Payment reference (bank transfer ref / receipt no.)</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. FADS-INV-001, bank confirmation ref"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleRecord} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Save payment (set Payment Pending)
              </Button>
            </DialogFooter>
          </div>
        )}

        {tab === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm you have received and verified the payment. This marks the payment as verified and
              moves the subscription to <strong>Active</strong>, granting the organisation access to FADS AI.
            </p>
            {!sub && (
              <div className="bg-status-warn/10 border border-status-warn/30 rounded-lg p-3 text-sm text-status-warn">
                No subscription record yet — record the payment first.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Subscription start date</Label>
                <Input type="date" value={subscriptionStart} onChange={(e) => setSubscriptionStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next renewal / expiry date</Label>
                <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleVerify} disabled={busy || !sub}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Verify &amp; Activate
              </Button>
            </DialogFooter>
          </div>
        )}

        {tab === "status" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Change the subscription status (suspend or reactivate) and adjust the start / renewal dates.
              All changes are recorded in the audit log with your name and timestamp.
            </p>
            {!sub && (
              <div className="bg-status-warn/10 border border-status-warn/30 rounded-lg p-3 text-sm text-status-warn">
                No subscription record yet — record the payment first.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Subscription status</Label>
                <ResponsiveSelect
                  value={statusValue}
                  onValueChange={setStatusValue}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subscription start date</Label>
                <Input type="date" value={statusStart} onChange={(e) => setStatusStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next renewal / expiry date</Label>
                <Input type="date" value={statusRenewal} onChange={(e) => setStatusRenewal(e.target.value)} />
              </div>
              {(statusValue === "cancelled" || statusValue === "expired") && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Customer requested cancellation"
                    rows={2}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleStatus} disabled={busy || !sub}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                Update subscription
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}