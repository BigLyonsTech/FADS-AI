export const QUOTATION_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Converted" },
];

export function deriveQuotationStatus(quotation, today = new Date().toISOString().slice(0, 10)) {
  if (!quotation) return "draft";
  if (["accepted", "declined", "expired", "converted"].includes(quotation.status)) {
    return quotation.status;
  }
  if (quotation.valid_until && quotation.valid_until < today) return "expired";
  return quotation.status || "draft";
}

export function quotationStatusLabel(status) {
  return QUOTATION_STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

export function quotationStatusClass(status) {
  switch (status) {
    case "sent":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "accepted":
      return "bg-green-50 text-green-700 border-green-200";
    case "declined":
      return "bg-red-50 text-red-700 border-red-200";
    case "expired":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "converted":
      return "bg-brand-mint text-brand-navy border-brand-teal/30";
    default:
      return "bg-muted/40 text-muted-foreground border-border";
  }
}
