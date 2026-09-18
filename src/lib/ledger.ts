import type {
  AttentionItem,
  DashboardTotals,
  DateRange,
  LedgerState,
  Payment,
  Receivable,
  ReceivableStatus,
} from "@/types";
import { daysFromToday, inRange, overdueDays, startOfToday } from "@/lib/dates";

export function paymentsReceived(payments: Payment[]): Payment[] {
  return payments.filter((payment) => payment.kind === "RECEIVED");
}

export function paymentsRefunded(payments: Payment[]): Payment[] {
  return payments.filter((payment) => payment.kind === "REFUND");
}

export function allocatedReceived(
  payments: Payment[],
  receivableId: string,
): number {
  return paymentsReceived(payments)
    .filter((payment) => payment.receivableId === receivableId)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function remainingForReceivable(
  receivable: Receivable,
  payments: Payment[],
): number {
  return Math.max(0, receivable.totalAmount - allocatedReceived(payments, receivable.id));
}

export function clientBalance(
  clientId: string,
  state: Pick<LedgerState, "receivables" | "payments">,
): number {
  const totalReceivables = state.receivables
    .filter((item) => item.clientId === clientId && item.status !== "CANCELLED")
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const totalPayments = paymentsReceived(state.payments)
    .filter((item) => item.clientId === clientId)
    .reduce((sum, item) => sum + item.amount, 0);

  return totalReceivables - totalPayments;
}

export function computeReceivableStatus(
  receivable: Receivable,
  payments: Payment[],
  now = new Date(),
): ReceivableStatus {
  if (receivable.status === "CANCELLED") return "CANCELLED";
  const remaining = remainingForReceivable(receivable, payments);
  if (remaining <= 0) return "PAID";
  if (overdueDays(receivable.dueDate, now) > 0) return "OVERDUE";
  if (allocatedReceived(payments, receivable.id) > 0) return "PARTIAL";
  return "PENDING";
}

export function netCash(received: number, expenses: number, refunds: number): number {
  return received - expenses - refunds;
}

export function dashboardTotals(state: LedgerState, range: DateRange): DashboardTotals {
  const received = paymentsReceived(state.payments)
    .filter((payment) => inRange(payment.receivedAt, range))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const refunds = paymentsRefunded(state.payments)
    .filter((payment) => inRange(payment.receivedAt, range))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const expenses = state.expenses
    .filter((expense) => inRange(expense.spentAt, range))
    .reduce((sum, expense) => sum + expense.amount, 0);

  const pending = state.receivables
    .filter((item) => item.status !== "CANCELLED")
    .reduce((sum, item) => sum + remainingForReceivable(item, state.payments), 0);

  return {
    received,
    pending,
    expenses,
    refunds,
    netCash: netCash(received, expenses, refunds),
  };
}

function isSnoozed(receivable: Receivable, now: Date): boolean {
  if (!receivable.snoozedUntil) return false;
  return new Date(receivable.snoozedUntil) > now;
}

export function needsAttention(
  state: LedgerState,
  now = new Date(),
): AttentionItem[] {
  const today = startOfToday(now);
  const tomorrow = daysFromToday(1, now);

  const items: AttentionItem[] = [];

  for (const receivable of state.receivables) {
    if (receivable.status === "CANCELLED") continue;
    const remaining = remainingForReceivable(receivable, state.payments);
    if (remaining <= 0) continue;
    if (isSnoozed(receivable, now)) continue;

    const due = startOfToday(new Date(receivable.dueDate));
    const daysOverdue = overdueDays(receivable.dueDate, now);
    let urgency: AttentionItem["urgency"] | null = null;

    if (daysOverdue > 0) urgency = "overdue";
    else if (due.getTime() === today.getTime()) urgency = "today";
    else if (due.getTime() === tomorrow.getTime()) urgency = "tomorrow";

    if (!urgency) continue;

    const client = state.clients.find((item) => item.id === receivable.clientId);
    if (!client) continue;

    items.push({
      receivableId: receivable.id,
      clientId: client.id,
      clientName: client.name,
      phone: client.phone,
      remaining,
      dueDate: receivable.dueDate,
      overdueDays: daysOverdue,
      flat: receivable.flat,
      urgency,
      description: receivable.description,
    });
  }

  const urgencyRank = { overdue: 0, today: 1, tomorrow: 2 };

  return items.sort((a, b) => {
    if (urgencyRank[a.urgency] !== urgencyRank[b.urgency]) {
      return urgencyRank[a.urgency] - urgencyRank[b.urgency];
    }
    if (a.urgency === "overdue") {
      return b.overdueDays - a.overdueDays;
    }
    return b.remaining - a.remaining;
  });
}

export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function reminderMessage(item: AttentionItem): string {
  return `Hi ${item.clientName}, just a reminder that Rs ${item.remaining.toLocaleString("en-PK")} is still pending. Thank you.`;
}

export type RecentActivityItem = {
  id: string;
  at: string;
  kind: "payment" | "expense" | "rent";
  title: string;
  detail: string;
  amount: number;
};

export function recentActivity(state: LedgerState, limit = 8): RecentActivityItem[] {
  const rents: RecentActivityItem[] = state.receivables.map((item) => {
    const client = state.clients.find((entry) => entry.id === item.clientId);
    return {
      id: item.id,
      at: item.createdAt,
      kind: "rent",
      title: client?.name ?? "Client",
      detail: item.flat ? `Rent · Flat ${item.flat}` : "Rent",
      amount: item.totalAmount,
    };
  });

  const pays: RecentActivityItem[] = state.payments.map((item) => {
    const client = state.clients.find((entry) => entry.id === item.clientId);
    return {
      id: item.id,
      at: item.receivedAt,
      kind: "payment",
      title: client?.name ?? "Client",
      detail: item.kind === "REFUND" ? "Refund" : "Payment",
      amount: item.amount,
    };
  });

  const spends: RecentActivityItem[] = state.expenses.map((item) => ({
    id: item.id,
    at: item.spentAt,
    kind: "expense",
    title: item.description,
    detail: item.flat ? `Expense · Flat ${item.flat}` : "Expense",
    amount: item.amount,
  }));

  return [...rents, ...pays, ...spends]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);
}
