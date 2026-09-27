import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Check } from "lucide-react";

export default function DailyBrief({ brief }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-brand-teal/30 bg-brand-teal/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-teal" />
            Daily Brief
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <pre className="text-base sm:text-sm whitespace-pre-wrap font-body leading-relaxed">{brief}</pre>
      </CardContent>
    </Card>
  );
}