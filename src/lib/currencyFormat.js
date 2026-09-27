// Shared currency formatter for all FADS modules.
// Uses the organisation's configured currency as the single source of truth.
// Never hard-codes any currency (NGN, EUR, USD, GBP, etc.).
// When no currency is configured, shows the plain number without a symbol.
//
// Future FADS modules should import from here rather than writing their
// own currency formatting — this ensures every monetary value inherits the
// selected organisation/workspace currency automatically.

// Full format with 2 decimal places (e.g. €1,234.56, ₦1,234.56).
export function formatCurrency(amount, currency) {
  const n = Number(amount) || 0;
  if (!currency) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

// Compact format with no decimals (e.g. €1,235). For dashboards and cards.
export function formatCurrencyCompact(amount, currency) {
  const n = Number(amount) || 0;
  if (!currency) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}