export type PaymentMethod =
  | "CASH"
  | "EASYPAISA"
  | "BANK_TRANSFER"
  | "JAZZCASH"
  | "OTHER";

export type PaymentKind = "RECEIVED" | "REFUND";

export type ReceivableStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type ExpenseCategory =
  | "SUPPLIES"
  | "MAINTENANCE"
  | "UTILITIES"
  | "LABOR"
  | "TRANSPORT"
  | "OTHER";

export type NotificationType =
  | "OVERDUE"
  | "DUE_TODAY"
  | "DUE_TOMORROW"
  | "PAYMENT_RECEIVED"
  | "EXPENSE"
  | "SYSTEM";

export type DateFilterPreset = "today" | "7days" | "month" | "custom";

export type DateRange = {
  from: Date;
  to: Date;
};

export type Client = {
  id: string;
  createdAt: string;
  name: string;
  phone: string | null;
  notes: string | null;
};

export type Receivable = {
  id: string;
  createdAt: string;
  clientId: string;
  totalAmount: number;
  description: string;
  flat: string | null;
  dueDate: string;
  status: ReceivableStatus;
  notes: string | null;
  snoozedUntil: string | null;
};

export type Payment = {
  id: string;
  createdAt: string;
  receivedAt: string;
  clientId: string;
  receivableId: string | null;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  notes: string | null;
};

export type Expense = {
  id: string;
  createdAt: string;
  spentAt: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  method: PaymentMethod;
  flat: string | null;
  notes: string | null;
};

export type Reminder = {
  id: string;
  createdAt: string;
  clientId: string;
  receivableId: string | null;
  dueDate: string;
  snoozedUntil: string | null;
  note: string | null;
};

export type AppNotification = {
  id: string;
  createdAt: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  clientId: string | null;
  receivableId: string | null;
};

export type AuditLog = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
};

export type LedgerState = {
  clients: Client[];
  receivables: Receivable[];
  payments: Payment[];
  expenses: Expense[];
  reminders: Reminder[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
};

export type AttentionUrgency = "overdue" | "today" | "tomorrow";

export type AttentionItem = {
  receivableId: string;
  clientId: string;
  clientName: string;
  phone: string | null;
  remaining: number;
  dueDate: string;
  overdueDays: number;
  flat: string | null;
  urgency: AttentionUrgency;
  description: string;
};

export type DashboardTotals = {
  received: number;
  pending: number;
  expenses: number;
  refunds: number;
  netCash: number;
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "SUPPLIES", label: "Supplies" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "LABOR", label: "Labor" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "OTHER", label: "Other" },
];
