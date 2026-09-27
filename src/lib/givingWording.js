// Church Giving & Pledges wording. Funds map 1:1 to income FinanceCategories —
// Finance remains the source of truth. A fund category is created on demand the
// first time giving is recorded against it (via the existing finance backend).

export const CHURCH_FUNDS = [
  "Tithes",
  "Offerings",
  "Donations",
  "Building Fund",
  "Missions",
  "Youth",
  "Welfare",
];

// Quick "Record giving" kinds shown in the Giving dashboard. Each maps to a fund
// (income category) name.
export const GIVING_KINDS = [
  { value: "Tithes", label: "Tithe" },
  { value: "Offerings", label: "Offering" },
  { value: "Donations", label: "Donation" },
  { value: "Building Fund", label: "Building Fund" },
  { value: "Missions", label: "Missions" },
  { value: "Youth", label: "Youth" },
  { value: "Welfare", label: "Welfare" },
];

// The three classic giving types used by the dashboard summary + reports.
export const GIVING_TYPE_FUNDS = ["Tithes", "Offerings", "Donations"];

export function isChurchFundName(name) {
  return CHURCH_FUNDS.some((f) => f.toLowerCase() === String(name || "").toLowerCase());
}