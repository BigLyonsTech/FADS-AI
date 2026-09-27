import React, { useEffect, useRef, useState } from "react";
import { useFadsMoneyCapture } from "@/lib/useFadsMoneyCapture";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import MoneyItemCard from "@/components/finance/MoneyItemCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic, Square, X, Loader2, CheckCircle, Play, RotateCcw, Keyboard,
  ArrowRight, AlertCircle,
} from "lucide-react";

// FADS Voice Player — a compact Y2K-style AI co-pilot device for the Driver
// experience. It WRAPS the existing conversational-money engine
// (useFadsMoneyCapture: microphone capture, Whisper transcription, financial
// interpretation, review/approval) in a player UI that belongs to the FADS
// player family (FADS TV = what's happening, Business Health = how am I doing,
// Cash-Flow = where is my money heading, FADS Voice = talk to my co-pilot).
//
// The capture/transcription/interpretation logic is unchanged and shared with
// the Self-Employed TalkToFadsRecorder. Nothing is added until the driver
// approves. Driver safety wording is shown throughout — this is NOT hands-free
// for active driving.
//
// States: READY → LISTENING → THINKING → (FADS HEARD) → FADS PREPARED | NEEDS YOUR HELP.
export default function FadsVoicePlayer() {
  const cap = useFadsMoneyCapture();
  const {
    text, setText, parsing, items, adding, transcript, voiceBusy, audioUrl,
    recorder, micSupported, currency, incomeCats, expenseCats, accounts,
    toggleMic, cancelRecording, reset, parse, updateItem, removeItem, addAll,
    ph, safety, review,
  } = cap;

  const [mode, setMode] = useState(micSupported ? "voice" : "text"); // "voice" | "text"
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const preparedRef = useRef(null);

  // Recording timer
  useEffect(() => {
    if (!recorder.recording) { setElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [recorder.recording]);

  useEffect(() => {
    if (recorder.recording) setPlaying(false);
  }, [recorder.recording]);

  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const playAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.currentTime = 0; a.play().then(() => setPlaying(true)).catch(() => {}); }
  };
  const replayAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().then(() => setPlaying(true)).catch(() => {});
  };

  const recordAgain = () => {
    if (mode !== "voice") setMode("voice");
    toggleMic(); // resets state + starts a fresh recording
  };
  const speakAgain = () => {
    if (mode !== "voice") setMode("voice");
    toggleMic();
  };
  const typeInstead = () => {
    reset();
    setMode("text");
  };

  const listening = recorder.recording;
  const thinking = !listening && (voiceBusy || parsing);
  const hasItems = !!items && items.length > 0;
  const needsHelp = !!items && items.length === 0;
  const heard = !!transcript;
  const currentState = listening ? "LISTENING" : thinking ? "THINKING" : hasItems ? "PREPARED" : needsHelp ? "NEEDS YOUR HELP" : "READY";

  return (
    <div className="bg-brand-navy rounded-2xl p-4 sm:p-5 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS VOICE</p>
        </div>
        <StateBadge state={currentState} />
      </div>

      {/* LISTENING */}
      {listening && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full bg-status-bad/25 blur-2xl animate-pulse" />
              <FadsRobotAvatar size="md" />
            </div>
            <p className="text-xs text-white/60">FADS is listening…</p>
            <p className="text-2xl font-mono font-bold text-white tracking-wider">{mmss(elapsed)}</p>
          </div>
          {/* Waveform — driven by real microphone audio level */}
          <div className="flex items-end justify-center gap-1 h-12" aria-hidden>
            {Array.from({ length: 16 }).map((_, i) => {
              const weight = 0.4 + 0.6 * Math.abs(Math.sin(i * 1.1));
              const h = Math.max(8, Math.min(100, 12 + (recorder.audioLevel || 0) * 90 * weight));
              return <span key={i} style={{ height: `${h}%` }} className="w-1 sm:w-1.5 rounded-full bg-brand-teal/80" />;
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={toggleMic} className="h-12 bg-status-bad hover:bg-status-bad/90 text-white gap-2">
              <Square className="w-4 h-4" /> Stop
            </Button>
            <Button onClick={cancelRecording} variant="outline" className="h-12 border-white/20 bg-white/5 text-white hover:bg-white/10 gap-2">
              <X className="w-4 h-4" /> Cancel
            </Button>
          </div>
          <p className="text-[11px] text-white/40 text-center">{safety}</p>
        </div>
      )}

      {/* THINKING */}
      {!listening && thinking && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-brand-teal/25 blur-2xl animate-pulse" />
            <FadsRobotAvatar size="md" />
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
            <p className="text-sm">{voiceBusy ? "FADS is listening…" : "FADS is reading…"}</p>
          </div>
        </div>
      )}

      {/* READY + results */}
      {!listening && !thinking && (
        <>
          {/* READY */}
          {items === null && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full bg-brand-teal/20 blur-2xl animate-pulse" />
                  <FadsRobotAvatar size="md" />
                  <span className="absolute -bottom-1 px-2 py-0.5 rounded-full bg-brand-teal text-brand-navy text-[10px] font-bold tracking-wider">CO-PILOT</span>
                </div>
                <p className="text-sm text-white/80">Tell me what you earned or spent.</p>
                <p className="text-xs text-white/40 italic">&ldquo;I earned €280 in fares and spent €45 on fuel.&rdquo;</p>
              </div>

              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("text")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium min-h-touch transition-colors ${
                    mode === "text" ? "bg-brand-teal text-brand-navy" : "bg-white/5 text-white/70"
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" /> Tell FADS
                </button>
                {micSupported && (
                  <button
                    onClick={() => setMode("voice")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium min-h-touch transition-colors ${
                      mode === "voice" ? "bg-brand-teal text-brand-navy" : "bg-white/5 text-white/70"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Speak to FADS
                  </button>
                )}
              </div>

              {/* Voice input */}
              {mode === "voice" && micSupported && (
                <button
                  onClick={toggleMic}
                  className="w-full flex items-center justify-center gap-2 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-4 text-sm font-bold min-h-touch transition-colors"
                >
                  <Mic className="w-5 h-5" /> SPEAK TO FADS
                </button>
              )}

              {/* Text input */}
              {mode === "text" && (
                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={ph}
                    disabled={parsing}
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
                  />
                  <Button
                    onClick={parse}
                    disabled={parsing || !text.trim()}
                    className="w-full h-11 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 gap-2"
                  >
                    {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    {parsing ? "FADS is reading…" : "Tell FADS"}
                  </Button>
                </div>
              )}

              <p className="text-[11px] text-white/40 text-center">{safety}</p>
            </div>
          )}

          {/* FADS HEARD */}
          {heard && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS HEARD</p>
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-white/90 max-h-32 overflow-y-auto">
                <p className="italic">&ldquo;{transcript}&rdquo;</p>
              </div>
              {audioUrl && (
                <div className="flex items-center gap-2 flex-wrap">
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
                  <Button onClick={playAudio} variant="outline" className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5">
                    {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {playing ? "Pause" : "Play"}
                  </Button>
                  <Button onClick={replayAudio} variant="outline" className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Replay
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={recordAgain} variant="outline" className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Record Again
                </Button>
                {hasItems && (
                  <Button
                    onClick={() => preparedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className="h-10 bg-white/10 hover:bg-white/15 text-white gap-1.5"
                  >
                    Use Transcript <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* FADS PREPARED */}
          {hasItems && (
            <div ref={preparedRef} className="space-y-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-status-ok" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-status-ok font-semibold">FADS PREPARED</p>
              </div>
              {items.map((it, i) => (
                <MoneyItemCard
                  key={i}
                  item={it}
                  index={i}
                  currency={currency}
                  incomeCats={incomeCats}
                  expenseCats={expenseCats}
                  accounts={accounts}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                />
              ))}
              <Button onClick={addAll} disabled={adding} className="w-full h-12 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {adding ? "Adding…" : "Review & Add"}
              </Button>
              <p className="text-[11px] text-white/40 text-center">{review}</p>
            </div>
          )}

          {/* NEEDS YOUR HELP (non-financial speech) */}
          {needsHelp && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-status-warn" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-status-warn font-semibold">FADS SAYS</p>
              </div>
              <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
                <FadsRobotAvatar size="sm" className="shrink-0" />
                <p className="text-xs text-white/85 leading-relaxed">
                  &ldquo;I heard you, but I couldn&rsquo;t find an amount to record. Try telling me what you earned or spent.&rdquo;
                </p>
              </div>
              <p className="text-xs text-white/40 italic text-center">e.g. &ldquo;I spent €62 on fuel today.&rdquo;</p>
              <div className="grid grid-cols-2 gap-2">
                {micSupported && (
                  <Button onClick={speakAgain} variant="outline" className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5">
                    <Mic className="w-3.5 h-3.5" /> Speak Again
                  </Button>
                )}
                <Button onClick={typeInstead} className="h-10 bg-white/10 hover:bg-white/15 text-white gap-1.5">
                  <Keyboard className="w-3.5 h-3.5" /> Type Instead
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StateBadge({ state }) {
  const map = {
    READY: "text-brand-teal",
    LISTENING: "text-status-bad",
    THINKING: "text-brand-teal",
    PREPARED: "text-status-ok",
    "NEEDS YOUR HELP": "text-status-warn",
  };
  const pulse = state === "LISTENING" || state === "THINKING";
  return (
    <p className={`text-[10px] uppercase tracking-[0.15em] font-mono flex items-center gap-1.5 ${map[state] || "text-white/50"}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {state}
    </p>
  );
}