// Shared HR document helpers: file validation, expiry status, default
// document types, and the AI HR document drafting prompt. Used by the
// hrDocuments backend function and the assistant draft_hr_document action.

// ---- File validation ----
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/plain",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateFile(fileName: string, fileSize?: number): { valid: boolean; error?: string } {
  if (!fileName) return { valid: false, error: "File name is required" };
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const allowedExts = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt"];
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: "File type not allowed. Use PDF, image, Word, Excel or text." };
  }
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: "File too large. Maximum 10 MB." };
  }
  return { valid: true };
}

// ---- Expiry status ----
export function getExpiryStatus(expiryDate?: string): string {
  if (!expiryDate) return "none";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate + "T00:00:00");
  if (isNaN(d.getTime())) return "none";
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "valid";
}

// ---- Default document types (for demo seeding) ----
export const DEFAULT_DOCUMENT_TYPES = [
  { name: "Employment Contract", description: "Signed employment contract", category: "contract", is_confidential_default: true, is_required_for_onboarding: true, has_expiry: false },
  { name: "Offer Letter", description: "Offer of employment", category: "contract", is_confidential_default: true, is_required_for_onboarding: true, has_expiry: false },
  { name: "National ID", description: "National identification document", category: "identity", is_confidential_default: true, is_required_for_onboarding: true, has_expiry: true },
  { name: "Passport", description: "Passport biographical page", category: "identity", is_confidential_default: true, is_required_for_onboarding: false, has_expiry: true },
  { name: "Proof of Address", description: "Utility bill or bank statement", category: "identity", is_confidential_default: false, is_required_for_onboarding: false, has_expiry: false },
  { name: "Academic Certificate", description: "Degree or diploma certificate", category: "qualification", is_confidential_default: false, is_required_for_onboarding: false, has_expiry: false },
  { name: "Policy Acknowledgement", description: "Signed policy acknowledgement", category: "policy", is_confidential_default: false, is_required_for_onboarding: true, has_expiry: false },
  { name: "Medical Certificate", description: "Medical fitness certificate", category: "medical", is_confidential_default: true, is_required_for_onboarding: false, has_expiry: true },
];

// ---- AI HR document drafting prompt ----
// Used by the assistant backend `draft_hr_document` action. Generates a
// DRAFT letter or summary requiring human review. Never presented as legal
// advice. Respects HR access roles (enforced server-side before the call).

export type HrDocType =
  | "employment_letter"
  | "warning_letter"
  | "promotion_letter"
  | "general_letter"
  | "performance_summary";

export function buildHrDocumentPrompt(
  org: any,
  params: {
    docType: HrDocType;
    employeeName?: string;
    jobTitle?: string;
    startDate?: string;
    salary?: string;
    context: string;
  }
): string {
  const orgName = org.name || "the organisation";
  const orgTypeLabel = org.type.replace(/_/g, " ");

  const typeGuide: Record<HrDocType, string> = {
    employment_letter:
      "An employment/offer letter. Include role title, start date, key terms, and a warm welcome. Use formal but friendly tone.",
    warning_letter:
      "A formal warning/disciplinary letter. State the issue clearly, reference the context provided, set expectations, and mention that further incidents may lead to escalation. Use a serious, professional tone.",
    promotion_letter:
      "A promotion letter. Congratulate the employee, state the new role/title, effective date, and express confidence. Use a warm, encouraging tone.",
    general_letter:
      "A general HR letter addressing the context provided. Use a professional, clear tone.",
    performance_summary:
      "A concise performance summary based on the context provided. Highlight strengths, areas for improvement, and suggested next steps. Use a balanced, fair tone.",
  };

  const lines: string[] = [];
  lines.push(`You are drafting an HR document for ${orgName}, a ${orgTypeLabel}.`);
  lines.push("");
  lines.push(`DOCUMENT TYPE: ${params.docType}`);
  lines.push(`GUIDANCE: ${typeGuide[params.docType]}`);
  lines.push("");
  lines.push("EMPLOYEE DETAILS:");
  lines.push(`- Name: ${params.employeeName || "(not specified)"}`);
  if (params.jobTitle) lines.push(`- Job title: ${params.jobTitle}`);
  if (params.startDate) lines.push(`- Start date: ${params.startDate}`);
  if (params.salary) lines.push(`- Salary: ${params.salary}`);
  lines.push("");
  lines.push(`CONTEXT / INSTRUCTIONS FROM HR: ${params.context}`);
  lines.push("");
  lines.push("REQUIREMENTS:");
  lines.push("- Write a complete, ready-to-review draft document.");
  lines.push("- Use clear paragraphs. Do not use markdown headers.");
  lines.push("- Address the employee by name where appropriate.");
  lines.push("- Do NOT invent facts not provided in the context. Use [placeholder] for any missing required detail.");
  lines.push("- Do NOT include legal advice or cite employment law.");
  lines.push("- End the draft with: 'This is a draft generated by FADS AI and requires human review before use.'");
  lines.push("- Output ONLY the document text. No JSON, no labels, no surrounding quotation marks.");

  return lines.join("\n");
}