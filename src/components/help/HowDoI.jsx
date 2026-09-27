import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft, ArrowUpRight, Receipt, FileText, Wallet,
  UserPlus, Upload, Calendar, Users, Mic, FileAudio,
  Activity, Calculator, Bot, ChevronRight,
} from "lucide-react";

// How Do I...? — large plain-English action buttons. Each navigates
// directly to the correct existing feature. No dead buttons.
const ACTIONS = [
  { label: "Record money coming in", to: "/finance/money-in", icon: ArrowDownLeft },
  { label: "Record something I bought", to: "/finance/money-out", icon: ArrowUpRight },
  { label: "Scan a receipt", to: "/finance?scan=1", icon: Receipt },
  { label: "Send an invoice", to: "/finance/invoices/new", icon: FileText },
  { label: "See who owes me money", to: "/finance/invoices", icon: Wallet },
  { label: "Add a customer", to: "/crm/contacts", icon: UserPlus },
  { label: "Import my contacts", to: "/crm/contacts", icon: Upload },
  { label: "Follow up with someone", to: "/crm/tasks", icon: Calendar },
  { label: "Add an employee", to: "/hr/employees/new", icon: Users },
  { label: "Record a meeting", to: "/transcribe/studio", icon: Mic },
  { label: "Turn a meeting into notes", to: "/transcribe", icon: FileAudio },
  { label: "Check my business health", to: "/intelligence", icon: Activity },
  { label: "Check my tax readiness", to: "/finance/tax-centre", icon: Calculator },
  { label: "Ask FADS about my business", to: "/assistant", icon: Bot },
];

export default function HowDoI() {
  return (
    <div id="how-do-i" className="space-y-3 scroll-mt-4">
      <h2 className="text-lg font-bold text-brand-navy">How do I…?</h2>
      <p className="text-sm text-muted-foreground">Tap what you're trying to do and I'll take you straight there.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="flex items-center justify-between bg-card rounded-xl border border-border p-3.5 hover:border-brand-teal transition-colors min-h-touch"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
              <a.icon className="w-4 h-4 text-brand-teal shrink-0" /> {a.label}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}