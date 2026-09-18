"use client";

import { addDays, startOfDay } from "date-fns";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { createDemoData } from "@/data/demo";
import { toISO } from "@/lib/dates";
import {
  computeReceivableStatus,
  remainingForReceivable,
} from "@/lib/ledger";
import { formatPKR } from "@/lib/money";
import type { ExpenseDraft, PaymentDraft, RentDraft } from "@/lib/parse-quick-entry";
import { createId } from "@/lib/utils";
import type {
  Expense,
  ExpenseCategory,
  LedgerState,
  Payment,
  PaymentMethod,
} from "@/types";

type RecordPaymentInput = {
  clientId: string;
  receivableId?: string | null;
  amount: number;
  method: PaymentMethod;
  notes?: string | null;
};

type AddExpenseInput = {
  amount: number;
  category: ExpenseCategory;
  description: string;
  method: PaymentMethod;
  flat?: string | null;
  notes?: string | null;
};

type Action =
  | { type: "HYDRATE"; payload: LedgerState }
  | { type: "RECORD_PAYMENT"; payload: RecordPaymentInput }
  | { type: "ADD_EXPENSE"; payload: AddExpenseInput }
  | { type: "SNOOZE_RECEIVABLE"; receivableId: string }
  | { type: "APPLY_QUICK_ENTRY"; parsed: RentDraft | PaymentDraft | ExpenseDraft }
  | { type: "MARK_NOTIFICATION_READ"; id: string };

const emptyLedger: LedgerState = {
  clients: [],
  receivables: [],
  payments: [],
  expenses: [],
  reminders: [],
  notifications: [],
  auditLogs: [],
};

function nowISO() {
  return toISO(new Date());
}

function refreshStatuses(state: LedgerState): LedgerState {
  return {
    ...state,
    receivables: state.receivables.map((item) => ({
      ...item,
      status: computeReceivableStatus(item, state.payments),
    })),
  };
}

function withAudit(
  state: LedgerState,
  entry: Omit<LedgerState["auditLogs"][number], "id" | "createdAt">,
): LedgerState {
  return {
    ...state,
    auditLogs: [
      {
        id: createId("aud"),
        createdAt: nowISO(),
        ...entry,
      },
      ...state.auditLogs,
    ],
  };
}

function withNotification(
  state: LedgerState,
  entry: Omit<LedgerState["notifications"][number], "id" | "createdAt" | "isRead">,
): LedgerState {
  return {
    ...state,
    notifications: [
      {
        id: createId("ntf"),
        createdAt: nowISO(),
        isRead: false,
        ...entry,
      },
      ...state.notifications,
    ],
  };
}

function findOrCreateClient(state: LedgerState, name: string) {
  const existing = state.clients.find(
    (client) => client.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return { state, client: existing };

  const client = {
    id: createId("client"),
    createdAt: nowISO(),
    name,
    phone: null,
    notes: null,
  };

  return {
    state: { ...state, clients: [client, ...state.clients] },
    client,
  };
}

function applyPayment(state: LedgerState, input: RecordPaymentInput): LedgerState {
  let receivableId = input.receivableId ?? null;
  if (!receivableId) {
    const open = state.receivables
      .filter((item) => item.clientId === input.clientId)
      .filter((item) => remainingForReceivable(item, state.payments) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    receivableId = open?.id ?? null;
  }

  const payment: Payment = {
    id: createId("pay"),
    createdAt: nowISO(),
    receivedAt: nowISO(),
    clientId: input.clientId,
    receivableId,
    amount: input.amount,
    method: input.method,
    kind: "RECEIVED",
    notes: input.notes ?? null,
  };

  const client = state.clients.find((item) => item.id === input.clientId);
  let next = {
    ...state,
    payments: [payment, ...state.payments],
  };
  next = refreshStatuses(next);
  next = withAudit(next, {
    action: "RECORD_PAYMENT",
    entityType: "Payment",
    entityId: payment.id,
    summary: `Recorded ${formatPKR(input.amount)} from ${client?.name ?? "client"}.`,
  });
  next = withNotification(next, {
    type: "PAYMENT_RECEIVED",
    title: `Payment received${client ? ` from ${client.name}` : ""}`,
    body: `${formatPKR(input.amount)} recorded.`,
    clientId: input.clientId,
    receivableId,
  });
  return next;
}

function applyExpense(state: LedgerState, input: AddExpenseInput): LedgerState {
  const expense: Expense = {
    id: createId("exp"),
    createdAt: nowISO(),
    spentAt: nowISO(),
    amount: input.amount,
    category: input.category,
    description: input.description,
    method: input.method,
    flat: input.flat ?? null,
    notes: input.notes ?? null,
  };

  let next = { ...state, expenses: [expense, ...state.expenses] };
  next = withAudit(next, {
    action: "ADD_EXPENSE",
    entityType: "Expense",
    entityId: expense.id,
    summary: `Logged ${formatPKR(input.amount)} expense for ${input.description}.`,
  });
  next = withNotification(next, {
    type: "EXPENSE",
    title: "Expense recorded",
    body: `${formatPKR(input.amount)} — ${input.description}`,
    clientId: null,
    receivableId: null,
  });
  return next;
}

function reducer(state: LedgerState, action: Action): LedgerState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "RECORD_PAYMENT":
      return applyPayment(state, action.payload);
    case "ADD_EXPENSE":
      return applyExpense(state, action.payload);
    case "SNOOZE_RECEIVABLE": {
      const until = addDays(startOfDay(new Date()), 2);
      const receivable = state.receivables.find((item) => item.id === action.receivableId);
      if (!receivable) return state;
      let next: LedgerState = {
        ...state,
        receivables: state.receivables.map((item) =>
          item.id === action.receivableId
            ? { ...item, snoozedUntil: toISO(until) }
            : item,
        ),
        reminders: [
          {
            id: createId("rem"),
            createdAt: nowISO(),
            clientId: receivable.clientId,
            receivableId: receivable.id,
            dueDate: receivable.dueDate,
            snoozedUntil: toISO(until),
            note: "Reminded later from Needs Attention.",
          },
          ...state.reminders,
        ],
      };
      next = withAudit(next, {
        action: "SNOOZE",
        entityType: "Receivable",
        entityId: receivable.id,
        summary: "Snoozed a client balance reminder for 2 days.",
      });
      return next;
    }
    case "APPLY_QUICK_ENTRY": {
      const parsed = action.parsed;
      if (parsed.type === "expense") {
        return applyExpense(state, parsed);
      }

      const created = findOrCreateClient(state, parsed.clientName);
      let next = created.state;
      const client = created.client;

      if (parsed.type === "payment") {
        return applyPayment(next, {
          clientId: client.id,
          amount: parsed.amount,
          method: parsed.method,
        });
      }

      const receivable = {
        id: createId("recv"),
        createdAt: nowISO(),
        clientId: client.id,
        totalAmount: parsed.totalAmount,
        description: parsed.description,
        flat: parsed.flat,
        dueDate: toISO(parsed.dueDate),
        status: "PENDING" as const,
        notes: null,
        snoozedUntil: null,
      };

      next = {
        ...next,
        receivables: [receivable, ...next.receivables],
      };
      next = withAudit(next, {
        action: "CREATE_RECEIVABLE",
        entityType: "Receivable",
        entityId: receivable.id,
        summary: `Created ${formatPKR(parsed.totalAmount)} rent for ${client.name}.`,
      });

      if (parsed.receivedAmount > 0) {
        next = applyPayment(next, {
          clientId: client.id,
          receivableId: receivable.id,
          amount: parsed.receivedAmount,
          method: parsed.method,
        });
      }

      return refreshStatuses(next);
    }
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.id ? { ...item, isRead: true } : item,
        ),
      };
    default:
      return state;
  }
}

const LedgerContext = createContext<{
  state: LedgerState;
  dispatch: Dispatch<Action>;
  ready: boolean;
} | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, emptyLedger);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: refreshStatuses(createDemoData()) });
    setReady(true);
  }, []);

  const value = useMemo(() => ({ state, dispatch, ready }), [state, ready]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error("useLedger must be used within LedgerProvider");
  }
  return context;
}
