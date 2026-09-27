import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Public layout for legal/help pages (Privacy, Terms, Support). Reachable
// without authentication so store reviewers can read them.
export default function LegalLayout({ title, updated, children, backTo = "/" }) {
  return (
    <div className="min-h-screen bg-brand-mint/40">
      <header className="bg-brand-navy text-white pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to={backTo}>
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-white/80 hover:text-white">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <span className="font-semibold">FADS AI</span>
          <span className="text-white/50 text-xs hidden sm:inline">Business Suite</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 pb-20">
        <h1 className="text-2xl font-bold text-brand-navy mb-1">{title}</h1>
        {updated && (
          <p className="text-xs text-muted-foreground mb-6">Last updated: {updated}</p>
        )}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 space-y-4 text-sm leading-relaxed text-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}