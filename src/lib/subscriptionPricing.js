// International billing currencies supported by the FADS AI pricing selector.
// Billing currency is separate from the organisation's operational accounting
// currency — this selector only affects what the user sees on the subscription
// page, not the org's finance records.
export const BILLING_CURRENCIES = [
  { code: "NGN", label: "Nigerian Naira", symbol: "₦", region_label: "Nigeria" },
  { code: "EUR", label: "Euro", symbol: "€", region_label: "Eurozone (Ireland, France)" },
  { code: "GBP", label: "British Pound", symbol: "£", region_label: "United Kingdom" },
  { code: "USD", label: "US Dollar", symbol: "$", region_label: "United States" },
];

// Map organisation country code → suggested billing currency.
export const COUNTRY_TO_CURRENCY = {
  NG: "NGN", IE: "EUR", GB: "GBP", FR: "EUR", US: "USD",
};

// Legacy country list kept for compatibility with existing admin components.
export const COUNTRIES = [
  { code: "NG", label: "Nigeria", currency: "NGN" },
  { code: "IE", label: "Ireland", currency: "EUR" },
  { code: "GB", label: "United Kingdom", currency: "GBP" },
  { code: "FR", label: "France", currency: "EUR" },
  { code: "US", label: "United States", currency: "USD" },
];

const CURRENCY_SYMBOLS = { USD: "$", NGN: "₦", EUR: "€", GBP: "£" };

export function formatPrice(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  const value = Number(amount || 0).toLocaleString();
  return symbol ? `${symbol}${value}` : `${currency} ${value}`;
}

// Suggest a billing currency based on the organisation's saved country.
// Never forces the choice — the user can always switch manually.
export function suggestCurrency(country) {
  return COUNTRY_TO_CURRENCY[country] || "USD";
}

const STORAGE_KEY = "fads_selected_billing_currency";

// Read the user's manually-selected billing currency from localStorage.
export function getStoredCurrency() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

// Persist the user's billing currency selection so it is remembered across visits.
export function setStoredCurrency(currency) {
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // Ignore — storage may be unavailable in private browsing.
  }
}

// Resolve the effective billing currency: user's stored choice wins, otherwise
// the suggested currency based on the organisation's country.
export function resolveBillingCurrency(suggested) {
  const stored = getStoredCurrency();
  return stored || suggested || "USD";
}