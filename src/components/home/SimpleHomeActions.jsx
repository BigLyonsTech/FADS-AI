import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Bot,
  CalendarPlus,
  FileText,
  GraduationCap,
  Heart,
  Mic,
  PackagePlus,
  Receipt,
  RefreshCw,
  UserPlus,
  Users,
  Wallet,
  Bell,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import {
  canManageFinance,
  canManageInvoices,
  canViewFinanceTotals,
  financeWording,
} from "@/lib/financeWording";
import { resolveTerminology } from "@/lib/faithTerminology";
import { useInventory } from "@/lib/useInventory";
import RecordSaleDialog from "@/components/finance/RecordSaleDialog";
import TransactionDialog from "@/components/finance/TransactionDialog";
import ContactDialog from "@/components/crm/ContactDialog";
import TaskDialog from "@/components/crm/TaskDialog";

const GROUP_STYLES = {
  money: {
    shell: "border-brand-teal/20 bg-brand-mint/25",
    title: "text-brand-navy",
    card: "border-brand-teal/20 bg-white/90 hover:border-brand-teal/45 hover:bg-brand-mint/40 dark:bg-white dark:hover:bg-slate-50",
    icon: "bg-brand-teal/15 text-brand-teal ring-1 ring-brand-teal/15",
    cardTitle: "text-slate-900",
    cardHelper: "text-slate-600",
    arrow: "text-brand-teal/60 group-hover:text-brand-teal",
  },
  day_to_day: {
    shell: "border-brand-navy/10 bg-muted/25",
    title: "text-brand-navy",
    card: "border-brand-navy/10 bg-white/90 hover:border-brand-navy/20 hover:bg-brand-navy/[0.025] dark:bg-white dark:hover:bg-slate-50",
    icon: "bg-brand-navy/[0.06] text-brand-navy ring-1 ring-brand-navy/10",
    cardTitle: "text-slate-900",
    cardHelper: "text-slate-600",
    arrow: "text-brand-navy/35 group-hover:text-brand-navy/60",
  },
  ai: {
    shell: "border-brand-teal/25 bg-brand-navy/[0.035]",
    title: "text-brand-navy",
    card: "border-brand-teal/35 bg-brand-mint/55 hover:border-brand-teal/60 hover:bg-brand-mint/80 shadow-sm dark:bg-white dark:hover:bg-slate-50",
    icon: "bg-brand-teal text-brand-navy ring-1 ring-brand-teal/30 shadow-sm",
    cardTitle: "text-slate-900",
    cardHelper: "text-slate-600",
    arrow: "text-brand-teal group-hover:text-brand-navy",
  },
};

function HomeRecordSaleDialog({ onSaved, ...props }) {
  const inventory = useInventory();
  const handleSaved = async (result) => {
    await Promise.all([onSaved?.(result), inventory.invalidate()]);
  };
  return (
    <RecordSaleDialog
      {...props}
      onSaved={handleSaved}
      inventoryItems={inventory.items}
    />
  );
}

function ActionButton({ action, onClick, visualGroup }) {
  const Icon = action.icon;
  const style = GROUP_STYLES[visualGroup] || GROUP_STYLES.day_to_day;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-h-[108px] rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 ${style.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className={`w-4 h-4 transition-colors ${style.arrow}`} />
      </div>
      <p className={`font-semibold mt-3 leading-tight ${style.cardTitle}`}>{action.label}</p>
      {action.helper && (
        <p className={`text-xs mt-1 leading-snug ${style.cardHelper}`}>{action.helper}</p>
      )}
    </button>
  );
}

export default function SimpleHomeActions({
  activeOrg,
  activeRole,
  finance,
  invoiceData,
  crm,
}) {
  const navigate = useNavigate();
  const [saleOpen, setSaleOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);

  const orgType = activeOrg?.type || "small_business";
  const canWriteFinance = canManageFinance(activeRole);
  const canInvoice = canManageInvoices(activeRole);
  const canSeeFinanceTotals = canViewFinanceTotals(activeRole);
  const wording = financeWording(activeOrg);

  const micSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";

  const givingTerm = orgType === "church"
    ? resolveTerminology(activeOrg).giving
    : "Giving";

  const actions = useMemo(() => {
    if (orgType === "school") {
      return [
        canWriteFinance && {
          key: "school-payment",
          label: "Record a Fee / Payment",
          helper: "Money received by the school",
          icon: Wallet,
          route: "/finance/money-in",
        },
        canWriteFinance && {
          key: "school-spent",
          label: "Money Spent",
          helper: "Record a school expense",
          icon: Receipt,
          route: "/finance/money-out",
        },
        {
          key: "school-contact",
          label: "Add Parent / Guardian",
          helper: "Add someone to your school contacts",
          icon: UserPlus,
          dialog: "contact",
        },
        {
          key: "school-meeting",
          label: "Book a Meeting",
          helper: "Arrange a parent or school meeting",
          icon: CalendarPlus,
          dialog: "appointment",
        },
        {
          key: "school-follow",
          label: "Follow Up",
          helper: "See enquiries and people to contact",
          icon: RefreshCw,
          route: "/crm/leads",
        },
        {
          key: "school-records",
          label: "School Records",
          helper: "Open existing school reports",
          icon: GraduationCap,
          route: "/school/reports",
        },
        {
          key: "school-reminders",
          label: "Reminders",
          helper: "Appointments, reminders and tasks",
          icon: Bell,
          route: "/crm/tasks",
        },
        {
          key: "school-ask",
          label: "Ask FADS",
          helper: "Ask about your school records",
          icon: Bot,
          route: "/assistant",
        },
      ].filter(Boolean);
    }

    if (orgType === "church") {
      return [
        canWriteFinance && {
          key: "church-giving",
          label: `Record ${givingTerm} / Donation`,
          helper: "Use your existing giving records",
          icon: Heart,
          route: "/church/giving",
        },
        canWriteFinance && {
          key: "church-spent",
          label: "Money Spent",
          helper: "Record a church expense",
          icon: Receipt,
          route: "/finance/money-out",
        },
        {
          key: "church-contact",
          label: "Add a Member / Contact",
          helper: "Add a member, visitor or contact",
          icon: UserPlus,
          dialog: "contact",
        },
        {
          key: "church-meeting",
          label: "Book a Meeting",
          helper: "Arrange a meeting or visit",
          icon: CalendarPlus,
          dialog: "appointment",
        },
        {
          key: "church-follow",
          label: "Follow Up",
          helper: "See contacts who need attention",
          icon: RefreshCw,
          route: "/crm/leads",
        },
        {
          key: "church-people",
          label: "Members & Contacts",
          helper: "Find people already in FADS",
          icon: Users,
          route: "/crm/contacts",
        },
        {
          key: "church-reminders",
          label: "Reminders",
          helper: "Meetings, reminders and tasks",
          icon: Bell,
          route: "/crm/tasks",
        },
        {
          key: "church-ask",
          label: "Ask FADS",
          helper: "Ask about your church records",
          icon: Bot,
          route: "/assistant",
        },
      ].filter(Boolean);
    }

    return [
      canWriteFinance && {
        key: "sale",
        label: "I made a sale",
        helper: "Paid now or money still owed",
        icon: BadgeDollarSign,
        dialog: "sale",
      },
      canSeeFinanceTotals && {
        key: "view-sales",
        label: "View Sales",
        helper: "See sales today, this week, this month and money still owed",
        icon: BarChart3,
        route: "/finance/sales",
      },
      canWriteFinance && {
        key: "spent",
        label: "I spent money",
        helper: "Record a business expense",
        icon: Receipt,
        route: "/finance/money-out",
      },
      canSeeFinanceTotals && {
        key: "owed",
        label: "A customer owes me",
        helper: "See unpaid customer balances",
        icon: Wallet,
        route: "/finance/money-owed",
      },
      canInvoice && {
        key: "invoice",
        label: "Make an Invoice",
        helper: "Bill a customer",
        icon: FileText,
        route: "/finance/invoices/new",
      },
      canInvoice && {
        key: "quotation",
        label: "Create Quotation",
        helper: "Send a customer a price before invoicing",
        icon: FileText,
        route: "/finance/quotations/new",
      },
      {
        key: "customer",
        label: "Add a Customer",
        helper: "Add someone to your contacts",
        icon: UserPlus,
        dialog: "contact",
      },
      {
        key: "appointment",
        label: "Book Someone",
        helper: "Create an appointment",
        icon: CalendarPlus,
        dialog: "appointment",
      },
      {
        key: "follow",
        label: "Follow Up",
        helper: "See who needs contacting",
        icon: RefreshCw,
        route: "/crm/leads",
      },
      {
        key: "stock",
        label: "I bought stock",
        helper: "Add or update items in Inventory",
        icon: PackagePlus,
        route: "/inventory",
      },
      canWriteFinance && {
        key: "scan",
        label: "Scan a receipt",
        helper: "Photograph or upload an expense receipt",
        icon: Receipt,
        route: "/finance?scan=1",
      },
      {
        key: "employee",
        label: "Add an employee",
        helper: "Add someone to your team",
        icon: Users,
        route: "/hr/employees/new",
      },
      {
        key: "ask",
        label: "I'm not sure — guide me",
        helper: "Tell FADS what happened in your own words",
        icon: Bot,
        route: "/assistant",
      },
      canWriteFinance && micSupported && {
        key: "tell",
        label: "Tell FADS",
        helper: "Speak money in or money spent, then review before saving",
        icon: Mic,
        dialog: "voice",
      },
    ].filter(Boolean);
  }, [
    orgType,
    canWriteFinance,
    canInvoice,
    canSeeFinanceTotals,
    micSupported,
    givingTerm,
  ]);

  const visualGroups = useMemo(() => {
    const groupConfig = orgType === "school"
      ? [
          { key: "money", label: "Money", actionKeys: ["school-payment", "school-spent"] },
          { key: "day_to_day", label: "People & Day-to-Day", actionKeys: ["school-contact", "school-meeting", "school-follow", "school-records", "school-reminders"] },
          { key: "ai", label: "FADS AI", actionKeys: ["school-ask"] },
        ]
      : orgType === "church"
        ? [
            { key: "money", label: "Money & Giving", actionKeys: ["church-giving", "church-spent"] },
            { key: "day_to_day", label: "People & Day-to-Day", actionKeys: ["church-contact", "church-meeting", "church-follow", "church-people", "church-reminders"] },
            { key: "ai", label: "FADS AI", actionKeys: ["church-ask"] },
          ]
        : [
            { key: "money", label: "Money", actionKeys: ["sale", "view-sales", "spent", "owed", "invoice", "quotation"] },
            { key: "day_to_day", label: "Customers & Day-to-Day", actionKeys: ["customer", "appointment", "follow", "stock", "employee"] },
            { key: "ai", label: "FADS AI", actionKeys: ["scan", "ask", "tell"] },
          ];

    const actionByKey = new Map(actions.map((action) => [action.key, action]));

    return groupConfig
      .map((group) => ({
        ...group,
        actions: group.actionKeys.map((key) => actionByKey.get(key)).filter(Boolean),
      }))
      .filter((group) => group.actions.length > 0);
  }, [actions, orgType]);

  const openAction = (action) => {
    if (action.route) {
      navigate(action.route);
      return;
    }
    if (action.dialog === "sale") setSaleOpen(true);
    if (action.dialog === "voice") setVoiceOpen(true);
    if (action.dialog === "contact") setContactOpen(true);
    if (action.dialog === "appointment") setAppointmentOpen(true);
  };

  const refreshMoney = async () => {
    await Promise.all([
      finance?.reload?.(),
      invoiceData?.reload?.(),
    ]);
  };

  return (
    <>
      <section aria-labelledby="simple-home-heading" className="space-y-3">
        <div>
          <h2 id="simple-home-heading" className="text-xl font-bold text-brand-navy">
            Tell FADS what happened
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {orgType === "school"
              ? "What would you like to manage at the school today?"
              : orgType === "church"
                ? "What would you like help with at the church today?"
                : "Choose what happened. FADS will open the right existing tool and guide you."}
          </p>
        </div>

        <div className="space-y-4">
          {visualGroups.map((group) => {
            const style = GROUP_STYLES[group.key] || GROUP_STYLES.day_to_day;

            return (
              <div
                key={group.key}
                className={`rounded-2xl border p-3 sm:p-4 ${style.shell}`}
              >
                <h3 className={`text-xs font-semibold uppercase tracking-[0.12em] mb-3 ${style.title}`}>
                  {group.label}
                </h3>
                <div className={`grid grid-cols-2 gap-3 ${
                  group.key === "ai"
                    ? "md:grid-cols-2"
                    : group.key === "money" && orgType === "small_business"
                      ? "md:grid-cols-3 xl:grid-cols-5"
                      : "md:grid-cols-3 xl:grid-cols-4"
                }`}>
                  {group.actions.map((action) => (
                    <ActionButton
                      key={action.key}
                      action={action}
                      visualGroup={group.key}
                      onClick={() => openAction(action)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {orgType === "small_business" && canWriteFinance && saleOpen && (
        <HomeRecordSaleDialog
          open
          autoDictate={false}
          onClose={() => setSaleOpen(false)}
          onSaved={refreshMoney}
          onAccountsChanged={finance?.reload}
          onCreateInvoice={() => navigate("/finance/invoices/new")}
          accounts={finance?.accounts || []}
          categories={finance?.categories || []}
          contacts={finance?.contacts || []}
          orgId={activeOrg?.id}
          currency={activeOrg?.currency}
        />
      )}

      {canWriteFinance && micSupported && (
        <TransactionDialog
          open={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          onSaved={async () => {
            await refreshMoney();
            setVoiceOpen(false);
          }}
          accounts={finance?.accounts || []}
          categories={finance?.categories || []}
          contacts={finance?.contacts || []}
          orgId={activeOrg?.id}
          wording={wording}
          currency={activeOrg?.currency}
          autoDictate
        />
      )}

      <ContactDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        orgId={crm?.orgId}
        orgType={orgType}
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateContact(id, payload);
          else await crm.createContact(payload);
          setContactOpen(false);
        }}
      />

      <TaskDialog
        key={`${crm?.orgId || ""}:${crm?.dataMode || ""}`}
        open={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
        contacts={crm?.contacts || []}
        tasks={crm?.tasks || []}
        defaultType="appointment"
        onSaved={async (payload, isEdit, id) => {
          if (isEdit) await crm.updateTask(id, payload);
          else await crm.createTask(payload);
          setAppointmentOpen(false);
        }}
      />
    </>
  );
}
