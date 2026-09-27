import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AdminConversionDialog({ open, onClose, attributions, onRecorded }) {
  const [form, setForm] = useState({
    attribution_id: "",
    conversion_type: "monthly",
    base_amount: "",
    description: "",
    conversion_reference: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeAttrs = attributions.filter((a) => a.status === "active");

  const submit = async () => {
    if (!form.attribution_id) { setError("Select an organisation"); return; }
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("affiliate", {
        action: "admin_record_conversion",
        attribution_id: form.attribution_id,
        conversion_type: form.conversion_type,
        base_amount: Number(form.base_amount) || 0,
        description: form.description || null,
        conversion_reference: form.conversion_reference || null,
      });
      setForm({ attribution_id: "", conversion_type: "monthly", base_amount: "", description: "", conversion_reference: "" });
      onRecorded();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Manually Verified Conversion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="space-y-2">
            <Label>Referred organisation</Label>
            <Select value={form.attribution_id} onValueChange={(v) => setForm((f) => ({ ...f, attribution_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select organisation" /></SelectTrigger>
              <SelectContent>
                {activeAttrs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.referred_organisation_name} ({a.referred_organisation_status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conversion type</Label>
            <Select value={form.conversion_type} onValueChange={(v) => setForm((f) => ({ ...f, conversion_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly subscription payment</SelectItem>
                <SelectItem value="introductory">Introductory access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.conversion_type === "introductory" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warn/10 text-status-warn text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Affiliate commissions are not earned on introductory access. A referral becomes a
                commissionable paid conversion only after the first verified monthly subscription payment.
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ba">Base amount (monthly subscription payment)</Label>
            <Input
              id="ba" type="number" min="0" step="0.01"
              value={form.base_amount}
              onChange={(e) => setForm((f) => ({ ...f, base_amount: e.target.value }))}
              placeholder="e.g. 30000"
              disabled={form.conversion_type === "introductory"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. First monthly subscription payment"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Conversion reference (optional)</Label>
            <Input
              id="ref" value={form.conversion_reference}
              onChange={(e) => setForm((f) => ({ ...f, conversion_reference: e.target.value }))}
              placeholder="e.g. INV-2026-001"
            />
          </div>
          <p className="text-xs text-status-warn bg-status-warn/10 rounded-lg p-2">
            This will be labelled "Manually verified" in the affiliate's commission records.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="min-h-touch">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Record Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}