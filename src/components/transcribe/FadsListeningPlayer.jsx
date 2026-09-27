import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import AudioBars from "@/components/transcribe/AudioBars";
import {
  Mic, Pause, Square, Play, Upload, FileText,
  Bot, ListChecks, FileAudio, Loader2, CheckCircle2,
  ChevronRight, RefreshCw, AlertCircle,
} from "lucide-react";

// FADS Listening Player — a friendly Y2K digital recorder hero for the
// Transcribe home page. Reuses the existing useAudioRecorder hook and the
// existing transcribe backend (transcribeAudioFile, createSession,
// saveSegments, generateAI). No new entities, no new transcription engine.
//
// States: idle → recording → paused → processing → finished
export default function FadsListeningPlayer({
  transcribeAudioFile,
  createSession,
  saveSegments,
  generateAI,
  onUploadAudio,
}) {
  const recorder = useAudioRecorder();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [sessionType, setSessionType] = useState("voice_note");
  const [savedSession, setSavedSession] = useState(null);
  const [stages, setStages] = useState({ uploaded: false, transcribed: false, notes: false });
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const elapsedBaseRef = useRef(0);

  // ── Timer ──
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current + elapsedBaseRef.current) / 1000));
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedBaseRef.current += Date.now() - startTimeRef.current;
  };
  const resetTimer = () => {
    elapsedBaseRef.current = 0;
    setElapsed(0);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Recording flow ──
  const handleStart = (type = "voice_note") => {
    // The live Web Speech state and corrected single-listener lifecycle live in
    // TranscribeStudio. Route every home-page recording entry point there so
    // the production recorder renders its existing interimText/finalSegments.
    navigate(`/transcribe/studio?type=${encodeURIComponent(type)}`);
  };

  const handlePause = () => {
    recorder.pause();
    stopTimer();
    setPhase("paused");
  };

  const handleResume = () => {
    recorder.resume();
    startTimer();
    setPhase("recording");
  };

  const handleFinish = async () => {
    stopTimer();
    setPhase("processing");
    setStages({ uploaded: false, transcribed: false, notes: false });
    try {
      const blob = await recorder.stop();
      if (!blob || blob.size === 0) {
        setError("No audio was captured. Check your microphone and try again.");
        setPhase("idle");
        resetTimer();
        return;
      }
      setStages((s) => ({ ...s, uploaded: true }));

      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      const file = new File([blob], `recording.${ext}`, { type: blob.type });
      const transcript = await transcribeAudioFile(file);
      const text = (transcript || "").trim();
      setStages((s) => ({ ...s, transcribed: true }));

      if (!text) {
        setError("No speech was detected. Try again in a quieter spot and speak clearly.");
        setPhase("idle");
        resetTimer();
        return;
      }

      const now = new Date();
      const title = `Recording ${now.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const session = await createSession({
        title,
        session_type: sessionType,
        session_date: now.toISOString(),
        language: "en",
        participants: [],
        folder_id: null,
        tags: [],
        notes: "",
        status: "completed",
      });

      const lines = text.split("\n").filter((l) => l.trim());
      const segments = lines.map((line, i) => ({
        text: line,
        sequence: i,
        start_time: elapsed > 0 ? (elapsed / lines.length) * i : 0,
        end_time: elapsed > 0 ? (elapsed / lines.length) * (i + 1) : 0,
        speaker_name: "",
        is_final: true,
      }));
      await saveSegments(session.id, segments, []);

      const updated = await generateAI(session.id);
      setStages((s) => ({ ...s, notes: true }));
      setSavedSession(updated);
      setPhase("finished");
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Something went wrong. Please try again.");
      setPhase("idle");
      resetTimer();
    }
  };

  const handleReset = () => {
    setSavedSession(null);
    setPhase("idle");
    resetTimer();
    setStages({ uploaded: false, transcribed: false, notes: false });
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorder.cancel();
    };
  }, []);

  const actionCount = savedSession?.action_points?.length || 0;

  // ── IDLE ──
  if (phase === "idle") {
    return (
      <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS LISTENING</p>
        </div>

        <div className="flex flex-col items-center py-2">
          <FadsRobotAvatar size="lg" />
          <p className="text-lg font-medium text-white mt-3">Ready when you are</p>
          <p className="text-2xl font-mono text-white/25 mt-2 tabular-nums">{formatTime(0)}</p>
          <div className="mt-2 opacity-25">
            <AudioBars isActive={false} />
          </div>
        </div>

        <button
          onClick={() => handleStart("voice_note")}
          className="w-full inline-flex items-center justify-center gap-2 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-3.5 text-sm font-bold tracking-wide min-h-touch transition-colors"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-status-bad" />
          START RECORDING
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onUploadAudio}
            className="inline-flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 rounded-xl py-2.5 px-1 text-xs text-white/70 min-h-touch transition-colors"
          >
            <Upload className="w-4 h-4 text-brand-teal" />
            Import
          </button>
          <button
            onClick={() => handleStart("voice_note")}
            className="inline-flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 rounded-xl py-2.5 px-1 text-xs text-white/70 min-h-touch transition-colors"
          >
            <Mic className="w-4 h-4 text-brand-teal" />
            Voice Note
          </button>
          <button
            onClick={() => handleStart("business_meeting")}
            className="inline-flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 rounded-xl py-2.5 px-1 text-xs text-white/70 min-h-touch transition-colors"
          >
            <Bot className="w-4 h-4 text-brand-teal" />
            Meeting
          </button>
        </div>

        {/* Flow: Record → FADS listens → Notes → Actions */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1">
          <FlowStep icon={Mic} label="Record" />
          <ChevronRight className="w-3 h-3 text-white/15" />
          <FlowStep icon={Bot} label="FADS listens" />
          <ChevronRight className="w-3 h-3 text-white/15" />
          <FlowStep icon={FileText} label="Notes" />
          <ChevronRight className="w-3 h-3 text-white/15" />
          <FlowStep icon={ListChecks} label="Actions" />
        </div>

        <div className="bg-white/5 rounded-xl p-3 space-y-1">
          <p className="text-xs text-white/80 leading-relaxed">
            &ldquo;Talk normally. I&rsquo;ll turn it into something useful.&rdquo;
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            I can transcribe it, summarise it and find the important action points.
          </p>
        </div>

        {error && (
          <div className="bg-status-bad/10 border border-status-bad/30 rounded-xl p-2.5 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-status-bad shrink-0 mt-0.5" />
            <p className="text-xs text-status-bad">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── RECORDING / PAUSED ──
  if (phase === "recording" || phase === "paused") {
    return (
      <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              phase === "recording" ? "bg-status-bad animate-pulse" : "bg-status-warn"
            }`}
          />
          <p
            className={`text-[11px] uppercase tracking-[0.2em] font-semibold ${
              phase === "recording" ? "text-status-bad" : "text-status-warn"
            }`}
          >
            {phase === "recording" ? "FADS IS LISTENING" : "PAUSED"}
          </p>
        </div>

        <div className="flex flex-col items-center py-2">
          <div className="relative">
            <FadsRobotAvatar size="lg" />
            <span
              className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-brand-navy ${
                phase === "recording" ? "bg-status-bad animate-pulse" : "bg-status-warn"
              }`}
            />
          </div>
          <p className="text-3xl font-mono text-brand-teal mt-3 tabular-nums tracking-wider">
            {formatTime(elapsed)}
          </p>
          <div className="mt-3 w-full max-w-[220px]">
            <AudioBars isActive={phase === "recording"} audioLevel={recorder.audioLevel} />
          </div>
        </div>

        <div className="flex gap-2">
          {phase === "recording" ? (
            <button
              onClick={handlePause}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
            >
              <Play className="w-4 h-4" /> Resume
            </button>
          )}
          <button
            onClick={handleFinish}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-status-bad hover:bg-status-bad/90 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <Square className="w-4 h-4" /> Finish
          </button>
        </div>
      </div>
    );
  }

  // ── PROCESSING ──
  if (phase === "processing") {
    return (
      <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">
            FADS IS WORKING ON IT...
          </p>
        </div>

        <div className="flex flex-col items-center py-4">
          <Loader2 className="w-7 h-7 animate-spin text-brand-teal mb-4" />
          <div className="space-y-2.5 w-full max-w-[280px]">
            <Stage done={stages.uploaded} label="Audio received" />
            <Stage done={stages.transcribed} label="Transcript created" />
            <Stage
              done={stages.notes}
              loading={!stages.notes}
              label="Creating notes & action points"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── FINISHED ──
  if (phase === "finished" && savedSession) {
    const message =
      actionCount > 0
        ? `All done. I found ${actionCount} action ${actionCount !== 1 ? "points" : "point"} and created your meeting notes.`
        : "All done. I've created your transcript and meeting notes.";

    return (
      <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS SAYS</p>
        </div>

        <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
          <FadsRobotAvatar size="sm" className="shrink-0" />
          <p className="text-sm text-white/90 leading-relaxed pt-0.5">&ldquo;{message}&rdquo;</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link
            to={`/transcribe/${savedSession.id}`}
            className="inline-flex items-center justify-center gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-2.5 text-xs font-medium min-h-touch transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Read Summary
          </Link>
          <Link
            to={`/transcribe/${savedSession.id}`}
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-2.5 text-xs font-medium min-h-touch transition-colors"
          >
            <ListChecks className="w-3.5 h-3.5" /> See Action Points
          </Link>
          <Link
            to={`/transcribe/${savedSession.id}`}
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-2.5 text-xs font-medium min-h-touch transition-colors"
          >
            <FileAudio className="w-3.5 h-3.5" /> Open Transcript
          </Link>
        </div>

        <button
          onClick={handleReset}
          className="w-full inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl py-2.5 text-xs font-medium min-h-touch transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Record Another
        </button>
      </div>
    );
  }

  return null;
}

// ── Helpers ──

function FlowStep({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-brand-teal" />
      </div>
      <p className="text-[9px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

function Stage({ done, loading, label }) {
  return (
    <div className="flex items-center gap-2.5">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-status-ok shrink-0" />
      ) : loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-brand-teal shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-white/15 shrink-0" />
      )}
      <span className={`text-sm ${done ? "text-white/90" : loading ? "text-white/70" : "text-white/30"}`}>
        {label}
      </span>
    </div>
  );
}