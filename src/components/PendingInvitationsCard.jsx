import React from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";

// Presents a signed-in user's pending organisation invitations with accept
// buttons. Hidden entirely when there are none.
export default function PendingInvitationsCard({ pending, onAccept, accepting }) {
  if (!pending || pending.length === 0) return null;
  return (
    <div className="bg-status-warn/10 border border-status-warn/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-5 h-5 text-status-warn" />
        <h2 className="font-semibold text-brand-navy">Pending invitations</h2>
      </div>
      <div className="space-y-2">
        {pending.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between bg-card rounded-xl border border-border p-3"
          >
            <div className="min-w-0">
              <div className="font-medium text-brand-navy truncate">
                {inv.organisation_name}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                Role: {(inv.role_in_org || "").replace(/_/g, " ")}
              </div>
            </div>
            <Button size="sm" disabled={accepting[inv.id]} onClick={() => onAccept(inv.id)}>
              {accepting[inv.id] && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Accept
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}