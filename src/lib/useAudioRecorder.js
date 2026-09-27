import { useState, useRef, useCallback, useEffect } from "react";

// Captures microphone audio using MediaRecorder (mobile/WebView compatible).
// The browser Web Speech API is unavailable in many mobile WebViews, so the
// Transcribe studio uses this recorder to capture real audio, then transcribes
// it server-side with Whisper. Returns start/stop/pause/resume/cancel controls,
// live recording state, and a real-time audio level for the visualiser.
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const mimeRef = useRef("");

  const pickMime = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/mpeg",
    ];
    for (const t of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "";
  };

  const stopRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const teardown = () => {
    stopRaf();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setAudioLevel(null);
  };

  const start = useCallback(async () => {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mime = pickMime();
    mimeRef.current = mime;
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setRecording(true);
    // Audio level visualiser
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(1, avg / 100));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      // visualiser is optional
    }
  }, []);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        teardown();
        setRecording(false);
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const mime = mimeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        teardown();
        setRecording(false);
        resolve(blob);
      };
      try { recorder.stop(); } catch (e) {
        teardown();
        setRecording(false);
        resolve(null);
      }
    });
  }, []);

  const pause = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state === "recording") {
      try { r.pause(); } catch (e) {}
    }
  }, []);

  const resume = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state === "paused") {
      try { r.resume(); } catch (e) {}
    }
  }, []);

  const cancel = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r) {
      try { r.onstop = null; r.stop(); } catch (e) {}
    }
    teardown();
    setRecording(false);
  }, []);

  useEffect(() => () => teardown(), []);

  return { recording, audioLevel, start, stop, pause, resume, cancel };
}