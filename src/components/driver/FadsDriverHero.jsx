import React from "react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import DriverHeroImage from "@/components/driver/DriverHeroImage";

// FADS Driver hero — compact, on-brand visual of the FADS robot as a friendly
// AI business co-pilot. The human remains the driver; FADS is the digital
// co-pilot ("CO-PILOT" badge). Uses the existing FADS robot identity (deep
// navy, teal, Y2K digital feel). No car-control or navigation is implied.
export default function FadsDriverHero({ name }) {
  return (
    <div className="bg-brand-navy rounded-2xl p-4 sm:p-5 text-white">
      {/* Rotating FADS Driver visual — the vehicle/scene varies while the
          FADS robot stays consistent across all approved visuals. Renders
          nothing when no visuals are configured (the robot avatar below
          remains). Admins manage the curated set via Platform Admin. */}
      <DriverHeroImage className="mb-4" />
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* FADS robot as co-pilot, with a soft teal glow */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-brand-teal/20 blur-2xl animate-pulse" />
          <FadsRobotAvatar size="lg" />
          <span className="absolute -bottom-1 px-2 py-0.5 rounded-full bg-brand-teal text-brand-navy text-[10px] font-bold tracking-wider">
            CO-PILOT
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-[10px] font-mono tracking-[0.25em] text-brand-teal/80 uppercase">FADS Driver</p>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Your AI business co-pilot</h1>
          <p className="text-sm text-white/70 mt-1.5 leading-relaxed">
            You drive. FADS helps keep the business organised.
          </p>
          {name && (
            <p className="text-xs text-white/50 mt-2">Welcome back, {name}.</p>
          )}
        </div>
      </div>

      {/* Y2K dashboard strip */}
      <div className="mt-3 flex items-center gap-2 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-status-ok animate-pulse" />
        <span className="text-[10px] font-mono tracking-wider text-white/40">FADS CO-PILOT ONLINE</span>
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] font-mono text-white/30">YOU DRIVE • FADS ORGANISES</span>
      </div>
    </div>
  );
}