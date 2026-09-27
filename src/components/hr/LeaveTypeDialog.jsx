import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function LeaveTypeDialog({ open, onClose, onSubmit, initial }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [allowance, setAllowance] = useState(0);
  const [carryOver, setCarryOver] = useState(false);
  const [carryLimit, setCarryLimit] = useState(0);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [docAfterDays, setDocAfterDays] = useState(0);
  const [colour, setColour] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setDescription(initial?.description || "");
      setIsPaid(initial?.is_paid !== false);
      setAllowance(initial?.default_annual_allowance || 0);
      setCarryOver(initial?.carry_over_allowed || false);
      setCarryLimit(initial?.carry_over_limit || 0);
      setRequiresApproval(initial?.requires_approval !== false);
      setDocAfterDays(initial?.requires_documentation_after_days || 0);
      setColour(initial?.colour || "#3b82f6");
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!name) { setError("Name is required"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name,
        description,
        is_paid: isPaid,
        default_annual_allowance: Number(allowance),
        carry_over_allowed: carryOver,
        carry_over_limit: Number(carryLimit),
        requires_approval: requiresApproval,
        requires_documentation_after_days: Number(docAfterDays),
        colour,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Leave Type" : "New Leave Type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual Leave" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Default Allowance (days)</Label>
              <Input type="number" min="0" step="0.5" value={allowance} onChange={(e) => setAllowance(e.target.value)} />
            </div>
            <div>
              <Label>Colour</Label>
              <Input type="color" value={colour} onChange={(e) => setColour(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isPaid} onCheckedChange={setIsPaid} />
            <Label className="text-sm font-normal cursor-pointer" onClick={() => setIsPaid(!isPaid)}>Paid leave</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={requiresApproval} onCheckedChange={setRequiresApproval} />
            <Label className="text-sm font-normal cursor-pointer" onClick={() => setRequiresApproval(!requiresApproval)}>Requires approval</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={carryOver} onCheckedChange={setCarryOver} />
            <Label className="text-sm font-normal cursor-pointer" onClick={() => setCarryOver(!carryOver)}>Allow carry-over</Label>
          </div>
          {carryOver && (
            <div>
              <Label>Carry-over limit (days)</Label>
              <Input type="number" min="0" step="0.5" value={carryLimit} onChange={(e) => setCarryLimit(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Require documentation after (days, 0=never)</Label>
            <Input type="number" min="0" value={docAfterDays} onChange={(e) => setDocAfterDays(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}