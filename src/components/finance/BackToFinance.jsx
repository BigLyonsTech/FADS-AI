import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackToFinance({ to = "/finance", label = "Back to Finance" }) {
  return (
    <Button asChild variant="ghost" size="sm" className="h-10 gap-1 -ml-2 mb-2 text-muted-foreground">
      <Link to={to}>
        <ChevronLeft className="w-4 h-4" />
        {label}
      </Link>
    </Button>
  );
}