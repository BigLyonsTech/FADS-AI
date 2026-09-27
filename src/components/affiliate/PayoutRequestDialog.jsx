import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `${currency || ""} ${Number(amount || 0).toFixed(2)}`;
  }
}

export default function PayoutRequestDialog({ open, onClose, profile, settings, onRequested }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const balance = profile?.total_approved_commission || 0;
  const minAmount = settings?.min_payout_amount || 0;

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await base44.functions.invoke("affiliate", {
        action: "request_payout",
        amount: balance,
        notes: notes || null,
      });
      onRequested();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          <div className="bg-muted rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Approved balance</span>
              <span className="font-bold text-brand-navy">{formatMoney(balance, profile?.payout_currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minimum payout</span>
              <span className="text-brand-navy">{formatMoney(minAmount, profile?.payout_currency)}</span>
            </div>
          </div>
          {balance < minAmount && (
            <p className="text-sm text-destructive">
              Your approved balance is below the minimum payout amount.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="pnotes">Notes (optional)</Label>
            <Textarea
              id="pnotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment method or reference details"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading || balance < minAmount} className="min-h-touch">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Request {formatMoney(balance, profile?.payout_currency)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}