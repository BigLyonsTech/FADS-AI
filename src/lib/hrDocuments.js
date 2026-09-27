// Client-side HR document constants and helpers. Mirrors the server-side
// validation in base44/shared/hrDocuments.ts.

export const PERMITTED_EXTENSIONS = [
  "pdf", "jpg", "jpeg", "png", "gif", "webp",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv",
];

export const BLOCKED_EXTENSIONS = [
  "exe", "bat", "sh", "cmd", "com", "msi", "app",
  "jar", "js", "mjs", "vbs", "ps1", "scr", "dll",
  "bin", "run", "deb", "rpm", "dmg", "pkg", "hta",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function getFileExtension(fileName) {
  if (!fileName) return "";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function validateFile(fileName, fileSize) {
  if (!fileName) return { valid: false, error: "File name is required" };
  if (fileSize != null && fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds the 10 MB size limit" };
  }
  const ext = getFileExtension(fileName);
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type .${ext} is not permitted (executable or script file)` };
  }
  if (!PERMITTED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type .${ext} is not supported. Permitted: PDF, images, documents, text.` };
  }
  return { valid: true };
}

export function getExpiryStatus(expiryDate) {
  if (!expiryDate) return "none";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "valid";
}

export const DOCUMENT_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "identification", label: "Identification" },
  { value: "tax_employment_form", label: "Tax / Employment Form" },
  { value: "qualification", label: "Qualification" },
  { value: "training_certificate", label: "Training Certificate" },
  { value: "policy", label: "Policy" },
  { value: "acknowledgement", label: "Acknowledgement" },
  { value: "other", label: "Other" },
];

export const CONFIDENTIALITY_LEVELS = [
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "restricted", label: "Restricted" },
];

export const DOCUMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "current", label: "Current" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

export const VERIFICATION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];