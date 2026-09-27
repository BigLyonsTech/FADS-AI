import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useFinance } from "@/lib/useFinance";
import { runTaxCheck } from "@/lib/taxRules";

// Loads the active organisation's authoritative Tax Profile for the supplied
// country, runs the client-side FADS Tax Check over already-loaded Finance
// records, and exposes a save helper. Business & Tax Centre guidance switching
// is intentionally separate from this hook: reference countries must never
// create or mutate TaxProfiles.
//
// `jurisdictions` lists every country this business has a Tax Profile for
// (plus the org's primary country), so the switcher can show
// Primary / Additional / Preview without any extra Organisation field.
export function useTax(country) {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const fin = useFinance();
  const queryClient = useQueryClient();
  const orgId = activeOrg?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["taxProfile", orgId, dataMode, country],
    queryFn: async () => {
      if (!orgId || !country) return null;
      const list = await base44.entities.TaxProfile.filter({
        organisation_id: orgId,
        data_mode: dataMode,
        country,
      });
      if (list.length) return list[0];
      // Legacy fallback: profiles with no country set are treated as the
      // organisation's own jurisdiction, so existing records migrate
      // naturally. Switching to a different country starts fresh.
      if (country === activeOrg?.country) {
        const legacy = await base44.entities.TaxProfile.filter({
          organisation_id: orgId,
          data_mode: dataMode,
        });
        const noCountry = legacy.filter((p) => !p.country);
        if (noCountry.length) return noCountry[0];
      }
      return null;
    },
    enabled: !!orgId && !!country,
    staleTime: 30000,
  });

  // All jurisdictions configured for this business: the org's primary country
  // plus every country that has a Tax Profile. Used by the switcher.
  const { data: jurisdictions } = useQuery({
    queryKey: ["taxJurisdictions", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return [];
      const list = await base44.entities.TaxProfile.filter({
        organisation_id: orgId,
        data_mode: dataMode,
      });
      const codes = new Set();
      list.forEach((p) => { if (p.country) codes.add(p.country); });
      if (activeOrg?.country) codes.add(activeOrg.country);
      return [...codes];
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  const saveProfile = useCallback(
    async (values) => {
      if (!orgId || !country) return;
      if (profile?.id) {
        return await base44.entities.TaxProfile.update(profile.id, { ...values, country });
      }
      return await base44.entities.TaxProfile.create({
        ...values,
        organisation_id: orgId,
        data_mode: dataMode,
        country,
      });
    },
    [profile, orgId, dataMode, country]
  );

  const reload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["taxProfile", orgId, dataMode, country] });
    queryClient.invalidateQueries({ queryKey: ["taxJurisdictions", orgId, dataMode] });
  }, [queryClient, orgId, dataMode, country]);

  const taxCheck = runTaxCheck(
    { transactions: fin.transactions, categories: fin.categories },
    { ...profile, _currency: activeOrg?.currency }
  );

  return {
    profile,
    loading: isLoading || fin.loading,
    saveProfile,
    reload,
    taxCheck,
    finance: fin,
    jurisdictions: jurisdictions || [],
  };
}