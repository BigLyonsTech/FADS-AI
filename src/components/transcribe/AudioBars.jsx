import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Animated audio bars. When active, bars animate with varying heights.
// If audioLevel (0-1) is provided, bar heights reflect real audio input.
// Otherwise, bars animate with a gentle CSS-like pattern.
export default function AudioBars({ isActive, audioLevel = null, barCount = 7 }) {
  const bars = Array.from({ length: barCount });

  return (
    <div className="flex items-end justify-center gap-1 h-10" aria-hidden="true">
      {bars.map((_, i) => {
        const center = (barCount - 1) / 2;
        const distance = Math.abs(i - center);
        const baseHeight = 20 + (1 - distance / center) * 40;
        const levelBoost = audioLevel !== null ? audioLevel * 40 : 0;
        const height = isActive ? Math.min(100, baseHeight + levelBoost) : 15;

        return (
          <motion.div
            key={i}
            className="w-1.5 rounded-full bg-brand-teal"
            animate={
              isActive
                ? {
                    height: [height * 0.4, height, height * 0.5],
                    opacity: [0.6, 1, 0.7],
                  }
                : { height: 15, opacity: 0.3 }
            }
            transition={
              isActive
                ? {
                    duration: 0.4 + (i % 3) * 0.1,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
}