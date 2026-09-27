import React from "react";
import FadsRobot from "@/components/FadsRobot";

// Wraps the existing FADS robot in a fixed-size container with a scale
// transform. The robot artwork is unchanged — only the display size is
// adjusted so the same FADS character is recognisable everywhere.
//
// sm = chat avatar (fits 32px circle)
// md = header / section heading
// lg = empty / new conversation state
export default function FadsRobotAvatar({ size = "md", className = "" }) {
  const config = {
    sm: { scale: 0.35, w: 17, h: 28 },
    md: { scale: 0.5, w: 24, h: 40 },
    lg: { scale: 1, w: 48, h: 80 },
  };
  const c = config[size] || config.md;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: c.w, height: c.h }}>
      <div
        className="absolute left-1/2 top-0"
        style={{ transform: `translateX(-50%) scale(${c.scale})`, transformOrigin: "top center" }}
      >
        <FadsRobot />
      </div>
    </div>
  );
}