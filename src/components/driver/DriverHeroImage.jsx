import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

// Rotating FADS Driver visual. Fetches active DriverVisual records and picks
// one per mount — rotation happens between visits/refreshes, with no carousel
// or animation. The FADS robot identity stays consistent across all approved
// visuals; only the vehicle/scene varies. Renders nothing when no visuals are
// configured, so the caller's default robot-only hero remains untouched.
//
// Admins manage the curated set via the DriverVisual entity (Platform Admin →
// FADS Driver Visuals): add, edit, activate/feature, deactivate, delete.
// New approved images can be added later without changing any page code.
export default function DriverHeroImage({ className = "", heightClass = "h-32 sm:h-40" }) {
  const [visuals, setVisuals] = useState(null); // null = loading, [] = none

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await base44.entities.DriverVisual.filter({ active: true }, "sort_order", 50);
        if (alive) setVisuals(all);
      } catch {
        if (alive) setVisuals([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Pick one per mount: prefer featured, else any active. Stable for the
  // component's life so it doesn't flicker on re-render.
  const pick = useMemo(() => {
    if (!visuals || visuals.length === 0) return null;
    const featured = visuals.filter((v) => v.featured);
    const pool = featured.length ? featured : visuals;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [visuals]);

  if (!visuals || !pick) return null;

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden shrink-0 ${className}`}>
      <Image src={pick.image_url} alt={pick.title || "FADS Driver"} fittingType="fill" className="w-full h-full" />
      {/* Navy gradient keeps the label legible over any scene */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/85 via-brand-navy/25 to-transparent pointer-events-none" />
      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
        <span className="text-[10px] font-mono tracking-[0.25em] text-brand-teal/90 uppercase">FADS Driver</span>
        {pick.vehicle_type && (
          <span className="text-[10px] font-mono text-white/60 capitalize">{pick.vehicle_type.replace(/_/g, " ")}</span>
        )}
      </div>
    </div>
  );
}