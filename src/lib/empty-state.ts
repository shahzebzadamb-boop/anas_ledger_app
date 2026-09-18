import { FLAT_NAMES } from "@/types";
import type { LedgerState } from "@/types";

export function emptyLedgerState(): LedgerState {
  return {
    flats: FLAT_NAMES.map((name, index) => ({
      id: `flat_${name}`,
      name,
      sortOrder: index + 1,
    })),
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
  };
}
