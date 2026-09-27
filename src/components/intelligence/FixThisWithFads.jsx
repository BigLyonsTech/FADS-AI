import React from "react";
import { Link } from "react-router-dom";
import { Wrench, ChevronRight } from "lucide-react";

// "Fix this with FADS" — a contextual action that takes the user directly to the
// safest next step in an EXISTING workflow. It never performs risky actions;
// it navigates to the relevant page where the user reviews and acts themselves.
//
// Pass `dark` when the link sits on a navy/dark panel so it inverts to a
// teal-on-dark style that stands out instead of blending in.
export default function FixThisWithFads({ to, label = "Fix this with FADS", dark = false }) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-xl p-3 transition-opacity hover:opacity-90 ${
        dark
          ? "bg-brand-teal text-brand-navy"
          : "bg-brand-navy text-white"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Wrench className={`w-4 h-4 ${dark ? "text-brand-navy" : "text-brand-teal"}`} /> {label}
      </span>
      <ChevronRight className="w-4 h-4" />
    </Link>
  );
}