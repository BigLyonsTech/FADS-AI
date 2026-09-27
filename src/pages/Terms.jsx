import React from "react";
import LegalLayout from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="August 2026" backTo="/settings">
      <p>
        These terms govern your use of FADS AI Business Suite across web, iOS and
        Android. By creating an account or signing in, you agree to them.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Your account</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You must provide accurate information and keep your password secure.</li>
        <li>You are responsible for activity under your account.</li>
        <li>One account works across web, iOS and Android.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Your organisations</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You may create organisations and invite members by email.</li>
        <li>Organisation owners control roles and access for their members.</li>
        <li>You are responsible for the accuracy of the data you enter.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Acceptable use</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Do not use FADS AI for unlawful, fraudulent or abusive activity.</li>
        <li>Do not attempt to access data that is not yours.</li>
        <li>Do not misuse device permissions (microphone, camera, notifications, files).</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Subscriptions &amp; payments</h2>
      <p>
        FADS AI offers a web subscription with a five-day introductory period and
        automatic monthly renewal. The following terms apply:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Introductory access:</strong> You are charged the configured introductory price for five days of full access. This is a one-time introductory offer — only one introductory access is permitted per customer and per organisation.</li>
        <li><strong>Automatic renewal:</strong> After the five-day introductory period, your stored payment method is charged the plan's configured monthly price in your organisation's currency on a recurring monthly basis until you cancel.</li>
        <li><strong>Cancellation during the introductory period:</strong> You may cancel at any time during the five-day introductory period. Cancellation stops further charges. Access continues until the introductory period expires.</li>
        <li><strong>Payment processing:</strong> Payments are processed by Stripe. FADS AI does not store your full card number — Stripe tokenises and secures all payment details.</li>
        <li><strong>Webhook verification:</strong> Subscription activation and access are granted only after a verified successful payment event is received from Stripe via secure webhook. Browser confirmations alone are not trusted.</li>
        <li><strong>Failed payments:</strong> If a renewal payment fails, your subscription moves to past-due status and organisation access may be paused. You may update your payment method to restore access.</li>
        <li><strong>Refunds:</strong> Refunds are processed at the discretion of the Platform Owner. Contact support for refund requests.</li>
        <li><strong>Native apps:</strong> Subscriptions purchased on the web are recognised across web, iOS and Android. In-app purchasing through Apple App Store and Google Play Store is a separate store-compliance task and is not yet available. Do not embed web checkout links inside native app packages.</li>
        <li><strong>Affiliate attribution:</strong> If you signed up with a referral code, the affiliate attribution is preserved through checkout. Affiliate commissions are earned only on the first verified monthly subscription payment — not on the introductory access charge.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Service availability</h2>
      <p>
        We work to keep the service reliable but do not guarantee uninterrupted
        availability. Features may change over time.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Liability</h2>
      <p>
        FADS AI is provided "as is". To the extent permitted by law, we are not
        liable for indirect or consequential losses arising from your use of the
        service.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Contact</h2>
      <p>For questions about these terms, see the Support page.</p>
    </LegalLayout>
  );
}