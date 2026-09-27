import React, { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

export default function CategoryDialog({ open, onClose, onSaved, record, orgId }) {
  const isEdit = !!record;
  const { dataMode } = useDataMode();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("income");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (record) {
      setName(record.name || "");
      setKind(record.kind || "income");
    } else {
      setName("");
      setKind("income");
    }
  }, [open, record]);

  const submit = async () => {
    setError("");
    if (!name) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = { organisation_id: orgId, data_mode: dataMode, name, kind };
      if (isEdit) {
        await base44.functions.invoke("finance", {
          action: "update_category",
          category_id: record.id,
          ...payload,
        });
      } else {
        await base44.functions.invoke("finance", {
          action: "create_category",
          ...payload,
        });
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "New"} Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          <div>
            <Label>Name</Label>
            <Input className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Kind</Label>
            <ResponsiveSelect
              value={kind}
              onValueChange={setKind}
              placeholder="Select kind"
              triggerClassName="h-11"
              options={[
                { value: "income", label: "Income / Money In" },
                { value: "expense", label: "Expense / Money Out" },
              ]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="h-11" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}