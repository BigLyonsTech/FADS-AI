import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, Play, Square, Heart } from "lucide-react";

// Large touch-friendly recording controls. Phase determines which buttons show:
//   recording → Pause + Stop
//   paused    → Resume + Stop
//   idle      → Start
// The heart animation plays when recording stops successfully.
export default function RecordingControls({
  phase,
  onStart,
  onPause,
  onResume,
  onStop,
  showHeart,
}) {
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute"
          >
            <Heart className="w-16 h-16 text-rose-400 fill-rose-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "idle" && (
        <button
          onClick={onStart}
          className="w-20 h-20 rounded-full bg-brand-teal flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
          title="Start recording"
        >
          <Mic className="w-8 h-8 text-brand-navy" />
        </button>
      )}

      {phase === "recording" && (
        <>
          <button
            onClick={onPause}
            className="w-16 h-16 rounded-full bg-brand-navy flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border-2 border-brand-teal/40"
            title="Pause"
          >
            <Pause className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={onStop}
            className="w-20 h-20 rounded-full bg-status-bad flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            title="Stop and save"
          >
            <Square className="w-7 h-7 text-white fill-white" />
          </button>
        </>
      )}

      {phase === "paused" && (
        <>
          <button
            onClick={onResume}
            className="w-16 h-16 rounded-full bg-brand-teal flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            title="Resume"
          >
            <Play className="w-6 h-6 text-brand-navy fill-brand-navy" />
          </button>
          <button
            onClick={onStop}
            className="w-20 h-20 rounded-full bg-status-bad flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            title="Stop and save"
          >
            <Square className="w-7 h-7 text-white fill-white" />
          </button>
        </>
      )}
    </div>
  );
}