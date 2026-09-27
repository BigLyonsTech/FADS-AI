import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
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
import { Loader2, Send } from "lucide-react";

// Lightweight internal message composer. Recipients are active members of the
// same organisation (passed in from the Messages page). Messages are stored on
// the Message entity, org-isolated and private to sender + recipient via RLS.
export default function MessageDialog({
  open, onClose, orgId, members, onSent, demoMode = false,
  initialSubject = "", initialBody = "",
}) {
  const { user } = useAuth();
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRecipientId("");
    setSubject(initialSubject || "");
    setBody(initialBody || "");
    setError("");
  }, [open, initialSubject, initialBody]);

  const demoMembers = demoMode && !members.length
    ? [
        { user_id: "demo-admin", user_name: "Demo Administrator" },
        { user_id: "demo-team", user_name: "Demo Team Member" },
      ]
    : members;
  const recipient = demoMembers.find((m) => m.user_id === recipientId);

  const send = async () => {
    if (!recipient) {
      setError("Choose a recipient.");
      return;
    }
    if (!body.trim()) {
      setError("Write a message.");
      return;
    }
    setSending(true);
    setError("");
    try {
      if (demoMode && recipient.user_id.startsWith("demo-")) {
        if (onSent) onSent({ demo: true, recipient, subject: subject.trim(), body: body.trim() });
        onClose();
        return;
      }
      await base44.entities.Message.create({
        organisation_id: orgId,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        recipient_id: recipient.user_id,
        recipient_name: recipient.user_name || recipient.user_email,
        subject: subject.trim(),
        body: body.trim(),
        read: false,
        data_mode: "live",
      });
      if (onSent) onSent();
      onClose();
    } catch (e) {
      setError(e.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-lg max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>New team message</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>To</Label>
            <ResponsiveSelect
              value={recipientId}
              onValueChange={setRecipientId}
              placeholder="Select a team member…"
              triggerClassName="h-11"
              options={demoMembers.map((m) => ({
                value: m.user_id,
                label: m.user_name || m.user_email,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Subject (optional)</Label>
            <Input
              className="h-11"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Optional subject"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm min-h-28"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message…"
            />
          </div>

          {error && <p className="text-sm text-status-bad">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-11" onClick={send} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}