import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackToCRM({ label = "Back to CRM", to = "/crm" }) {
  return (
    <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2 mb-3 text-muted-foreground">
      <Link to={to}>
        <ChevronLeft className="w-4 h-4" />
        {label}
      </Link>
    </Button>
  );
}