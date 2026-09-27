import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, FileText, LayoutTemplate } from "lucide-react";
import { isValidCanvaTemplateUrl } from "@/lib/contentWording";

export default function TemplateCard({ template, onUse, onCopy }) {
  const t = template;
  const isCanva = t.type === "canva";
  const hasCanvaUrl = isCanva && isValidCanvaTemplateUrl(t.canva_url);

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-36 bg-gradient-to-br from-brand-teal/10 to-brand-mint flex items-center justify-center relative overflow-hidden">
        {isCanva && t.preview_url ? (
          <img src={t.preview_url} alt={t.title} className="w-full h-full object-cover" />
        ) : isCanva ? (
          <div className="flex flex-col items-center gap-1.5 text-brand-navy/50 px-4 text-center">
            <LayoutTemplate className="w-8 h-8" />
            <span className="text-xs font-medium">Preview not available</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-brand-navy/60 px-4 text-center">
            <FileText className="w-8 h-8" />
            <span className="text-[11px] font-medium uppercase tracking-wide">
              Ready-to-copy text
            </span>
          </div>
        )}

        {hasCanvaUrl && (
          <span className="absolute top-2 right-2 text-[10px] bg-brand-teal text-white px-1.5 py-0.5 rounded-full font-medium">
            Canva design
          </span>
        )}
      </div>

      <CardContent className="p-4 flex flex-col flex-1">
        <Badge variant="secondary" className="self-start text-xs mb-2">
          {t.purpose_label || "Template"}
        </Badge>

        <h3 className="font-semibold text-brand-navy">{t.title}</h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{t.description}</p>

        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
          {isCanva ? (
            hasCanvaUrl && (
              <Button
                size="sm"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
                onClick={() => onUse(t)}
              >
                <ExternalLink className="w-4 h-4" /> Use Template
              </Button>
            )
          ) : (
            <>
              <Button
                size="sm"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
                onClick={() => onUse(t)}
              >
                <FileText className="w-4 h-4" /> Use Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => onCopy(t.body)}>
                <Copy className="w-4 h-4" /> Copy Text
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
