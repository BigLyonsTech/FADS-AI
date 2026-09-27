import React from "react";
import LegalLayout from "@/components/LegalLayout";

export default function AffiliateTerms() {
  return (
    <LegalLayout title="Affiliate Programme Terms" updated="August 2026">
      <h2 className="text-base font-semibold text-brand-navy mt-5">Overview</h2>
      <p>
        The FADS AI Affiliate Programme lets you earn commission when
        organisations you refer become paying customers. By applying to the
        programme and sharing your referral link, you agree to these terms.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Commission</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Commission is set as a percentage or fixed amount, recurring or one-time, as configured by the Platform Owner.</li>
        <li>The default rate is 20% recurring commission, editable by the Platform Owner at any time.</li>
        <li>Commission is <strong>not</strong> calculated or owed until a verified paid conversion exists. During beta, conversions are manually verified by the Platform Owner and clearly labelled "Manually verified."</li>
        <li>Recurring commission applies to each verified payment cycle for the referred organisation.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Attribution</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>An organisation is attributed to the affiliate whose referral code was used at signup, once.</li>
        <li>Self-referrals are not allowed — you cannot earn commission on your own organisation.</li>
        <li>Duplicate attribution is prevented — each organisation can only be attributed to one affiliate.</li>
        <li>Attribution is locked after confirmation. Only a Platform Owner can correct attribution, with a mandatory reason and audit log entry.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Payouts</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You may request a payout once your approved commission balance meets the minimum payout amount.</li>
        <li>Payout requests are reviewed by the Platform Owner and processed via the configured payment methods.</li>
        <li>Approved commissions are marked as paid once a payout is recorded.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Privacy</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Referral link visits are tracked as anonymous counts — no IP address, device fingerprint or personal data is collected.</li>
        <li>You can see only the name and status of organisations you refer — no financial details, contacts or transactions.</li>
        <li>Your affiliate data is separate from any organisation's private finance records.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Programme rules</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>The Platform Owner may approve, reject, pause or close affiliate accounts at any time.</li>
        <li>Spam, fraud or misleading promotion of your referral link may result in immediate closure and forfeiture of pending commission.</li>
        <li>The Platform Owner may update commission rates, payout methods and programme settings at any time.</li>
        <li>Demo affiliate data is fictional and clearly separated from live records.</li>
      </ul>
    </LegalLayout>
  );
}