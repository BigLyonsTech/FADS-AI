import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Hook for the FADS AI HR Officer. Manages conversation state, usage status,
// suggestions, today's briefing, and saved drafts. All API calls go through
// the backend function which enforces org isolation, role-based filtering,
// and safety rules.
export function useHrOfficer(activeOrg) {
  const [conversation, setConversation] = useState(null);
  const [status, setStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [accessLevel, setAccessLevel] = useState(null);
  const [dataMode, setDataMode] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const orgIdRef = useRef(null);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    if (orgIdRef.current && orgIdRef.current !== activeOrg.id) {
      setConversation(null);
      setStatus(null);
      setBriefing(null);
      setDrafts([]);
    }
    orgIdRef.current = activeOrg.id;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("hrOfficer", {
        action: "get_conversation",
        organisation_id: activeOrg.id,
      });
      setConversation(res.data.conversation);
      setStatus(res.data.status);
      setSuggestions(res.data.suggestions || []);
      setAccessLevel(res.data.access_level);
      setDataMode(res.data.data_mode);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Load briefing after conversation loads
  const loadBriefing = useCallback(async () => {
    if (!activeOrg || briefingLoading) return;
    setBriefingLoading(true);
    try {
      const res = await base44.functions.invoke("hrOfficer", {
        action: "get_briefing",
        organisation_id: activeOrg.id,
      });
      setBriefing(res.data.briefing);
    } catch (e) {
      // Briefing is non-critical — fail silently
    } finally {
      setBriefingLoading(false);
    }
  }, [activeOrg?.id, briefingLoading]);

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
      const res = await base44.functions.invoke("hrOfficer", {
        action: "ask",
        organisation_id: activeOrg.id,
        question,
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
  }, [activeOrg?.id, asking]);

  const deleteConversation = useCallback(async () => {
    if (!activeOrg) return;
    try {
      await base44.functions.invoke("hrOfficer", {
        action: "delete_conversation",
        organisation_id: activeOrg.id,
      });
      setConversation(null);
      setStatus((prev) => ({ ...prev, used: 0, remaining: prev?.allowance || 30 }));
      setDrafts([]);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [activeOrg?.id]);

  const saveDraft = useCallback(async (draft_type, title, content) => {
    if (!activeOrg) return;
    try {
      const res = await base44.functions.invoke("hrOfficer", {
        action: "save_draft",
        organisation_id: activeOrg.id,
        draft_type,
        title,
        content,
      });
      setDrafts((prev) => [...prev, res.data.draft]);
      return res.data.draft;
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [activeOrg?.id]);

  const loadDrafts = useCallback(async () => {
    if (!activeOrg) return;
    try {
      const res = await base44.functions.invoke("hrOfficer", {
        action: "list_drafts",
        organisation_id: activeOrg.id,
      });
      setDrafts(res.data.drafts || []);
    } catch (e) {
      // Non-critical
    }
  }, [activeOrg?.id]);

  const deleteDraft = useCallback(async (draft_id) => {
    if (!activeOrg) return;
    try {
      await base44.functions.invoke("hrOfficer", {
        action: "delete_draft",
        organisation_id: activeOrg.id,
        draft_id,
      });
      setDrafts((prev) => prev.filter((d) => d.draft_id !== draft_id));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [activeOrg?.id]);

  return {
    conversation,
    status,
    suggestions,
    accessLevel,
    dataMode,
    briefing,
    briefingLoading,
    loadBriefing,
    drafts,
    loadDrafts,
    saveDraft,
    deleteDraft,
    loading,
    asking,
    error,
    ask,
    deleteConversation,
    reload: load,
  };
}