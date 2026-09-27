import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";

// All HR document data access goes through the hrDocuments backend function
// so the server can enforce HR-role access control, validate file types, and
// create signed URLs for private file downloads.
export function useHrDocuments() {
  const { activeOrg } = useWorkspace();
  const orgId = activeOrg?.id;

  const invoke = useCallback(async (payload) => {
    const res = await base44.functions.invoke("hrDocuments", { ...payload, organisation_id: orgId });
    return res.data;
  }, [orgId]);

  const loadDocuments = useCallback(async (employee_id, filters = {}) => {
    return invoke({ action: "list_documents", employee_id, ...filters });
  }, [invoke]);

  const createDocument = useCallback(async (data) => {
    return invoke({ action: "create_document", ...data });
  }, [invoke]);

  const updateDocument = useCallback(async (document_id, patch) => {
    return invoke({ action: "update_document", document_id, ...patch });
  }, [invoke]);

  const verifyDocument = useCallback(async (document_id, verification_status, verification_notes) => {
    return invoke({ action: "verify_document", document_id, verification_status, verification_notes });
  }, [invoke]);

  const archiveDocument = useCallback(async (document_id) => {
    return invoke({ action: "archive_document", document_id });
  }, [invoke]);

  const deleteDocument = useCallback(async (document_id) => {
    return invoke({ action: "delete_document", document_id });
  }, [invoke]);

  const getDownloadUrl = useCallback(async (document_id) => {
    return invoke({ action: "get_download_url", document_id });
  }, [invoke]);

  const loadDocumentTypes = useCallback(async () => {
    return invoke({ action: "list_document_types" });
  }, [invoke]);

  const createDocumentType = useCallback(async (data) => {
    return invoke({ action: "create_document_type", ...data });
  }, [invoke]);

  const updateDocumentType = useCallback(async (document_type_id, patch) => {
    return invoke({ action: "update_document_type", document_type_id, ...patch });
  }, [invoke]);

  const deleteDocumentType = useCallback(async (document_type_id) => {
    return invoke({ action: "delete_document_type", document_type_id });
  }, [invoke]);

  const getExpiringDocuments = useCallback(async (days = 30) => {
    return invoke({ action: "get_expiring_documents", days });
  }, [invoke]);

  const seedDemo = useCallback(async () => invoke({ action: "seed_demo" }), [invoke]);

  return {
    orgId,
    invoke,
    loadDocuments,
    createDocument,
    updateDocument,
    verifyDocument,
    archiveDocument,
    deleteDocument,
    getDownloadUrl,
    loadDocumentTypes,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    getExpiringDocuments,
    seedDemo,
  };
}