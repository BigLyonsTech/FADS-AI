import { useState, useRef, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useAudioRecorder } from "@/lib/useAudioRecorder";

// Shared voice-dictation hook for the Finance "Speak a Record" and Inventory
// "Speak an Item" flows. Reuses the EXISTING microphone (useAudioRecorder) and
// the EXISTING assistant backend (Whisper + InvokeLLM) — no new speech service
// and no transcript database. Mirrors the Transcribe studio's dual-mode approach:
//   • live mode   — browser Web Speech API for real-time captions (no upload);
//                    the final transcript is sent as text to the backend (no
//                    Whisper, saving credits).
//   • record mode — MediaRecorder + server-side Whisper (when the Web Speech
//                    API is unavailable, e.g. mobile WebViews).
// Phases: idle → listening → transcribing (record mode only) → preparing → done.
// Nothing is saved automatically — onParsed hands the parsed fields to the
// existing form for the user to review and save.
export function useVoiceDictation({ action, resultKey, onParsed, autoStart } = {}) {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const recorder = useAudioRecorder();

  const [phase, setPhase] = useState("idle"); // idle | listening | transcribing | preparing | done
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimText, setInterimText] = useState("");

  const onParsedRef = useRef(onParsed);
  onParsedRef.current = onParsed;
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const processedFinalsRef = useRef(new Set());
  const finalTextRef = useRef("");
  const interimTextRef = useRef("");
  const restartBaseTextRef = useRef(null);
  const stopResolveRef = useRef(null);

  const SpeechRecognition =
    typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const hasMediaRecorder =
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator?.mediaDevices?.getUserMedia;
  const speechSupported = !!SpeechRecognition;
  const mode = speechSupported ? "live" : hasMediaRecorder ? "record" : "none";
  const micSupported = mode !== "none";

  const startRecognition = useCallback(() => {
    if (!SpeechRecognition || recognitionRef.current) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en";
    recognition.onresult = (event) => {
      // A stopped recognizer can deliver a late result after a new session has
      // started. Only the currently owned instance may update the transcript.
      if (recognitionRef.current !== recognition) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Each result index is committed once within a recognition session.
          if (!processedFinalsRef.current.has(i)) {
            processedFinalsRef.current.add(i);
            const text = t.trim();
            if (!text) continue;

            // Android Chrome may restart recognition and replay the accumulated
            // sentence from index 0 (for example "I sold", then
            // "I sold services"). Reconcile only immediately after a browser
            // restart so legitimate repeated words in one session are kept.
            const restartBase = restartBaseTextRef.current;
            if (restartBase !== null) {
              const baseNormalised = restartBase.toLowerCase().replace(/\s+/g, " ").trim();
              const textNormalised = text.toLowerCase().replace(/\s+/g, " ").trim();
              if (
                textNormalised === baseNormalised ||
                (textNormalised && baseNormalised.startsWith(textNormalised + " "))
              ) {
                continue;
              }
              restartBaseTextRef.current = null;
              if (baseNormalised && textNormalised.startsWith(baseNormalised + " ")) {
                finalTextRef.current = text;
                setLiveTranscript(text);
                continue;
              }
            }

            finalTextRef.current = (finalTextRef.current + " " + text).trim();
            setLiveTranscript(finalTextRef.current);
          }
        } else {
          interim += t;
        }
      }
      interimTextRef.current = interim;
      setInterimText(interim);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldRestartRef.current = false;
        setError("Microphone access was denied. You can type the details instead.");
        setPhase("idle");
      }
    };
    recognition.onend = () => {
      if (stopResolveRef.current) {
        stopResolveRef.current();
        stopResolveRef.current = null;
      }
      if (
        recognitionRef.current === recognition &&
        shouldRestartRef.current
      ) {
        // Result indexes restart at zero. Keep the committed sentence as the
        // comparison base in case Android replays it cumulatively.
        restartBaseTextRef.current = finalTextRef.current;
        processedFinalsRef.current = new Set();
        try { recognition.start(); } catch (e) {}
      }
    };
    processedFinalsRef.current = new Set();
    restartBaseTextRef.current = null;
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    }
  }, [SpeechRecognition]);

  const stopRecognition = useCallback(async ({ discardResults = false } = {}) => {
    shouldRestartRef.current = false;
    const recognition = recognitionRef.current;
    if (!recognition) return;
    // Stop & transcribe keeps ownership until onend so the browser's last
    // final result is not truncated. Cancel invalidates ownership immediately.
    if (discardResults) recognitionRef.current = null;
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        stopResolveRef.current = null;
        resolve();
      };
      stopResolveRef.current = finish;
      try { recognition.stop(); } catch (e) { finish(); }
      setTimeout(finish, 1200); // browser may omit onend; never block review
    });
  }, []);

  const start = useCallback(async () => {
    setError("");
    setTranscript("");
    setLiveTranscript("");
    setInterimText("");
    finalTextRef.current = "";
    interimTextRef.current = "";
    restartBaseTextRef.current = null;
    processedFinalsRef.current = new Set();
    setPhase("listening");
    if (mode === "live") {
      shouldRestartRef.current = true;
      startRecognition();
    } else {
      try {
        await recorder.start();
      } catch (e) {
        setError("Microphone access was denied. You can type the details instead.");
        setPhase("idle");
      }
    }
  }, [mode, recorder, startRecognition]);

  const stopAndDictate = useCallback(async () => {
    if (phase !== "listening") return;
    let sourceText = "";

    if (mode === "live") {
      await stopRecognition(); // allow the browser to emit its last final result
      sourceText = (finalTextRef.current.trim() || interimTextRef.current.trim());
      setInterimText("");
      setTranscript(sourceText);
      if (!sourceText) {
        setPhase("idle");
        setError("I didn't hear anything. Try speaking clearly, or type it instead.");
        return;
      }
    } else {
      const blob = await recorder.stop();
      if (!blob) {
        setPhase("idle");
        return;
      }
      setPhase("transcribing");
      try {
        const file = new File([blob], "dictation.webm", { type: blob.type || "audio/webm" });
        const up = await base44.integrations.Core.UploadFile({ file });
        const audioUrl = up?.file_url;
        if (!audioUrl) throw new Error("Upload failed");
        const tr = await base44.functions.invoke("assistant", {
          action,
          organisation_id: orgId,
          data_mode: dataMode,
          audio_url: audioUrl,
          parse: false,
        });
        sourceText = (tr.data?.transcript || "").trim();
        setTranscript(sourceText);
        if (!sourceText) {
          setPhase("idle");
          setError("I couldn't hear anything in that recording. Try again or type it instead.");
          return;
        }
      } catch (e) {
        setPhase("idle");
        setError(e.response?.data?.error || e.message || "Dictation failed. You can type the details instead.");
        return;
      }
    }

    setPhase("preparing");
    try {
      const res = await base44.functions.invoke("assistant", {
        action,
        organisation_id: orgId,
        data_mode: dataMode,
        text: sourceText,
      });
      const d = res.data || {};
      // Show the exact text supplied for extraction; do not replace it with a
      // second server rendering that could hide a discrepancy from the user.
      setTranscript(sourceText);
      const parsed = d[resultKey];
      if (parsed && onParsedRef.current) {
        onParsedRef.current(parsed);
      }
      if (!parsed && d.note) {
        setError(d.note);
      }
      setPhase("done");
    } catch (e) {
      setPhase("done");
      setError(e.response?.data?.error || e.message || "Could not prepare the record. You can type the details instead.");
    }
  }, [phase, mode, recorder, stopRecognition, action, orgId, dataMode, resultKey]);

  const cancel = useCallback(() => {
    stopRecognition({ discardResults: true });
    recorder.cancel();
    setPhase("idle");
    setTranscript("");
    setLiveTranscript("");
    setInterimText("");
    finalTextRef.current = "";
    interimTextRef.current = "";
    restartBaseTextRef.current = null;
    processedFinalsRef.current = new Set();
  }, [stopRecognition, recorder]);

  const toggle = useCallback(async () => {
    if (phase === "listening") {
      await stopAndDictate();
    } else {
      await start();
    }
  }, [phase, start, stopAndDictate]);

  // Auto-start on mount from a "Speak …" entry point. The click that opened the
  // form counts as the user gesture for mic access.
  useEffect(() => {
    if (autoStart && micSupported) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      recorder.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    micSupported,
    mode,
    phase,
    recording: phase === "listening",
    audioLevel: recorder.audioLevel,
    liveTranscript,
    interimText,
    transcript,
    error,
    busy: phase === "transcribing" || phase === "preparing",
    toggle,
    start,
    cancel,
    setError,
  };
}