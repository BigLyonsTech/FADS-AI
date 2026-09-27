import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TransactionForm from "@/components/finance/TransactionForm";

export default function TransactionDialog({
  open,
  onClose,
  onSaved,
  direction,
  accounts,
  categories,
  contacts,
  record,
  orgId,
  wording,
  currency,
  autoDictate,
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {autoDictate
              ? "Speak a Record"
              : `${record ? "Edit" : "Add"} ${direction === "in" ? wording?.moneyIn : wording?.moneyOut}`}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <TransactionForm
            direction={direction}
            accounts={accounts}
            categories={categories}
            contacts={contacts}
            orgId={orgId}
            wording={wording}
            currency={currency}
            record={record}
            onSaved={onSaved}
            onCancel={onClose}
            autoDictate={autoDictate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}