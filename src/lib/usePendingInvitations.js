import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Fetches the signed-in user's pending organisation invitations (matched by
// email on the server, so invitations to not-yet-registered users surface
// after they sign up). Exposes an accept() that activates a membership.
export function usePendingInvitations() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("members", {
        action: "list_my_invitations",
      });
      setPending(res.data.invitations || []);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = useCallback(
    async (membership_id) => {
      setAccepting((b) => ({ ...b, [membership_id]: true }));
      try {
        await base44.functions.invoke("members", {
          action: "accept",
          membership_id,
        });
        await load();
      } finally {
        setAccepting((b) => ({ ...b, [membership_id]: false }));
      }
    },
    [load]
  );

  return { pending, loading, accept, accepting, reload: load };
}