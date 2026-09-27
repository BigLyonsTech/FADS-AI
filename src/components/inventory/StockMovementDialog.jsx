import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";

// Add a stock_in / stock_out / adjustment movement via the backend function
// (which recomputes the item's current_quantity). One dialog for all types.
export default function StockMovementDialog({ open, onClose, onSaved, item, defaultType }) {
  const { activeOrg } = useWorkspace();
  const [type, setType] = useState(defaultType || "stock_in");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setType(defaultType || "stock_in");
      setQuantity("");
      setDate(new Date().toISOString().slice(0, 10));
      setReference("");
      setNote("");
      setError(null);
    }
  }, [open, defaultType]);

  const submit = async () => {
    const q = Number(quantity);
    if (!quantity || isNaN(q) || q === 0) {
      setError("Enter a non-zero quantity.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await base44.functions.invoke("inventory", {
        action: "add_movement",
        organisation_id: activeOrg.id,
        item_id: item.id,
        type,
        quantity: q,
        date,
        reference,
        note,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to record movement");
    } finally {
      setSaving(false);
    }
  };

  const TYPES = [
    { value: "stock_in", label: "Stock In", hint: "Receive stock (increases quantity)" },
    { value: "stock_out", label: "Stock Out", hint: "Issue / sell stock (decreases quantity)" },
    { value: "adjustment", label: "Adjustment", hint: "Correction (may be negative)" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
          <DialogDescription>{item?.name} · Current stock {item?.current_quantity ?? 0}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Movement type</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-lg border p-2 text-xs font-medium text-left ${
                    type === t.value ? "border-brand-teal bg-brand-mint text-brand-navy" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{TYPES.find((t) => t.value === type)?.hint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mv-qty">Quantity</Label>
              <Input id="mv-qty" type="number" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="mv-date">Date</Label>
              <Input id="mv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="mv-ref">Reference</Label>
            <Input id="mv-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO / invoice / recipient" />
          </div>
          <div>
            <Label htmlFor="mv-note">Note</Label>
            <Textarea id="mv-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Record movement"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}