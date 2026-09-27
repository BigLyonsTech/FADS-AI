import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Hook for the FADS AI Transcribe Officer. Manages conversation state,
// usage status, suggestions, and saved drafts. All API calls go through
// the backend function which enforces org isolation and safety rules.
export function useTranscribeOfficer(activeOrg) {
  const [conversation, setConversation] = useState(null);
  const [status, setStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
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
      setDrafts([]);
    }
    orgIdRef.current = activeOrg.id;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("transcribeOfficer", {
        action: "get_conversation",
        organisation_id: activeOrg.id,
      });
      setConversation(res.data.conversation);
      setStatus(res.data.status);
      setSuggestions(res.data.suggestions || []);
      setDrafts(res.data.conversation?.saved_drafts || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const ask = useCallback(async (question, filters = null) => {
    if (!activeOrg || !question.trim() || asking) return;
    setAsking(true);
    setError(null);
    const now = new Date().toISOString();
    const userMsg = { role: "user", content: question, timestamp: now, citations: [] };
    setConversation((prev) =>
      prev ? { ...prev, messages: [...(prev.messages || []), userMsg] } : { messages: [userMsg] }
    );

    try {
      const res = await base44.functions.invoke("transcribeOfficer", {
        action: "ask",
        organisation_id: activeOrg.id,
        question,
        filters,
      });
      const officerMsg = {
        role: "officer",
        content: res.data.response.answer,
        timestamp: new Date().toISOString(),
        citations: res.data.response.citations || [],
        period_note: res.data.response.period_note || "",
        insufficient_data: res.data.response.insufficient_data || false,
      };
      setConversation(res.data.conversation);
      setStatus(res.data.status);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setConversation((prev) =>
        prev ? { ...prev, messages: (prev.messages || []).slice(0, -1) } : null
      );
    } finally {
      setAsking(false);
    }
  }, [activeOrg?.id, asking]);

  const runAction = useCallback(async (actionType, filters = null, sessionIds = null, sessionId = null) => {
    if (!activeOrg || asking) return;
    setAsking(true);
    setError(null);

    const actionLabel = {
      find_decisions: "Find decisions across meetings",
      find_action_points: "Find incomplete or overdue action points",
      compare_themes: "Compare themes across transcripts",
      draft_briefing: "Draft a briefing from selected records",
      draft_agenda: "Draft a follow-up agenda",
      draft_minutes: "Draft minutes from a transcript",
    }[actionType] || actionType;

    const now = new Date().toISOString();
    const userMsg = { role: "user", content: actionLabel, timestamp: now, citations: [], action_type: actionType };
    setConversation((prev) =>
      prev ? { ...prev, messages: [...(prev.messages || []), userMsg] } : { messages: [userMsg] }
    );

    try {
      const res = await base44.functions.invoke("transcribeOfficer", {
        action: "run_action",
        organisation_id: activeOrg.id,
        action_type: actionType,
        filters,
        session_ids: sessionIds,
        session_id: sessionId,
      });
      setConversation(res.data.conversation);
      setStatus(res.data.status);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setConversation((prev) =>
        prev ? { ...prev, messages: (prev.messages || []).slice(0, -1) } : null
      );
    } finally {
      setAsking(false);
    }
  }, [activeOrg?.id, asking]);

  const saveDraft = useCallback(async (draftType, title, content) => {
    if (!activeOrg) return;
    try {
      const res = await base44.functions.invoke("transcribeOfficer", {
        action: "save_draft",
        organisation_id: activeOrg.id,
        draft_type: draftType,
        title,
        content,
      });
      setDrafts(res.data.conversation?.saved_drafts || []);
      return res.data.draft;
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [activeOrg?.id]);

  const deleteDraft = useCallback(async (draftId) => {
    if (!activeOrg) return;
    try {
      const res = await base44.functions.invoke("transcribeOfficer", {
        action: "delete_draft",
        organisation_id: activeOrg.id,
        draft_id: draftId,
      });
      setDrafts(res.data.conversation?.saved_drafts || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [activeOrg?.id]);

  const deleteConversation = useCallback(async () => {
    if (!activeOrg) return;
    try {
      await base44.functions.invoke("transcribeOfficer", {
        action: "delete_conversation",
        organisation_id: activeOrg.id,
      });
      setConversation(null);
      setDrafts([]);
      setStatus((prev) => ({ ...prev, used: 0, remaining: prev?.allowance || 50 }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [activeOrg?.id]);

  return {
    conversation,
    status,
    suggestions,
    drafts,
    loading,
    asking,
    error,
    ask,
    runAction,
    saveDraft,
    deleteDraft,
    deleteConversation,
    reload: load,
  };
}