import { formatMonthLabel, karachiMonthRange, karachiYmd } from "@/lib/dates";
import { isLive } from "@/lib/ledger";
import { listReportMonths, pendingCollectedFromRange, periodExpenses, periodReceived } from "@/lib/month-accounting";
import type { LedgerState, ProfitSharePayment } from "@/types";

export const KHIZER_PARTNER = "Khizer";

export function split5050(net: number): { anasShare: number; khizerShare: number } {
  const khizerShare = Math.floor(net / 2);
  return { anasShare: net - khizerShare, khizerShare };
}

export function liveKhizerPayments(
  state: LedgerState,
  year: number,
  month: number,
): ProfitSharePayment[] {
  return (state.profitSharePayments ?? [])
    .filter(
      (item) =>
        isLive(item) &&
        item.profitYear === year &&
        item.profitMonth === month &&
        item.partnerName === KHIZER_PARTNER,
    )
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.createdAt.localeCompare(b.createdAt));
}

export type MonthEarnings = {
  year: number;
  month: number;
  label: string;
  live: boolean;
  currentReceived: number;
  puranaRecovered: number;
  totalCashReceived: number;
  expenses: number;
  netCashProfit: number;
  anasShare: number;
  khizerShare: number;
  khizerPaid: number;
  stillOwed: number;
  overpaid: number;
  payments: ProfitSharePayment[];
};

export function monthEarnings(state: LedgerState, year: number, month: number, now = new Date()): MonthEarnings {
  const range = karachiMonthRange(year, month);
  const today = karachiYmd(now);
  const totalCashReceived = periodReceived(state, range);
  const puranaRecovered = pendingCollectedFromRange(state, range);
  const currentReceived = Math.max(0, totalCashReceived - puranaRecovered);
  const expenses = periodExpenses(state, range);
  const netCashProfit = totalCashReceived - expenses;
  const { anasShare, khizerShare } = split5050(netCashProfit);
  const payments = liveKhizerPayments(state, year, month);
  const khizerPaid = payments.reduce((sum, item) => sum + item.amount, 0);
  const difference = khizerShare - khizerPaid;
  return {
    year,
    month,
    label: formatMonthLabel(year, month),
    live: year === today.year && month === today.month,
    currentReceived,
    puranaRecovered,
    totalCashReceived,
    expenses,
    netCashProfit,
    anasShare,
    khizerShare,
    khizerPaid,
    stillOwed: Math.max(0, difference),
    overpaid: Math.max(0, -difference),
    payments,
  };
}

export function listEarningMonths(state: LedgerState, now = new Date()): { year: number; month: number; live: boolean }[] {
  const months = listReportMonths(state, now);
  const keys = new Set(months.map((item) => `${item.year}-${item.month}`));
  for (const item of state.profitSharePayments ?? []) {
    const key = `${item.profitYear}-${item.profitMonth}`;
    if (keys.has(key)) continue;
    keys.add(key);
    months.push({ year: item.profitYear, month: item.profitMonth, live: false });
  }
  return months.sort((a, b) => b.year - a.year || b.month - a.month);
}
