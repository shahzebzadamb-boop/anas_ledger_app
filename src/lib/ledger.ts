import type {
  AttentionItem,
  DashboardTotals,
  DateRange,
  LedgerState,
  Stay,
} from "@/types";
import { inRange } from "@/lib/dates";
import { formatPKR } from "@/lib/money";

export function flatName(state: LedgerState, flatId: string | null | undefined): string {
  if (!flatId) return "";
  return state.flats.find((item) => item.id === flatId)?.name ?? flatId.replace(/^flat_/, "");
}

export function stayRevenue(stayId: string, state: LedgerState): number {
  return state.rentEntries
    .filter((item) => item.stayId === stayId)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function stayDiscounts(stayId: string, state: LedgerState): number {
  return state.discounts
    .filter((item) => item.stayId === stayId)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function stayPayments(stayId: string, state: LedgerState): number {
  return state.payments
    .filter((item) => item.stayId === stayId)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function staySecurityApplied(stayId: string, state: LedgerState): number {
  return state.security
    .filter((item) => item.stayId === stayId && item.kind === "ADJUSTED_TO_RENT")
    .reduce((sum, item) => sum + item.amount, 0);
}

export function stayCollectible(stayId: string, state: LedgerState): number {
  return Math.max(0, stayRevenue(stayId, state) - stayDiscounts(stayId, state));
}

export function stayRemaining(stayId: string, state: LedgerState): number {
  return Math.max(
    0,
    stayCollectible(stayId, state) - stayPayments(stayId, state) - staySecurityApplied(stayId, state),
  );
}

export function clientSecurityHeld(clientId: string, state: LedgerState): number {
  return state.security
    .filter((item) => item.clientId === clientId)
    .reduce((sum, item) => {
      if (item.kind === "RECEIVED") return sum + item.amount;
      return sum - item.amount;
    }, 0);
}

export function isStayPendingActive(stay: Stay, state: LedgerState): boolean {
  if (stayRemaining(stay.id, state) <= 0) return false;
  if (stay.activePending) return true;
  if (stay.notifyEnabled && stay.importKey === null) return true;
  return state.reviews.some(
    (review) =>
      review.stayId === stay.id &&
      review.pendingDecision === "STILL_PENDING",
  );
}

function matchesFlat(flatId: string | null | undefined, selected: string): boolean {
  if (selected === "all") return true;
  return flatId === `flat_${selected}` || flatId === selected;
}

function stayTouchesRange(stay: Stay, state: LedgerState, range: DateRange): boolean {
  if (inRange(stay.checkIn, range) || inRange(stay.checkOut, range)) return true;
  if (state.rentEntries.some((item) => item.stayId === stay.id && inRange(item.occurredAt, range))) {
    return true;
  }
  return state.payments.some((item) => item.stayId === stay.id && inRange(item.receivedAt, range));
}

const SUMMARY_TEXT =
  /\b(total amount|grand total|sheet total|monthly total|anas received\s*\|)\b/i;

export function isSpreadsheetSummaryText(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (/^total amount\b/i.test(trimmed)) return true;
  if (/^anas received\s*\|/i.test(trimmed)) return true;
  return SUMMARY_TEXT.test(trimmed);
}

function isConfirmedExpense(
  item: LedgerState["expenses"][number],
  reviews: LedgerState["reviews"],
): boolean {
  if (isSpreadsheetSummaryText(item.description) || isSpreadsheetSummaryText(item.notes)) {
    return false;
  }
  const review = reviews.find((row) => row.id === item.id);
  if (!review) return true;
  if (review.proposedType === "SUMMARY" || review.proposedType === "TRANSFER") return false;
  if (review.proposedType === "EXPENSE" && review.status !== "CONFIRMED") return false;
  return true;
}

function isRentPayment(item: LedgerState["payments"][number], reviews: LedgerState["reviews"]): boolean {
  if (isSpreadsheetSummaryText(item.notes)) return false;
  const review = reviews.find((row) => row.id === item.id);
  if (!review) return true;
  return review.proposedType !== "SUMMARY";
}

export function dashboardTotals(
  state: LedgerState,
  range: DateRange,
  selectedFlat: string,
): DashboardTotals {
  const rent = state.rentEntries.filter(
    (item) =>
      matchesFlat(item.flatId, selectedFlat) &&
      inRange(item.occurredAt, range) &&
      !isSpreadsheetSummaryText(item.note),
  );
  const received = state.payments.filter(
    (item) =>
      matchesFlat(item.flatId, selectedFlat) &&
      inRange(item.receivedAt, range) &&
      isRentPayment(item, state.reviews),
  );
  const expenses = state.expenses.filter(
    (item) =>
      matchesFlat(item.flatId, selectedFlat) &&
      inRange(item.spentAt, range) &&
      isConfirmedExpense(item, state.reviews),
  );
  const discounts = state.discounts.filter(
    (item) => matchesFlat(item.flatId, selectedFlat) && inRange(item.occurredAt, range),
  );

  const business = Math.max(
    0,
    rent.reduce((sum, item) => sum + item.amount, 0) - discounts.reduce((sum, item) => sum + item.amount, 0),
  );
  const receivedSum = received.reduce((sum, item) => sum + item.amount, 0);
  const expenseSum = expenses.reduce((sum, item) => sum + item.amount, 0);

  const pending = state.stays
    .filter(
      (stay) =>
        matchesFlat(stay.flatId, selectedFlat) &&
        isStayPendingActive(stay, state) &&
        stayTouchesRange(stay, state, range),
    )
    .reduce((sum, stay) => sum + stayRemaining(stay.id, state), 0);

  return {
    business,
    received: receivedSum,
    pending,
    expenses: expenseSum,
  };
}

export function availableForWithdrawal(state: LedgerState): number {
  const received = state.payments
    .filter((item) => isRentPayment(item, state.reviews))
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = state.expenses
    .filter((item) => isConfirmedExpense(item, state.reviews))
    .reduce((sum, item) => sum + item.amount, 0);
  const withdrawals = state.withdrawals.reduce((sum, item) => sum + item.amount, 0);
  return Math.max(0, received - expenses - withdrawals);
}

export function needsAttention(state: LedgerState, selectedFlat = "all"): AttentionItem[] {
  return state.stays
    .filter((stay) => matchesFlat(stay.flatId, selectedFlat) && isStayPendingActive(stay, state))
    .map((stay) => {
      const client = state.clients.find((item) => item.id === stay.clientId);
      return {
        stayId: stay.id,
        clientId: stay.clientId,
        clientName: client?.name ?? "Customer",
        phone: client?.phone ?? null,
        remaining: stayRemaining(stay.id, state),
        flat: flatName(state, stay.flatId),
        checkOut: stay.checkOut,
      };
    })
    .sort((a, b) => b.remaining - a.remaining);
}

export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function reminderMessage(item: AttentionItem): string {
  return `Za kana jan, ${item.clientName} na Rs ${item.remaining.toLocaleString("en-PK")} rawakhla — Flat ${item.flat}`;
}

export function reviewMonth(item: { month?: string | null; date?: string | null; sourceSheet: string }): string {
  if (item.month) return item.month;
  if (item.date) {
    const parsed = new Date(item.date.includes("T") ? item.date : `${item.date}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    }
  }
  return item.sourceSheet;
}

export function currentInterpretation(item: LedgerState["reviews"][number], state: LedgerState): string {
  if (item.currentInterpretation && item.status !== "NEEDS_REVIEW") return item.currentInterpretation;
  if (item.proposedType === "PENDING_BALANCE" && item.stayId) {
    const remaining = stayRemaining(item.stayId, state);
    const stay = state.stays.find((row) => row.id === item.stayId);
    if (remaining <= 0) return "Pending is 0. Reminders off.";
    if (stay?.activePending) return `Still pending ${formatPKR(remaining)}. Reminders on.`;
    return `Open balance ${formatPKR(remaining)}. Reminders off until you confirm still pending.`;
  }
  if (item.proposedType === "EXPENSE") {
    return item.amount
      ? `Possible expense ${formatPKR(item.amount)}. Not counted until confirmed.`
      : "Possible expense. Confirm before counting.";
  }
  if (item.proposedType === "SUMMARY") return "Spreadsheet total — not counted in Business or Expenses.";
  if (item.proposedType === "TRANSFER") return "Money sent/transferred — not rent, not an expense.";
  if (item.proposedType === "STAY") {
    return item.amount
      ? `Stay of ${formatPKR(item.amount)} needs a date or clearer payment.`
      : "Stay is missing a date or payment amount.";
  }
  return item.reason;
}

export type RecentActivityItem = {
  id: string;
  at: string;
  title: string;
  detail: string;
  amount: number;
};

export function recentActivity(state: LedgerState, limit = 8): RecentActivityItem[] {
  const rows: RecentActivityItem[] = [
    ...state.rentEntries.map((item) => ({
      id: item.id,
      at: item.occurredAt,
      title: state.clients.find((client) => client.id === item.clientId)?.name ?? "Rent",
      detail: `Rent · Flat ${flatName(state, item.flatId)}`,
      amount: item.amount,
    })),
    ...state.payments.map((item) => ({
      id: item.id,
      at: item.receivedAt,
      title: state.clients.find((client) => client.id === item.clientId)?.name ?? "Payment",
      detail: "Payment received",
      amount: item.amount,
    })),
    ...state.expenses.map((item) => ({
      id: item.id,
      at: item.spentAt,
      title: item.description,
      detail: item.flatId ? `Expense · Flat ${flatName(state, item.flatId)}` : "Expense",
      amount: item.amount,
    })),
    ...state.withdrawals.map((item) => ({
      id: item.id,
      at: item.occurredAt,
      title: "Anas withdrawal",
      detail: "Internal transfer · not in money summary",
      amount: item.amount,
    })),
    ...state.security.map((item) => ({
      id: item.id,
      at: item.occurredAt,
      title: item.kind === "RECEIVED" ? "Security received" : "Security adjusted",
      detail: state.clients.find((client) => client.id === item.clientId)?.name ?? "Security",
      amount: item.amount,
    })),
    ...state.discounts.map((item) => ({
      id: item.id,
      at: item.occurredAt,
      title: "Discount",
      detail: state.clients.find((client) => client.id === item.clientId)?.name ?? "Discount",
      amount: item.amount,
    })),
  ];

  return rows.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

export function clientProfile(clientId: string, state: LedgerState) {
  const stays = state.stays.filter((item) => item.clientId === clientId);
  const lastStay = [...stays].sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))[0];
  return {
    totalStays: stays.length,
    lifetimeBusiness: stays.reduce((sum, stay) => sum + stayCollectible(stay.id, state), 0),
    lifetimeRevenue: stays.reduce((sum, stay) => sum + stayCollectible(stay.id, state), 0),
    totalReceived: state.payments
      .filter((item) => item.clientId === clientId)
      .reduce((sum, item) => sum + item.amount, 0),
    currentlyPending: stays
      .filter((stay) => isStayPendingActive(stay, state))
      .reduce((sum, stay) => sum + stayRemaining(stay.id, state), 0),
    securityHeld: clientSecurityHeld(clientId, state),
    lastFlat: lastStay ? flatName(state, lastStay.flatId) : null,
    lastStay: lastStay?.checkIn ?? null,
    stays,
  };
}
