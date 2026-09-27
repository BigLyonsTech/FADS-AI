import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import DataModeSwitcher from "@/components/DataModeSwitcher";
import DemoModeGuidanceBanner from "@/components/DemoModeGuidanceBanner";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, ShieldCheck, Home as HomeIcon, Users, Settings as SettingsIcon, Wallet, Gift, User as UserIcon,   ChevronDown, CreditCard, Briefcase, Bot, Mic, Contact, MoreHorizontal, HelpCircle, TriangleAlert, Rocket, Package, Heart, GraduationCap, BarChart3, MessageSquare, Brain, Sparkles, Zap, Megaphone, LayoutTemplate } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { canAccessHr } from "@/lib/hrWording";
import { resolveTerminology, faithTypeLabel } from "@/lib/faithTerminology";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

// Map the current route to the most relevant User Guide section.
function helpSectionFor(path) {
  if (path.startsWith("/finance/reports") || path.startsWith("/school/reports") || path.startsWith("/church/reports")) return "reports";
  if (path.startsWith("/intelligence")) return "intelligence";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/hr")) return "hr";
  if (path.startsWith("/crm")) return "crm";
  if (path.startsWith("/transcribe")) return "transcribe";
  if (path.startsWith("/assistant")) return "assistant";
  if (path.startsWith("/getting-started")) return "getting-started";
  if (path.startsWith("/settings") || path.startsWith("/account")) return "account";
  return "home";
}

export default function AppLayout() {
  const { user } = useAuth();
  const { activeRole, activeOrg } = useWorkspace();
  const location = useLocation();
  const isPlatformOwner = user?.role === "admin" || user?.platform_owner === true;
  const showHr = canAccessHr(activeRole);

  const handleLogout = () => base44.auth.logout(window.location.origin);

  // Primary product navigation — shown in the mobile bottom bar (max 4 items)
  // and in the desktop top nav.
  const primaryTabs = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/finance", label: "Finance", icon: Wallet },
  ];
  if (showHr) {
    primaryTabs.push({ to: "/hr", label: "HR", icon: Briefcase });
  }
  primaryTabs.push({ to: "/crm", label: "CRM", icon: Contact });

  // Items shown in the desktop top nav but moved to "More" on mobile to keep
  // the bottom bar uncluttered (Home, Finance, HR, CRM, More).
  const desktopOnlyTabs = [
    { to: "/content", label: "Content", icon: Megaphone },
    { to: "/templates", label: "Templates", icon: LayoutTemplate },
    { to: "/transcribe", label: "Transcribe", icon: Mic },
    { to: "/intelligence", label: "Intelligence", icon: Brain },
    { to: "/ai-team", label: "AI Team", icon: Sparkles },
    { to: "/assistant", label: "AI Assistant", icon: Bot },
    { to: "/inventory", label: "Inventory", icon: Package },
    { to: "/workflows", label: "Workflows", icon: Zap },
  ];
  if (activeOrg?.type === "church") {
    const cterm = resolveTerminology(activeOrg);
    const cftLabel = faithTypeLabel(activeOrg);
    desktopOnlyTabs.push({ to: "/church/giving", label: cterm.giving, icon: Heart });
    desktopOnlyTabs.push({ to: "/church/reports", label: `${cftLabel} Reports`, icon: BarChart3 });
  }
  if (activeOrg?.type === "school") {
    desktopOnlyTabs.push({ to: "/school/reports", label: "Report Cards", icon: GraduationCap });
  }

  // Secondary / admin items — grouped under "More" on both desktop and mobile.
  const secondaryTabs = [
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/team", label: "Team", icon: Users },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
    { to: "/affiliate", label: "Affiliate", icon: Gift },
  ];
  if (isPlatformOwner) {
    secondaryTabs.push({ to: "/platform-admin", label: "Platform", icon: Shield });
    secondaryTabs.push({ to: "/affiliate/admin", label: "Affiliate Management", icon: ShieldCheck });
  }

  // Help & onboarding entries — always available in the mobile "More" menu
  // (on desktop they live in the header Help button + the user menu).
  const helpTabs = [
    { to: "/help", label: "Help & Guide", icon: HelpCircle },
    { to: "/getting-started", label: "Getting Started", icon: Rocket },
  ];

  // Mobile bottom bar — fixed 4 primary destinations + More (5 slots total).
  // HR moves into More on mobile so Transcribe stays one tap away and labels
  // never wrap or overlap. Desktop keeps its own primaryTabs (incl. HR).
  const mobileBottomTabs = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/finance", label: "Finance", icon: Wallet },
    { to: "/crm", label: "CRM", icon: Contact },
    { to: "/transcribe", label: "Transcribe", icon: Mic },
  ];

  // Mobile "More" menu — HR (moved from the bottom bar) + remaining desktop-only
  // tabs (excluding Transcribe, now in the bottom bar) + Account + secondary/admin + help.
  const mobileMoreTabs = [];
  if (showHr) {
    mobileMoreTabs.push({ to: "/hr", label: "HR", icon: Briefcase });
  }
  mobileMoreTabs.push(
    ...desktopOnlyTabs.filter((t) => t.to !== "/transcribe"),
    { to: "/account", label: "Account", icon: UserIcon },
    ...secondaryTabs,
    ...helpTabs
  );
  const tabs = [...primaryTabs, ...desktopOnlyTabs, ...secondaryTabs];

  // Desktop: keep core modules as direct buttons; move Inventory and any
  // workspace-specific modules into the More dropdown to prevent overflow.
  // Desktop: Transcribe is a direct top-level nav item (visible from lg up);
  // Assistant, Inventory and workspace-specific modules stay in More.
  // Desktop: Content and Transcribe are direct top-level nav items; the rest
  // stay in the More dropdown to prevent overflow.
  const desktopDirectTabs = desktopOnlyTabs.filter((t) => t.to === "/transcribe" || t.to === "/content");
  const desktopOverflowTabs = desktopOnlyTabs.filter((t) => t.to !== "/transcribe" && t.to !== "/content");

  const isActive = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const navigate = useNavigate();
  const [tabHistory, setTabHistory] = useState({});

  // Determine which tab root the current path belongs to (longest prefix wins)
  const currentTabRoot = [...tabs]
    .sort((a, b) => b.to.length - a.to.length)
    .find((t) => (t.to === "/" ? location.pathname === "/" : location.pathname.startsWith(t.to)))?.to || null;

  // Track last visited sub-route for each tab
  useEffect(() => {
    if (currentTabRoot && currentTabRoot !== "/") {
      setTabHistory((prev) => ({ ...prev, [currentTabRoot]: location.pathname }));
    }
  }, [location.pathname, currentTabRoot]);

  // Clicking a tab returns to its last sub-route; clicking the active tab resets to root
  const handleTabClick = (tabTo) => {
    if (isActive(tabTo)) {
      navigate(tabTo);
    } else {
      navigate(tabHistory[tabTo] || tabTo);
    }
  };

  return (
    <div className="min-h-screen bg-brand-mint/40 flex flex-col">
      <header className="bg-brand-navy text-white sticky top-0 z-30 shadow-sm pt-safe pl-safe pr-safe print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 overflow-hidden shrink-0">
              <img
                src="https://media.base44.com/images/public/6a9335a8f5dcd11dda39fdfd/ebe972fdc_b8aaf7bdfa8c2541a7140be0cbc3d4d2e5b166e8be3c20edb58998238907201b.png"
                alt="FADS AI"
                className="w-full h-full object-cover object-left mix-blend-lighten"
              />
            </div>
            <span className="font-semibold truncate">FADS AI</span>
            <span className="text-white/50 text-xs hidden xl:inline">Business Suite</span>
          </div>
          <div className="flex items-center gap-1">
            <WorkspaceSwitcher />
            <DataModeSwitcher />
            <nav className="hidden lg:flex items-center gap-1">
              {primaryTabs.map((t) => (
                <Button
                  key={t.to}
                  variant="ghost"
                  className={`text-white gap-2 h-9 ${
                    isActive(t.to) ? "bg-brand-teal hover:bg-brand-teal" : "hover:bg-brand-teal/20"
                  }`}
                  onClick={() => handleTabClick(t.to)}
                >
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </Button>
              ))}
              {desktopDirectTabs.map((t) => (
                <Button
                  key={t.to}
                  variant="ghost"
                  className={`text-white gap-2 h-9 ${
                    isActive(t.to) ? "bg-brand-teal hover:bg-brand-teal" : "hover:bg-brand-teal/20"
                  }`}
                  onClick={() => handleTabClick(t.to)}
                >
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </Button>
              ))}
              {(desktopOverflowTabs.length > 0 || secondaryTabs.length > 0) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`text-white gap-2 h-9 ${
                        desktopOverflowTabs.some((t) => isActive(t.to)) || secondaryTabs.some((t) => isActive(t.to)) ? "bg-brand-teal hover:bg-brand-teal" : "hover:bg-brand-teal/20"
                      }`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      <span>More</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {desktopOverflowTabs.map((t) => (
                      <DropdownMenuItem key={t.to} asChild>
                        <Link to={t.to} className="flex items-center gap-2 cursor-pointer">
                          <t.icon className="w-4 h-4" /> {t.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    {desktopOverflowTabs.length > 0 && <DropdownMenuSeparator />}
                    {secondaryTabs.map((t) => (
                      <DropdownMenuItem key={t.to} asChild>
                        <Link to={t.to} className="flex items-center gap-2 cursor-pointer">
                          <t.icon className="w-4 h-4" /> {t.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {helpTabs.map((t) => (
                      <DropdownMenuItem key={t.to} asChild>
                        <Link to={t.to} className="flex items-center gap-2 cursor-pointer">
                          <t.icon className="w-4 h-4" /> {t.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
            <div className="text-sm text-white/60 hidden xl:block max-w-[140px] truncate">
              {user?.email}
            </div>
            <Link to={`/help?section=${helpSectionFor(location.pathname)}`} className="hidden sm:block">
              <Button variant="ghost" className="text-white hover:bg-brand-teal/20 h-9 px-2" title="Help & Guide">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-brand-teal/20 h-9 gap-1 px-2">
                  <UserIcon className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center gap-2 cursor-pointer">
                    <UserIcon className="w-4 h-4" /> Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/affiliate" className="flex items-center gap-2 cursor-pointer">
                    <Gift className="w-4 h-4" /> Earn with FADS
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/subscription" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="w-4 h-4" /> Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/hr/officer" className="flex items-center gap-2 cursor-pointer">
                    <Bot className="w-4 h-4" /> HR Officer
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/help" className="flex items-center gap-2 cursor-pointer">
                    <HelpCircle className="w-4 h-4" /> Help & Guide
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/support" className="flex items-center gap-2 cursor-pointer">
                    <TriangleAlert className="w-4 h-4" /> Report a Problem
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/getting-started" className="flex items-center gap-2 cursor-pointer">
                    <Rocket className="w-4 h-4" /> Getting Started
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <SettingsIcon className="w-4 h-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-6 pb-28 lg:pb-10 print:px-0 print:py-0 print:pb-0 print:max-w-none">
        <DemoModeGuidanceBanner />
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="hidden lg:block border-t border-border bg-card print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} FADS AI Business Suite</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-brand-navy hover:underline">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-brand-navy hover:underline">
              Terms
            </Link>
            <Link to="/support" className="hover:text-brand-navy hover:underline">
              Support
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile bottom tab bar — one-handed navigation (Home, Finance, CRM, Transcribe, More) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-brand-navy border-t border-white/10 pb-safe pl-safe pr-safe print:hidden">
        <div className="flex">
          {mobileBottomTabs.map((t) => {
            const active = isActive(t.to);
            return (
              <button
                key={t.to}
                onClick={() => handleTabClick(t.to)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px]"
              >
                <t.icon className={`w-5 h-5 ${active ? "text-brand-teal" : "text-white/60"}`} />
                <span
                  className={`text-xs ${
                    active ? "text-brand-teal font-medium" : "text-white/60"
                  }`}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
          {mobileMoreTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px]">
                  <MoreHorizontal className={`w-5 h-5 ${mobileMoreTabs.some((t) => isActive(t.to)) ? "text-brand-teal" : "text-white/60"}`} />
                  <span className={`text-xs ${mobileMoreTabs.some((t) => isActive(t.to)) ? "text-brand-teal font-medium" : "text-white/60"}`}>More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-56">
                {mobileMoreTabs.map((t) => (
                  <DropdownMenuItem key={t.to} asChild>
                    <Link to={t.to} className="flex items-center gap-2 cursor-pointer">
                      <t.icon className="w-4 h-4" /> {t.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer text-destructive font-medium"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </nav>
    </div>
  );
}