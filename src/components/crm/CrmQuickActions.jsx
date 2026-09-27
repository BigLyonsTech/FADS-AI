import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, FolderPlus, CheckSquare, Upload, Search, Sparkles, AlertCircle, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { getCrmConfig } from "@/lib/crmWording";

// Beginner-friendly CRM quick actions. Split into:
// 1. Primary actions — things the owner does directly (add, import, task, settings)
// 2. FADS guidance — "who should I follow up with?", "who owes me?", "guide me"
//    These deep-link to the AI Assistant with pre-filled questions or to
//    existing CRM pages.
export default function CrmQuickActions({ orgType, onNewContact, onNewLead, onNewTask, onSettings, onImport }) {
  const config = getCrmConfig(orgType);
  const addSomeoneLabel = "Add someone";
  const addPotentialLabel = orgType === "church" ? "Add a connection"
    : orgType === "school" ? "Add an enquiry"
    : orgType === "university" ? "Add an applicant"
    : "Add a potential customer";
  const importLabel = orgType === "church" ? "Import members"
    : orgType === "school" || orgType === "university" ? "Import students/parents"
    : "Import my contacts";

  return (
    <div className="space-y-3">
      {/* Primary actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button variant="outline" className="h-auto py-3 flex-col gap-1 min-h-touch" onClick={onNewContact}>
          <UserPlus className="w-5 h-5" />
          <span className="text-xs">{addSomeoneLabel}</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1 min-h-touch" onClick={onNewLead}>
          <FolderPlus className="w-5 h-5" />
          <span className="text-xs">{addPotentialLabel}</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1 min-h-touch" onClick={onNewTask}>
          <CheckSquare className="w-5 h-5" />
          <span className="text-xs">Add a task</span>
        </Button>
        {onImport && (
          <Button variant="outline" className="h-auto py-3 flex-col gap-1 min-h-touch" onClick={onImport}>
            <Upload className="w-5 h-5" />
            <span className="text-xs">{importLabel}</span>
          </Button>
        )}
      </div>

      {/* FADS guidance — beginner-friendly help links */}
      <div className="bg-brand-navy/5 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <p className="text-xs font-medium text-brand-navy">Not sure what to do next? I can help.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/crm/contacts" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs hover:border-brand-teal min-h-touch transition-colors">
            <Search className="w-3.5 h-3.5 text-brand-teal" /> Find a customer
          </Link>
          <Link to="/assistant?q=who+should+I+follow+up+with+today" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs hover:border-brand-teal min-h-touch transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-brand-teal" /> Who should I follow up with?
          </Link>
          <Link to="/assistant?q=which+customers+have+overdue+invoices" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs hover:border-brand-teal min-h-touch transition-colors">
            <AlertCircle className="w-3.5 h-3.5 text-status-warn" /> Who owes me money?
          </Link>
          <Link to="/assistant?q=what+needs+my+attention+today" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs hover:border-brand-teal min-h-touch transition-colors">
            <AlertCircle className="w-3.5 h-3.5 text-brand-teal" /> What needs my attention?
          </Link>
          <Link to="/getting-started?guide=1" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs hover:border-brand-teal min-h-touch transition-colors">
            <HandHeart className="w-3.5 h-3.5 text-brand-teal" /> I'm not sure — guide me
          </Link>
        </div>
      </div>
    </div>
  );
}