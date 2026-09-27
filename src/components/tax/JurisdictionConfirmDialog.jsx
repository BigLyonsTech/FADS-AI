import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Eye, Plus } from "lucide-react";

// Confirmation shown when a user picks a jurisdiction that is not yet
// configured for the current business. Prevents silently overwriting a real
// business's configured jurisdiction. Finance records are never changed.
export default function JurisdictionConfirmDialog({
  open,
  flag,
  label,
  onPreview,
  onSetup,
  onClose,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use {flag} {label} Tax Centre?</AlertDialogTitle>
          <AlertDialogDescription>
            This business is not set up for {label}. Choose how you'd like to use this
            jurisdiction. Your existing Finance records are never changed or duplicated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction
            onClick={onPreview}
            className="bg-brand-navy text-white h-11 justify-center"
          >
            <Eye className="w-4 h-4 mr-2" /> Preview / Test {label} Tax Centre
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSetup}
            className="bg-brand-teal text-white h-11 justify-center"
          >
            <Plus className="w-4 h-4 mr-2" /> Set up {label} Tax Profile for this business
          </AlertDialogAction>
          <AlertDialogCancel className="mt-1">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}