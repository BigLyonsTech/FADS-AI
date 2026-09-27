import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// Deep-link target for invitation links: /accept-invite?m=<membership_id>
// Accepts the pending membership for the signed-in user whose email matches
// the invitation, then redirects to the workspace home.
export default function AcceptInvite() {
  const [params] = useSearchParams();
  const membershipId = params.get("m");
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!membershipId) {
        setState("error");
        setError("This invitation link is incomplete.");
        return;
      }
      try {
        await base44.functions.invoke("members", {
          action: "accept",
          membership_id: membershipId,
        });
        setState("done");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } catch (e) {
        setState("error");
        setError(
          e.response?.data?.error ||
            e.message ||
            "Unable to accept this invitation. It may have been cancelled or belongs to another account."
        );
      }
    })();
  }, [membershipId]);

  return (
    <div className="max-w-md mx-auto bg-card rounded-2xl border border-border p-8 text-center space-y-3">
      {state === "loading" && (
        <>
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-brand-teal" />
          <h1 className="text-lg font-semibold text-brand-navy">Accepting invitation…</h1>
        </>
      )}
      {state === "done" && (
        <>
          <CheckCircle2 className="w-10 h-10 mx-auto text-status-ok" />
          <h1 className="text-lg font-semibold text-brand-navy">Invitation accepted</h1>
          <p className="text-sm text-muted-foreground">Taking you to your workspace…</p>
        </>
      )}
      {state === "error" && (
        <>
          <AlertCircle className="w-10 h-10 mx-auto text-status-bad" />
          <h1 className="text-lg font-semibold text-brand-navy">Couldn't accept</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href="/"
            className="inline-block text-sm text-brand-teal font-medium underline"
          >
            Go to home
          </a>
        </>
      )}
    </div>
  );
}