import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";

// Hook for Transcribe module CRUD operations. All calls go through the
// backend function which enforces org isolation, RLS, and audit logging.
// Data is filtered by the selected Demo / Live mode.
export function useTranscribe(activeOrg) {
  const { dataMode } = useDataMode();
  const [sessions, setSessions] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, foldersRes] = await Promise.all([
        base44.functions.invoke("transcribe", {
          action: "list_sessions",
          organisation_id: activeOrg.id,
          data_mode: dataMode,
          include_archived: true,
        }),
        base44.functions.invoke("transcribe", {
          action: "list_folders_tags",
          organisation_id: activeOrg.id,
          data_mode: dataMode,
        }),
      ]);
      setSessions(sessionsRes.data.sessions || []);
      setFolders(foldersRes.data.folders || []);
      setTags(foldersRes.data.tags || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id, dataMode]);

  useEffect(() => {
    load();
  }, [load]);

  const createSession = useCallback(async (data) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "create_session",
      organisation_id: activeOrg.id,
      ...data,
    });
    setSessions((prev) => [res.data.session, ...prev]);
    return res.data.session;
  }, [activeOrg?.id]);

  const updateSession = useCallback(async (sessionId, data) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "update_session",
      organisation_id: activeOrg.id,
      session_id: sessionId,
      ...data,
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? res.data.session : s))
    );
    return res.data.session;
  }, [activeOrg?.id]);

  const saveSegments = useCallback(async (sessionId, segments, speakers) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "save_segments",
      organisation_id: activeOrg.id,
      session_id: sessionId,
      segments,
      speakers,
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? res.data.session : s))
    );
    return res.data;
  }, [activeOrg?.id]);

  const deleteSession = useCallback(async (sessionId) => {
    await base44.functions.invoke("transcribe", {
      action: "delete_session",
      organisation_id: activeOrg.id,
      session_id: sessionId,
    });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, [activeOrg?.id]);

  const getSession = useCallback(async (sessionId) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "get_session",
      organisation_id: activeOrg.id,
      session_id: sessionId,
    });
    return res.data;
  }, [activeOrg?.id]);

  const createFolder = useCallback(async (name, color) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "create_folder",
      organisation_id: activeOrg.id,
      name,
      color,
    });
    setFolders((prev) => [...prev, res.data.folder]);
    return res.data.folder;
  }, [activeOrg?.id]);

  const renameFolder = useCallback(async (folderId, name, description, color) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "rename_folder",
      organisation_id: activeOrg.id,
      folder_id: folderId,
      name,
      description,
      color,
    });
    setFolders((prev) => prev.map((f) => (f.id === folderId ? res.data.folder : f)));
    // Also update folder_name on sessions
    setSessions((prev) =>
      prev.map((s) =>
        s.folder_id === folderId ? { ...s, folder_name: name } : s
      )
    );
    return res.data.folder;
  }, [activeOrg?.id]);

  const createTag = useCallback(async (name, color) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "create_tag",
      organisation_id: activeOrg.id,
      name,
      color,
    });
    setTags((prev) => [...prev, res.data.tag]);
    return res.data.tag;
  }, [activeOrg?.id]);

  const generateAI = useCallback(async (sessionId) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "generate_ai",
      organisation_id: activeOrg.id,
      session_id: sessionId,
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? res.data.session : s))
    );
    return res.data.session;
  }, [activeOrg?.id]);

  const toggleFavourite = useCallback(async (sessionId) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "toggle_favourite",
      organisation_id: activeOrg.id,
      session_id: sessionId,
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? res.data.session : s))
    );
    return res.data.session;
  }, [activeOrg?.id]);

  const archiveSession = useCallback(async (sessionId, archived) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "archive_session",
      organisation_id: activeOrg.id,
      session_id: sessionId,
      archived,
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? res.data.session : s))
    );
    return res.data.session;
  }, [activeOrg?.id]);

  const updateReviewStatus = useCallback(async (sessionId, status) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "update_review_status",
      organisation_id: activeOrg.id,
      session_id: sessionId,
      review_status: status,
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? res.data.session : s))
    );
    return res.data.session;
  }, [activeOrg?.id]);

  const importText = useCallback(async (data) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "import_text",
      organisation_id: activeOrg.id,
      ...data,
    });
    setSessions((prev) => [res.data.session, ...prev]);
    return res.data.session;
  }, [activeOrg?.id]);

  const getImportedFileUrl = useCallback(async (sessionId) => {
    const res = await base44.functions.invoke("transcribe", {
      action: "get_imported_file_url",
      organisation_id: activeOrg.id,
      session_id: sessionId,
    });
    return res.data.signed_url;
  }, [activeOrg?.id]);

  // Upload an audio File (captured via MediaRecorder) and transcribe it
  // server-side with Whisper. Used by the mobile recording flow where the
  // browser Web Speech API is unavailable.
  const transcribeAudioFile = useCallback(async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const res = await base44.functions.invoke("transcribe", {
      action: "transcribe_audio",
      organisation_id: activeOrg.id,
      file_url,
    });
    return res.data.transcript || "";
  }, [activeOrg?.id]);

  return {
    sessions,
    folders,
    tags,
    loading,
    error,
    reload: load,
    createSession,
    transcribeAudioFile,
    updateSession,
    saveSegments,
    deleteSession,
    getSession,
    createFolder,
    renameFolder,
    createTag,
    generateAI,
    toggleFavourite,
    archiveSession,
    updateReviewStatus,
    importText,
    getImportedFileUrl,
  };
}