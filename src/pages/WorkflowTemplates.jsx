import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Bot, Sun, Wallet, Users, UserCheck, Package,
  StickyNote, Receipt, GraduationCap, Heart, Loader2, Zap,
} from "lucide-react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useWorkflows } from "@/lib/useWorkflows";
import { canAccessHr } from "@/lib/hrWording";
import { WORKFLOW_CATEGORIES, getTemplatesForWorkspace } from "@/lib/workflowTemplates";
import TemplateCard from "@/components/workflows/TemplateCard";
import TemplatePreview from "@/components/workflows/TemplatePreview";
import WorkflowHistory from "@/components/workflows/WorkflowHistory";
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS = {
  Daily: Sun, Money: Wallet, Customers: Users, HR: UserCheck,
  Inventory: Package, Meetings: StickyNote, Tax: Receipt,
  School: GraduationCap, Church: Heart,
};

export default function WorkflowTemplates() {
  const { activeOrg, activeRole } = useWorkspace();
  const { dataMode } = useDataMode();
  const { isTemplateActive, activateTemplate, runs, loading } = useWorkflows();
  const [activeCategory, setActiveCategory] = useState("Daily");
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const orgType = activeOrg?.type || "small_business";
  const showHr = canAccessHr(activeRole);

  const allTemplates = useMemo(
    () => getTemplatesForWorkspace(orgType, showHr),
    [orgType, showHr]
  );

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map((t) => t.category));
    return WORKFLOW_CATEGORIES.filter((c) => cats.has(c.id));
  }, [allTemplates]);

  const visibleTemplates = useMemo(
    () => allTemplates.filter((t) => t.category === activeCategory),
    [allTemplates, activeCategory]
  );

  const dailyTemplate = allTemplates.find((t) => t.id === "fads_daily_check");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-brand-navy text-white rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-teal flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-brand-navy" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Workflow Templates</h1>
            <p className="text-sm text-white/70 mt-0.5">Let FADS handle the follow-up.</p>
            <p className="text-sm text-white/80 mt-2">
              {activeOrg?.name} · {activeOrg?.currency} · {dataMode?.toUpperCase()} mode
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Link to="/assistant">
            <Button variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 h-11 min-h-touch w-full sm:w-auto gap-2">
              <Bot className="w-4 h-4" /> Ask FADS
            </Button>
          </Link>
        </div>
      </div>

      {/* Daily Check signature card */}
      {dailyTemplate && (
        <div className="bg-gradient-to-br from-brand-teal/15 to-brand-mint/40 rounded-2xl border border-brand-teal/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-brand-teal" />
            <h2 className="font-semibold text-brand-navy">{dailyTemplate.name}</h2>
            <span className="text-xs text-muted-foreground ml-auto">Signature workflow</span>
          </div>
          <p className="text-sm text-brand-navy">{dailyTemplate.trigger}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link to={dailyTemplate.runTo}>
              <Button className="bg-brand-teal text-brand-navy hover:bg-brand-teal/90 h-11 gap-2 w-full sm:w-auto">
                <Sparkles className="w-4 h-4" /> {dailyTemplate.runLabel}
              </Button>
            </Link>
            <Button variant="outline" className="h-11 gap-2 w-full sm:w-auto" onClick={() => setPreviewTemplate(dailyTemplate)}>
              Preview
            </Button>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || Sparkles;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-brand-navy text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="w-4 h-4" /> {cat.label}
            </button>
          );
        })}
      </div>

      {/* Template cards */}
      {visibleTemplates.filter((t) => !t.isSignature).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTemplates
            .filter((t) => !t.isSignature)
            .map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                active={isTemplateActive(template.id)}
                onToggle={() => activateTemplate(template)}
                onPreview={() => setPreviewTemplate(template)}
              />
            ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No workflow templates in this category for your workspace type.
          </p>
        </div>
      )}

      {/* Workflow History */}
      <WorkflowHistory runs={runs} />

      {/* Preview Dialog */}
      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        active={previewTemplate ? isTemplateActive(previewTemplate.id) : false}
        onToggle={() => previewTemplate && activateTemplate(previewTemplate)}
        orgId={activeOrg?.id}
        currency={activeOrg?.currency}
      />
    </div>
  );
}