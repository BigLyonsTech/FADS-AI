import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function BackToChurch({ to = "/church/giving", label = "Giving" }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy mb-3"
    >
      <ChevronLeft className="w-4 h-4" /> {label}
    </Link>
  );
}