import React from "react";
import LegalLayout from "@/components/LegalLayout";
import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";

export default function Support() {
  return (
    <LegalLayout title="Support" updated="August 2026" backTo="/settings">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
          <LifeBuoy className="w-5 h-5 text-brand-teal" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-brand-navy">Need help?</h2>
          <p>
            FADS AI Business Suite is a multi-tenant workspace for small
            businesses, schools and churches. If something isn't working, the
            steps below usually resolve it.
          </p>
        </div>
      </div>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Common issues</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Can't see your organisation:</strong> accept the invitation email from your organisation owner, then sign in with that same email.</li>
        <li><strong>Invitation missing:</strong> ask the organisation owner to resend it from Team &amp; Access.</li>
        <li><strong>Forgot password:</strong> use the "Forgot password" link on the login screen.</li>
        <li><strong>Wrong organisation open:</strong> switch workspace from the top bar.</li>
      </ul>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Account &amp; data</h2>
      <p>
        To export your data or request account deletion, sign in and open Settings
        → Account. These actions are logged for your security.
      </p>

      <h2 className="text-base font-semibold text-brand-navy mt-5">Contact</h2>
      <p className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-brand-teal" /> Please contact Base44 support
        through the platform for account or billing issues.
      </p>
      <p className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-brand-teal" /> For security reports,
        include a description and we will investigate promptly.
      </p>
    </LegalLayout>
  );
}