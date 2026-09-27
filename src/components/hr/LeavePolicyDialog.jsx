import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { CONTRACT_TYPES } from "@/lib/hrWording";

export default function LeavePolicyDialog({ open, onClose, onSubmit, initial, leaveTypes }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contractTypes, setContractTypes] = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setDescription(initial?.description || "");
      setContractTypes(initial?.applicable_contract_types || []);
      setAllowances(
        (leaveTypes || []).map((lt) => {
          const existing = (initial?.allowances || []).find((a) => a.leave_type_id === lt.id);
          return {
            leave_type_id: lt.id,
            leave_type_name: lt.name,
            annual_allowance: existing?.annual_allowance ?? lt.default_annual_allowance ?? 0,
          };
        })
      );
      setError(null);
    }
  }, [open, initial, leaveTypes]);

  const toggleContractType = (ct) => {
    setContractTypes((prev) =>
      prev.includes(ct) ? prev.filter((c) => c !== ct) : [...prev, ct]
    );
  };

  const updateAllowance = (idx, value) => {
    setAllowances((prev) => {
      const copy = [...prev];
      copy[idx].annual_allowance = Number(value);
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!name) { setError("Name is required"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name,
        description,
        applicable_contract_types: contractTypes,
        allowances,
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
          <DialogTitle>{initial ? "Edit Leave Policy" : "New Leave Policy"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Full-time Staff" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Applicable Contract Types (empty = all)</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {CONTRACT_TYPES.map((ct) => (
                <div key={ct.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={contractTypes.includes(ct.value)}
                    onCheckedChange={() => toggleContractType(ct.value)}
                  />
                  <Label className="text-sm font-normal cursor-pointer" onClick={() => toggleContractType(ct.value)}>
                    {ct.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Annual Allowances (days)</Label>
            <div className="space-y-2 mt-1">
              {allowances.map((a, i) => (
                <div key={a.leave_type_id} className="flex items-center justify-between gap-2">
                  <span className="text-sm flex-1">{a.leave_type_name}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={a.annual_allowance}
                    onChange={(e) => updateAllowance(i, e.target.value)}
                    className="w-20"
                  />
                </div>
              ))}
              {allowances.length === 0 && (
                <p className="text-xs text-muted-foreground">Create leave types first to set allowances.</p>
              )}
            </div>
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