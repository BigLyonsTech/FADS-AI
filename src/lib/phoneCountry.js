// Lightweight country → dial-code helper for CRM phone numbers.
// No geolocation/GPS or paid API: the default comes from the organisation's
// saved country (priority 1) or the browser/device locale (priority 2).
// The user can always override the suggested code for international contacts.

export const COUNTRY_DIAL_CODES = [
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
];

export function dialCodeByCode(code) {
  return COUNTRY_DIAL_CODES.find((c) => c.code === code) || null;
}

// Map a 2-letter region from the browser/device locale (e.g. "en-IE" → "IE").
function regionFromLocale() {
  try {
    const locale = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
    const m = locale.match(/-([a-z]{2})$/);
    if (m) return m[1].toUpperCase();
  } catch {
    // ignore — locale unavailable
  }
  return null;
}

// Pick the best default country for a new contact's phone number.
// Priority: 1) organisation's saved country, 2) browser/device locale.
export function suggestDialCountry(org) {
  if (org?.country && dialCodeByCode(org.country)) return dialCodeByCode(org.country);
  const reg = regionFromLocale();
  if (reg && dialCodeByCode(reg)) return dialCodeByCode(reg);
  return null;
}

// Detect the country whose dial code prefixes an existing number (e.g.
// "+353861234567" → Ireland). Used to preselect the code when editing.
export function detectDialCountry(number) {
  const n = (number || "").trim();
  if (!n.startsWith("+")) return null;
  let best = null;
  for (const c of COUNTRY_DIAL_CODES) {
    if (n.startsWith(c.dial) && (!best || c.dial.length > best.dial.length)) best = c;
  }
  return best;
}

// Combine a dial code and a raw national number into one international string.
// If the user already typed a full "+cc…" number it is kept as-is; a leading 0
// on the national part is stripped (common for IE/NG/GB mobiles).
export function formatWithDialCode(dial, number) {
  const n = (number || "").trim();
  if (!n) return "";
  if (n.startsWith("+")) return n;
  if (!dial) return n;
  const stripped = n.replace(/^0+/, "");
  return `${dial}${stripped}`;
}