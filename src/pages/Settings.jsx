import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  User,
  Shield,
  Scale,
  LifeBuoy,
  Mic,
  KeyRound,
  ChevronRight,
  Building2,
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const isPlatformOwner = user?.role === "admin" || user?.platform_owner === true;

  const items = [
    {
      to: "/manage-organisations",
      label: "Manage Organisations",
      desc: "View, edit and switch between your organisations",
      icon: Building2,
    },
    {
      to: "/account",
      label: "Account",
      desc: "Delete your account or request a copy of your data",
      icon: User,
    },
    {
      to: "/permissions",
      label: "App permissions",
      desc: "Why we ask for microphone, camera, notifications and files",
      icon: Mic,
    },
    {
      to: "/privacy",
      label: "Privacy Policy",
      desc: "How we collect, use and protect your data",
      icon: Shield,
    },
    {
      to: "/terms",
      label: "Terms of Service",
      desc: "The terms for using FADS AI Business Suite",
      icon: Scale,
    },
    {
      to: "/support",
      label: "Support",
      desc: "Get help and contact our team",
      icon: LifeBuoy,
    },
  ];

  if (isPlatformOwner) {
    items.push({
      to: "/reviewer-access",
      label: "Reviewer access",
      desc: "Test credentials for App Store / Google Play reviewers",
      icon: KeyRound,
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Account, legal and app information.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="flex items-center gap-3 p-4 min-h-[64px] hover:bg-accent active:bg-accent"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
              <it.icon className="w-5 h-5 text-brand-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-brand-navy">{it.label}</div>
              <div className="text-sm text-muted-foreground">{it.desc}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Signed in as {user?.email}
      </div>
    </div>
  );
}