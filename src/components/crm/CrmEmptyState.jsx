import React from "react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { Button } from "@/components/ui/button";

// Friendly empty state for CRM pages. Never show a confusing empty screen —
// FADS explains what to do and gives a clear button to continue.
export default function CrmEmptyState({ message, actionLabel, onAction, actionIcon: ActionIcon }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <FadsRobotAvatar size="lg" />
      <p className="text-sm text-muted-foreground mt-4 max-w-[280px]">{message}</p>
      {actionLabel && onAction && (
        <Button
          className="mt-4 h-11 gap-1.5 bg-brand-navy hover:bg-brand-navy/90 min-h-touch"
          onClick={onAction}
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />} {actionLabel}
        </Button>
      )}
    </div>
  );
}