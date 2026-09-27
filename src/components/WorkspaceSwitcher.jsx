import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/AuthContext";
import { workspaceTypeLabel, DEMO_WORKSPACE_NAMES } from "@/lib/workspaceTypes";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import {
  ChevronDown, Check, Sparkles, Loader2, Plus,
  Building2, School, GraduationCap, Church, User,
} from "lucide-react";

const TYPE_ICONS = {
  small_business: Building2,
  self_employed: User,
  school: School,
  university: GraduationCap,
  church: Church,
};

export default function WorkspaceSwitcher() {
  const { organisations, activeOrg, switchWorkspace, seedDemoWorkspaces } = useWorkspace();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const isPlatformOwner = user?.role === "admin" || user?.platform_owner === true;
  const hasAllDemos =
    organisations.length > 0 &&
    DEMO_WORKSPACE_NAMES.every((name) =>
      organisations.some((o) => o.name === name)
    );
  const showSeedOption = isPlatformOwner && !hasAllDemos;

  const handleSwitch = async (id) => {
    if (id === activeOrg?.id) {
      setOpen(false);
      setMobileOpen(false);
      return;
    }
    setBusy(true);
    try {
      await switchWorkspace(id);
      setOpen(false);
      setMobileOpen(false);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Unable to switch workspace");
    } finally {
      setBusy(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await seedDemoWorkspaces();
      setOpen(false);
      setMobileOpen(false);
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Unable to set up demo workspaces");
    } finally {
      setSeeding(false);
    }
  };

  if (organisations.length === 0 && !showSeedOption) return null;

  const ActiveIcon = activeOrg ? TYPE_ICONS[activeOrg.type] || Building2 : Building2;

  // Shared list rendered inside both the desktop dropdown and the mobile sheet.
  // Dark navy background with white text for strong readability.
  const isDemoActive = activeOrg?.data_mode === "demo";
  // "Switch Demo Type" lists only the canonical FADS demo experiences (named
  // "FADS Demo *"). Other demo-mode orgs the user may own (e.g. their own test
  // businesses) are NOT FADS demos — they stay in "Your workspaces" under their
  // real names, which prevents several different orgs all rendering as
  // "Business" just because they share the small_business type.
  const isFadsDemo = (o) => o.data_mode === "demo" && DEMO_WORKSPACE_NAMES.includes(o.name);
  const demoOrgs = organisations.filter(isFadsDemo);
  const otherOrgs = organisations.filter((o) => !isFadsDemo(o));

  const renderOrgButton = (o) => {
    const Icon = TYPE_ICONS[o.type] || Building2;
    const isActive = o.id === activeOrg?.id;
    const isDemoExperience = isFadsDemo(o);
    const primary = isDemoExperience ? workspaceTypeLabel(o) : o.name;
    const secondary = isDemoExperience ? "Demo" : workspaceTypeLabel(o.type);
    return (
      <button
        key={o.id}
        onClick={() => handleSwitch(o.id)}
        className={`w-full flex items-center gap-3 px-3 py-3 text-left min-h-[52px] transition-colors ${
          isActive
            ? "bg-brand-teal/25 text-white"
            : "text-white hover:bg-brand-teal/20 focus:bg-brand-teal/20 active:bg-brand-teal/25"
        }`}
      >
        <Icon className="w-5 h-5 text-brand-teal shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium text-sm text-white">{primary}</div>
          <div className="text-xs text-white/60 truncate">{secondary}</div>
        </div>
        {isActive && <Check className="w-4 h-4 text-brand-teal shrink-0" />}
      </button>
    );
  };

  const workspaceList = (
    <>
      {isDemoActive && demoOrgs.length > 0 && (
        <>
          <div className="px-3 py-2 text-xs font-medium text-white/50 uppercase tracking-wide border-b border-white/10">
            Switch Demo Type
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {demoOrgs.map(renderOrgButton)}
          </div>
        </>
      )}
      {(!isDemoActive || otherOrgs.length > 0) && (
        <>
          {isDemoActive && <div className="border-t border-white/10" />}
          <div className="px-3 py-2 text-xs font-medium text-white/50 uppercase tracking-wide border-b border-white/10">
            Your workspaces
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {(isDemoActive ? otherOrgs : organisations).map(renderOrgButton)}
          </div>
        </>
      )}
      {organisations.length > 0 && (
        <>
          <div className="border-t border-white/10" />
          <Link
            to="/onboarding"
            onClick={() => { setOpen(false); setMobileOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm text-brand-teal hover:bg-brand-teal/20 text-left min-h-[52px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add another organisation</span>
          </Link>
        </>
      )}
      {showSeedOption && (
        <>
          <div className="border-t border-white/10" />
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm text-brand-teal hover:bg-brand-teal/20 text-left disabled:opacity-50 min-h-[52px]"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Set up demo workspaces</span>
          </button>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: compact dropdown */}
      <div className="hidden md:block relative">
        <Button
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-brand-teal/25 gap-2"
          onClick={() => setOpen((o) => !o)}
          disabled={busy || seeding}
        >
          <ActiveIcon className="w-4 h-4 text-brand-teal shrink-0" />
          <span className="max-w-[120px] truncate">{activeOrg?.name || "Select workspace"}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-xl z-50 overflow-hidden border border-white/10 bg-[hsl(var(--brand-navy))]">
              {workspaceList}
            </div>
          </>
        )}
      </div>

      {/* Mobile: compact button that opens a bottom sheet */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          disabled={busy || seeding}
          className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-md px-2 h-8 text-white disabled:opacity-50 max-w-[130px]"
        >
          <ActiveIcon className="w-4 h-4 text-brand-teal shrink-0" />
          <span className="truncate text-xs">{activeOrg?.name || "Select"}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        </button>
        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerContent className="bg-[hsl(var(--brand-navy))] border-t border-white/10 text-white">
            <DrawerHeader className="text-center">
              <DrawerTitle className="text-white">Your workspaces</DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-6">
              {workspaceList}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}