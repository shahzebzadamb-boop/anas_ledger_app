import { formatMonthLabel, karachiMonthRange, karachiYmd } from "@/lib/dates";
import { isLive, isStayPendingActive, stayLedgerRowFor, stayRemaining, type StayLedgerRow } from "@/lib/ledger";
import { stayBalanceAsOf, stayOriginAt } from "@/lib/month-accounting";
import type { LedgerState, Stay } from "@/types";

export type PuranaMonthGroup = {
  year: number;
  month: number;
  label: string;
  totalOutstanding: number;
  rows: StayLedgerRow[];
};

function matchesFlat(flatId: string | null | undefined, selected: string): boolean {
  if (selected === "all") return true;
  return flatId === `flat_${selected}` || flatId === selected;
}

function monthBefore(
  a: { year: number; month: number },
  b: { year: number; month: number },
): boolean {
  return a.year < b.year || (a.year === b.year && a.month < b.month);
}

export function stayOriginMonth(stay: Stay, state: LedgerState): { year: number; month: number } {
  return karachiYmd(new Date(stayOriginAt(stay, state)));
}

export function isPuranaOutstanding(stay: Stay, state: LedgerState, now = new Date()): boolean {
  if (!isLive(stay)) return false;
  const today = karachiYmd(now);
  const origin = stayOriginMonth(stay, state);
  if (!monthBefore(origin, today)) return false;
  return isStayPendingActive(stay, state);
}

export function isPuranaSettled(stay: Stay, state: LedgerState, now = new Date()): boolean {
  if (!isLive(stay)) return false;
  const today = karachiYmd(now);
  const origin = stayOriginMonth(stay, state);
  if (!monthBefore(origin, today)) return false;
  if (stayRemaining(stay.id, state) > 0) return false;
  const originEnd = karachiMonthRange(origin.year, origin.month).to;
  return stayBalanceAsOf(stay.id, state, originEnd) > 0;
}

export function listPuranaMonths(
  state: LedgerState,
  opts?: { showSettled?: boolean; now?: Date },
): { year: number; month: number }[] {
  const now = opts?.now ?? new Date();
  const keys = new Set<string>();
  const months: { year: number; month: number }[] = [];
  for (const stay of state.stays) {
    const include = isPuranaOutstanding(stay, state, now) || (opts?.showSettled && isPuranaSettled(stay, state, now));
    if (!include) continue;
    const origin = stayOriginMonth(stay, state);
    const key = `${origin.year}-${origin.month}`;
    if (keys.has(key)) continue;
    keys.add(key);
    months.push(origin);
  }
  return months.sort((a, b) => b.year - a.year || b.month - a.month);
}

export function puranaKhataGroups(
  state: LedgerState,
  opts?: {
    clientId?: string | null;
    selectedFlat?: string;
    originYear?: number | null;
    originMonth?: number | null;
    showSettled?: boolean;
    now?: Date;
  },
): PuranaMonthGroup[] {
  const now = opts?.now ?? new Date();
  const selectedFlat = opts?.selectedFlat ?? "all";
  const grouped = new Map<string, PuranaMonthGroup>();

  for (const stay of state.stays) {
    if (opts?.clientId && stay.clientId !== opts.clientId) continue;
    if (!matchesFlat(stay.flatId, selectedFlat)) continue;
    const outstanding = isPuranaOutstanding(stay, state, now);
    const settled = opts?.showSettled ? isPuranaSettled(stay, state, now) : false;
    if (!outstanding && !settled) continue;
    const origin = stayOriginMonth(stay, state);
    if (opts?.originYear && opts?.originMonth) {
      if (origin.year !== opts.originYear || origin.month !== opts.originMonth) continue;
    }
    const key = `${origin.year}-${origin.month}`;
    const row = stayLedgerRowFor(stay, state);
    const existing = grouped.get(key);
    if (existing) {
      existing.rows.push(row);
      existing.totalOutstanding += Math.max(0, row.pending);
    } else {
      grouped.set(key, {
        year: origin.year,
        month: origin.month,
        label: formatMonthLabel(origin.year, origin.month),
        totalOutstanding: Math.max(0, row.pending),
        rows: [row],
      });
    }
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => {
        if (a.pending !== b.pending) return b.pending - a.pending;
        return a.clientName.localeCompare(b.clientName);
      }),
    }))
    .sort((a, b) => b.year - a.year || b.month - a.month);
}
