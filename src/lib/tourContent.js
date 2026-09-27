// Guided tour definitions for the FADS robot.
// Each tour is a short, plain-English walkthrough. Tours are launched
// from the Help Centre or the Getting Started completion screen.

export const TOURS = {
  overview: {
    id: "overview",
    name: "FADS Overview",
    description: "A quick 60-second tour of FADS.",
    steps: [
      { title: "Home", text: "This is your starting point. I'll show you what needs attention.", route: "/" },
      { title: "Ask FADS", text: "Ask me questions about your organisation in normal language.", route: "/assistant" },
      { title: "Daily Brief", text: "I can give you a quick summary of what matters today.", route: "/intelligence" },
      { title: "Departments", text: "Finance, HR, CRM, Transcribe and your other tools live here.", route: "/" },
      { title: "Quick Actions", text: "Use these when you already know what you want to do.", route: "/" },
      { title: "Demo / Live", text: "Demo uses sample information. Live is your real organisation.", route: "/" },
      { title: "Help", text: "If you're ever unsure, ask FADS or open Help.", route: "/help" },
    ],
  },
  finance: {
    id: "finance",
    name: "Finance Tour",
    description: "Money in, money out, invoices and receipts.",
    steps: [
      { title: "Money came in", text: "Record money coming into your organisation.", route: "/finance/money-in" },
      { title: "I bought something", text: "Record expenses and purchases.", route: "/finance/money-out" },
      { title: "Scan Receipt", text: "Snap a receipt and FADS extracts the details for you.", route: "/finance?scan=1" },
      { title: "Send Invoice", text: "Create and send invoices to your customers.", route: "/finance/invoices/new" },
      { title: "Ask Finance Officer", text: "Get help with your money from the Finance Officer.", route: "/finance-officer" },
    ],
  },
  crm: {
    id: "crm",
    name: "CRM Tour",
    description: "Contacts, follow-ups and communication.",
    steps: [
      { title: "Add / Import Contacts", text: "Add people one by one or bring them in from a spreadsheet.", route: "/crm/contacts" },
      { title: "Follow-ups", text: "Keep track of people and follow-ups.", route: "/crm/contacts" },
      { title: "Tasks", text: "Stay on top of what needs doing.", route: "/crm/tasks" },
      { title: "WhatsApp Draft", text: "Draft a WhatsApp message for review before sending.", route: "/crm/contacts" },
      { title: "Ask FADS", text: "Ask me about your contacts and follow-ups.", route: "/assistant" },
    ],
  },
  hr: {
    id: "hr",
    name: "HR Tour",
    description: "Staff, leave and documents.",
    steps: [
      { title: "Staff", text: "Add and manage your team members.", route: "/hr/employees" },
      { title: "Import Staff", text: "Bring in your staff from a spreadsheet.", route: "/hr/employees" },
      { title: "Leave / Attendance", text: "Track who's off and who's in.", route: "/hr/leave" },
      { title: "HR Documents", text: "Store contracts and documents securely.", route: "/hr/employees" },
      { title: "Ask HR Manager", text: "Get help with your team from the HR Manager.", route: "/hr/officer" },
    ],
  },
  inventory: {
    id: "inventory",
    name: "Inventory Tour",
    description: "Products, stock levels and reorder insights.",
    steps: [
      { title: "Products", text: "Add and manage your products.", route: "/inventory" },
      { title: "Stock Levels", text: "See what's in stock, running low, or out.", route: "/inventory" },
      { title: "Smart Stock", text: "FADS highlights what needs attention.", route: "/inventory" },
      { title: "Reorder Insights", text: "Know what to reorder before you run out.", route: "/inventory" },
    ],
  },
  transcribe: {
    id: "transcribe",
    name: "Transcribe Tour",
    description: "Record, transcribe and summarise meetings.",
    steps: [
      { title: "Record / Upload", text: "Record a meeting or upload audio.", route: "/transcribe/studio" },
      { title: "Transcript", text: "Get a full transcript of your meeting.", route: "/transcribe" },
      { title: "Summary", text: "FADS summarises the key points for you.", route: "/transcribe" },
      { title: "Actions / Notes", text: "Capture action points and decisions.", route: "/transcribe" },
    ],
  },
};

// Tours available for a given organisation type.
export function getAvailableTours(orgType) {
  return Object.values(TOURS);
}