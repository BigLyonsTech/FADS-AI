import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, MessageCircle, Mail, Bell } from "lucide-react";

export default function PipelineFollowUpDialog({
  open,
  onClose,
  contact,
  orgType,
  onInternalMessage,
  onWhatsApp,
  onEmail,
  onReminder,
}) {
  if (!contact) return null;

  const personWord = orgType === "school"
    ? "parent / guardian"
    : orgType === "church"
      ? "contact / member"
      : "customer";

  const act = (fn) => {
    onClose();
    fn?.(contact);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Follow Up</DialogTitle>
          <DialogDescription>
            Choose how you want to follow up with this {personWord}. Nothing is sent automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => act(onInternalMessage)}>
            <MessageSquare className="w-4 h-4" /> Internal Message
          </Button>
          <Button
            variant="outline"
            className="h-11 justify-start gap-2"
            disabled={!contact.phone}
            onClick={() => act(onWhatsApp)}
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            className="h-11 justify-start gap-2"
            disabled={!contact.email}
            onClick={() => act(onEmail)}
          >
            <Mail className="w-4 h-4" /> Email
          </Button>
          <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => act(onReminder)}>
            <Bell className="w-4 h-4" /> Set Reminder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}