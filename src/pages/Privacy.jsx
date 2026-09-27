import React from "react";
import LegalLayout from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 2026" backTo="/settings">
      <p>
        FADS AI Business Suite ("FADS AI", "we", "us") respects your privacy. This
        policy explains what data we collect, how we use it, and the choices you
        have. It applies to the web, iOS and Android apps, which share one account
        and one database.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Data we collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account data:</strong> your email address and password (stored as a secure hash). We do not collect your name unless you provide it.</li>
        <li><strong>Organisation data:</strong> the organisations you create or belong to, their country, currency, tax settings and the members you invite.</li>
        <li><strong>Usage data:</strong> audit records of sensitive actions (invites, role changes, access-status changes) for security and accountability.</li>
        <li><strong>Device permissions:</strong> microphone, camera, notifications and files — only when you choose to use a feature that needs them, and only for that feature.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">How we use data</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>To provide and secure your workspace across web, iOS and Android.</li>
        <li>To isolate each organisation's data so members only see their own organisation.</li>
        <li>To keep an audit trail of administrative actions.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Affiliate & referral programme</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Referral visits:</strong> when someone clicks your referral link, we increment an anonymous counter — no IP address, device fingerprint or personal data is stored.</li>
        <li><strong>Affiliate data is platform-level:</strong> your affiliate profile, commissions and payouts are separate from any organisation's private finance records. Organisation members cannot see your affiliate data.</li>
        <li><strong>Privacy-safe referrals:</strong> affiliates see only the name and status of organisations they referred — no financial details, contacts or transactions of the referred organisation are exposed.</li>
        <li><strong>Attribution is locked:</strong> once an organisation is attributed to an affiliate, the link cannot be changed except by a Platform Owner with a recorded reason and audit trail.</li>
        <li><strong>Demo vs live:</strong> fictional demo affiliates and commissions are clearly marked and never mixed with live affiliate records.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Billing &amp; subscription data</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Payment processor:</strong> We use Stripe to process payments. Your full card number and payment details are tokenised and stored by Stripe — we never see or store them.</li>
        <li><strong>What we store:</strong> your Stripe customer ID, subscription status, trial dates, renewal dates, and payment event records (event type, amount, status). This data is isolated to your organisation by row-level security.</li>
        <li><strong>Webhook verification:</strong> subscription changes are processed only from verified Stripe webhook events, not from browser confirmations, to prevent unauthorised access.</li>
        <li><strong>One trial per customer:</strong> we track whether you have used the introductory $1 trial to prevent duplicate-trial abuse. This check is keyed to your user account and organisation.</li>
        <li><strong>Affiliate link:</strong> if you use a referral code, the code is preserved through checkout and linked to your subscription for commission purposes. No financial data from your organisation is exposed to the affiliate.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Data isolation</h2>
      <p>
        Each organisation's data is isolated by row-level security keyed to your
        membership. A user in one organisation cannot read or modify another
        organisation's records unless they are an authorised member.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Your rights</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Access &amp; export:</strong> request a copy of your data from Settings → Account.</li>
        <li><strong>Deletion:</strong> request account deletion from Settings → Account. Your memberships are revoked and your data is purged by the platform owner.</li>
        <li><strong>Withdraw permission:</strong> disable microphone, camera, notifications or files at any time in your device settings.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Data retention</h2>
      <p>
        We retain your data while your account is active. After a deletion request,
        access is revoked immediately and remaining data is purged as soon as
        practicable. Audit logs may be retained for security and legal compliance.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Contact</h2>
      <p>
        For privacy questions or requests, see the Support page.
      </p>
    </LegalLayout>
  );
}