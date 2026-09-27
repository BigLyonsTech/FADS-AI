import React from "react";
import { Link } from "react-router-dom";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { Bot, Compass, HelpCircle, Wrench, Sparkles } from "lucide-react";

// Help Hero — the warm, non-technical entry point to the Help Centre.
// The FADS robot is the main visual. A busy or overwhelmed user should
// immediately see five friendly paths, not a wall of documentation.
export default function HelpHero({ onShowMeAround }) {
  return (
    <div className="bg-brand-navy rounded-2xl p-5 sm:p-6 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">FADS HELP</p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-status-ok animate-pulse" />
          HERE TO HELP
        </p>
      </div>

      {/* Robot + headline */}
      <div className="flex flex-col items-center py-2">
        <FadsRobotAvatar size="lg" />
        <h1 className="text-2xl font-bold text-white mt-4 text-center">Hi, I'm FADS. How can I help?</h1>
        <p className="text-sm text-white/70 mt-2 text-center max-w-[340px] leading-relaxed">
          You don't need to know where everything is. Tell me what you're trying to do and I'll help you find it.
        </p>
      </div>

      {/* Primary buttons */}
      <div className="space-y-2">
        <a
          href="#new-here"
          className="w-full inline-flex items-center justify-center gap-2 bg-brand-teal text-brand-navy hover:bg-brand-teal/90 rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
        >
          <Sparkles className="w-4 h-4" /> I'm new here
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onShowMeAround}
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <Compass className="w-4 h-4" /> Show me around
          </button>
          <a
            href="#how-do-i"
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <HelpCircle className="w-4 h-4" /> How do I…?
          </a>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/assistant"
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <Bot className="w-4 h-4" /> Ask FADS
          </Link>
          <a
            href="#troubleshooting"
            className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-medium min-h-touch transition-colors"
          >
            <Wrench className="w-4 h-4" /> Something isn't working
          </a>
        </div>
      </div>
    </div>
  );
}