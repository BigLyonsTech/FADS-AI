import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackToHR({ label = "Back to HR", to = "/hr" }) {
  return (
    <Link to={to}>
      <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground">
        <ChevronLeft className="w-4 h-4" />
        {label}
      </Button>
    </Link>
  );
}