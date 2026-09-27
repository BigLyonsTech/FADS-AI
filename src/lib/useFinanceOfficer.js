import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Hook for the FADS AI Finance Officer. Manages conversation state,
// usage status, suggestions, and context filters. All API calls go
// through the backend function which enforces org isolation and RLS.
export function useFinanceOfficer(activeOrg) {
  const [conversation, setConversation] = useState(null);
  const [status, setStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const orgIdRef = useRef(null);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    if (orgIdRef.current && orgIdRef.current !== activeOrg.id) {
      setConversation(null);
      setStatus(null);
      setFilters({});
    }
    orgIdRef.current = activeOrg.id;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("financeOfficer", {
        action: "get_conversation",
        organisation_id: activeOrg.id,
      });
      setConversation(res.data.conversation);
      setStatus(res.data.status);
      setSuggestions(res.data.suggestions || []);
      setAccounts(res.data.accounts || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const ask = useCallback(async (question) => {
    if (!activeOrg || !question.trim() || asking) return;
    setAsking(true);
    setError(null);
    const now = new Date().toISOString();
    const userMsg = { role: "user", content: question, timestamp: now, citations: [] };
    setConversation((prev) =>
      prev
        ? { ...prev, messages: [...(prev.messages || []), userMsg] }
        : { messages: [userMsg] }
    );

    try {
      const res = await base44.functions.invoke("financeOfficer", {
        action: "ask",
        organisation_id: activeOrg.id,
        question,
        date_from: filters.date_from,
        date_to: filters.date_to,
        account_id: filters.account_id,
      });
      const officerMsg = {
        role: "officer",
        content: res.data.response.answer,
        timestamp: new Date().toISOString(),
        citations: res.data.response.citations || [],
        period_note: res.data.response.period_note || "",
        insufficient_data: res.data.response.insufficient_data || false,
      };
      setConversation((prev) =>
        prev
          ? { ...prev, messages: [...(prev.messages || []), officerMsg] }
          : { messages: [userMsg, officerMsg] }
      );
      setStatus((prev) => ({ ...prev, ...res.data.status }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setConversation((prev) =>
        prev ? { ...prev, messages: (prev.messages || []).slice(0, -1) } : null
      );
    } finally {
      setAsking(false);
    }
  }, [activeOrg?.id, filters, asking]);

  const deleteConversation = useCallback(async () => {
    if (!activeOrg) return;
    try {
      await base44.functions.invoke("financeOfficer", {
        action: "delete_conversation",
        organisation_id: activeOrg.id,
      });
      setConversation(null);
      setStatus((prev) => ({ ...prev, used: 0, remaining: prev?.allowance || 50 }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [activeOrg?.id]);

  return {
    conversation,
    status,
    suggestions,
    accounts,
    loading,
    asking,
    error,
    filters,
    setFilters,
    ask,
    deleteConversation,
    reload: load,
  };
}