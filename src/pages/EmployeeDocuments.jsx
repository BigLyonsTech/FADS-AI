import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useHrDocuments } from "@/lib/useHrDocuments";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording, fullName } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import BackToHR from "@/components/hr/BackToHR";
import ExpiryBadge from "@/components/hr/ExpiryBadge";
import DocumentUploadDialog from "@/components/hr/DocumentUploadDialog";
import DocumentVerifyDialog from "@/components/hr/DocumentVerifyDialog";
import ConfirmDialog from "@/components/finance/ConfirmDialog";
import {
  Loader2, AlertCircle, FileText, Upload, Download, ShieldCheck,
  Archive, Trash2, Search, Lock, Pencil,
} from "lucide-react";
import {
  VERIFICATION_STATUSES, CONFIDENTIALITY_LEVELS,
} from "@/lib/hrDocuments";

const verifyColor = (s) => ({
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}[s] || "bg-gray-100 text-gray-600");

const confColor = (c) => ({
  internal: "bg-blue-100 text-blue-700",
  confidential: "bg-purple-100 text-purple-700",
  restricted: "bg-red-100 text-red-700",
}[c] || "bg-gray-100 text-gray-600");

const statusColor = (s) => ({
  draft: "bg-gray-100 text-gray-600",
  current: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-500",
}[s] || "bg-gray-100 text-gray-600");

export default function EmployeeDocuments() {
  const { id } = useParams();
  const { activeOrg } = useWorkspace();
  const w = hrWording(activeOrg?.type);
  const isDemo = activeOrg?.data_mode === "demo";
  const { getEmployee } = useHr();
  const {
    loadDocuments, createDocument, updateDocument, verifyDocument,
    archiveDocument, deleteDocument, getDownloadUrl,
  } = useHrDocuments();

  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "", document_type_id: "", search: "" });
  const [showUpload, setShowUpload] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const empData = await getEmployee(id);
      setEmployee(empData.employee);
      const docData = await loadDocuments(id, filters);
      setDocuments(docData.documents || []);
      setDocumentTypes(docData.document_types || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, getEmployee, loadDocuments, filters]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (editDoc) {
      await updateDocument(editDoc.id, data);
    } else {
      await createDocument({ employee_id: id, ...data });
    }
    setEditDoc(null);
    await load();
  };

  const handleVerify = async (status, notes) => {
    await verifyDocument(verifyTarget.id, status, notes);
    setVerifyTarget(null);
    await load();
  };

  const handleDownload = async (doc) => {
    if (!doc.file_uri) return;
    setDownloading(doc.id);
    try {
      const result = await getDownloadUrl(doc.id);
      window.open(result.signed_url, "_blank");
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleArchive = async () => {
    setBusy(true);
    try {
      await archiveDocument(archiveTarget.id);
      setArchiveTarget(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" onClick={load}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackToHR label={`Back to ${fullName(employee)}`} to={`/hr/employees/${id}`} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-heading font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal" />
            Documents
          </h1>
          <p className="text-sm text-muted-foreground">{fullName(employee)}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditDoc(null); setShowUpload(true); }}>
          <Upload className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search documents..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All statuses</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.document_type_id} onValueChange={(v) => setFilters({ ...filters, document_type_id: v })}>
          <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All types</SelectItem>
            {documentTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {documents.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No documents recorded yet</p>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditDoc(null); setShowUpload(true); }}>
            <Upload className="w-4 h-4" /> Upload First Document
          </Button>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Expiry</th>
                  <th className="text-left p-3 font-medium">Verification</th>
                  <th className="text-left p-3 font-medium">Confidentiality</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-teal shrink-0" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{doc.document_type_name || "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {doc.expiry_date ? (
                        <div className="space-y-1">
                          <p className="text-xs">{doc.expiry_date}</p>
                          <ExpiryBadge expiryDate={doc.expiry_date} />
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${verifyColor(doc.verification_status)}`}>
                        {VERIFICATION_STATUSES.find((v) => v.value === doc.verification_status)?.label || doc.verification_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${confColor(doc.confidentiality_level)}`}>
                        {CONFIDENTIALITY_LEVELS.find((c) => c.value === doc.confidentiality_level)?.label || doc.confidentiality_level}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {doc.file_uri && (
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} disabled={downloading === doc.id} title="Download">
                            {downloading === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setVerifyTarget(doc)} title="Verify">
                          <ShieldCheck className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditDoc(doc); setShowUpload(true); }} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(doc)} title="Archive" disabled={doc.status === "archived"}>
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(doc)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-brand-teal shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.document_type_name || "—"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(doc.status)}`}>{doc.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${verifyColor(doc.verification_status)}`}>
                    {VERIFICATION_STATUSES.find((v) => v.value === doc.verification_status)?.label || doc.verification_status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${confColor(doc.confidentiality_level)}`}>
                    <Lock className="w-2.5 h-2.5 inline mr-0.5" />
                    {CONFIDENTIALITY_LEVELS.find((c) => c.value === doc.confidentiality_level)?.label || doc.confidentiality_level}
                  </span>
                  {doc.expiry_date && <ExpiryBadge expiryDate={doc.expiry_date} />}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {doc.file_uri && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDownload(doc)} disabled={downloading === doc.id}>
                      {downloading === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setVerifyTarget(doc)}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Verify
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setEditDoc(doc); setShowUpload(true); }}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setArchiveTarget(doc)} disabled={doc.status === "archived"}>
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive" onClick={() => setDeleteTarget(doc)}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dialogs */}
      <DocumentUploadDialog
        open={showUpload}
        onClose={() => { setShowUpload(false); setEditDoc(null); }}
        onSave={handleSave}
        documentTypes={documentTypes}
        editDoc={editDoc}
        isDemo={isDemo}
      />
      <DocumentVerifyDialog
        open={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        onSave={handleVerify}
        docTitle={verifyTarget?.title}
      />
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive this document?"
        description="Archived documents are hidden from the active list but the record is preserved. This action is audited."
        confirmLabel="Archive"
        busy={busy}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this document?"
        description="This permanently deletes the document record. The private file may remain in storage. This action cannot be undone."
        confirmLabel="Delete"
        busy={busy}
      />
    </div>
  );
}