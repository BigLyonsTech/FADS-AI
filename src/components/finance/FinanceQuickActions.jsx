import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Truck,
  BarChart3,
  Heart,
  Wallet,
  TrendingUp,
  ScanLine,
  Landmark,
  FileDown,
} from "lucide-react";

// Type-aware Quick Actions for the Finance dashboard. All link to existing
// routes — one shared Finance product, no duplicated pages. The org type
// only determines which contextual labels and shortcuts appear.
const ACTIONS = {
  small_business: [
    { label: "Create Invoice", to: "/finance/invoices/new", icon: FileText },
    { label: "Record Income", to: "/finance/money-in", icon: ArrowDownLeft },
    { label: "Record Expense", to: "/finance/money-out", icon: ArrowUpRight },
    { label: "Customers", to: "/finance/contacts", icon: Users },
    { label: "Suppliers", to: "/finance/contacts", icon: Truck },
    { label: "Financial Reports", to: "/finance/reports", icon: BarChart3 },
  ],
  school: [
    { label: "Record School Fee Payment", to: "/finance/money-in", icon: ArrowDownLeft },
    { label: "Outstanding School Fees", to: "/finance/invoices", icon: FileText },
    { label: "Record Expense", to: "/finance/money-out", icon: ArrowUpRight },
    { label: "School Income", to: "/finance/transactions", icon: TrendingUp },
    { label: "Budget", to: "/finance/categories", icon: Wallet },
    { label: "Financial Reports", to: "/finance/reports", icon: BarChart3 },
  ],
  university: [
    { label: "Record Student Fee Payment", to: "/finance/money-in", icon: ArrowDownLeft },
    { label: "Outstanding Student Fees", to: "/finance/invoices", icon: FileText },
    { label: "Department Expenses", to: "/finance/money-out", icon: ArrowUpRight },
    { label: "University Income", to: "/finance/transactions", icon: TrendingUp },
    { label: "Department Budgets", to: "/finance/categories", icon: Wallet },
    { label: "Financial Reports", to: "/finance/reports", icon: BarChart3 },
  ],
  church: [
    { label: "Record Tithe / Offering", to: "/finance/money-in", icon: ArrowDownLeft },
    { label: "Record Donation", to: "/finance/receipts", icon: Heart },
    { label: "Record Expense", to: "/finance/money-out", icon: ArrowUpRight },
    { label: "Giving Summary", to: "/finance/transactions", icon: TrendingUp },
    { label: "Ministry / Department Budget", to: "/finance/categories", icon: Wallet },
    { label: "Financial Reports", to: "/finance/reports", icon: BarChart3 },
  ],
};

export default function FinanceQuickActions({ orgType, onScanReceipt, onUploadStatement, onDownloadStatement }) {
  const navigate = useNavigate();
  const actions = ACTIONS[orgType] || ACTIONS.small_business;

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {onUploadStatement && (
          <button
            onClick={onUploadStatement}
            className="bg-gradient-to-r from-brand-teal/10 to-brand-teal/5 border border-brand-teal/30 rounded-xl p-4 flex items-center gap-3 hover:border-brand-teal transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-navy">Upload Bank Statement</p>
              <p className="text-xs text-muted-foreground">FADS reads it, matches what it can, you approve the rest.</p>
            </div>
          </button>
        )}
        {onDownloadStatement && (
          <button
            onClick={onDownloadStatement}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-brand-teal transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-navy">Download Statement</p>
              <p className="text-xs text-muted-foreground">Export your FADS Account Activity as PDF or spreadsheet.</p>
            </div>
          </button>
        )}
      </div>
      {onScanReceipt && (
        <button
          onClick={onScanReceipt}
          className="w-full bg-gradient-to-r from-brand-teal/10 to-brand-teal/5 border border-brand-teal/30 rounded-xl p-4 flex items-center gap-3 hover:border-brand-teal transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-navy">Scan Receipt</p>
            <p className="text-xs text-muted-foreground">Upload a receipt and let FADS help organise the transaction.</p>
          </div>
        </button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className="bg-card rounded-xl border border-border p-4 hover:border-brand-teal transition-colors text-left"
          >
            <a.icon className="w-5 h-5 text-brand-teal" />
            <p className="text-sm font-medium mt-2 text-brand-navy leading-tight">{a.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}