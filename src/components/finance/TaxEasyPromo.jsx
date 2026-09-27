import React from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

// Small promo that replaces the removed dedicated tax features (Tax Centre,
// Tax Summary report, Tax Readiness) in FADS AI Business Suite. FADS TaxEasy
// Europe is a separate product — this card only signposts it and does NOT
// build any tax functionality inside Business Suite.
export default function TaxEasyPromo({ className = "" }) {
  const { toast } = useToast();
  return (
    <div className={`bg-brand-mint/40 rounded-xl border border-brand-teal/20 p-4 flex items-start gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-brand-navy flex items-center justify-center shrink-0">
        <Calculator className="w-5 h-5 text-brand-teal" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-brand-navy text-sm">Need help getting tax-ready?</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          FADS TaxEasy Europe is our dedicated tax &amp; money assistant.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-9 gap-1.5 border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10"
          onClick={() =>
            toast({
              title: "FADS TaxEasy Europe",
              description: "Our dedicated tax & money assistant — coming soon.",
            })
          }
        >
          Explore FADS TaxEasy
        </Button>
      </div>
    </div>
  );
}