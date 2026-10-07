import { formatMonthLabel, karachiMonthRange, karachiYmd } from "@/lib/dates";
import { isLive } from "@/lib/ledger";
import { listReportMonths, pendingCollectedFromRange, periodExpenses, periodReceived } from "@/lib/month-accounting";
import {
  liveAssignmentsForFlatMonth,
  livePartnerPayments,
  partnerNameById,
  splitNetCash,
} from "@/lib/partners";
import type { LedgerState, PartnerPayment } from "@/types";

export type AllocationLine = {
  partnerId: string | null;
  partnerName: string;
  sharePercent: number;
  amount: number;
  paid: number;
  remaining: number;
  overpaid: number;
};

export type FlatMonthEarnings = {
  flatId: string;
  flatName: string;
  cashReceived: number;
  puranaRecovered: number;
  expenses: number;
  netCashProfit: number;
  allocations: AllocationLine[];
};

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
  allocations: AllocationLine[];
  partnerPaid: number;
  partnerRemaining: number;
  flats: FlatMonthEarnings[];
  payments: PartnerPayment[];
};

function partnerPaidMap(state: LedgerState, year: number, month: number): Map<string, number> {
  const paid = new Map<string, number>();
  for (const item of livePartnerPayments(state, year, month)) {
    paid.set(item.partnerId, (paid.get(item.partnerId) ?? 0) + item.amount);
  }
  return paid;
}

function withPaid(lines: Omit<AllocationLine, "paid" | "remaining" | "overpaid">[], paid: Map<string, number>): AllocationLine[] {
  return lines.map((line) => {
    const received = line.partnerId ? (paid.get(line.partnerId) ?? 0) : 0;
    const difference = line.amount - received;
    return {
      ...line,
      paid: line.partnerId ? received : 0,
      remaining: line.partnerId ? Math.max(0, difference) : 0,
      overpaid: line.partnerId ? Math.max(0, -difference) : 0,
    };
  });
}

export function monthEarnings(state: LedgerState, year: number, month: number, now = new Date()): MonthEarnings {
  const range = karachiMonthRange(year, month);
  const today = karachiYmd(now);
  const totalCashReceived = periodReceived(state, range);
  const puranaRecovered = pendingCollectedFromRange(state, range);
  const currentReceived = Math.max(0, totalCashReceived - puranaRecovered);
  const expenses = periodExpenses(state, range);
  const netCashProfit = totalCashReceived - expenses;
  const paid = partnerPaidMap(state, year, month);
  const partnerExpected = new Map<string, { name: string; amount: number }>();

  const flats: FlatMonthEarnings[] = state.flats.map((flat) => {
    const cashReceived = periodReceived(state, range, flat.name);
    const flatPurana = pendingCollectedFromRange(state, range, flat.name);
    const flatExpenses = periodExpenses(state, range, flat.name);
    const flatNet = cashReceived - flatExpenses;
    const assignments = liveAssignmentsForFlatMonth(state, flat.id, year, month);
    const split = splitNetCash(
      flatNet,
      assignments.map((item) => ({ partnerId: item.partnerId, sharePercent: item.sharePercent })),
    );
    for (const item of split.partners) {
      const prev = partnerExpected.get(item.partnerId);
      partnerExpected.set(item.partnerId, {
        name: partnerNameById(state, item.partnerId),
        amount: (prev?.amount ?? 0) + item.amount,
      });
    }
    const allocationBase = [
      ...split.partners.map((item) => ({
        partnerId: item.partnerId,
        partnerName: partnerNameById(state, item.partnerId),
        sharePercent: item.sharePercent,
        amount: item.amount,
      })),
      {
        partnerId: null,
        partnerName: "Anas",
        sharePercent: split.anasPercent,
        amount: split.anasAmount,
      },
    ];
    return {
      flatId: flat.id,
      flatName: flat.name,
      cashReceived,
      puranaRecovered: flatPurana,
      expenses: flatExpenses,
      netCashProfit: flatNet,
      allocations: withPaid(allocationBase, new Map()),
    };
  });

  const partnerLines = [...partnerExpected.entries()]
    .map(([partnerId, item]) => ({
      partnerId,
      partnerName: item.name,
      sharePercent: 0,
      amount: item.amount,
    }))
    .sort((a, b) => a.partnerName.localeCompare(b.partnerName));
  const partnerAllocated = partnerLines.reduce((sum, item) => sum + item.amount, 0);
  const allocations = withPaid(
    [
      ...partnerLines,
      {
        partnerId: null,
        partnerName: "Anas",
        sharePercent: 0,
        amount: netCashProfit - partnerAllocated,
      },
    ],
    paid,
  );

  const payments = livePartnerPayments(state, year, month);
  const partnerPaid = payments.reduce((sum, item) => sum + item.amount, 0);
  const partnerRemaining = allocations
    .filter((item) => item.partnerId)
    .reduce((sum, item) => sum + item.remaining, 0);

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
    allocations,
    partnerPaid,
    partnerRemaining,
    flats,
    payments,
  };
}

export function listEarningMonths(
  state: LedgerState,
  now = new Date(),
): { year: number; month: number; live: boolean }[] {
  const today = karachiYmd(now);
  const months = listReportMonths(state, now);
  const keys = new Set(months.map((item) => `${item.year}-${item.month}`));
  if (!keys.has(`${today.year}-${today.month}`)) {
    keys.add(`${today.year}-${today.month}`);
    months.push({ year: today.year, month: today.month, live: true });
  }
  for (const item of state.partnerPayments ?? []) {
    const key = `${item.profitYear}-${item.profitMonth}`;
    if (keys.has(key)) continue;
    keys.add(key);
    months.push({ year: item.profitYear, month: item.profitMonth, live: false });
  }
  for (const item of state.profitSharePayments ?? []) {
    const key = `${item.profitYear}-${item.profitMonth}`;
    if (keys.has(key)) continue;
    keys.add(key);
    months.push({ year: item.profitYear, month: item.profitMonth, live: false });
  }
  return months.sort((a, b) => b.year - a.year || b.month - a.month);
}

export function partnerLifetime(state: LedgerState, partnerId: string, now = new Date()) {
  let expected = 0;
  let paid = 0;
  const monthly = listEarningMonths(state, now).map((item) => {
    const month = monthEarnings(state, item.year, item.month, now);
    const line = month.allocations.find((row) => row.partnerId === partnerId);
    expected += line?.amount ?? 0;
    paid += line?.paid ?? 0;
    return {
      year: item.year,
      month: item.month,
      label: month.label,
      expected: line?.amount ?? 0,
      paid: line?.paid ?? 0,
      remaining: line?.remaining ?? 0,
    };
  });
  return {
    expected,
    paid,
    outstanding: Math.max(0, expected - paid),
    monthly,
  };
}

export function allPartnerPayments(state: LedgerState): PartnerPayment[] {
  return (state.partnerPayments ?? [])
    .filter((item) => isLive(item))
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.createdAt.localeCompare(a.createdAt));
}
