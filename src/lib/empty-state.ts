import { DEFAULT_RECEIVERS } from "@/lib/receivers";
import { FLAT_NAMES } from "@/types";
import type { LedgerState } from "@/types";

export function emptyLedgerState(): LedgerState {
  return {
    flats: FLAT_NAMES.map((name, index) => ({
      id: `flat_${name}`,
      name,
      sortOrder: index + 1,
    })),
    receivers: DEFAULT_RECEIVERS.map((item) => ({ ...item })),
    clients: [],
    stays: [],
    rentEntries: [],
    payments: [],
    expenses: [],
    security: [],
    discounts: [],
    withdrawals: [],
    reviews: [],
    activityLogs: [],
    auditLogs: [],
    reminderSilences: [],
    nightSummaryDates: [],
    monthlyReports: [],
    receipts: [],
  };
}
