const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

/** Largest PKR figure the ledger will store. Phone numbers are 10+ digits. */
export const MAX_LEDGER_AMOUNT = 9_999_999;

export function formatPKR(amount: number): string {
  return pkr.format(amount).replace("PKR", "Rs").trim();
}

export function isPhoneLikeAmount(amount: number): boolean {
  const digits = String(Math.trunc(Math.abs(amount)));
  if (digits.length >= 10) return true;
  return /^(?:92)?3\d{9}$/.test(digits);
}

export function isPlausibleLedgerAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_LEDGER_AMOUNT && !isPhoneLikeAmount(amount);
}

export function isValidMoneyAmount(amount: number, allowZero = false): boolean {
  if (!Number.isFinite(amount) || !Number.isSafeInteger(amount)) return false;
  if (amount < 0 || amount > MAX_LEDGER_AMOUNT) return false;
  if (amount === 0) return allowZero;
  return !isPhoneLikeAmount(amount);
}

/** Parse a dedicated money input. Never use this on phone fields. */
export function parseFormAmount(raw: string, allowZero = false): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/^rs\.?\s*/i, "").trim();
  if (cleaned === "") return allowZero ? 0 : null;
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return isValidMoneyAmount(value, allowZero) ? value : null;
}

export function parseAmountToken(token: string): number | null {
  const cleaned = token
    .replace(/,/g, "")
    .toLowerCase()
    .replace(/^rs\.?/, "")
    .trim();

  const lac = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:lac|lakh)s?$/);
  if (lac) {
    const value = Math.round(Number(lac[1]) * 100000);
    return isPlausibleLedgerAmount(value) ? value : null;
  }

  const withK = cleaned.match(/^(\d+(?:\.\d+)?)k$/);
  if (withK) {
    const value = Math.round(Number(withK[1]) * 1000);
    return isPlausibleLedgerAmount(value) ? value : null;
  }

  if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
    const value = Math.round(Number(cleaned));
    return isPlausibleLedgerAmount(value) ? value : null;
  }
  return null;
}

export function formatFlat(flat: string | null | undefined): string | null {
  if (!flat) return null;
  return `Flat ${flat}`;
}

export function methodLabel(method: string): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "EASYPAISA":
      return "Easypaisa";
    case "BANK_TRANSFER":
      return "Bank";
    case "JAZZCASH":
      return "JazzCash";
    default:
      return "Other";
  }
}
