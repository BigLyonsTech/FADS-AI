import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Fetches the current user's workspaces and memberships via the backend
// `list_my_workspaces` action (service role), which returns the complete,
// authoritative list independent of client RLS token/cache state. Exposes the
// active workspace + role.
//
// Backed by React Query so every consumer sharing the same user shares ONE
// cached request.
async function fetchWorkspace() {
  const res = await base44.functions.invoke("workspace", {
    action: "list_my_workspaces",
  });
  return {
    orgs: res.data?.orgs || [],
    memberships: res.data?.memberships || [],
  };
}

export function useWorkspace() {
  const { user, patchUser } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["workspace", user?.id];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchWorkspace(user.id),
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const orgs = data?.orgs || [];
  const memberships = data?.memberships || [];
  const activeId = user?.active_organisation_id;
  const activeOrg = orgs.find((o) => o.id === activeId) || null;
  const m = memberships.find(
    (mm) => mm.organisation_id === activeId && mm.status === "active"
  );
  const activeRole = m?.role_in_org || user?.active_org_role || null;

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const switchWorkspace = useCallback(
    async (organisation_id) => {
      const res = await base44.functions.invoke("workspace", {
        action: "set_active",
        organisation_id,
      });
      const data = res.data || {};
      patchUser?.({
        active_organisation_id: data.organisation_id || organisation_id,
        active_org_role: data.role_in_org || null,
      });
      return data;
    },
    [patchUser]
  );

  // Admin-only: seeds the five demo workspaces (Business, Self-Employed, School,
  // University, Church) with demo data. No live data is touched.
  const seedDemoWorkspaces = useCallback(async () => {
    const res = await base44.functions.invoke("workspace", {
      action: "seed_demo_workspaces",
    });
    await queryClient.invalidateQueries({ queryKey: ["workspace"] });
    return res.data;
  }, [queryClient]);

  // Existing one-way Demo → Live lifecycle transition. The backend verifies
  // organisation ownership before changing the authoritative organisation mode.
  // Remove only this organisation's cached feature data so no Demo selection or
  // records can linger when the refreshed workspace starts querying Live.
  const promoteToLive = useCallback(
    async (organisation_id) => {
      const res = await base44.functions.invoke("workspace", {
        action: "promote_to_live",
        organisation_id,
      });
      queryClient.removeQueries({
        predicate: (query) => query.queryKey.includes(organisation_id),
      });
      await queryClient.invalidateQueries({ queryKey: ["workspace"] });
      await refetch();
      return res.data;
    },
    [queryClient, refetch]
  );

  return {
    organisations: orgs,
    memberships,
    activeOrg,
    activeRole,
    loading: isLoading,
    reload,
    switchWorkspace,
    seedDemoWorkspaces,
    promoteToLive,
  };
}