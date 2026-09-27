import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { formatMoney } from "@/lib/financeWording";
import { PAYMENT_METHODS } from "@/lib/financeConstants";

// Dialog for creating a Money In or Money Out record from an unmatched
// statement line. After creation, the line is auto-matched to the new
// transaction by the backend.
export default function CreateFromLineDialog({
  open,
  onClose,
  line,
  categories,
  contacts,
  currency,
  onSubmit,
}) {
  const [categoryId, setCategoryId] = useState("");
  const [contactId, setContactId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const direction = line && Number(line.amount_in) > 0 ? "in" : "out";
  const amount = line ? (direction === "in" ? Number(line.amount_in) : Number(line.amount_out)) : 0;

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === (direction === "in" ? "income" : "expense")),
    [categories, direction]
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        category_id: categoryId || null,
        contact_id: contactId || null,
        payment_method: paymentMethod || null,
        description: description || line?.description || null,
      });
      // reset
      setCategoryId("");
      setContactId("");
      setPaymentMethod("");
      setDescription("");
    } catch (e) {
      setError(e.message || "Failed to create transaction");
    } finally {
      setSubmitting(false);
    }
  };

  if (!line) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create {direction === "in" ? "Money In" : "Money Out"} from Statement Line</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{line.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium truncate ml-2">{line.description || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className={`font-bold ${direction === "in" ? "text-status-ok" : "text-status-bad"}`}>
                {direction === "in" ? "+" : "−"}{formatMoney(amount, currency)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <ResponsiveSelect
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Select category"
              triggerClassName="h-11"
              options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{direction === "in" ? "Customer/Contact" : "Supplier"}</Label>
            <ResponsiveSelect
              value={contactId}
              onValueChange={setContactId}
              placeholder="Optional"
              triggerClassName="h-11"
              options={contacts.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <ResponsiveSelect
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              placeholder="Auto-detect"
              triggerClassName="h-11"
              options={PAYMENT_METHODS}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              className="h-11"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={line.description || "Imported from statement"}
            />
          </div>

          {error && <p className="text-sm text-status-bad">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create & Match"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}