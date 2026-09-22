import { addDays } from "date-fns";
import {
  clientSecurityHeld,
  availableForWithdrawal,
  stayRemaining,
} from "@/lib/ledger";
import { formatPKR } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import type { ConfirmableDraft } from "@/lib/parse-quick-entry";
import type { MigrationPatch } from "@/lib/parse-migration-update";
import { canonicalReceiverName, DEFAULT_RECEIVER_NAME, DEFAULT_RECEIVERS } from "@/lib/receivers";
import { createId } from "@/lib/utils";
import type {
  Client,
  Expense,
  ExpenseCategory,
  LedgerState,
  Payment,
  PaymentMethod,
  PendingDecision,
  Receiver,
} from "@/types";

export type RecordPaymentInput = {
  clientId: string;
  stayId?: string | null;
  amount: number;
  method: PaymentMethod;
  receivedById?: string | null;
  receivedByName?: string | null;
};

export type Action =
  | { type: "HYDRATE"; payload: LedgerState }
  | { type: "RECORD_PAYMENT"; payload: RecordPaymentInput }
  | {
      type: "ADD_EXPENSE";
      payload: {
        amount: number;
        category: ExpenseCategory;
        description: string;
        method: PaymentMethod;
        flat?: string | null;
      };
    }
  | { type: "APPLY_QUICK_ENTRY"; parsed: ConfirmableDraft }
  | { type: "SET_CLIENT_PHONE"; clientId: string; phone: string }
  | { type: "RENAME_FLAT"; flatId: string; name: string }
  | { type: "REVIEW_STATUS"; id: string; status: "CONFIRMED" | "IGNORED" }
  | { type: "REVIEW_PENDING"; id: string; decision: PendingDecision }
  | { type: "APPLY_MIGRATION_UPDATE"; id: string; patch: MigrationPatch; correctionText?: string }
  | { type: "SILENCE_CLIENT"; clientId: string; cycleDate: string }
  | { type: "MARK_NIGHT_SUMMARY"; cycleDate: string };

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function nowISO() {
  return new Date().toISOString();
}

function withActivity(
  state: LedgerState,
  entry: Omit<LedgerState["activityLogs"][number], "id" | "createdAt">,
): LedgerState {
  return {
    ...state,
    activityLogs: [
      { id: createId("act"), createdAt: nowISO(), ...entry },
      ...state.activityLogs,
    ],
  };
}

function findReceiver(
  state: LedgerState,
  input: { receivedById?: string | null; receivedByName?: string | null },
): { state: LedgerState; receiver: Receiver } {
  if (input.receivedById) {
    const existing = state.receivers.find((item) => item.id === input.receivedById);
    if (existing) return { state, receiver: existing };
  }
  const name = canonicalReceiverName(input.receivedByName || DEFAULT_RECEIVER_NAME);
  const existing = state.receivers.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing) return { state, receiver: existing };
  const seeded = DEFAULT_RECEIVERS.find((item) => item.name === name);
  const receiver: Receiver = {
    id: seeded?.id ?? createId("recv"),
    createdAt: nowISO(),
    name,
    active: true,
  };
  return { state: { ...state, receivers: [...state.receivers, receiver] }, receiver };
}

function findClient(
  state: LedgerState,
  name: string,
  phone: string | null,
): { state: LedgerState; client: Client; isNew: boolean } {
  if (phone) {
    const existing = state.clients.find((client) => client.phone === phone);
    if (existing) return { state, client: existing, isNew: false };
  }
  const byName = state.clients.find(
    (client) => client.name.toLowerCase() === name.toLowerCase(),
  );
  if (byName) return { state, client: byName, isNew: false };

  const client: Client = {
    id: createId("client"),
    createdAt: nowISO(),
    name,
    phone,
    phoneMissing: !phone,
    notes: null,
  };
  return { state: { ...state, clients: [client, ...state.clients] }, client, isNew: true };
}

function relatedStayId(state: LedgerState, reviewId: string): string | null {
  const review = state.reviews.find((item) => item.id === reviewId);
  if (!review) return null;
  if (review.stayId) return review.stayId;
  const sibling = state.reviews.find(
    (item) =>
      item.id !== review.id &&
      item.sourceFile === review.sourceFile &&
      item.sourceSheet === review.sourceSheet &&
      item.sourceRow === review.sourceRow &&
      item.stayId,
  );
  return sibling?.stayId ?? null;
}

function setStayPending(state: LedgerState, stayId: string, active: boolean): LedgerState {
  return {
    ...state,
    stays: state.stays.map((stay) =>
      stay.id === stayId ? { ...stay, activePending: active, notifyEnabled: active } : stay,
    ),
  };
}

function addStayDiscount(state: LedgerState, stayId: string, amount: number, note: string): LedgerState {
  if (amount <= 0) return state;
  const stay = state.stays.find((item) => item.id === stayId);
  if (!stay) return state;
  const discount = {
    id: createId("disc"),
    stayId,
    clientId: stay.clientId,
    flatId: stay.flatId,
    amount,
    occurredAt: nowISO(),
    note,
  };
  return { ...state, discounts: [discount, ...state.discounts] };
}

function addStayRent(state: LedgerState, stayId: string, amount: number, note: string): LedgerState {
  if (amount <= 0) return state;
  const stay = state.stays.find((item) => item.id === stayId);
  if (!stay) return state;
  const rent = {
    id: createId("rent"),
    stayId,
    clientId: stay.clientId,
    flatId: stay.flatId,
    amount,
    occurredAt: nowISO(),
    note,
  };
  return { ...state, rentEntries: [rent, ...state.rentEntries] };
}

function targetRemaining(state: LedgerState, stayId: string, remaining: number): LedgerState {
  const current = stayRemaining(stayId, state);
  if (current === remaining) return state;
  if (current > remaining) return addStayDiscount(state, stayId, current - remaining, "Migration remaining fix");
  return addStayRent(state, stayId, remaining - current, "Migration remaining fix");
}

function applyMigrationPatch(
  state: LedgerState,
  reviewId: string,
  patch: MigrationPatch,
  correctionText?: string,
): LedgerState {
  const review = state.reviews.find((item) => item.id === reviewId);
  if (!review) return state;
  const stayId = relatedStayId(state, reviewId);
  const stay = stayId ? state.stays.find((item) => item.id === stayId) ?? null : null;
  let next = state;

  if (patch.ignore) {
    next = {
      ...next,
      reviews: next.reviews.map((item) =>
        item.id === reviewId
          ? {
              ...item,
              status: "IGNORED",
              lastQuickUpdate: patch.summary,
              currentInterpretation: "Ignored.",
              previousInterpretation: item.currentInterpretation,
              correctionText: correctionText ?? patch.summary,
              originalValue: item.originalValue ?? item.sourceText,
              updatedAt: nowISO(),
            }
          : item,
      ),
    };
    return withActivity(next, {
      action: "MIGRATION_UPDATED",
      entityType: "MigrationRecord",
      entityId: reviewId,
      summary: `Ignored ${review.customer ?? "row"} · ${review.flatName}`,
    });
  }

  if (patch.keepExpense && review.amount && review.proposedType !== "SUMMARY") {
    const already = next.expenses.some(
      (item) => item.notes === review.sourceText || item.description === review.sourceText,
    );
    if (!already) {
      const expense: Expense = {
        id: createId("exp"),
        createdAt: nowISO(),
        flatId: `flat_${review.flatName}`,
        amount: review.amount,
        category: "OTHER",
        description: review.customer ? `${review.customer} expense` : "Confirmed expense",
        method: patch.method ?? "OTHER",
        spentAt: review.date ? `${review.date}T00:00:00.000Z` : nowISO(),
        notes: review.sourceText,
      };
      next = { ...next, expenses: [expense, ...next.expenses] };
    }
  }

  if (stay) {
    if (patch.checkInText) {
      next = {
        ...next,
        stays: next.stays.map((item) =>
          item.id === stay.id ? { ...item, checkIn: `${patch.checkInText}T00:00:00.000Z` } : item,
        ),
      };
    }
    if (patch.checkOutText) {
      next = {
        ...next,
        stays: next.stays.map((item) =>
          item.id === stay.id ? { ...item, checkOut: `${patch.checkOutText}T00:00:00.000Z` } : item,
        ),
      };
    }
    if (patch.nights) {
      next = {
        ...next,
        stays: next.stays.map((item) => (item.id === stay.id ? { ...item, nights: patch.nights ?? item.nights } : item)),
      };
    }
    if (patch.rentAmount) {
      const existing = next.rentEntries.find((item) => item.stayId === stay.id);
      if (existing) {
        next = {
          ...next,
          rentEntries: next.rentEntries.map((item) =>
            item.id === existing.id ? { ...item, amount: patch.rentAmount ?? item.amount } : item,
          ),
        };
      } else {
        next = addStayRent(next, stay.id, patch.rentAmount, "Migration rent fix");
      }
    }
    if (patch.receiveAmount) {
      next = applyPayment(next, {
        clientId: stay.clientId,
        stayId: stay.id,
        amount: patch.receiveAmount,
        method: patch.method ?? "CASH",
      });
    }
    if (patch.alreadyPaid || patch.settlePending) {
      const leftover = stayRemaining(stay.id, next);
      if (leftover > 0) {
        next = applyPayment(next, {
          clientId: stay.clientId,
          stayId: stay.id,
          amount: leftover,
          method: patch.method ?? "OTHER",
        });
      }
      next = setStayPending(next, stay.id, false);
    }
    if (patch.remainingAmount !== undefined) {
      next = targetRemaining(next, stay.id, patch.remainingAmount);
      next = setStayPending(next, stay.id, patch.remainingAmount > 0 && (patch.stillPending ?? stay.activePending));
    }
    if (patch.stillPending) {
      next = setStayPending(next, stay.id, stayRemaining(stay.id, next) > 0);
    }
    if (patch.alreadyPaid || (patch.remainingAmount === 0 && !patch.stillPending)) {
      next = setStayPending(next, stay.id, false);
    }
  }

  const interpretation = [
    patch.summary,
    stay ? `Pending now ${formatPKR(stayRemaining(stay.id, next))}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  next = {
    ...next,
    reviews: next.reviews.map((item) =>
      item.id === reviewId
        ? {
            ...item,
            status: "CONFIRMED",
            lastQuickUpdate: patch.summary,
            currentInterpretation: interpretation,
            previousInterpretation: item.currentInterpretation,
            correctionText: correctionText ?? patch.summary,
            originalValue: item.originalValue ?? item.sourceText,
            updatedAt: nowISO(),
            pendingDecision: patch.stillPending
              ? "STILL_PENDING"
              : patch.alreadyPaid
                ? "ALREADY_PAID"
                : item.pendingDecision,
          }
        : item,
    ),
    auditLogs: [
      {
        id: createId("audit"),
        createdAt: nowISO(),
        action: "MIGRATION_QUICK_UPDATE",
        entityType: "MigrationRecord",
        entityId: reviewId,
        originalValue: review.sourceText,
        newValue: patch.summary,
        reason: "Migration Quick Update",
      },
      ...next.auditLogs,
    ],
  };

  return withActivity(next, {
    action: "MIGRATION_UPDATED",
    entityType: "MigrationRecord",
    entityId: reviewId,
    summary: `Updated ${review.customer ?? "row"} · Flat ${review.flatName}`,
  });
}

function openStayFor(state: LedgerState, clientId: string, flatName: string | null) {
  const open = state.stays
    .filter((stay) => stay.clientId === clientId && stayRemaining(stay.id, state) > 0)
    .filter((stay) => !flatName || stay.flatId === `flat_${flatName}`)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  return open ?? null;
}

function applyPayment(state: LedgerState, input: RecordPaymentInput): LedgerState {
  const foundReceiver = findReceiver(state, input);
  let next = foundReceiver.state;
  const receiver = foundReceiver.receiver;
  let stayId = input.stayId ?? null;
  if (!stayId) {
    stayId = openStayFor(next, input.clientId, null)?.id ?? null;
  }
  const stay = next.stays.find((item) => item.id === stayId);
  const payment: Payment = {
    id: createId("pay"),
    createdAt: nowISO(),
    stayId,
    clientId: input.clientId,
    flatId: stay?.flatId ?? null,
    amount: input.amount,
    method: input.method,
    receivedAt: nowISO(),
    notes: null,
    receivedById: receiver.id,
  };
  const client = next.clients.find((item) => item.id === input.clientId);
  const cycleDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  return withActivity(
    {
      ...next,
      payments: [payment, ...next.payments],
      reminderSilences: [
        { clientId: input.clientId, cycleDate },
        ...next.reminderSilences.filter(
          (item) => !(item.clientId === input.clientId && item.cycleDate === cycleDate),
        ),
      ],
    },
    {
      action: "PAYMENT_RECEIVED",
      entityType: "Payment",
      entityId: payment.id,
      summary: `Received ${formatPKR(input.amount)} from ${client?.name ?? "customer"}.`,
    },
  );
}

function withDefaultReceivers(state: LedgerState): LedgerState {
  const receivers = [...(state.receivers ?? [])];
  for (const seed of DEFAULT_RECEIVERS) {
    const exists = receivers.some(
      (item) => item.id === seed.id || item.name.toLowerCase() === seed.name.toLowerCase(),
    );
    if (!exists) receivers.push({ ...seed });
  }
  return { ...state, receivers };
}

function normalizeState(state: LedgerState): LedgerState {
  return withDefaultReceivers({
    ...state,
    stays: state.stays.map((stay) => ({
      ...stay,
      activePending: stay.activePending ?? false,
      notifyEnabled: stay.notifyEnabled ?? false,
    })),
    payments: state.payments.map((item) => ({
      ...item,
      receivedById: item.receivedById ?? "recv_anas",
    })),
    reviews: state.reviews.map((item) => ({
      ...item,
      month: item.month ?? item.sourceSheet,
      currentInterpretation: item.currentInterpretation ?? item.reason,
      lastQuickUpdate: item.lastQuickUpdate ?? null,
      originalValue: item.originalValue ?? item.sourceText,
      correctionText: item.correctionText ?? null,
      previousInterpretation: item.previousInterpretation ?? null,
      importedAt: item.importedAt ?? null,
      updatedAt: item.updatedAt ?? null,
    })),
  });
}

function reducer(state: LedgerState, action: Action): LedgerState {
  switch (action.type) {
    case "HYDRATE":
      return normalizeState(action.payload);
    case "RECORD_PAYMENT":
      return applyPayment(state, action.payload);
    case "ADD_EXPENSE": {
      const expense: Expense = {
        id: createId("exp"),
        createdAt: nowISO(),
        flatId: action.payload.flat ? `flat_${action.payload.flat}` : null,
        amount: action.payload.amount,
        category: action.payload.category,
        description: action.payload.description,
        method: action.payload.method,
        spentAt: nowISO(),
        notes: null,
      };
      return withActivity(
        { ...state, expenses: [expense, ...state.expenses] },
        {
          action: "EXPENSE_CREATED",
          entityType: "Expense",
          entityId: expense.id,
          summary: `${formatPKR(expense.amount)} expense · ${expense.description}`,
        },
      );
    }
    case "SET_CLIENT_PHONE":
      return {
        ...state,
        clients: state.clients.map((client) =>
          client.id === action.clientId
            ? {
                ...client,
                phone: normalizePhone(action.phone),
                phoneMissing: false,
              }
            : client,
        ),
      };
    case "RENAME_FLAT":
      return {
        ...state,
        flats: state.flats.map((flat) =>
          flat.id === action.flatId ? { ...flat, name: action.name } : flat,
        ),
      };
    case "APPLY_MIGRATION_UPDATE":
      return applyMigrationPatch(state, action.id, action.patch, action.correctionText);
    case "REVIEW_STATUS":
      return {
        ...state,
        reviews: state.reviews.map((item) =>
          item.id === action.id ? { ...item, status: action.status } : item,
        ),
      };
    case "REVIEW_PENDING": {
      const review = state.reviews.find((item) => item.id === action.id);
      let next: LedgerState = {
        ...state,
        reviews: state.reviews.map((item) =>
          item.id === action.id
            ? { ...item, pendingDecision: action.decision, status: "CONFIRMED" }
            : item,
        ),
        stays: state.stays.map((stay) => {
          if (!review || review.stayId !== stay.id) return stay;
          return {
            ...stay,
            notifyEnabled: action.decision === "STILL_PENDING",
            activePending: action.decision === "STILL_PENDING",
          };
        }),
      };
      if (action.decision === "ALREADY_PAID" && review?.stayId && review.amount) {
        const stay = next.stays.find((item) => item.id === review.stayId);
        if (stay) {
          next = applyPayment(next, {
            clientId: stay.clientId,
            stayId: stay.id,
            amount: review.amount,
            method: "OTHER",
          });
          next = {
            ...next,
            auditLogs: [
              {
                id: createId("audit"),
                createdAt: nowISO(),
                action: "TRANSACTION_CORRECTED",
                entityType: "Stay",
                entityId: stay.id,
                originalValue: "pending",
                newValue: "already_paid",
                reason: "Migration review: already paid",
              },
              ...next.auditLogs,
            ],
          };
        }
      }
      return next;
    }
    case "SILENCE_CLIENT":
      return {
        ...state,
        reminderSilences: [
          { clientId: action.clientId, cycleDate: action.cycleDate },
          ...state.reminderSilences.filter(
            (item) => !(item.clientId === action.clientId && item.cycleDate === action.cycleDate),
          ),
        ],
      };
    case "MARK_NIGHT_SUMMARY":
      return {
        ...state,
        nightSummaryDates: Array.from(new Set([...state.nightSummaryDates, action.cycleDate])),
      };
    case "APPLY_QUICK_ENTRY": {
      const parsed = action.parsed;
      if (parsed.type === "expense") {
        return reducer(state, {
          type: "ADD_EXPENSE",
          payload: parsed,
        });
      }
      if (parsed.type === "withdrawal") {
        const available = availableForWithdrawal(state);
        if (parsed.amount > available) return state;
        const withdrawal = {
          id: createId("wd"),
          amount: parsed.amount,
          occurredAt: nowISO(),
          note: parsed.note,
        };
        return withActivity(
          { ...state, withdrawals: [withdrawal, ...state.withdrawals] },
          {
            action: "ANAS_WITHDRAWAL",
            entityType: "Withdrawal",
            entityId: withdrawal.id,
            summary: `Anas withdrew ${formatPKR(parsed.amount)}.`,
          },
        );
      }

      const phone = parsed.type === "payment" || parsed.type === "rent" || parsed.type === "security"
        ? parsed.phone
        : "phone" in parsed
          ? parsed.phone
          : null;
      const name = "clientName" in parsed ? parsed.clientName : "";
      const found = findClient(state, name, phone);
      let next = found.state;
      const client = found.client;

      if (parsed.type === "payment") {
        const stay = openStayFor(next, client.id, parsed.flat);
        return applyPayment(next, {
          clientId: client.id,
          stayId: stay?.id ?? null,
          amount: parsed.amount,
          method: parsed.method,
          receivedByName: parsed.receivedByName,
        });
      }

      if (parsed.type === "security") {
        const stay = openStayFor(next, client.id, parsed.flat);
        const row = {
          id: createId("sec"),
          clientId: client.id,
          stayId: stay?.id ?? null,
          flatId: stay?.flatId ?? (parsed.flat ? `flat_${parsed.flat}` : null),
          kind: "RECEIVED" as const,
          amount: parsed.amount,
          occurredAt: nowISO(),
          notes: null,
        };
        return withActivity(
          { ...next, security: [row, ...next.security] },
          {
            action: "SECURITY_RECEIVED",
            entityType: "Security",
            entityId: row.id,
            summary: `Security ${formatPKR(parsed.amount)} from ${client.name}.`,
          },
        );
      }

      if (parsed.type === "security_adjustment") {
        const held = clientSecurityHeld(client.id, next);
        const amount = Math.min(parsed.amount, held);
        const stay = openStayFor(next, client.id, null);
        const row = {
          id: createId("sec"),
          clientId: client.id,
          stayId: stay?.id ?? null,
          flatId: stay?.flatId ?? null,
          kind: "ADJUSTED_TO_RENT" as const,
          amount,
          occurredAt: nowISO(),
          notes: "Security applied to rent. No new cash.",
        };
        return withActivity(
          { ...next, security: [row, ...next.security] },
          {
            action: "SECURITY_ADJUSTED",
            entityType: "Security",
            entityId: row.id,
            summary: `Applied ${formatPKR(amount)} security to rent for ${client.name}.`,
          },
        );
      }

      if (parsed.type === "discount") {
        const stay = openStayFor(next, client.id, null);
        if (!stay) return next;
        const discount = {
          id: createId("disc"),
          stayId: stay.id,
          clientId: client.id,
          flatId: stay.flatId,
          amount: parsed.amount,
          occurredAt: nowISO(),
          note: null,
        };
        return withActivity(
          { ...next, discounts: [discount, ...next.discounts] },
          {
            action: "DISCOUNT_ADDED",
            entityType: "Discount",
            entityId: discount.id,
            summary: `Discount ${formatPKR(parsed.amount)} for ${client.name}.`,
          },
        );
      }

      if (parsed.type === "extension") {
        const stay = openStayFor(next, client.id, parsed.flat);
        if (!stay) return next;
        const rent = {
          id: createId("rent"),
          stayId: stay.id,
          clientId: client.id,
          flatId: stay.flatId,
          amount: parsed.extraRevenue,
          occurredAt: nowISO(),
          note: `Extended ${parsed.extraNights} days`,
        };
        return withActivity(
          {
            ...next,
            stays: next.stays.map((item) =>
              item.id === stay.id
                ? {
                    ...item,
                    nights: item.nights + parsed.extraNights,
                    checkOut: addDays(new Date(item.checkOut), parsed.extraNights).toISOString(),
                  }
                : item,
            ),
            rentEntries: [rent, ...next.rentEntries],
          },
          {
            action: "STAY_EXTENDED",
            entityType: "Stay",
            entityId: stay.id,
            summary: `Extended ${client.name} by ${parsed.extraNights} days.`,
          },
        );
      }

      if (parsed.type === "rent") {
        const stayId = createId("stay");
        const flatId = parsed.flat ? `flat_${parsed.flat}` : next.flats[0]?.id;
        if (!flatId) return next;
        const stay = {
          id: stayId,
          createdAt: nowISO(),
          flatId,
          clientId: client.id,
          checkIn: asDate(parsed.checkIn).toISOString(),
          checkOut: asDate(parsed.checkOut).toISOString(),
          nights: parsed.nights,
          notifyEnabled: parsed.remaining > 0,
          activePending: parsed.remaining > 0,
          importKey: null,
        };
        const rent = {
          id: createId("rent"),
          stayId,
          clientId: client.id,
          flatId,
          amount: parsed.totalAmount,
          occurredAt: asDate(parsed.checkIn).toISOString(),
          note: null,
        };
        next = {
          ...next,
          stays: [stay, ...next.stays],
          rentEntries: [rent, ...next.rentEntries],
        };
        next = withActivity(next, {
          action: "RENT_CREATED",
          entityType: "Stay",
          entityId: stayId,
          summary: `Rent ${formatPKR(parsed.totalAmount)} for ${client.name}.`,
        });
        if (parsed.receivedAmount > 0) {
          next = applyPayment(next, {
            clientId: client.id,
            stayId,
            amount: parsed.receivedAmount,
            method: parsed.method,
            receivedByName: parsed.receivedByName,
          });
        }
        return next;
      }

      return next;
    }
    default:
      return state;
  }
}

export function reviveAction(action: Action): Action {
  if (action.type !== "APPLY_QUICK_ENTRY" || action.parsed.type !== "rent") return action;
  return {
    ...action,
    parsed: {
      ...action.parsed,
      checkIn: asDate(action.parsed.checkIn),
      checkOut: asDate(action.parsed.checkOut),
    },
  };
}

export { normalizeState, reducer };
