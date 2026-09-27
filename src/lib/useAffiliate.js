import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Fetches the current user's affiliate dashboard data (profile, link,
// attributions, commissions, payouts, terms acceptance, settings).
export function useAffiliate() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("affiliate", { action: "get_dashboard" });
      setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// Fetches the public programme settings (available to any authenticated user).
export function useAffiliateSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions
      .invoke("affiliate", { action: "get_settings" })
      .then((res) => setSettings(res.data.settings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}

// Fetches the Platform Owner admin dashboard data.
export function useAffiliateAdmin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("affiliate", { action: "admin_get_dashboard" });
      setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}