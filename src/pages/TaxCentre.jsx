import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useTax } from "@/lib/useTax";
import { formatCurrency } from "@/lib/currencyFormat";
import { canManageFinance } from "@/lib/financeWording";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Building2,
  Calculator,
  ClipboardCheck,
  FileText,
  Info,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";
import {
  entityTypeLabel,
  getObligations,
  getReadyTaxCentreCountries,
  getTaxPack,
  isReadyTaxCentreCountry,
  OBLIGATION_LABELS,
} from "@/lib/taxRules";
import TaxCentreHeader from "@/components/tax/TaxCentreHeader";
import TaxProfileSetup from "@/components/tax/TaxProfileSetup";
import TaxCheckResults from "@/components/tax/TaxCheckResults";
import AccountantPackButton from "@/components/tax/AccountantPackButton";
import BackToFinance from "@/components/finance/BackToFinance";

const GUIDANCE_COUNTRIES = getReadyTaxCentreCountries();

const TAX_SAFETY_NOTICE =
  "FADS organises the records already in your Business Suite. It does not file tax returns or replace Revenue guidance, ROS, your accountant or your tax adviser.";

const IRELAND_ASK_EXAMPLES = [
  "What business expenses have I recorded this month?",
  "How much VAT have I recorded?",
  "What records should I keep for my accountant?",
  "What does ROS mean?",
  "What needs my attention?",
];

const REFERENCE_ASK_EXAMPLES = [
  "What tax authority does this country guidance refer to?",
  "What business structures does this guidance pack cover?",
  "What records are generally useful to keep for an accountant?",
];

export default function TaxCentre() {
  const { activeOrg, activeRole } = useWorkspace();
  const navigate = useNavigate();
  const organisationCountry = activeOrg?.country || null;
  const authoritativeCountry = isReadyTaxCentreCountry(organisationCountry)
    ? organisationCountry
    : null;
  const [guidanceCountry, setGuidanceCountry] = useState(
    authoritativeCountry || GUIDANCE_COUNTRIES[0]?.code || "IE"
  );
  const [view, setView] = useState("dashboard");

  const {
    profile,
    loading,
    saveProfile,
    reload,
    taxCheck,
    finance,
  } = useTax(authoritativeCountry);

  useEffect(() => {
    const next = isReadyTaxCentreCountry(activeOrg?.country)
      ? activeOrg.country
      : GUIDANCE_COUNTRIES[0]?.code || "IE";
    setGuidanceCountry(next);
    setView("dashboard");
  }, [activeOrg?.id, activeOrg?.country]);

  const organisationPack = authoritativeCountry
    ? getTaxPack(authoritativeCountry)
    : null;
  const guidancePack = getTaxPack(guidanceCountry);
  const isReferenceGuidance =
    !!authoritativeCountry && guidanceCountry !== authoritativeCountry;

  const clearedTransactions = useMemo(
    () =>
      (finance.transactions || []).filter(
        (t) => t.status === "cleared" || t.status === "completed"
      ),
    [finance.transactions]
  );

  if (!activeOrg) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Select a workspace to open the Business &amp; Tax Centre.
      </div>
    );
  }

  if (!canManageFinance(activeRole)) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-brand-navy">Business &amp; Tax Centre</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You do not have permission to manage Finance and tax-preparation settings for this workspace.
        </p>
        <Link to="/finance">
          <Button variant="outline" className="mt-4 h-11">Back to Finance</Button>
        </Link>
      </div>
    );
  }

  if (authoritativeCountry === "NG") {
    return <Navigate to="/finance" replace />;
  }

  if (!authoritativeCountry) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <BackToFinance />
        <TaxCentreHeader
          title="Business & Tax Centre"
          org={activeOrg}
          organisationPack={null}
          guidanceCountry={guidanceCountry}
          guidanceOptions={GUIDANCE_COUNTRIES}
          onSelectGuidance={setGuidanceCountry}
        />
        <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal/10 p-4 flex gap-3">
          <Info className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-brand-navy">Country centre not enabled for this organisation yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              The V1 Business &amp; Tax Centre currently supports Ireland and preserves the existing Nigeria tax experience.
              Your organisation settings and Finance records have not been changed.
            </p>
          </div>
        </div>
        <ReferenceGuidance
          organisationPack={null}
          guidancePack={guidancePack}
          organisationCountry={organisationCountry}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Loading Business &amp; Tax Centre…
      </div>
    );
  }

  const title = `${organisationPack.flag} ${organisationPack.label} Business & Tax Centre`;

  if (isReferenceGuidance) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <BackToFinance />
        <TaxCentreHeader
          title={title}
          org={activeOrg}
          organisationPack={organisationPack}
          taxYear={profile?.tax_year}
          guidanceCountry={guidanceCountry}
          guidanceOptions={GUIDANCE_COUNTRIES}
          onSelectGuidance={(code) => {
            setGuidanceCountry(code);
            setView("dashboard");
          }}
        />
        <ReferenceGuidance
          organisationPack={organisationPack}
          guidancePack={guidancePack}
          organisationCountry={authoritativeCountry}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <BackToFinance />
        <TaxCentreHeader
          title={title}
          org={activeOrg}
          organisationPack={organisationPack}
          guidanceCountry={guidanceCountry}
          guidanceOptions={GUIDANCE_COUNTRIES}
          onSelectGuidance={setGuidanceCountry}
        />
        <div className="rounded-2xl border border-status-warn/30 bg-status-warn/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-status-warn shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-brand-navy">Review your Irish tax profile first</p>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the business structure that really applies to this organisation. FADS will not guess whether you are
              a sole trader, limited company or partnership.
            </p>
          </div>
        </div>
        <TaxProfileSetup
          org={activeOrg}
          country={authoritativeCountry}
          profile={profile}
          onSave={async (values) => {
            await saveProfile(values);
            await reload();
          }}
        />
        <SafetyNotice />
      </div>
    );
  }

  const obligations = getObligations(authoritativeCountry, profile.entity_type);

  const askPrefix =
    `Authoritative organisation country: ${organisationPack.label}. ` +
    `Guidance country: ${guidancePack.label}. ` +
    `Use only this organisation's permitted Finance records and its ${organisationPack.label} TaxProfile. ` +
    `Entity type: ${entityTypeLabel(authoritativeCountry, profile.entity_type)}. ` +
    `Tax year: ${profile.tax_year}. `;

  const askFads = (question) => {
    navigate(`/assistant?q=${encodeURIComponent(askPrefix + question)}`);
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <BackToFinance />
      <TaxCentreHeader
        title={title}
        org={activeOrg}
        organisationPack={organisationPack}
        taxYear={profile.tax_year}
        guidanceCountry={guidanceCountry}
        guidanceOptions={GUIDANCE_COUNTRIES}
        onSelectGuidance={(code) => {
          setGuidanceCountry(code);
          setView("dashboard");
        }}
      />

      {view === "dashboard" && (
        <IrelandDashboard
          org={activeOrg}
          profile={profile}
          finance={finance}
          taxCheck={taxCheck}
          currency={activeOrg.currency}
          onView={setView}
          onAsk={askFads}
        />
      )}

      {view === "records" && (
        <SectionBack onBack={() => setView("dashboard")} title="Records & Readiness">
          <p className="text-sm text-muted-foreground">
            FADS checks the Finance records already stored for this workspace and highlights records that may need review
            before you send information to your accountant or tax adviser.
          </p>
          <TaxCheckResults taxCheck={taxCheck} currency={activeOrg.currency} />
          <div className="pt-2">
            <AccountantPackButton
              org={activeOrg}
              taxProfile={profile}
              finance={finance}
              taxCheck={taxCheck}
            />
          </div>
          <SafetyNotice />
        </SectionBack>
      )}

      {view === "vat" && (
        <SectionBack onBack={() => setView("dashboard")} title="VAT">
          <IrelandVatView
            profile={profile}
            transactions={clearedTransactions}
            currency={activeOrg.currency}
          />
          <SafetyNotice />
        </SectionBack>
      )}

      {view === "tax" && (
        <SectionBack onBack={() => setView("dashboard")} title="Tax">
          <IrelandTaxView
            profile={profile}
            obligations={obligations}
            finance={finance}
            currency={activeOrg.currency}
          />
          <SafetyNotice />
        </SectionBack>
      )}

      {view === "revenue" && (
        <SectionBack onBack={() => setView("dashboard")} title="Revenue & ROS">
          <IrelandRevenueView obligations={obligations} />
          <SafetyNotice />
        </SectionBack>
      )}

      {view === "ask" && (
        <SectionBack onBack={() => setView("dashboard")} title="Ask FADS about Irish business & tax">
          <p className="text-sm text-muted-foreground">
            These questions use the current Ireland workspace, its Ireland TaxProfile and only the Finance records you are
            permitted to access.
          </p>
          <div className="space-y-2">
            {IRELAND_ASK_EXAMPLES.map((question) => (
              <button
                type="button"
                key={question}
                onClick={() => askFads(question)}
                className="w-full bg-card rounded-xl border border-border p-3 hover:border-brand-teal flex items-center gap-2 text-left"
              >
                <Bot className="w-4 h-4 text-brand-teal shrink-0" />
                <span className="text-sm text-brand-navy">{question}</span>
              </button>
            ))}
          </div>
          <Link to="/assistant">
            <Button variant="outline" className="h-11 min-h-touch">Open FADS AI Assistant</Button>
          </Link>
        </SectionBack>
      )}
    </div>
  );
}

function IrelandDashboard({ org, profile, finance, taxCheck, currency, onView, onAsk }) {
  const entityLabel = entityTypeLabel("IE", profile.entity_type);
  const vatStatus = profile.vat_registered ? "VAT registered" : "Not marked VAT registered";

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <SectionHeading title="Business Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InfoCard icon={Building2} label="Business structure" value={entityLabel} />
          <InfoCard icon={ReceiptText} label="VAT status" value={vatStatus} />
          <InfoCard icon={FileText} label="Tax year" value={profile.tax_year || "Review profile"} />
        </div>
        <FinanceSummary finance={finance} cur={currency} />
      </section>

      <section className="space-y-3">
        <SectionHeading title="What do you want to check?" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ActionTile icon={ReceiptText} label="VAT" helper="See VAT recorded in FADS" onClick={() => onView("vat")} />
          <ActionTile icon={Calculator} label="Tax" helper={`For ${entityLabel}`} onClick={() => onView("tax")} />
          <ActionTile icon={ClipboardCheck} label="Records & Readiness" helper={`${taxCheck.readiness}% ready`} onClick={() => onView("records")} />
          <ActionTile icon={Landmark} label="Revenue & ROS" helper="How FADS helps you prepare" onClick={() => onView("revenue")} />
          <ActionTile icon={Bot} label="Ask FADS" helper="Ask about this Ireland workspace" onClick={() => onView("ask")} />
          <AccountantPackButton
            org={org}
            taxProfile={profile}
            finance={finance}
            taxCheck={taxCheck}
            variant="outline"
            className="w-full justify-start"
          />
        </div>
      </section>

      <div className="rounded-xl border border-brand-teal/20 bg-brand-mint/35 p-4">
        <p className="font-medium text-brand-navy">Simple preparation, not tax filing</p>
        <p className="text-sm text-muted-foreground mt-1">
          FADS keeps your business records organised and helps you see what needs attention. Irish rates, thresholds,
          credits and filing deadlines are not guessed here.
        </p>
        <Button variant="link" className="px-0 h-auto mt-2" onClick={() => onAsk("What needs my attention?")}>
          Ask FADS what needs attention
        </Button>
      </div>
    </div>
  );
}

function FinanceSummary({ finance, cur }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryCard icon={ArrowDownLeft} label="Money received this month" value={formatCurrency(finance.moneyIn, cur)} tone="ok" />
      <SummaryCard icon={ArrowUpRight} label="Money spent this month" value={formatCurrency(finance.moneyOut, cur)} tone="bad" />
      <SummaryCard icon={Wallet} label="Account balance" value={formatCurrency(finance.totalBalance, cur)} />
      <SummaryCard icon={AlertCircle} label="Records needing review" value={String(finance.outstanding.length)} tone={finance.outstanding.length ? "warn" : "ok"} />
    </div>
  );
}

function IrelandVatView({ profile, transactions, currency }) {
  if (!profile.vat_registered) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="font-semibold text-brand-navy">Your Tax Profile is not marked VAT registered.</p>
        <p className="text-sm text-muted-foreground mt-2">
          FADS will not invent a VAT liability or decide whether you should be registered. Review your Tax Profile if your
          registration status changes.
        </p>
      </div>
    );
  }

  const vatCollected = transactions
    .filter((t) => t.direction === "in")
    .reduce((sum, t) => sum + Number(t.tax_amount || 0), 0);
  const vatPaid = transactions
    .filter((t) => t.direction === "out")
    .reduce((sum, t) => sum + Number(t.tax_amount || 0), 0);
  const net = vatCollected - vatPaid;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoCard icon={ArrowDownLeft} label="VAT recorded on money in" value={formatCurrency(vatCollected, currency)} />
        <InfoCard icon={ArrowUpRight} label="VAT recorded on money out" value={formatCurrency(vatPaid, currency)} />
        <InfoCard icon={ReceiptText} label="Net recorded VAT position" value={formatCurrency(net, currency)} />
      </div>
      <div className="rounded-xl border border-status-warn/30 bg-status-warn/10 p-4 text-sm text-brand-navy">
        This is a summary of VAT amounts already recorded in FADS. It is not a VAT3 return and does not apply unverified
        Irish VAT rates, thresholds or special rules.
      </div>
    </div>
  );
}

function IrelandTaxView({ profile, obligations, finance, currency }) {
  const entity = profile.entity_type;
  const entityLabel = entityTypeLabel("IE", entity);
  const cleared = (finance.transactions || []).filter(
    (t) => t.status === "cleared" || t.status === "completed"
  );
  const income = cleared
    .filter((t) => t.direction === "in")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = cleared
    .filter((t) => t.direction === "out")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  let boundaryText =
    "FADS has not enabled a final Irish tax-liability calculator for this entity type. Your recorded business position is shown for preparation only.";
  if (entity === "sole_trader") {
    boundaryText =
      "This is the sole-trader area. FADS does not mix it with company Corporation Tax. Final Income Tax, USC and PRSI calculations are not enabled until authoritative year-specific rules are configured.";
  } else if (entity === "limited_company") {
    boundaryText =
      "This is the limited-company area. FADS does not treat company Corporation Tax as personal Income Tax. Final Corporation Tax calculations are not enabled until authoritative year-specific rules are configured.";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Business structure</p>
        <p className="text-xl font-bold text-brand-navy mt-1">{entityLabel}</p>
        <p className="text-sm text-muted-foreground mt-2">{boundaryText}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoCard icon={ArrowDownLeft} label="Income recorded" value={formatCurrency(income, currency)} />
        <InfoCard icon={ArrowUpRight} label="Expenses recorded" value={formatCurrency(expenses, currency)} />
        <InfoCard icon={Calculator} label="Recorded business position" value={formatCurrency(income - expenses, currency)} />
      </div>

      <div>
        <p className="font-semibold text-brand-navy mb-2">Areas this Ireland pack recognises</p>
        <div className="space-y-2">
          {obligations.map((obligation) => (
            <div key={obligation} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
              <FileText className="w-4 h-4 text-brand-teal shrink-0" />
              <span className="text-sm text-brand-navy">{OBLIGATION_LABELS[obligation] || obligation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IrelandRevenueView({ obligations }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-brand-navy">FADS prepares your records; Revenue is where filing happens.</p>
            <p className="text-sm text-muted-foreground mt-2">
              ROS means Revenue Online Service. FADS AI Business Suite does not currently submit Irish tax returns or VAT
              returns to Revenue or ROS. Use the records and Accountant Pack here to prepare, review and hand information
              to your accountant or tax adviser.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="font-semibold text-brand-navy mb-2">Preparation areas</p>
        <div className="space-y-2">
          {obligations.map((obligation) => (
            <div key={obligation} className="rounded-xl border border-border bg-card p-3">
              <p className="text-sm font-medium text-brand-navy">{OBLIGATION_LABELS[obligation] || obligation}</p>
              <p className="text-xs text-muted-foreground mt-1">
                FADS can organise records for review. Filing rules, rates and deadlines must follow current Revenue guidance.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReferenceGuidance({
  organisationPack,
  guidancePack,
  organisationCountry,
}) {
  if (!guidancePack) return null;

  const orgLabel = organisationPack?.label || organisationCountry || "your configured country";
  const referencePrefix =
    `Authoritative organisation country: ${orgLabel}. ` +
    `Country guidance selected: ${guidancePack.label}. ` +
    `This is reference-only guidance. Do not apply ${guidancePack.label} tax rules to the organisation's Finance records, ` +
    `do not reinterpret its currency or TaxProfile, and do not imply it is registered in ${guidancePack.label}. `;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-status-warn/30 bg-status-warn/10 p-4 flex gap-3">
        <Info className="w-5 h-5 text-status-warn shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-brand-navy">Viewing {guidancePack.flag} {guidancePack.label} guidance</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your organisation is still configured for {orgLabel}. This guidance view does not change its country,
            currency, TaxProfile, Finance records, VAT settings, invoices or Demo/Live mode.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference pack</p>
        <p className="text-xl font-bold text-brand-navy mt-1">{guidancePack.flag} {guidancePack.label}</p>
        <p className="text-sm text-muted-foreground mt-2">Tax authority guidance label: {guidancePack.authorityLabel}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {guidancePack.entityTypes.map((entity) => (
            <span key={entity.value} className="text-xs rounded-full border border-border bg-muted/50 px-3 py-1.5 text-brand-navy">
              {entity.label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold text-brand-navy mb-2">Ask FADS — reference guidance</p>
        <div className="space-y-2">
          {REFERENCE_ASK_EXAMPLES.map((question) => (
            <Link
              key={question}
              to={`/assistant?q=${encodeURIComponent(referencePrefix + question)}`}
              className="block"
            >
              <div className="rounded-xl border border-border bg-card p-3 hover:border-brand-teal flex items-center gap-2">
                <Bot className="w-4 h-4 text-brand-teal shrink-0" />
                <span className="text-sm text-brand-navy">{question}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title }) {
  return <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>;
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 min-w-0">
      <Icon className="w-4 h-4 text-brand-teal" />
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
      <p className="text-sm font-semibold text-brand-navy mt-1 break-words">{value}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const toneClass =
    tone === "ok"
      ? "text-status-ok"
      : tone === "warn"
        ? "text-status-warn"
        : tone === "bad"
          ? "text-status-bad"
          : "text-brand-navy";

  return (
    <div className="rounded-xl border border-border bg-card p-3 min-w-0">
      <Icon className={`w-4 h-4 ${toneClass}`} />
      <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
      <p className="text-sm font-semibold text-brand-navy break-words">{value}</p>
    </div>
  );
}

function ActionTile({ icon: Icon, label, helper, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[108px] rounded-2xl border border-border bg-card p-4 text-left hover:border-brand-teal transition-colors"
    >
      <Icon className="w-5 h-5 text-brand-teal" />
      <p className="text-sm font-semibold text-brand-navy mt-3">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{helper}</p>
    </button>
  );
}

function SectionBack({ onBack, title, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="h-9 px-2">← Back</Button>
        <h2 className="font-semibold text-brand-navy">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SafetyNotice() {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
      {TAX_SAFETY_NOTICE}
    </div>
  );
}
