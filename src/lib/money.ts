const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatPKR(amount: number): string {
  return pkr.format(amount).replace("PKR", "Rs").trim();
}

export function parseAmountToken(token: string): number | null {
  const cleaned = token.replace(/,/g, "").toLowerCase().replace(/^rs\.?/, "");
  const withK = cleaned.match(/^(\d+(?:\.\d+)?)k$/);
  if (withK) return Math.round(Number(withK[1]) * 1000);
  if (/^\d+(?:\.\d+)?$/.test(cleaned)) return Math.round(Number(cleaned));
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
      return "Bank Transfer";
    case "JAZZCASH":
      return "JazzCash";
    default:
      return "Other";
  }
}
