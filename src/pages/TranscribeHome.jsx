import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useTranscribe } from "@/lib/useTranscribe";
import { sessionTypeLabel, formatDuration, reviewStatusLabel } from "@/lib/transcribeConstants";
import { downloadCSV, computeSearchableWords, computeActionPointTotal } from "@/lib/transcribeExport";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Mic, FileAudio, Folder, Clock,
  AlertCircle, Loader2, ChevronRight, FileText, Star,
  Archive, Trash2, Download, Settings2, Sparkles, Bot,
} from "lucide-react";
import TranscriptSearchBar from "@/components/transcribe/TranscriptSearchBar";
import TranscriptFilters from "@/components/transcribe/TranscriptFilters";
import FolderTagManager from "@/components/transcribe/FolderTagManager";
import ImportDialog from "@/components/transcribe/ImportDialog";
import TranscribeQuickActions from "@/components/transcribe/TranscribeQuickActions";
import FadsListeningPlayer from "@/components/transcribe/FadsListeningPlayer";
import TranscribeCounter from "@/components/transcribe/TranscribeCounter";
import { useToast } from "@/components/ui/use-toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import BeginnerGuide from "@/components/BeginnerGuide";

// Transcribe Home — FADS Listening Player + searchable Transcript Library.
// "Record it. Understand it. Act on it."
export default function TranscribeHome() {
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const {
    sessions, folders, tags, loading, error,
    deleteSession, toggleFavourite, archiveSession,
    createFolder, renameFolder, createTag, importText, reload,
    transcribeAudioFile, createSession, saveSegments, generateAI,
  } = useTranscribe(activeOrg);
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [showManager, setShowManager] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { pullDistance, refreshing, threshold } = usePullToRefresh(() => reload());

  // Client-side search + filter
  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filters.favourite_only && !s.is_favourite) return false;
      if (filters.archived_only && !s.is_archived) return false;
      if (!filters.archived_only && s.is_archived) return false;
      if (filters.session_type && s.session_type !== filters.session_type) return false;
      if (filters.folder_id && s.folder_id !== filters.folder_id) return false;
      if (filters.tag && !(s.tags || []).includes(filters.tag)) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (search) {
        const q = search.toLowerCase();
        const fields = [
          s.title || "",
          (s.participants || []).join(" "),
          s.full_text || "",
          s.summary || "",
          s.minutes || "",
          (s.decisions || []).map((d) => d.text || "").join(" "),
          (s.action_points || []).map((a) => a.text || "").join(" "),
        ];
        if (!fields.some((f) => f.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [sessions, search, filters]);

  // Stats (non-archived only)
  const activeSessions = useMemo(() => sessions.filter((s) => !s.is_archived), [sessions]);
  const stats = useMemo(() => ({
    total: activeSessions.length,
    favourites: activeSessions.filter((s) => s.is_favourite).length,
    actionPoints: computeActionPointTotal(activeSessions),
    words: computeSearchableWords(activeSessions),
  }), [activeSessions]);

  const handleDeleteFolder = async (folderId) => {
    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.functions.invoke("transcribe", {
        action: "delete_folder",
        organisation_id: activeOrg.id,
        folder_id: folderId,
      });
      toast({ title: "Folder deleted" });
      window.location.reload();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Delete failed", variant: "destructive" });
    }
  };

  const handleDeleteTag = async (tagId) => {
    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.functions.invoke("transcribe", {
        action: "delete_tag",
        organisation_id: activeOrg.id,
        tag_id: tagId,
      });
      toast({ title: "Tag deleted" });
      window.location.reload();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Delete failed", variant: "destructive" });
    }
  };

  if (wsLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
        <p className="text-sm text-muted-foreground">Loading transcripts…</p>
      </div>
    );
  }

  if (!activeOrg) {
    return <div className="text-center py-20 text-muted-foreground">Select an organisation to view transcripts.</div>;
  }

  return (
    <div className="space-y-5">
      <BeginnerGuide module="transcribe" orgType={activeOrg?.type} />

      {/* FADS Listening Player — hero */}
      <FadsListeningPlayer
        transcribeAudioFile={transcribeAudioFile}
        createSession={createSession}
        saveSegments={saveSegments}
        generateAI={generateAI}
        onUploadAudio={() => setShowImport(true)}
      />

      {/* Mini Y2K counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <TranscribeCounter label="Transcripts" value={String(stats.total).padStart(2, "0")} sublabel="Saved" icon={FileAudio} />
        <TranscribeCounter label="Actions" value={String(stats.actionPoints).padStart(2, "0")} sublabel="Found" icon={Sparkles} />
        <TranscribeCounter label="Words" value={stats.words.toLocaleString()} sublabel="Searchable" icon={FileText} />
        <TranscribeCounter label="Favourites" value={String(stats.favourites).padStart(2, "0")} sublabel="Starred" icon={Star} />
      </div>

      {/* Not sure? Ask FADS to guide me */}
      <div className="flex items-center justify-between bg-brand-mint/40 border border-brand-teal/20 rounded-xl p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-navy">Not sure which one to use?</p>
          <p className="text-xs text-muted-foreground">Ask FADS and I&rsquo;ll guide you.</p>
        </div>
        <Link to="/assistant?q=which+transcribe+option+should+I+use" className="shrink-0">
          <Button size="sm" variant="outline" className="min-h-touch">
            <Bot className="w-3.5 h-3.5" /> Ask FADS
          </Button>
        </Link>
      </div>

      {/* Quick Actions — grouped (secondary to the player) */}
      <div>
        <h2 className="font-semibold text-brand-navy mb-3">Quick Actions</h2>
        <TranscribeQuickActions orgType={activeOrg?.type} />
      </div>

      {/* Tools — power tools, kept available but not dominant */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Tools</p>
        <div className="flex gap-2 flex-wrap">
          <Link to="/transcribe/officer">
            <Button variant="outline" size="sm" className="h-8">
              <Bot className="w-3.5 h-3.5" /> Officer
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowManager(true)} className="h-8">
            <Settings2 className="w-3.5 h-3.5" /> Organise
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(activeSessions)} disabled={activeSessions.length === 0} className="h-8">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="h-8">
            <FileText className="w-3.5 h-3.5" /> Import
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-2 pt-2 border-t border-border">
        <TranscriptSearchBar value={search} onChange={setSearch} />
        <TranscriptFilters value={filters} onChange={setFilters} folders={folders} tags={tags} />
      </div>

      {/* Session list */}
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-brand-mint flex items-center justify-center mx-auto mb-4">
            <FileAudio className="w-7 h-7 text-brand-teal" />
          </div>
          <h2 className="text-base font-semibold text-brand-navy mb-1">
            {sessions.length === 0 ? "No transcripts yet" : "No matching sessions"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {sessions.length === 0
              ? "Record a meeting or import a transcript to get started."
              : "Try clearing your search or filters."}
          </p>
          {sessions.length === 0 && (
            <div className="flex gap-2 justify-center">
              <Link to="/transcribe/studio">
                <Button><Mic className="w-4 h-4" /> Start Recording</Button>
              </Link>
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <FileText className="w-4 h-4" /> Import TXT
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onFavourite={() => toggleFavourite(s.id)}
              onArchive={() => archiveSession(s.id, !s.is_archived)}
              onDelete={() => deleteSession(s.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <FolderTagManager
        open={showManager}
        onClose={setShowManager}
        folders={folders}
        tags={tags}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onCreateTag={createTag}
        onDeleteFolder={handleDeleteFolder}
        onDeleteTag={handleDeleteTag}
      />
      <ImportDialog
        open={showImport}
        onClose={setShowImport}
        folders={folders}
        onImport={importText}
      />
    </div>
  );
}

function SessionCard({ session, onFavourite, onArchive, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const date = session.session_date
    ? new Date(session.session_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <Card className="p-4 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/transcribe/${session.id}`} className="min-w-0 flex-1">
          <p className="font-medium text-sm text-brand-navy truncate hover:underline">{session.title}</p>
          <p className="text-xs text-muted-foreground">
            {sessionTypeLabel(session.session_type)} · {date}
          </p>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onFavourite} className={`p-1 ${session.is_favourite ? "text-status-warn" : "text-muted-foreground hover:text-status-warn"}`}>
            <Star className={`w-4 h-4 ${session.is_favourite ? "fill-status-warn" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          session.status === "completed" ? "bg-status-ok/15 text-status-ok" : "bg-status-warn/15 text-status-warn"
        }`}>
          {session.status}
        </span>
        {session.review_status && session.review_status !== "draft" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {reviewStatusLabel(session.review_status)}
          </span>
        )}
        {session.imported_file_name && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal">
            Imported
          </span>
        )}
      </div>

      {(session.summary || session.full_text) && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {(session.summary || session.full_text || "").slice(0, 150)}
          {(session.summary || session.full_text || "").length > 150 ? "…" : ""}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {formatDuration(session.duration_seconds)}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> {session.segment_count} seg
        </span>
        {session.action_points && session.action_points.length > 0 && (
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {session.action_points.length} action{session.action_points.length !== 1 ? "s" : ""}
          </span>
        )}
        {session.folder_name && (
          <span className="flex items-center gap-1">
            <Folder className="w-3 h-3" /> {session.folder_name}
          </span>
        )}
      </div>

      {session.tags && session.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {session.tags.map((t) => (
            <span key={t} className="text-[10px] bg-brand-mint text-brand-navy px-1.5 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 pt-1 border-t border-border">
        <Link to={`/transcribe/${session.id}`} className="flex-1">
          <button className="text-xs text-brand-teal font-medium hover:underline flex items-center gap-0.5">
            Open <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={onArchive} className="text-muted-foreground hover:text-brand-navy p-1" title={session.is_archived ? "Unarchive" : "Archive"}>
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (!confirmDel) {
                setConfirmDel(true);
                setTimeout(() => setConfirmDel(false), 3000);
              } else {
                onDelete();
              }
            }}
            className={`p-1 ${confirmDel ? "text-status-bad font-medium" : "text-muted-foreground hover:text-destructive"}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}