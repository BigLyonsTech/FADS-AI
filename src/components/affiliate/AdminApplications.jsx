import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Loader2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AdminApplications({ applications, onAction }) {
  const [processing, setProcessing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  const approve = async (id) => {
    setProcessing(id);
    try {
      await base44.functions.invoke("affiliate", { action: "admin_approve", affiliate_id: id });
      onAction();
    } catch {} finally { setProcessing(null); }
  };

  const reject = async (id) => {
    setProcessing(id);
    try {
      await base44.functions.invoke("affiliate", {
        action: "admin_reject", affiliate_id: id, reason: reason || null,
      });
      setRejecting(null);
      setReason("");
      onAction();
    } catch {} finally { setProcessing(null); }
  };

  if (applications.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No pending applications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <div key={app.id} className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-brand-navy">{app.user_name || app.user_email}</p>
              <p className="text-sm text-muted-foreground">{app.user_email}</p>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span>Country: {app.country || "—"}</span>
                <span>Currency: {app.payout_currency}</span>
                <span>Applied: {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "—"}</span>
              </div>
              {app.notes && (
                <p className="text-sm text-muted-foreground mt-2 bg-muted rounded-lg p-2">{app.notes}</p>
              )}
            </div>
            <div className="flex gap-2">
              {rejecting === app.id ? (
                <div className="flex flex-col gap-2 w-full">
                  <Input placeholder="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => reject(app.id)} disabled={processing === app.id}>
                      {processing === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Confirm Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejecting(null); setReason(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button size="sm" onClick={() => approve(app.id)} disabled={processing === app.id} className="bg-status-ok hover:bg-status-ok/90">
                    {processing === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejecting(app.id)}>
                    <X className="w-4 h-4" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}