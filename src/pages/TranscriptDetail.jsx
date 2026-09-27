import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useTranscribe } from "@/lib/useTranscribe";
import {
  sessionTypeLabel, formatDuration, reviewStatusLabel,
  REVIEW_STATUSES, TRANSCRIBE_SESSION_TYPES, TRANSCRIBE_LANGUAGES,
} from "@/lib/transcribeConstants";
import { downloadTXT, downloadPDF } from "@/lib/transcribeExport";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import AIPanel from "@/components/transcribe/AIPanel";
import DecisionsEditor from "@/components/transcribe/DecisionsEditor";
import ActionPointsEditor from "@/components/transcribe/ActionPointsEditor";
import {
  ArrowLeft, Download, FileText, Star, Archive, Trash2,
  Save, Loader2, Clock, Users, Info, Bot, Calendar,
  ChevronRight, UserCircle,
} from "lucide-react";

// Transcript Detail — full transcript record with Meeting Intelligence.
export default function TranscriptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const {
    getSession, updateSession, saveSegments, deleteSession,
    toggleFavourite, archiveSession, generateAI, updateReviewStatus,
    folders, tags,
  } = useTranscribe(activeOrg);
  const { toast } = useToast();

  const [session, setSession] = useState(null);
  const [segments, setSegments] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [savingIntel, setSavingIntel] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // Editable state
  const [transcriptText, setTranscriptText] = useState("");
  const [summary, setSummary] = useState("");
  const [minutes, setMinutes] = useState("");
  const [decisions, setDecisions] = useState([]);
  const [actionPoints, setActionPoints] = useState([]);
  const [lectureNotes, setLectureNotes] = useState("");
  const [meta, setMeta] = useState({});

  const isLecture = session?.session_type === "lecture";

  useEffect(() => {
    if (!activeOrg || !id) return;
    setLoading(true);
    getSession(id)
      .then((data) => {
        setSession(data.session);
        setSegments(data.segments || []);
        setSpeakers(data.speakers || []);
        setTranscriptText((data.segments || []).map((s) => s.text).join("\n"));
        setSummary(data.session.summary || "");
        setMinutes(data.session.minutes || "");
        setDecisions(data.session.decisions || []);
        setActionPoints(data.session.action_points || []);
        setLectureNotes(data.session.lecture_notes || "");
        setMeta({
          title: data.session.title,
          session_type: data.session.session_type,
          session_date: data.session.session_date ? data.session.session_date.slice(0, 16) : "",
          language: data.session.language,
          participants: data.session.participants || [],
          folder_id: data.session.folder_id,
          tags: data.session.tags || [],
          notes: data.session.notes || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message);
        setLoading(false);
      });
  }, [activeOrg?.id, id]);

  // ---- Handlers ----
  const handleSaveTranscript = async () => {
    setSavingTranscript(true);
    try {
      const lines = transcriptText.split("\n").filter((l) => l.trim());
      const newSegments = lines.map((text, i) => ({
        text, sequence: i, start_time: 0, end_time: 0, speaker_name: "", is_final: true,
      }));
      await saveSegments(id, newSegments, []);
      const data = await getSession(id);
      setSegments(data.segments);
      setSession(data.session);
      toast({ title: "Transcript saved" });
    } catch (e) {
      toast({ title: e.response?.data?.error || "Save failed", variant: "destructive" });
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleSaveIntel = async () => {
    setSavingIntel(true);
    try {
      const updated = await updateSession(id, {
        summary, minutes, decisions,
        action_points: actionPoints,
        lecture_notes: isLecture ? lectureNotes : "",
      });
      setSession(updated);
      toast({ title: "Intelligence saved" });
    } catch (e) {
      toast({ title: e.response?.data?.error || "Save failed", variant: "destructive" });
    } finally {
      setSavingIntel(false);
    }
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      const updated = await updateSession(id, {
        ...meta,
        session_date: meta.session_date ? new Date(meta.session_date).toISOString() : undefined,
      });
      setSession(updated);
      toast({ title: "Details saved" });
    } catch (e) {
      toast({ title: e.response?.data?.error || "Save failed", variant: "destructive" });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const updated = await generateAI(id);
      setSession(updated);
      setSummary(updated.summary || "");
      setMinutes(updated.minutes || "");
      setDecisions(updated.decisions || []);
      setActionPoints(updated.action_points || []);
      setLectureNotes(updated.lecture_notes || "");
      toast({ title: "AI drafts generated" });
    } catch (e) {
      toast({ title: e.response?.data?.error || "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (status) => {
    try {
      const updated = await updateReviewStatus(id, status);
      setSession(updated);
      toast({ title: `Review status: ${reviewStatusLabel(status)}` });
    } catch (e) {
      toast({ title: e.response?.data?.error || "Update failed", variant: "destructive" });
    }
  };

  const handleFavourite = async () => {
    const updated = await toggleFavourite(id);
    setSession(updated);
  };

  const handleArchive = async () => {
    const updated = await archiveSession(id, !session.is_archived);
    setSession(updated);
    toast({ title: session.is_archived ? "Unarchived" : "Archived" });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this transcript? This cannot be undone.")) return;
    await deleteSession(id);
    navigate("/transcribe");
  };

  // ---- Render ----
  if (wsLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
        <p className="text-sm text-muted-foreground">Loading transcript…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-sm text-muted-foreground">{error || "Transcript not found"}</p>
        <Link to="/transcribe"><Button variant="outline" size="sm">Back to Library</Button></Link>
      </div>
    );
  }

  const dateStr = session.session_date
    ? new Date(session.session_date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "";

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Back link */}
      <Link to="/transcribe" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
        <ArrowLeft className="w-4 h-4" /> Library
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-brand-navy break-words">{session.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sessionTypeLabel(session.session_type)} · {dateStr} · {formatDuration(session.duration_seconds)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            session.status === "completed" ? "bg-status-ok/15 text-status-ok" : "bg-status-warn/15 text-status-warn"
          }`}>
            {session.status}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {reviewStatusLabel(session.review_status)}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => downloadTXT(session, segments)} className="h-8">
          <Download className="w-3.5 h-3.5" /> TXT
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadPDF(session, segments)} className="h-8">
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleFavourite} className="h-8">
          <Star className={`w-3.5 h-3.5 ${session.is_favourite ? "fill-status-warn text-status-warn" : ""}`} />
        </Button>
        <Button variant="outline" size="sm" onClick={handleArchive} className="h-8">
          <Archive className="w-3.5 h-3.5" /> {session.is_archived ? "Unarchive" : "Archive"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDelete} className="h-8 text-destructive hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transcript">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="transcript" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" /> Transcript</TabsTrigger>
          <TabsTrigger value="intelligence" className="text-xs"><Bot className="w-3.5 h-3.5 mr-1" /> Intelligence</TabsTrigger>
          <TabsTrigger value="details" className="text-xs"><Info className="w-3.5 h-3.5 mr-1" /> Details</TabsTrigger>
        </TabsList>

        {/* Transcript tab */}
        <TabsContent value="transcript" className="space-y-3 mt-3">
          <div className="bg-brand-mint/30 border border-brand-teal/20 rounded-xl p-2.5 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
            <p className="text-xs text-brand-navy">
              <span className="font-medium">Consent:</span> Everyone present should have agreed to being recorded. Automated transcripts are drafts — verify before official use.
            </p>
          </div>
          <Card className="p-4 space-y-3">
            <div>
              <Label htmlFor="transcript" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-teal" /> Transcript Text
              </Label>
              <Textarea
                id="transcript"
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Transcript text…"
                className="mt-1.5 min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {transcriptText.split("\n").filter((l) => l.trim()).length} segment(s) · {formatDuration(session.duration_seconds)} recorded
              </p>
            </div>
            <Button onClick={handleSaveTranscript} disabled={savingTranscript} className="h-9">
              {savingTranscript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Transcript
            </Button>
          </Card>
        </TabsContent>

        {/* Intelligence tab */}
        <TabsContent value="intelligence" className="space-y-3 mt-3">
          <Card className="p-4 space-y-4">
            <AIPanel session={session} onGenerate={handleGenerateAI} onReview={handleReview} generating={generating} />

            <>
                <div>
                  <Label>Summary</Label>
                  <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1 min-h-[100px]" placeholder="Summary…" />
                </div>
                <div>
                  <Label>Meeting Minutes</Label>
                  <Textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1 min-h-[150px]" placeholder="Minutes…" />
                </div>
                <div>
                  <Label>Key Decisions or Resolutions</Label>
                  <div className="mt-1"><DecisionsEditor decisions={decisions} onChange={setDecisions} /></div>
                </div>
                <div>
                  <Label>Action Points</Label>
                  <div className="mt-1"><ActionPointsEditor actionPoints={actionPoints} onChange={setActionPoints} /></div>
                </div>
                {isLecture && (
                  <div>
                    <Label>Lecture Notes</Label>
                    <Textarea value={lectureNotes} onChange={(e) => setLectureNotes(e.target.value)} className="mt-1 min-h-[150px]" placeholder="Lecture notes…" />
                  </div>
                )}
                <Button onClick={handleSaveIntel} disabled={savingIntel} className="h-9">
                  {savingIntel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Intelligence
                </Button>
            </>
          </Card>
        </TabsContent>

        {/* Details tab */}
        <TabsContent value="details" className="space-y-3 mt-3">
          <Card className="p-4 space-y-3">
            <div>
              <Label htmlFor="d-title">Title</Label>
              <Input id="d-title" value={meta.title || ""} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Session type</Label>
                <Select value={meta.session_type || "other"} onValueChange={(v) => setMeta((m) => ({ ...m, session_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSCRIBE_SESSION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="d-date">Date and time</Label>
                <Input id="d-date" type="datetime-local" value={meta.session_date || ""} onChange={(e) => setMeta((m) => ({ ...m, session_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Language</Label>
                <Select value={meta.language || "en"} onValueChange={(v) => setMeta((m) => ({ ...m, language: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSCRIBE_LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Folder</Label>
                <Select value={meta.folder_id || "none"} onValueChange={(v) => setMeta((m) => ({ ...m, folder_id: v === "none" ? null : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="d-participants">Participants (comma-separated)</Label>
              <Input
                id="d-participants"
                value={(meta.participants || []).join(", ")}
                onChange={(e) => setMeta((m) => ({ ...m, participants: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="d-tags">Tags (comma-separated)</Label>
              <Input
                id="d-tags"
                value={(meta.tags || []).join(", ")}
                onChange={(e) => setMeta((m) => ({ ...m, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="d-notes">Notes</Label>
              <Textarea id="d-notes" value={meta.notes || ""} onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))} className="mt-1 min-h-[80px]" />
            </div>

            {/* Speakers */}
            {speakers.length > 0 && (
              <div>
                <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Speakers</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {speakers.map((sp, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <UserCircle className="w-3 h-3 text-brand-teal" /> {sp.name}
                      {sp.role && <span className="text-muted-foreground">· {sp.role}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Created: {session.created_date ? new Date(session.created_date).toLocaleString() : "—"} by {session.created_by_name || "—"}</p>
              <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Updated: {session.updated_date ? new Date(session.updated_date).toLocaleString() : "—"}</p>
              {session.reviewed_by_name && (
                <p className="flex items-center gap-1.5"><UserCircle className="w-3 h-3" /> Reviewed by {session.reviewed_by_name} on {session.reviewed_date || "—"}</p>
              )}
              {session.imported_file_name && (
                <p className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Imported from: {session.imported_file_name}</p>
              )}
            </div>

            <Button onClick={handleSaveDetails} disabled={savingDetails} className="h-9">
              {savingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Details
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}