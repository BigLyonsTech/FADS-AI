// Guided Chart of Accounts structure for non-accountants.
// Each class (Asset, Liability, Equity, Income, Expense) has plain-English
// explanations and suggested categories. FADS guides the user but never
// makes accounting decisions for them — the user always confirms.

export const ACCOUNT_CLASSES = [
  {
    value: "asset",
    label: "Asset",
    description: "Things your organisation owns or is owed — cash, bank balances, money customers owe you, equipment and property.",
    categories: [
      {
        value: "Cash & Bank",
        description: "Cash on hand and money held in bank or savings accounts.",
        defaultType: "bank",
        suggestions: ["Current Account", "Savings Account", "Petty Cash", "Cash Register"],
      },
      {
        value: "Accounts Receivable",
        description: "Money customers (or parents/students/members) owe you for sales or fees you've already issued.",
        defaultType: "other",
      },
      {
        value: "Inventory",
        description: "Goods held for sale or raw materials used in operations.",
        defaultType: "other",
      },
      {
        value: "Fixed Assets",
        description: "Long-term physical assets used to run the organisation.",
        defaultType: "other",
        suggestions: ["Plant & Machinery", "Furniture & Fittings", "Office Equipment", "Computer Equipment", "Motor Vehicles", "Buildings", "Land"],
      },
      {
        value: "Intangible Assets",
        description: "Non-physical assets that hold long-term value.",
        defaultType: "other",
        suggestions: ["Software", "Licences", "Patents", "Trademarks", "Goodwill"],
      },
    ],
  },
  {
    value: "liability",
    label: "Liability",
    description: "Money your organisation owes to others — unpaid supplier bills, loans, credit cards and tax owed.",
    categories: [
      { value: "Accounts Payable", description: "Money you owe to suppliers for purchases made on credit.", defaultType: "other" },
      { value: "Loans & Borrowings", description: "Bank loans, mortgages and other borrowings repayable over time.", defaultType: "other" },
      { value: "Credit Cards", description: "Outstanding balances on business credit cards.", defaultType: "other" },
      { value: "Sales Tax Payable", description: "Tax collected from customers that is owed to the tax authority.", defaultType: "other" },
      { value: "Payroll Liabilities", description: "Wages, tax and deductions owed to staff but not yet paid.", defaultType: "other" },
      { value: "Other Liabilities", description: "Any other amount your organisation owes.", defaultType: "other" },
    ],
  },
  {
    value: "equity",
    label: "Equity",
    description: "The owner's stake in the organisation — capital invested and accumulated profits kept in the business.",
    categories: [
      { value: "Owner's Equity", description: "Money the owner has invested into the organisation.", defaultType: "other" },
      { value: "Retained Earnings", description: "Profits kept in the organisation over time rather than withdrawn.", defaultType: "other" },
      { value: "Share Capital", description: "Funds raised by issuing shares (where applicable).", defaultType: "other" },
      { value: "Drawings", description: "Money the owner has taken out of the organisation for personal use.", defaultType: "other" },
    ],
  },
  {
    value: "income",
    label: "Income",
    description: "Money earned from sales, fees or other sources — the revenue of your organisation.",
    categories: [
      { value: "Sales Revenue", description: "Income from selling goods or products.", defaultType: "other" },
      { value: "Service Revenue", description: "Income from providing services.", defaultType: "other" },
      { value: "Fees & Subscriptions", description: "Recurring fees, memberships or subscriptions received.", defaultType: "other" },
      { value: "Donations & Tithes", description: "Gifts, tithes and offerings received (common for churches).", defaultType: "other" },
      { value: "Interest Income", description: "Income earned from bank interest.", defaultType: "other" },
      { value: "Other Income", description: "Any other income not covered above.", defaultType: "other" },
    ],
  },
  {
    value: "expense",
    label: "Expense",
    description: "Costs of running the organisation — rent, wages, supplies, utilities and more.",
    categories: [
      { value: "Rent", description: "Cost of renting premises or equipment.", defaultType: "other" },
      { value: "Utilities", description: "Electricity, water, internet and phone costs.", defaultType: "other" },
      { value: "Salaries & Wages", description: "Pay paid to employees and staff.", defaultType: "other" },
      { value: "Supplies", description: "Day-to-day consumable items used in operations.", defaultType: "other" },
      { value: "Marketing", description: "Advertising, promotion and marketing costs.", defaultType: "other" },
      { value: "Insurance", description: "Insurance premiums for the organisation.", defaultType: "other" },
      { value: "Travel", description: "Business travel, transport and mileage costs.", defaultType: "other" },
      { value: "Depreciation", description: "The gradual loss of value of fixed assets over time.", defaultType: "other" },
      { value: "Other Expenses", description: "Any other cost not covered above.", defaultType: "other" },
    ],
  },
];

const CLASS_MAP = Object.fromEntries(ACCOUNT_CLASSES.map((c) => [c.value, c]));

export function getAccountClass(value) {
  return CLASS_MAP[value] || null;
}

export function getCategoriesForClass(classValue) {
  return CLASS_MAP[classValue]?.categories || [];
}

export function getCategory(classValue, categoryValue) {
  return (CLASS_MAP[classValue]?.categories || []).find((c) => c.value === categoryValue) || null;
}

export function accountClassLabel(value) {
  return CLASS_MAP[value]?.label || "Other";
}

// Friendly ordering for grouped display on the Chart of Accounts page.
export const CLASS_ORDER = ["asset", "liability", "equity", "income", "expense"];