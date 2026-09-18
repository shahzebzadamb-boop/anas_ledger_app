export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("92") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.startsWith("0") && digits.length === 11) return `92${digits.slice(1)}`;
  if (digits.length === 10) return `92${digits}`;
  return digits;
}

export function displayPhone(raw: string | null | undefined): string {
  const normalized = normalizePhone(raw);
  if (!normalized) return "No phone";
  if (normalized.startsWith("92")) return `0${normalized.slice(2)}`;
  return normalized;
}
