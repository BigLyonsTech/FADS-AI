// Country-specific tax packs for the FADS Tax Centre.
//
// V1 fully supports Ireland (IE) and Nigeria (NG). The architecture is a
// registry so future country packs (UK, FR, GH, KE, ZA) can be added without
// rebuilding Finance or the Tax Centre.
//
// SAFETY: This module NEVER invents tax rates or deadlines. It organises
// existing Finance records, maps them to jurisdiction-appropriate categories
// where reliable, and flags items needing review. Final tax figures always
// require professional review.

// ---- Country pack registry ----
export const TAX_PACKS = {
  IE: {
    country: "IE",
    label: "Ireland",
    flag: "🇮🇪",
    hasStates: false,
    states: [],
    entityTypes: [
      { value: "sole_trader", label: "Sole Trader / Self-Employed", form: "Form 11" },
      { value: "limited_company", label: "Limited Company", form: "CT1" },
      { value: "partnership", label: "Partnership", form: "Form 1" },
    ],
    obligations: {
      sole_trader: ["income_tax", "vat", "paye_employer", "rental_income", "accountant_pack"],
      limited_company: ["corporation_tax", "vat", "paye_employer", "accountant_pack"],
      partnership: ["income_tax", "vat", "paye_employer", "accountant_pack"],
    },
    taxIdFields: [
      { key: "pps", label: "PPS Number" },
      { key: "cro", label: "CRO Number (if registered)" },
    ],
    vatIdField: { key: "vat_ie", label: "Irish VAT Number" },
    filingFrequencies: ["annual", "bi-monthly (VAT)"],
    authorityLabel: "Revenue",
  },
  NG: {
    country: "NG",
    label: "Nigeria",
    flag: "🇳🇬",
    hasStates: true,
    states: [
      "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
      "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
      "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
      "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
      "Yobe","Zamfara",
    ],
    entityTypes: [
      { value: "individual_sole_proprietor", label: "Individual / Sole Proprietor" },
      { value: "company", label: "Company (CIT)" },
    ],
    obligations: {
      individual_sole_proprietor: [
        "personal_income_tax", "vat", "withholding_tax", "paye_employer",
        "stamp_duties", "tax_clearance", "accountant_pack",
      ],
      company: [
        "company_income_tax", "vat", "withholding_tax", "paye_employer",
        "stamp_duties", "tax_clearance", "accountant_pack",
      ],
    },
    taxIdFields: [{ key: "tin", label: "TIN (Taxpayer Identification Number)" }],
    vatIdField: { key: "vat_ng", label: "VAT Registration Number" },
    filingFrequencies: ["monthly", "annual"],
    authorityLabel: "FIRS / State IRS",
  },
  GB: {
    country: "GB",
    label: "United Kingdom",
    flag: "🇬🇧",
    hasStates: false,
    states: [],
    entityTypes: [
      { value: "sole_trader", label: "Sole Trader / Self-Employed", form: "Self Assessment (SA103)" },
      { value: "limited_company", label: "Limited Company", form: "Corporation Tax (CT600)" },
      { value: "partnership", label: "Partnership", form: "Partnership Return (SA800)" },
    ],
    obligations: {
      sole_trader: ["income_tax", "vat", "paye_employer", "accountant_pack"],
      limited_company: ["corporation_tax", "vat", "paye_employer", "accountant_pack"],
      partnership: ["income_tax", "vat", "paye_employer", "accountant_pack"],
    },
    taxIdFields: [
      { key: "utr", label: "UTR (Unique Taxpayer Reference)" },
      { key: "companies_house", label: "Companies House Number (if registered)" },
    ],
    vatIdField: { key: "vat_gb", label: "UK VAT Registration Number" },
    filingFrequencies: ["annual", "quarterly (VAT)"],
    authorityLabel: "HMRC",
  },
  US: {
    country: "US",
    label: "United States",
    flag: "🇺🇸",
    hasStates: true,
    states: [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
      "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
      "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
      "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
      "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
      "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
      "Wisconsin","Wyoming","District of Columbia",
    ],
    entityTypes: [
      { value: "sole_proprietor", label: "Sole Proprietor", form: "Schedule C (1040)" },
      { value: "llc", label: "LLC (Limited Liability Company)", form: "Depends on election" },
      { value: "s_corp", label: "S Corporation", form: "Form 1120-S" },
      { value: "c_corp", label: "C Corporation", form: "Form 1120" },
    ],
    obligations: {
      sole_proprietor: ["federal_income_tax", "state_income_tax", "sales_tax", "payroll_tax", "accountant_pack"],
      llc: ["federal_income_tax", "state_income_tax", "sales_tax", "payroll_tax", "accountant_pack"],
      s_corp: ["federal_income_tax", "state_income_tax", "sales_tax", "payroll_tax", "accountant_pack"],
      c_corp: ["federal_income_tax", "state_income_tax", "sales_tax", "payroll_tax", "accountant_pack"],
    },
    taxIdFields: [{ key: "ein", label: "EIN (Employer Identification Number)" }],
    vatIdField: { key: "sales_tax_permit", label: "State Sales Tax Permit Number" },
    filingFrequencies: ["annual", "quarterly"],
    authorityLabel: "IRS / State Tax Authority",
  },
  FR: {
    country: "FR",
    label: "France",
    flag: "🇫🇷",
    hasStates: false,
    states: [],
    entityTypes: [
      { value: "auto_entrepreneur", label: "Auto-entrepreneur / Micro-entreprise", form: "Déclaration 2042-C" },
      { value: "ei", label: "Entreprise Individuelle (EI)", form: "Déclaration 2033" },
      { value: "sarl", label: "SARL", form: "Liasse fiscale 2058" },
      { value: "sas", label: "SAS / SASU", form: "Liasse fiscale 2058" },
    ],
    obligations: {
      auto_entrepreneur: ["impot_revenu", "tva", "cotisations_sociales", "accountant_pack"],
      ei: ["impot_revenu", "tva", "cotisations_sociales", "accountant_pack"],
      sarl: ["impot_societes", "tva", "cotisations_sociales", "accountant_pack"],
      sas: ["impot_societes", "tva", "cotisations_sociales", "accountant_pack"],
    },
    taxIdFields: [
      { key: "siren", label: "SIREN" },
      { key: "siret", label: "SIRET" },
    ],
    vatIdField: { key: "tva_fr", label: "Numéro de TVA intracommunautaire" },
    filingFrequencies: ["monthly (TVA)", "annual"],
    authorityLabel: "DGFiP",
  },
};

export function getTaxPack(country) {
  return TAX_PACKS[country] || null;
}

export function isSupportedCountry(country) {
  return !!TAX_PACKS[country];
}

// V1 Business & Tax Centre packs that are ready to expose to customers.
// Other registry entries stay available for future work without appearing in
// the live guidance switcher until they have been explicitly validated.
export const READY_TAX_CENTRE_COUNTRIES = ["IE", "NG"];

export function isReadyTaxCentreCountry(country) {
  return READY_TAX_CENTRE_COUNTRIES.includes(country);
}

export function getReadyTaxCentreCountries() {
  return READY_TAX_CENTRE_COUNTRIES
    .map((code) => TAX_PACKS[code])
    .filter(Boolean)
    .map((p) => ({ code: p.country, label: p.label, flag: p.flag }));
}

// Full configured registry. Kept for internal/future country-pack work.
export function getSupportedCountries() {
  return Object.values(TAX_PACKS).map((p) => ({ code: p.country, label: p.label, flag: p.flag }));
}

export function getTaxYears() {
  const y = new Date().getFullYear();
  return [String(y), String(y - 1), String(y + 1)];
}

export function getEntityTypes(country) {
  return getTaxPack(country)?.entityTypes || [];
}

export function getStates(country) {
  return getTaxPack(country)?.states || [];
}

export function getObligations(country, entityType) {
  const pack = getTaxPack(country);
  if (!pack) return [];
  return pack.obligations[entityType] || [];
}

export function entityTypeLabel(country, value) {
  return getEntityTypes(country).find((e) => e.value === value)?.label || value;
}

export const OBLIGATION_LABELS = {
  income_tax: "Income Tax (Form 11)",
  corporation_tax: "Corporation Tax (CT1)",
  vat: "VAT",
  paye_employer: "PAYE / Employer",
  rental_income: "Rental Income",
  personal_income_tax: "Personal Income Tax (State)",
  company_income_tax: "Company Income Tax (Federal)",
  withholding_tax: "Withholding Tax",
  stamp_duties: "Stamp Duties",
  tax_clearance: "Tax Clearance Certificate",
  accountant_pack: "Accountant / Tax Adviser Pack",
  federal_income_tax: "Federal Income Tax (IRS)",
  state_income_tax: "State Income Tax",
  sales_tax: "Sales Tax",
  payroll_tax: "Payroll Tax",
  impot_revenu: "Impôt sur le Revenu",
  impot_societes: "Impôt sur les Sociétés",
  tva: "TVA (Taxe sur la Valeur Ajoutée)",
  cotisations_sociales: "Cotisations Sociales (URSSAF)",
};

// ---- FADS Tax Check ----
// Analyses existing Finance records and flags items needing review.
// Pure function; never makes a definitive tax decision.
export function runTaxCheck({ transactions, categories }, taxProfile) {
  const findings = [];
  const cleared = (transactions || []).filter((t) => t.status !== "cancelled");
  const cur = taxProfile?._currency || "";

  // 1. Uncategorized transactions
  const uncategorized = cleared.filter((t) => !t.category_id);
  if (uncategorized.length > 0) {
    findings.push({
      type: "uncategorized",
      severity: "warn",
      title: "Uncategorized transactions",
      detail: `${uncategorized.length} transaction${uncategorized.length > 1 ? "s" : ""} have no category. Categorise them so they map to the right tax line.`,
      count: uncategorized.length,
      items: uncategorized.slice(0, 8),
    });
  }

  // 2. Missing receipts (expenses over a threshold with no receipt)
  const RECEIPT_THRESHOLD = 50;
  const missingReceipts = cleared.filter(
    (t) => t.direction === "out" && Number(t.amount) >= RECEIPT_THRESHOLD && !t.receipt_file_url
  );
  if (missingReceipts.length > 0) {
    findings.push({
      type: "missing_receipts",
      severity: "warn",
      title: "Missing receipts / supporting documents",
      detail: `${missingReceipts.length} expense${missingReceipts.length > 1 ? "s" : ""} of ${cur} ${RECEIPT_THRESHOLD}+ have no receipt attached.`,
      count: missingReceipts.length,
      items: missingReceipts.slice(0, 8),
    });
  }

  // 3. Possible duplicates (same date + amount + direction)
  const dupMap = {};
  cleared.forEach((t) => {
    const key = `${t.date}|${t.amount}|${t.direction}`;
    (dupMap[key] = dupMap[key] || []).push(t);
  });
  const duplicates = Object.values(dupMap).filter((g) => g.length > 1).flat();
  if (duplicates.length > 0) {
    findings.push({
      type: "duplicates",
      severity: "alert",
      title: "Possible duplicate transactions",
      detail: `${duplicates.length} transaction${duplicates.length > 1 ? "s" : ""} share the same date, amount and direction. Review to avoid double-counting.`,
      count: duplicates.length,
      items: duplicates.slice(0, 8),
    });
  }

  // 4. Possible capital asset purchases
  const CAPITAL_THRESHOLD = 1000;
  const CAPITAL_KEYWORDS = [
    "laptop", "computer", "equipment", "machinery", "vehicle", "furniture",
    "generator", "printer", "server", "asset",
  ];
  const capitalAssets = cleared.filter((t) => {
    if (t.direction !== "out") return false;
    const desc = String(t.description || "").toLowerCase();
    return Number(t.amount) >= CAPITAL_THRESHOLD || CAPITAL_KEYWORDS.some((k) => desc.includes(k));
  });
  if (capitalAssets.length > 0) {
    findings.push({
      type: "capital_assets",
      severity: "info",
      title: "Possible capital asset purchases",
      detail: `${capitalAssets.length} purchase${capitalAssets.length > 1 ? "s" : ""} may need to be treated as capital assets rather than ordinary expenses. Please review.`,
      count: capitalAssets.length,
      items: capitalAssets.slice(0, 8),
    });
  }

  // 5. Transactions needing review (pending)
  const needsReview = (transactions || []).filter((t) => t.status === "pending");
  if (needsReview.length > 0) {
    findings.push({
      type: "needs_review",
      severity: "warn",
      title: "Transactions awaiting review",
      detail: `${needsReview.length} pending transaction${needsReview.length > 1 ? "s" : ""} have not been cleared yet.`,
      count: needsReview.length,
      items: needsReview.slice(0, 8),
    });
  }

  // 6. Incomplete records (no description and no reference)
  const incomplete = cleared.filter((t) => !t.description && !t.reference);
  if (incomplete.length > 0) {
    findings.push({
      type: "incomplete",
      severity: "warn",
      title: "Incomplete records",
      detail: `${incomplete.length} transaction${incomplete.length > 1 ? "s" : ""} have no description or reference. Add details for a clean audit trail.`,
      count: incomplete.length,
      items: incomplete.slice(0, 8),
    });
  }

  // Readiness score (weighted, floored at 0)
  const penalty =
    Math.min(uncategorized.length * 2, 20) +
    Math.min(missingReceipts.length * 2, 15) +
    Math.min(duplicates.length * 3, 10) +
    Math.min(capitalAssets.length * 3, 15) +
    Math.min(needsReview.length * 2, 10) +
    Math.min(incomplete.length * 2, 10);
  const readiness = Math.max(0, 100 - penalty);

  return { readiness, findings };
}

// ---- Accountant / Tax Adviser Pack data ----
// Reusable across all jurisdictions. Builds a structured summary from
// existing Finance records + the tax check.
export function buildAccountantPackData(org, taxProfile, finance, taxCheck) {
  const cur = org?.currency || "";
  const cleared = (finance.transactions || []).filter((t) => t.status === "cleared");
  const income = cleared.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = cleared.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expenses;

  const catName = (id) => finance.categories?.find((c) => c.id === id)?.name || "Uncategorised";
  const byCat = {};
  cleared.forEach((t) => {
    const k = catName(t.category_id);
    byCat[k] = byCat[k] || { income: 0, expense: 0 };
    if (t.direction === "in") byCat[k].income += Number(t.amount);
    else byCat[k].expense += Number(t.amount);
  });

  const vatCollected = cleared.filter((t) => t.direction === "in").reduce((s, t) => s + Number(t.tax_amount || 0), 0);
  const vatPaid = cleared.filter((t) => t.direction === "out").reduce((s, t) => s + Number(t.tax_amount || 0), 0);

  return {
    org,
    taxProfile,
    cur,
    income,
    expenses,
    net,
    transactionCount: cleared.length,
    byCategory: Object.entries(byCat).map(([name, v]) => ({ name, ...v })),
    vatCollected,
    vatPaid,
    vatNet: vatCollected - vatPaid,
    taxCheck,
  };
}