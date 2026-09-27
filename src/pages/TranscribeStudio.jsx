import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useTranscribe } from "@/lib/useTranscribe";
import { formatDuration } from "@/lib/transcribeConstants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mic, AlertCircle, Loader2, ArrowLeft, CheckCircle2,
  FileText, Save, X, Info,
} from "lucide-react";
import SessionSetup from "@/components/transcribe/SessionSetup";
import PermissionGate from "@/components/transcribe/PermissionGate";
import RecordingControls from "@/components/transcribe/RecordingControls";
import AudioBars from "@/components/transcribe/AudioBars";
import FadsRobotLoader from "@/components/FadsRobotLoader";
import { useToast } from "@/components/ui/use-toast";
import { useAudioRecorder } from "@/lib/useAudioRecorder";

// Live Transcribe Studio. Uses the browser's Web Speech API for real-time
// speech-to-text. The microphone is never activated before the user presses
// Start and grants permission. Audio is not stored — only the transcript text.
export default function TranscribeStudio() {
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const { createSession, saveSegments, folders, tags, transcribeAudioFile } = useTranscribe(activeOrg);
  const recorder = useAudioRecorder();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phase, setPhase] = useState("setup");
  const [setup, setSetup] = useState(() => {
    // Allow Quick Actions to preselect a session type via ?type= query param.
    const urlParams = new URLSearchParams(window.location.search);
    const presetType = urlParams.get("type") || "business_meeting";
    return {
      title: "",
      session_type: presetType,
      session_date: new Date().toISOString().slice(0, 16),
      language: "en",
      participants: [],
      folder_id: null,
      tags: [],
      notes: "",
    };
  });

  const [elapsed, setElapsed] = useState(0);
  const [finalSegments, setFinalSegments] = useState([]);
  const [interimText, setInterimText] = useState("");
  const [editableText, setEditableText] = useState("");
  const [audioLevel, setAudioLevel] = useState(null);
  const [showHeart, setShowHeart] = useState(false);
  const [noSpeech, setNoSpeech] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSession, setSavedSession] = useState(null);
  const [error, setError] = useState(null);
  const [transcribeError, setTranscribeError] = useState(null);
  const cancelProcessingRef = useRef(false);

  const recognitionRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const timerRef = useRef(null);
  const audioTimerRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const lastResultTimeRef = useRef(0);
  // Tracks which final result indices have already been appended to
  // finalSegments in the current recognition session. Chrome's Web Speech
  // API (continuous=true) can re-emit already-final results — without this
  // guard the same phrase is appended multiple times, duplicating the text.
  const processedFinalsRef = useRef(new Set());
  // Chrome may replay the last final phrase at index 0 after an automatic
  // recognizer restart. Index-only dedupe cannot span that boundary.
  const lastFinalRef = useRef({ text: "", at: 0 });
  const startTimeRef = useRef(0);
  const elapsedBaseRef = useRef(0);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognition;
  const hasMediaRecorder = typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
  const mode = speechSupported ? "live" : (hasMediaRecorder ? "record" : "none");
  const canTranscribe = mode !== "none";

  // ---- Timer ----
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

  // ---- Audio analysis ----
  const startAudioAnalysis = (stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      audioTimerRef.current = setInterval(() => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(1, avg / 100));
      }, 200);
    } catch (e) {
      // Audio analysis is optional — fall back to CSS animation
    }
  };
  const stopAudioAnalysis = () => {
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevel(null);
  };

  // ---- Speech recognition ----
  const startRecognition = useCallback(() => {
    if (!SpeechRecognition || recognitionRef.current) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = setup.language || "en";

    recognition.onresult = (event) => {
      // Ignore callbacks from a recognizer that has been stopped or replaced.
      // Without this ownership check, a late onend/onresult from the previous
      // instance can overlap a newly resumed recognizer and append speech twice.
      if (recognitionRef.current !== recognition) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Append each final result once per session — the Web Speech API
          // can re-deliver a final result, which would otherwise duplicate it.
          if (!processedFinalsRef.current.has(i)) {
            processedFinalsRef.current.add(i);
            const text = transcript.trim();
            const receivedAt = Date.now();
            const normalized = text.toLowerCase().replace(/\s+/g, " ");
            const replayedAfterRestart =
              normalized &&
              normalized === lastFinalRef.current.text &&
              receivedAt - lastFinalRef.current.at < 2000;
            if (!replayedAfterRestart && text) {
              lastFinalRef.current = { text: normalized, at: receivedAt };
              const now = (receivedAt - startTimeRef.current + elapsedBaseRef.current) / 1000;
              setFinalSegments((prev) => [
                ...prev,
                { text, start_time: now, end_time: now + 1 },
              ]);
            }
          }
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
      lastResultTimeRef.current = Date.now();
      setNoSpeech(false);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldRestartRef.current = false;
        setPhase("denied");
        stopTimer();
        stopAudioAnalysis();
      }
    };

    recognition.onend = () => {
      // Only the currently owned recognizer may restart. A recognizer stopped
      // during pause/stop can fire onend later, after resume has created a new
      // instance; restarting that stale instance would create two listeners.
      if (recognitionRef.current === recognition && shouldRestartRef.current) {
        // A new recognition session begins — result indices restart at 0.
        processedFinalsRef.current = new Set();
        try { recognition.start(); } catch (e) {}
      }
    };

    processedFinalsRef.current = new Set();
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    }
  }, [SpeechRecognition, setup.language]);

  const stopRecognition = () => {
    shouldRestartRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  };

  // ---- Recording flow ----
  const beginRecording = async () => {
    setError(null);
    setFinalSegments([]);
    setInterimText("");
    processedFinalsRef.current = new Set();
    lastFinalRef.current = { text: "", at: 0 };
    setNoSpeech(false);
    setTranscribeError(null);
    resetTimer();
    lastResultTimeRef.current = Date.now();

    if (mode === "record") {
      try {
        await recorder.start();
      } catch (e) {
        setPhase("denied");
        return;
      }
      startTimer();
      setPhase("recording");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      startAudioAnalysis(stream);
    } catch (e) {
      setPhase("denied");
      return;
    }

    shouldRestartRef.current = true;
    startRecognition();
    startTimer();
    setPhase("recording");
  };

  const handlePause = () => {
    if (mode === "record") {
      recorder.pause();
    } else {
      shouldRestartRef.current = false;
      stopRecognition();
    }
    stopTimer();
    stopAudioAnalysis();
    setPhase("paused");
  };

  const handleResume = () => {
    if (mode === "record") {
      recorder.resume();
    } else {
      shouldRestartRef.current = true;
      startRecognition();
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        audioStreamRef.current = stream;
        startAudioAnalysis(stream);
      }).catch(() => {});
    }
    startTimer();
    setPhase("recording");
  };

  const handleStop = async () => {
    if (mode === "record") {
      stopTimer();
      cancelProcessingRef.current = false;
      const blob = await recorder.stop();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1500);
      setInterimText("");
      if (!blob || blob.size === 0) {
        setTranscribeError("No audio was captured. Check your microphone and try again.");
        setEditableText("");
        setPhase("stopped");
        return;
      }
      setPhase("processing");
      try {
        const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
        const file = new File([blob], `recording.${ext}`, { type: blob.type });
        const transcript = await transcribeAudioFile(file);
        if (cancelProcessingRef.current) return;
        const text = (transcript || "").trim();
        setEditableText(text);
        setTranscribeError(
          text ? null : "No speech was detected in the recording. Try again in a quieter spot and speak clearly."
        );
      } catch (e) {
        if (cancelProcessingRef.current) return;
        setTranscribeError(e.response?.data?.error || e.message || "Transcription failed. Try again.");
        setEditableText("");
      }
      setPhase("stopped");
      return;
    }

    stopRecognition();
    stopTimer();
    stopAudioAnalysis();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1500);
    const text = finalSegments.map((s) => s.text).join("\n");
    setEditableText(text);
    setInterimText("");
    setPhase("stopped");
  };

  const handleDiscard = () => {
    if (mode === "record") recorder.cancel();
    setFinalSegments([]);
    processedFinalsRef.current = new Set();
    lastFinalRef.current = { text: "", at: 0 };
    setEditableText("");
    setTranscribeError(null);
    resetTimer();
    setPhase("setup");
  };

  const handleCancelProcessing = () => {
    cancelProcessingRef.current = true;
    recorder.cancel();
    resetTimer();
    setPhase("setup");
  };

  const handleSave = async (status) => {
    if (!activeOrg) return;
    setSaving(true);
    setError(null);
    try {
      const session = await createSession({
        ...setup,
        status,
        session_date: setup.session_date
          ? new Date(setup.session_date).toISOString()
          : new Date().toISOString(),
      });

      const lines = editableText.split("\n").filter((l) => l.trim());
      const segments = lines.map((text, i) => ({
        text,
        sequence: i,
        start_time: elapsed > 0 ? (elapsed / lines.length) * i : 0,
        end_time: elapsed > 0 ? (elapsed / lines.length) * (i + 1) : 0,
        speaker_name: "",
        is_final: true,
      }));

      await saveSegments(session.id, segments, []);
      setSavedSession(session);
      toast({ title: status === "completed" ? "Transcript saved" : "Draft saved" });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  // No-speech detection (live mode only)
  useEffect(() => {
    if (phase !== "recording" || mode !== "live") return;
    const interval = setInterval(() => {
      if (Date.now() - lastResultTimeRef.current > 5000 && finalSegments.length === 0) {
        setNoSpeech(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, mode, finalSegments.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      recorder.cancel();
    };
  }, []);

  // ---- Render ----
  if (wsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
        <p className="text-sm text-muted-foreground">Loading studio…</p>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Select an organisation to start recording.
      </div>
    );
  }

  // Saved state
  if (savedSession) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-full bg-status-ok/15 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-status-ok" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-navy">Transcript saved</h2>
          <p className="text-sm text-muted-foreground">
            "{savedSession.title}" has been saved as {savedSession.status}.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Link to="/transcribe">
            <Button variant="outline">View all transcripts</Button>
          </Link>
          <Button onClick={() => {
            setSavedSession(null);
            setPhase("setup");
            setSetup({ ...setup, title: "" });
            setEditableText("");
            resetTimer();
            setFinalSegments([]);
          }}>
            <Mic className="w-4 h-4" /> New Recording
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Back link */}
      {phase === "setup" && (
        <Link to="/transcribe" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
          <ArrowLeft className="w-4 h-4" /> Back to Transcribe
        </Link>
      )}
      {phase === "stopped" && (
        <button onClick={handleDiscard} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
          <ArrowLeft className="w-4 h-4" /> Discard and start over
        </button>
      )}

      <div className="rounded-2xl border border-brand-teal/20 bg-gradient-to-r from-brand-navy to-brand-navy/95 p-4 sm:p-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-teal/15 border border-brand-teal/30 flex items-center justify-center">
            <Mic className="w-5 h-5 text-brand-teal" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-teal font-semibold">FADS AI • Transcribe</p>
            <h1 className="text-xl sm:text-2xl font-bold">Turn Conversations Into Action.</h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1">{activeOrg.name} • Record, review and turn spoken conversations into useful records.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* SETUP PHASE */}
      {phase === "setup" && (
        <Card className="p-4 space-y-4">
          <SessionSetup
            value={setup}
            onChange={setSetup}
            folders={folders}
            tags={tags}
          />
          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              onClick={() => setPhase("permission")}
              disabled={!setup.title.trim()}
              className="h-11"
            >
              Continue <Mic className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* PERMISSION PHASE */}
      {phase === "permission" && (
        <Card className="p-4">
          <PermissionGate
            isSupported={speechSupported}
            canRecord={canTranscribe}
            mode={mode}
            onConfirm={canTranscribe ? beginRecording : () => {
              setEditableText("");
              setPhase("stopped");
            }}
            onCancel={() => setPhase("setup")}
          />
        </Card>
      )}

      {/* RECORDING / PAUSED PHASE */}
      {(phase === "recording" || phase === "paused") && (
        <div className="space-y-4">
          {/* Recording display — premium FADS business console with a subtle Y2K media-player feel */}
          <div className="rounded-[26px] p-[4px] relative overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#9ca3af] to-[#4b5563] shadow-[0_22px_55px_rgba(15,23,42,0.30)]">
          <div className="bg-gradient-to-b from-[#182633] via-brand-navy to-[#07111a] rounded-[22px] p-4 sm:p-6 space-y-5 relative overflow-hidden border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            {/* Subtle FADS glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS AI Transcribe Assistant</p>
                <p className="text-xs text-white/50 mt-0.5">Listening live • Your words appear below</p>
              </div>
              <span className="text-[10px] rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-1 text-brand-teal font-semibold">LIVE</span>
            </div>

            {/* Status + timer */}
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    phase === "recording" ? "bg-status-bad animate-pulse" : "bg-status-warn"
                  }`}
                />
                <span className="text-xs text-white/70 font-medium uppercase tracking-wide">
                  {phase === "recording" ? "Recording" : "Paused"}
                </span>
              </div>
              <div className="font-mono text-3xl text-brand-teal tabular-nums tracking-wider">
                {formatDuration(elapsed)}
              </div>
            </div>

            {/* Old-school FADS player display */}
            <div className="relative rounded-[22px] border border-white/70 bg-gradient-to-br from-[#f8fafc] via-[#c7cbd1] to-[#737982] p-[5px] shadow-[0_18px_50px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.95)]">
              <div className="rounded-[17px] border border-[#4b5563] bg-[radial-gradient(circle_at_top_left,rgba(24,201,188,0.10),transparent_34%),linear-gradient(180deg,#07151d_0%,#08111a_100%)] overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#d8dce1]/15 via-white/[0.03] to-[#d8dce1]/10 px-3 py-2 font-mono text-[10px] tracking-[0.16em] text-brand-teal/80">
                  <span>FADS//PLAYER</span>
                  <span>{phase === "recording" ? "● REC" : "II PAUSE"}</span>
                  <span>AI TAPE 01</span>
                </div>

                <div className="space-y-3 p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-[#aeb4bc] bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(0,0,0,0.14))] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                      <FadsRobotLoader compact message="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {phase === "recording" ? "Listening…" : "Paused"}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-teal/90">
                        {phase === "recording" ? "I can hear you…" : "Your recognised words are still here."}
                      </p>
                      <div className="mt-2 h-8 overflow-hidden rounded-lg border border-[#8f969f] bg-black/30 px-2">
                        <AudioBars isActive={phase === "recording"} audioLevel={mode === "record" ? recorder.audioLevel : audioLevel} />
                      </div>
                    </div>
                  </div>

                  <div className="min-h-[220px] max-h-[360px] overflow-y-auto rounded-xl border border-brand-teal/20 bg-black/35 p-4 shadow-[inset_0_0_24px_rgba(24,201,188,0.05)] sm:min-h-[260px] sm:p-5">
                    {mode === "record" ? (
                      <p className="text-base leading-7 text-white/60">
                        {phase === "recording"
                          ? "FADS AI is recording your audio. Your words will be transcribed when you finish."
                          : "Recording paused. Your audio is ready to continue."}
                      </p>
                    ) : (
                      <>
                        {finalSegments.length === 0 && !interimText && (
                          <p className="text-base leading-7 text-white/40">
                            Start speaking — your words will appear here…
                          </p>
                        )}
                        {finalSegments.length > 0 && (
                          <p className="whitespace-pre-wrap break-words text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
                            {finalSegments.map((s) => s.text).join(" ")}
                          </p>
                        )}
                        {interimText && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-brand-teal italic sm:text-lg sm:leading-8">
                            {interimText}
                          </p>
                        )}
                        {noSpeech && phase === "recording" && !interimText && finalSegments.length === 0 && (
                          <p className="mt-3 text-xs text-status-warn/90">
                            No speech detected yet.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[9px] text-white/40">
                    <div className="rounded-md border border-[#9da3aa] bg-gradient-to-b from-[#d5d8dc]/20 via-white/[0.04] to-black/10 px-2 py-1.5 text-center">MIC • ON</div>
                    <div className="rounded-md border border-[#9da3aa] bg-gradient-to-b from-[#d5d8dc]/20 via-white/[0.04] to-black/10 px-2 py-1.5 text-center">LEVEL • AUTO</div>
                    <div className="rounded-md border border-[#9da3aa] bg-gradient-to-b from-[#d5d8dc]/20 via-white/[0.04] to-black/10 px-2 py-1.5 text-center">TEXT • LIVE</div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-[9px] text-white/25">
                  <span>STEREO</span>
                  <span>VOICE → TEXT</span>
                  <span>NR • ON</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <RecordingControls
              phase={phase === "recording" ? "recording" : "paused"}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              showHeart={showHeart}
            />
          </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border bg-card p-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">1 • Listen</p><p className="text-xs font-medium text-brand-navy mt-1">Capture speech</p></div>
            <div className="rounded-xl border bg-card p-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">2 • Review</p><p className="text-xs font-medium text-brand-navy mt-1">Check transcript</p></div>
            <div className="rounded-xl border bg-card p-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">3 • FADS AI</p><p className="text-xs font-medium text-brand-navy mt-1">Create insights</p></div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Audio is processed live in your browser and is not stored. Everyone present should consent to being recorded.
          </p>
        </div>
      )}

      {/* DENIED PHASE */}
      {phase === "denied" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-start gap-2 bg-status-warn/10 border border-status-warn/30 rounded-xl p-3">
            <AlertCircle className="w-5 h-5 text-status-warn shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-status-warn">Microphone access denied</p>
              <p className="text-xs text-muted-foreground mt-1">
                We need microphone access for live transcription. You can grant
                access in your browser settings and try again, or type your transcript manually.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={beginRecording} className="flex-1 h-11">
              Try Again
            </Button>
            <Button
              onClick={() => {
                setEditableText("");
                setPhase("stopped");
              }}
              variant="outline"
              className="flex-1 h-11"
            >
              Type Manually
            </Button>
          </div>
        </Card>
      )}

      {/* PROCESSING PHASE — server-side transcription (mobile/record mode) */}
      {phase === "processing" && (
        <Card className="p-6 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal mx-auto" />
          <p className="text-sm font-medium text-brand-navy">Transcribing your recording…</p>
          <p className="text-xs text-muted-foreground">FADS AI is converting your speech to text. This takes a few seconds.</p>
          <Button onClick={handleCancelProcessing} variant="outline" className="h-11 mt-2">
            Cancel
          </Button>
        </Card>
      )}

      {/* STOPPED PHASE — editable transcript */}
      {phase === "stopped" && (
        <div className="space-y-3">
          {transcribeError && (
            <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
              <p className="text-xs text-status-warn">{transcribeError}</p>
            </div>
          )}
          <div className="bg-brand-mint/30 border border-brand-teal/20 rounded-xl p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <p className="text-xs text-brand-navy">
              <span className="font-medium">Draft transcript.</span> Automated
              transcription may contain errors. Review names, figures and decisions
              before using this as an official record.
            </p>
          </div>

          <Card className="p-4 space-y-3">
            <div>
              <Label htmlFor="transcript" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-teal" /> Transcript
              </Label>
              <Textarea
                id="transcript"
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                placeholder="Your transcript will appear here. You can edit this text before saving. Each line will become a segment."
                className="mt-1.5 min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editableText.split("\n").filter((l) => l.trim()).length} segment(s) · {formatDuration(elapsed)} recorded
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button
                onClick={() => handleSave("draft")}
                disabled={saving || !editableText.trim()}
                variant="outline"
                className="flex-1 h-11"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave("completed")}
                disabled={saving || !editableText.trim()}
                className="flex-1 h-11"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save as Completed
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}