import React from "react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";

// FADS Self-Employed hero — same FADS robot identity as Driver, presented as
// the user's AI back office for one-person businesses (freelancers, sole
// traders, consultants, tradespeople, etc.). The human runs the business;
// FADS is the digital back office ("BACK OFFICE" badge). No new brand, no
// new assistant — reuses the existing FADS robot.
export default function FadsSelfEmployedHero({ name }) {
  return (
    <div className="bg-brand-navy rounded-2xl p-4 sm:p-5 text-white">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* FADS robot as back office, with a soft teal glow */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-brand-teal/20 blur-2xl animate-pulse" />
          <FadsRobotAvatar size="lg" />
          <span className="absolute -bottom-1 px-2 py-0.5 rounded-full bg-brand-teal text-brand-navy text-[10px] font-bold tracking-wider">
            BACK OFFICE
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-[10px] font-mono tracking-[0.25em] text-brand-teal/80 uppercase">FADS Self-Employed</p>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Your AI back office when you’re the business</h1>
          <p className="text-sm text-white/70 mt-1.5 leading-relaxed">
            Keep track of what you earn, what you spend, what you’re owed and what you need for tax — with FADS helping you figure out what to do next.
          </p>
          {name && (
            <p className="text-xs text-white/50 mt-2">Welcome back, {name}.</p>
          )}
        </div>
      </div>

      {/* Y2K dashboard strip */}
      <div className="mt-3 flex items-center gap-2 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-status-ok animate-pulse" />
        <span className="text-[10px] font-mono tracking-wider text-white/40">FADS BACK OFFICE ONLINE</span>
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] font-mono text-white/30">YOU RUN IT • FADS ORGANISES</span>
      </div>
    </div>
  );
}