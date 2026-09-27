import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { buildAccountantPackData } from "@/lib/taxRules";
import { generateAccountantPackPDF } from "@/lib/taxPackPdf";

// Reusable Tax-Ready Accountant Pack generator. Builds a structured summary
// from existing Finance records + the tax check, then downloads a PDF using
// the existing jspdf export infrastructure. One generator for all jurisdictions.
export default function AccountantPackButton({ org, taxProfile, finance, taxCheck, variant = "default", className = "" }) {
  const { toast } = useToast();
  const [building, setBuilding] = useState(false);

  const handleBuild = async () => {
    if (building) return;
    setBuilding(true);
    const preparing = toast({ title: "Preparing Accountant Pack…" });
    try {
      const data = buildAccountantPackData(org, taxProfile, finance, taxCheck);
      await generateAccountantPackPDF(data);
      preparing.dismiss();
      toast({ title: "Accountant Pack downloaded.", description: "Ready to share with your accountant or tax adviser." });
    } catch (e) {
      preparing.dismiss();
      toast({ title: "Could not build the Accountant Pack.", description: e?.message, variant: "destructive" });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <Button onClick={handleBuild} disabled={building} variant={variant} className={`h-11 min-h-touch ${className}`}>
      {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      {building ? "Preparing…" : "Give to Accountant"}
    </Button>
  );
}