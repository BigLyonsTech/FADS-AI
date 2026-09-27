import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Loader2, Wallet } from "lucide-react";
import { base44 } from "@/api/base44Client";

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `${currency || ""} ${Number(amount || 0).toFixed(2)}`;
  }
}

export default function AdminPayoutReview({ payouts, allProfiles, onAction }) {
  const [processing, setProcessing] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordForm, setRecordForm] = useState({ payment_method: "bank_transfer", payment_reference: "" });

  const approve = async (id) => {
    setProcessing(id);
    try {
      await base44.functions.invoke("affiliate", { action: "admin_approve_payout", payout_request_id: id });
      onAction();
    } catch {} finally { setProcessing(null); }
  };

  const reject = async (id) => {
    setProcessing(id);
    try {
      await base44.functions.invoke("affiliate", { action: "admin_reject_payout", payout_request_id: id, reason: "Rejected by Platform Owner" });
      onAction();
    } catch {} finally { setProcessing(null); }
  };

  const record = async () => {
    setProcessing(recording.id);
    try {
      await base44.functions.invoke("affiliate", {
        action: "admin_record_payout",
        payout_request_id: recording.id,
        payment_method: recordForm.payment_method,
        payment_reference: recordForm.payment_reference || null,
      });
      setRecording(null);
      setRecordForm({ payment_method: "bank_transfer", payment_reference: "" });
      onAction();
    } catch {} finally { setProcessing(null); }
  };

  if (payouts.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No pending payout requests.</p>
      </div>
    );
  }

  const profileMap = {};
  for (const p of allProfiles) profileMap[p.id] = p;

  return (
    <div className="space-y-3">
      {payouts.map((p) => {
        const profile = profileMap[p.affiliate_id];
        return (
          <div key={p.id} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-brand-navy">{formatMoney(p.requested_amount, p.currency)}</p>
                <p className="text-sm text-muted-foreground">{profile?.user_name || profile?.user_email || p.affiliate_id}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requested: {new Date(p.requested_date).toLocaleDateString()}
                  {p.notes && ` · ${p.notes}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(p.id)} disabled={processing === p.id} className="bg-status-ok hover:bg-status-ok/90">
                  {processing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reject(p.id)} disabled={processing === p.id}>
                  <X className="w-3 h-3" /> Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRecording(p)}>
                  Record Payout
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <Dialog open={!!recording} onOpenChange={() => setRecording(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payout</DialogTitle>
          </DialogHeader>
          {recording && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Recording payout for {formatMoney(recording.requested_amount, recording.currency)}.
                This will mark all approved commissions as paid.
              </p>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select value={recordForm.payment_method} onValueChange={(v) => setRecordForm((f) => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pref">Payment reference</Label>
                <Input
                  id="pref" value={recordForm.payment_reference}
                  onChange={(e) => setRecordForm((f) => ({ ...f, payment_reference: e.target.value }))}
                  placeholder="Transaction ID or reference"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecording(null)}>Cancel</Button>
            <Button onClick={record} disabled={processing === recording?.id} className="min-h-touch">
              {processing === recording?.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm & Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}