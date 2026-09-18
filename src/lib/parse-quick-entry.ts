import { addDays, startOfDay } from "date-fns";
import { parseAmountToken } from "@/lib/money";
import type { ExpenseCategory, PaymentMethod } from "@/types";

export type TransactionType = "RENT" | "PAYMENT" | "EXPENSE";

export type RentDraft = {
  type: "rent";
  clientName: string;
  flat: string | null;
  totalAmount: number;
  receivedAmount: number;
  remaining: number;
  method: PaymentMethod;
  dueDate: Date;
  description: string;
};

export type PaymentDraft = {
  type: "payment";
  clientName: string;
  amount: number;
  method: PaymentMethod;
};

export type ExpenseDraft = {
  type: "expense";
  amount: number;
  method: PaymentMethod;
  description: string;
  categoryLabel: string;
  category: ExpenseCategory;
  flat: string | null;
};

export type ExtractedFields = {
  clientName: string | null;
  flat: string | null;
  method: PaymentMethod;
  amounts: number[];
  totalAmount: number | null;
  receivedAmount: number | null;
  remainingAmount: number | null;
  dueDate: Date;
};

export type ParsedQuickEntry =
  | RentDraft
  | PaymentDraft
  | ExpenseDraft
  | {
      type: "ambiguous";
      reason: string;
      extracted: ExtractedFields;
    };

export type ParseContext = {
  knownClients?: string[];
  now?: Date;
};

const EXPENSE_RE =
  /\b(bought|buy|expense|electricity|gas|internet|cleaning|cleaner|repair|maintenance|bedsheets?|linen|furniture|grocers?y|groceries|supplies|staff|commission|\bac\b|water|bill)\b/i;

const RENT_STRONG_RE = /\b(rent|room|nights?|booking|total)\b/i;
const DAYS_RE = /\b(\d+)\s+days?\b/i;
const PAYMENT_RE =
  /\b(paid|received|another|remaining\s+payment|balance\s+paid)\b/i;

const STOP_WORDS = new Set([
  "bought",
  "buy",
  "paid",
  "received",
  "rent",
  "room",
  "flat",
  "total",
  "due",
  "cash",
  "bank",
  "easypaisa",
  "jazzcash",
  "another",
  "remaining",
  "balance",
  "today",
  "tomorrow",
  "days",
  "day",
  "night",
  "nights",
  "booking",
  "expense",
  "electricity",
  "internet",
  "cleaner",
  "cleaning",
  "repair",
  "bill",
  "other",
]);

const METHOD_PATTERNS: { pattern: RegExp; method: PaymentMethod }[] = [
  { pattern: /easy\s*paisa/i, method: "EASYPAISA" },
  { pattern: /jazz\s*cash/i, method: "JAZZCASH" },
  { pattern: /bank\s*transfer/i, method: "BANK_TRANSFER" },
  { pattern: /\bbank\b/i, method: "BANK_TRANSFER" },
  { pattern: /\bcash\b/i, method: "CASH" },
  { pattern: /\bother\b/i, method: "OTHER" },
];

function detectMethod(text: string): PaymentMethod {
  for (const item of METHOD_PATTERNS) {
    if (item.pattern.test(text)) return item.method;
  }
  return "CASH";
}

function normalizeFlat(value: string): string {
  return value.replace(/-([a-z])$/i, (_, letter: string) => `-${letter.toUpperCase()}`);
}

function detectFlat(text: string): string | null {
  const labeled = text.match(/\bflat\s+([A-Za-z0-9-]+)/i);
  if (labeled?.[1]) return normalizeFlat(labeled[1]);

  const hyphen = text.match(/\b(\d{3}-[A-Za-z])\b/);
  if (hyphen?.[1]) return normalizeFlat(hyphen[1]);

  const withoutDays = text.replace(/\b\d+\s+days?\b/gi, " ");
  const triples = withoutDays.match(/\b\d{3}\b/g) ?? [];
  for (const token of triples) {
    const value = Number(token);
    if (value >= 100 && value <= 999) return token;
  }
  return null;
}

function detectDueDate(text: string, now: Date): Date {
  const today = startOfDay(now);
  if (/\btomorrow\b/i.test(text)) return addDays(today, 1);
  if (/\bdue\s+today\b/i.test(text)) return today;
  const days = text.match(DAYS_RE);
  if (days) return addDays(today, Number(days[1]));
  return today;
}

function detectClient(text: string, knownClients: string[]): string | null {
  const ranked = [...knownClients].sort((a, b) => b.length - a.length);
  for (const name of ranked) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) return name;
  }
  const first = text.match(/^([A-Za-z][A-Za-z.'-]*)\b/);
  if (!first || STOP_WORDS.has(first[1].toLowerCase())) return null;
  return first[1][0].toUpperCase() + first[1].slice(1).toLowerCase();
}

function amountAfter(text: string, keyword: RegExp): number | null {
  const match = text.match(keyword);
  if (!match || match.index === undefined) return null;
  const after = text.slice(match.index + match[0].length);
  const token = after.match(/rs\.?\s*[\d,]+(?:\.\d+)?k?|[\d,]+(?:\.\d+)?k?/i);
  if (!token) return null;
  return parseAmountToken(token[0].replace(/^rs\.?\s*/i, ""));
}

function extractAmounts(text: string, flat: string | null): number[] {
  const dayCount = text.match(DAYS_RE)?.[1] ?? null;
  const tokens =
    text.match(/(?:rs\.?\s*)?(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)k?/gi) ?? [];
  const flatNumber = flat ? Number(flat.replace(/-[A-Za-z]$/i, "")) : null;

  return tokens
    .map((token) => parseAmountToken(token.replace(/^rs\.?\s*/i, "")))
    .filter((value): value is number => {
      if (value === null || value <= 0) return false;
      if (dayCount && value === Number(dayCount)) return false;
      if (flatNumber && value === flatNumber) return false;
      return true;
    });
}

function expenseMeta(text: string): { label: string; category: ExpenseCategory } {
  if (/bedsheets?|linen/i.test(text)) {
    return { label: "Bedsheets / Linen", category: "SUPPLIES" };
  }
  if (/\bac\b/i.test(text)) return { label: "AC repair", category: "MAINTENANCE" };
  if (/electricity/i.test(text)) return { label: "Electricity", category: "UTILITIES" };
  if (/\bgas\b/i.test(text)) return { label: "Gas", category: "UTILITIES" };
  if (/internet/i.test(text)) return { label: "Internet", category: "UTILITIES" };
  if (/water/i.test(text)) return { label: "Water", category: "UTILITIES" };
  if (/clean(?:er|ing)/i.test(text)) return { label: "Cleaning", category: "LABOR" };
  if (/staff/i.test(text)) return { label: "Staff", category: "LABOR" };
  if (/commission/i.test(text)) return { label: "Commission", category: "LABOR" };
  if (/repair/i.test(text)) return { label: "Repair", category: "MAINTENANCE" };
  if (/maintenance/i.test(text)) return { label: "Maintenance", category: "MAINTENANCE" };
  if (/furniture/i.test(text)) return { label: "Furniture", category: "SUPPLIES" };
  if (/grocers?y|groceries|supplies/i.test(text)) {
    return { label: "Supplies", category: "SUPPLIES" };
  }
  if (/bill/i.test(text)) return { label: "Bill", category: "UTILITIES" };
  return { label: "Expense", category: "OTHER" };
}

export function extractFields(text: string, ctx: ParseContext = {}): ExtractedFields {
  const now = ctx.now ?? new Date();
  const flat = detectFlat(text);
  const amounts = extractAmounts(text, flat);

  return {
    clientName: detectClient(text, ctx.knownClients ?? []),
    flat,
    method: detectMethod(text),
    amounts,
    totalAmount: amountAfter(text, /\b(?:rent|total)\b/i),
    receivedAmount: amountAfter(text, /\b(?:received|paid)\b/i),
    remainingAmount: amountAfter(text, /\bremaining\b/i),
    dueDate: detectDueDate(text, now),
  };
}

function classify(
  text: string,
  fields: ExtractedFields,
  knownClients: string[],
): TransactionType | "AMBIGUOUS" {
  if (EXPENSE_RE.test(text)) return "EXPENSE";
  if (RENT_STRONG_RE.test(text) || DAYS_RE.test(text)) return "RENT";
  if (/\bflat\b/i.test(text) && fields.clientName) return "RENT";
  if (fields.flat && fields.clientName && fields.amounts.length > 0 && !PAYMENT_RE.test(text)) {
    return "RENT";
  }

  const known = Boolean(
    fields.clientName &&
      knownClients.some((name) => name.toLowerCase() === fields.clientName?.toLowerCase()),
  );

  if ((known || fields.clientName) && PAYMENT_RE.test(text) && !RENT_STRONG_RE.test(text)) {
    return "PAYMENT";
  }
  return "AMBIGUOUS";
}

function buildRent(text: string, fields: ExtractedFields): RentDraft | null {
  const total =
    fields.totalAmount ??
    (fields.amounts.length > 1 ? Math.max(...fields.amounts) : fields.amounts[0]);
  if (!fields.clientName || !total) return null;

  let received = fields.receivedAmount ?? 0;
  if (received === 0 && fields.amounts.length === 1 && /\b(received|paid)\b/i.test(text)) {
    received = total;
  }

  return {
    type: "rent",
    clientName: fields.clientName,
    flat: fields.flat,
    totalAmount: total,
    receivedAmount: received,
    remaining: fields.remainingAmount ?? Math.max(0, total - received),
    method: fields.method,
    dueDate: fields.dueDate,
    description: fields.flat ? `Room rent · Flat ${fields.flat}` : "Room rent",
  };
}

function buildPayment(fields: ExtractedFields): PaymentDraft | null {
  const amount = fields.receivedAmount ?? fields.amounts[0];
  if (!fields.clientName || !amount) return null;
  return {
    type: "payment",
    clientName: fields.clientName,
    amount,
    method: fields.method,
  };
}

function buildExpense(text: string, fields: ExtractedFields): ExpenseDraft | null {
  const amount = fields.amounts[0];
  if (!amount) return null;
  const meta = expenseMeta(text);
  return {
    type: "expense",
    amount,
    method: fields.method,
    description: meta.label,
    categoryLabel: meta.label,
    category: meta.category,
    flat: fields.flat,
  };
}

function ambiguous(extracted: ExtractedFields): ParsedQuickEntry {
  return {
    type: "ambiguous",
    reason: "I couldn't fully understand this entry.",
    extracted,
  };
}

export function isConfirmable(
  parsed: ParsedQuickEntry,
): parsed is RentDraft | PaymentDraft | ExpenseDraft {
  return parsed.type === "rent" || parsed.type === "payment" || parsed.type === "expense";
}

export function parseQuickEntry(
  raw: string,
  ctx: ParseContext = {},
  forceType?: TransactionType,
): ParsedQuickEntry {
  const text = raw.trim().replace(/\s+/g, " ");
  const fields = extractFields(text, ctx);
  if (!text) return ambiguous(fields);

  const type = forceType ?? classify(text, fields, ctx.knownClients ?? []);
  if (type === "EXPENSE") return buildExpense(text, fields) ?? ambiguous(fields);
  if (type === "RENT") return buildRent(text, fields) ?? ambiguous(fields);
  if (type === "PAYMENT") return buildPayment(fields) ?? ambiguous(fields);
  return ambiguous(fields);
}

