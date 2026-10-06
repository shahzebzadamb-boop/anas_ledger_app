import { inRange } from "@/lib/dates";
import {
  flatName,
  isRentPayment,
  receiverName,
  stayCollectible,
  stayPaymentHistory,
  stayRemaining,
} from "@/lib/ledger";
import { methodLabel } from "@/lib/money";
import type { DateRange, LedgerState } from "@/types";

export type ActivityKind = "business" | "payment" | "expense" | "correction" | "security" | "discount" | "withdrawal";

export type ActivityEntity = "Stay" | "Payment" | "Expense" | "Security";

export type ActivityFeedItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  subtitle: string;
  label: string;
  amount: number;
  signed: boolean;
  detail?: string;
  remainingAfter?: number;
  flat: string;
  clientId: string | null;
  entityType: ActivityEntity | null;
  entityId: string;
  voided: boolean;
  editable: boolean;
};

function eventTime(...values: Array<string | null | undefined>): string {
  return values.find((value) => Boolean(value && !Number.isNaN(new Date(value).getTime()))) ?? "";
}

export function activityFeed(state: LedgerState): ActivityFeedItem[] {
  const rows: ActivityFeedItem[] = [];

  for (const stay of state.stays) {
    const rents = state.rentEntries.filter((item) => item.stayId === stay.id);
    const primary = rents[0];
    const client = state.clients.find((item) => item.id === stay.clientId)?.name ?? "Customer";
    const flat = flatName(state, stay.flatId);
    const amount = primary?.amount ?? stayCollectible(stay.id, state);
    rows.push({
      id: `stay:${stay.id}`,
      kind: "business",
      at: eventTime(stay.createdAt, primary?.occurredAt),
      title: client,
      subtitle: `${flat} · ${stay.nights} night${stay.nights === 1 ? "" : "s"}`,
      label: "Business added",
      amount,
      signed: false,
      flat,
      clientId: stay.clientId,
      entityType: "Stay",
      entityId: stay.id,
      voided: Boolean(stay.voided),
      editable: !stay.voided,
    });
    for (const rent of rents.slice(1)) {
      rows.push({
        id: `rent:${rent.id}`,
        kind: "business",
        at: eventTime(rent.createdAt, rent.occurredAt, stay.createdAt),
        title: client,
        subtitle: `${flat}${rent.note ? ` · ${rent.note}` : ""}`,
        label: "Business added",
        amount: rent.amount,
        signed: false,
        flat,
        clientId: stay.clientId,
        entityType: "Stay",
        entityId: stay.id,
        voided: Boolean(rent.voided || stay.voided),
        editable: !stay.voided && !rent.voided,
      });
    }
  }

  const remainingByPayment = new Map<string, number>();
  for (const stay of state.stays) {
    for (const line of stayPaymentHistory(stay.id, state, { includeVoided: true })) {
      remainingByPayment.set(line.id, line.remainingAfter);
    }
  }

  for (const payment of state.payments) {
    if (!isRentPayment(payment, state.reviews)) continue;
    const stay = payment.stayId ? state.stays.find((item) => item.id === payment.stayId) : null;
    const client = state.clients.find((item) => item.id === payment.clientId)?.name ?? "Customer";
    const flat = stay ? flatName(state, stay.flatId) : payment.flatId ? flatName(state, payment.flatId) : "";
    rows.push({
      id: `pay:${payment.id}`,
      kind: "payment",
      at: eventTime(payment.createdAt, payment.receivedAt),
      title: client,
      subtitle: flat,
      label: payment.voided ? "Payment undone" : "Payment received",
      amount: payment.amount,
      signed: true,
      detail: `${methodLabel(payment.method)} · Received by ${receiverName(state, payment.receivedById)}`,
      remainingAfter: remainingByPayment.get(payment.id),
      flat,
      clientId: payment.clientId,
      entityType: "Payment",
      entityId: payment.id,
      voided: Boolean(payment.voided),
      editable: !payment.voided,
    });
  }

  for (const expense of state.expenses) {
    const flat = expense.flatId ? flatName(state, expense.flatId) : "";
    rows.push({
      id: `exp:${expense.id}`,
      kind: "expense",
      at: eventTime(expense.createdAt, expense.spentAt),
      title: expense.description || expense.category,
      subtitle: flat ? `${expense.category} · ${flat}` : expense.category,
      label: "Expense",
      amount: expense.amount,
      signed: false,
      detail: methodLabel(expense.method),
      flat,
      clientId: null,
      entityType: "Expense",
      entityId: expense.id,
      voided: Boolean(expense.voided),
      editable: !expense.voided,
    });
  }

  for (const item of state.security) {
    const client = state.clients.find((row) => row.id === item.clientId)?.name ?? "Security";
    const flat = item.flatId ? flatName(state, item.flatId) : "";
    rows.push({
      id: `sec:${item.id}`,
      kind: "security",
      at: eventTime(item.occurredAt),
      title: client,
      subtitle: flat,
      label: item.kind === "RECEIVED" ? "Security received" : "Security adjusted",
      amount: item.amount,
      signed: false,
      flat,
      clientId: item.clientId,
      entityType: "Security",
      entityId: item.id,
      voided: Boolean(item.voided),
      editable: !item.voided,
    });
  }

  for (const item of state.discounts) {
    const client = state.clients.find((row) => row.id === item.clientId)?.name ?? "Discount";
    rows.push({
      id: `disc:${item.id}`,
      kind: "discount",
      at: eventTime(item.occurredAt),
      title: client,
      subtitle: item.flatId ? flatName(state, item.flatId) : "",
      label: "Discount",
      amount: item.amount,
      signed: false,
      flat: item.flatId ? flatName(state, item.flatId) : "",
      clientId: item.clientId,
      entityType: "Stay",
      entityId: item.stayId,
      voided: Boolean(item.voided),
      editable: false,
    });
  }

  for (const item of state.withdrawals) {
    rows.push({
      id: `wd:${item.id}`,
      kind: "withdrawal",
      at: eventTime(item.occurredAt),
      title: "Anas withdrawal",
      subtitle: "",
      label: "Withdrawal",
      amount: item.amount,
      signed: false,
      flat: "",
      clientId: null,
      entityType: null,
      entityId: item.id,
      voided: Boolean(item.voided),
      editable: false,
    });
  }

  for (const audit of state.auditLogs) {
    if (audit.action !== "MANUAL_EDIT" && audit.action !== "VOID" && audit.action !== "UNDO") continue;
    const entityType =
      audit.entityType === "Stay" || audit.entityType === "Payment" || audit.entityType === "Expense" || audit.entityType === "Security"
        ? (audit.entityType as ActivityEntity)
        : null;
    rows.push({
      id: `audit:${audit.id}`,
      kind: "correction",
      at: eventTime(audit.createdAt),
      title: audit.reason || audit.action,
      subtitle: `${audit.entityType} · ${audit.action}`,
      label: audit.action === "UNDO" || audit.action === "VOID" ? "Undone" : "Edited",
      amount: 0,
      signed: false,
      flat: "",
      clientId: activityClientId(state, entityType, audit.entityId),
      entityType,
      entityId: audit.entityId,
      voided: false,
      editable: Boolean(entityType),
    });
  }

  return rows
    .filter((item) => item.at)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id.localeCompare(b.id)));
}

function activityClientId(
  state: LedgerState,
  entityType: ActivityEntity | null,
  entityId: string,
): string | null {
  if (entityType === "Stay") return state.stays.find((item) => item.id === entityId)?.clientId ?? null;
  if (entityType === "Payment") return state.payments.find((item) => item.id === entityId)?.clientId ?? null;
  if (entityType === "Security") return state.security.find((item) => item.id === entityId)?.clientId ?? null;
  return null;
}

export function filterActivityFeed(
  items: ActivityFeedItem[],
  opts: {
    range: DateRange;
    flat: string;
    kind: "all" | ActivityKind;
    clientId?: string | null;
    includeVoided?: boolean;
  },
): ActivityFeedItem[] {
  return items.filter((item) => {
    if (!opts.includeVoided && item.voided) return false;
    if (opts.kind !== "all" && item.kind !== opts.kind) return false;
    if (!inRange(item.at, opts.range)) return false;
    if (opts.clientId && item.clientId !== opts.clientId) return false;
    if (opts.flat !== "all") {
      const wanted = opts.flat.toLowerCase();
      if ((item.flat || "").toLowerCase() !== wanted) return false;
    }
    return true;
  });
}

export function homeRecentActivity(state: LedgerState, limit = 8): ActivityFeedItem[] {
  return activityFeed(state)
    .filter((item) => !item.voided && item.kind !== "correction")
    .slice(0, limit);
}

export function activityEditorKind(item: ActivityFeedItem): "stay" | "payment" | "expense" | "security" | null {
  if (!item.entityType || !item.editable) return null;
  if (item.entityType === "Stay") return "stay";
  if (item.entityType === "Payment") return "payment";
  if (item.entityType === "Expense") return "expense";
  if (item.entityType === "Security") return "security";
  return null;
}

export function currentStayRemaining(state: LedgerState, stayId: string | null | undefined): number {
  if (!stayId) return 0;
  return stayRemaining(stayId, state);
}
