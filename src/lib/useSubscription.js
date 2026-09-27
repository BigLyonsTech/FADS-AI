import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Fetches the subscription status, plan, and trial eligibility for the
// active organisation.
export function useSubscription() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("subscription", { action: "get_subscription_status" });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// Fetches all subscription plans (public pricing info).
export function useSubscriptionPlans() {
  const [data, setData] = useState({ plans: [], stripe_configured: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions
      .invoke("subscription", { action: "get_plans" })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading };
}

// Reads the referral code preserved from registration (localStorage).
export function getReferralCode() {
  try {
    return localStorage.getItem("fads_ref_code") || "";
  } catch {
    return "";
  }
}