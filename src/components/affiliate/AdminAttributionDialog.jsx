import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AdminAttributionDialog({ open, onClose, attributions, affiliates, onCorrected }) {
  const [form, setForm] = useState({ attribution_id: "", new_affiliate_id: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeAttrs = attributions.filter((a) => a.status === "active");
  const activeAffs = affiliates.filter((a) => a.status === "active" || a.status === "approved");

  const submit = async () => {
    if (!form.attribution_id || !form.new_affiliate_id || !form.reason.trim()) {
      setError("All fields are required, including a reason");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("affiliate", {
        action: "admin_correct_attribution",
        attribution_id: form.attribution_id,
        new_affiliate_id: form.new_affiliate_id,
        reason: form.reason.trim(),
      });
      setForm({ attribution_id: "", new_affiliate_id: "", reason: "" });
      onCorrected();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Correction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct Referral Attribution</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="flex items-start gap-2 bg-status-warn/10 rounded-lg p-3 text-sm text-status-warn">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>This action is audited. The old attribution is marked "corrected" and a new one is created for the selected affiliate.</span>
          </div>
          <div className="space-y-2">
            <Label>Attribution to correct</Label>
            <Select value={form.attribution_id} onValueChange={(v) => setForm((f) => ({ ...f, attribution_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select attribution" /></SelectTrigger>
              <SelectContent>
                {activeAttrs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.referred_organisation_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>New affiliate</Label>
            <Select value={form.new_affiliate_id} onValueChange={(v) => setForm((f) => ({ ...f, new_affiliate_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select new affiliate" /></SelectTrigger>
              <SelectContent>
                {activeAffs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.user_name || a.user_email} ({a.affiliate_code || "no code"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (mandatory, recorded in audit log)</Label>
            <Textarea
              id="reason" value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Explain why this attribution is being corrected..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading} variant="destructive" className="min-h-touch">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Correct Attribution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}