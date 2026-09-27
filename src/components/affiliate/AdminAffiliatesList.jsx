import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pause, Play, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATUS_STYLES = {
  pending: "bg-status-warn/10 text-status-warn",
  approved: "bg-brand-teal/10 text-brand-teal",
  active: "bg-status-ok/10 text-status-ok",
  paused: "bg-muted text-muted-foreground",
  closed: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
};

export default function AdminAffiliatesList({ affiliates, onAction }) {
  const [processing, setProcessing] = useState(null);

  const act = async (action, id) => {
    setProcessing(id);
    try {
      await base44.functions.invoke("affiliate", { action, affiliate_id: id });
      onAction();
    } catch {} finally { setProcessing(null); }
  };

  if (affiliates.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">No affiliates yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {affiliates.map((a) => (
          <div key={a.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-brand-navy truncate">{a.user_name || a.user_email}</p>
                {a.data_mode === "demo" && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-status-warn/10 text-status-warn">DEMO</span>
                )}
              </div>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{a.user_email}</span>
                {a.affiliate_code && <span className="font-mono">Code: {a.affiliate_code}</span>}
                <span>Signups: {a.total_signups || 0}</span>
                <span>Conversions: {a.total_conversions || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[a.status] || ""}`}>
                {a.status}
              </span>
              {(a.status === "active" || a.status === "approved") && (
                <Button size="sm" variant="outline" onClick={() => act("admin_pause", a.id)} disabled={processing === a.id}>
                  {processing === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                </Button>
              )}
              {a.status === "paused" && (
                <Button size="sm" variant="outline" onClick={() => act("admin_activate", a.id)} disabled={processing === a.id}>
                  {processing === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                </Button>
              )}
              {a.status !== "closed" && a.status !== "rejected" && (
                <Button size="sm" variant="ghost" onClick={() => act("admin_close", a.id)} disabled={processing === a.id}>
                  <XCircle className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}