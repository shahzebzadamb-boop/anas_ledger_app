import { addCalendarDays, karachiMonthRange, karachiStartOfDay, karachiYmd, pad2 } from "@/lib/dates";
import { isLive } from "@/lib/ledger";
import type { DateRange, LedgerState, Partner, PartnerAssignment, PartnerPayment } from "@/types";

export const SHARE_EXCEED_ERROR = "Partner shares cannot exceed 100%";
export const KHIZER_PARTNER_NAME = "Khizer";
export const KHIZER_PARTNER_ID = "partner_khizer";

export function isAnasName(name: string): boolean {
  return name.trim().toLowerCase() === "anas";
}

export function ymdKeyFromIso(iso: string): string {
  const ymd = karachiYmd(new Date(iso));
  return `${ymd.year}-${pad2(ymd.month)}-${pad2(ymd.day)}`;
}

export function isoFromYmdKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return karachiStartOfDay(year, month, day).toISOString();
}

export function dayBeforeIso(iso: string): string {
  const ymd = karachiYmd(new Date(iso));
  const prev = addCalendarDays(ymd.year, ymd.month, ymd.day, -1);
  return karachiStartOfDay(prev.year, prev.month, prev.day).toISOString();
}

export function findPartnerByName(state: LedgerState, name: string): Partner | undefined {
  const needle = name.trim().toLowerCase();
  return (state.partners ?? []).find((item) => item.name.trim().toLowerCase() === needle);
}

export function khizerPartner(state: LedgerState): Partner | undefined {
  return (state.partners ?? []).find((item) => item.id === KHIZER_PARTNER_ID) ?? findPartnerByName(state, KHIZER_PARTNER_NAME);
}

export function seedKhizerPartner(now = new Date().toISOString()): Partner {
  return {
    id: KHIZER_PARTNER_ID,
    name: KHIZER_PARTNER_NAME,
    phone: null,
    notes: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function assignmentCoversRange(assignment: PartnerAssignment, range: DateRange): boolean {
  if (assignment.voided) return false;
  if (new Date(assignment.effectiveFrom) > range.to) return false;
  if (assignment.effectiveUntil && new Date(assignment.effectiveUntil) < range.from) return false;
  return true;
}

function assignmentCoversYmd(assignment: PartnerAssignment, day: string): boolean {
  if (assignment.voided) return false;
  const from = ymdKeyFromIso(assignment.effectiveFrom);
  const until = assignment.effectiveUntil ? ymdKeyFromIso(assignment.effectiveUntil) : "9999-12-31";
  return from <= day && day <= until;
}

function preferLaterAssignment(current: PartnerAssignment | undefined, next: PartnerAssignment): PartnerAssignment {
  if (!current) return next;
  if (next.effectiveFrom > current.effectiveFrom) return next;
  if (next.effectiveFrom === current.effectiveFrom && next.createdAt > current.createdAt) return next;
  return current;
}

export function liveAssignmentsForFlatMonth(
  state: LedgerState,
  flatId: string,
  year: number,
  month: number,
): PartnerAssignment[] {
  const range = karachiMonthRange(year, month);
  const covering = (state.partnerAssignments ?? []).filter(
    (item) => item.flatId === flatId && assignmentCoversRange(item, range),
  );
  const best = new Map<string, PartnerAssignment>();
  for (const item of covering) {
    best.set(item.partnerId, preferLaterAssignment(best.get(item.partnerId), item));
  }
  return [...best.values()];
}

export function currentAssignmentsForPartner(state: LedgerState, partnerId: string, now = new Date()): PartnerAssignment[] {
  const today = karachiYmd(now);
  const range = {
    from: karachiStartOfDay(today.year, today.month, today.day),
    to: karachiStartOfDay(today.year, today.month, today.day),
  };
  return (state.partnerAssignments ?? []).filter(
    (item) => item.partnerId === partnerId && assignmentCoversRange(item, range),
  );
}

export function partnerApartmentCount(state: LedgerState, partnerId: string, now = new Date()): number {
  return new Set(currentAssignmentsForPartner(state, partnerId, now).map((item) => item.flatId)).size;
}

export function partnerHasSettlementHistory(state: LedgerState, partnerId: string): boolean {
  if ((state.partnerPayments ?? []).some((item) => item.partnerId === partnerId)) return true;
  const partner = (state.partners ?? []).find((item) => item.id === partnerId);
  if (!partner) return false;
  return (state.profitSharePayments ?? []).some((item) => item.partnerName === partner.name);
}

export function livePartnerPayments(state: LedgerState, year?: number, month?: number, partnerId?: string): PartnerPayment[] {
  return (state.partnerPayments ?? [])
    .filter((item) => {
      if (!isLive(item)) return false;
      if (year != null && item.profitYear !== year) return false;
      if (month != null && item.profitMonth !== month) return false;
      if (partnerId && item.partnerId !== partnerId) return false;
      return true;
    })
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.createdAt.localeCompare(b.createdAt));
}

export function splitNetCash(
  net: number,
  shares: { partnerId: string; sharePercent: number }[],
): { partners: { partnerId: string; sharePercent: number; amount: number }[]; anasAmount: number; anasPercent: number } {
  const partners = shares.map((item) => ({
    partnerId: item.partnerId,
    sharePercent: item.sharePercent,
    amount: Math.floor((net * item.sharePercent) / 100),
  }));
  const partnerTotal = partners.reduce((sum, item) => sum + item.amount, 0);
  const anasPercent = Math.max(0, 100 - shares.reduce((sum, item) => sum + item.sharePercent, 0));
  return {
    partners,
    anasAmount: net - partnerTotal,
    anasPercent,
  };
}

function nextYmdKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const next = addCalendarDays(year, month, day, 1);
  return `${next.year}-${pad2(next.month)}-${pad2(next.day)}`;
}

export function validateAssignmentShares(
  state: LedgerState,
  input: {
    flatId: string;
    partnerId: string;
    sharePercent: number;
    effectiveFrom: string;
    effectiveUntil?: string | null;
    excludeId?: string;
  },
): string | null {
  if (!Number.isInteger(input.sharePercent) || input.sharePercent < 1 || input.sharePercent > 100) {
    return "Share must be a whole number from 1 to 100.";
  }
  if (input.effectiveUntil && ymdKeyFromIso(input.effectiveUntil) < ymdKeyFromIso(input.effectiveFrom)) {
    return "End date cannot be before the start date.";
  }

  const proposed: PartnerAssignment = {
    id: input.excludeId ?? "__proposed__",
    partnerId: input.partnerId,
    flatId: input.flatId,
    sharePercent: input.sharePercent,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil ?? null,
    createdAt: "9999-12-31T00:00:00.000Z",
    updatedAt: "9999-12-31T00:00:00.000Z",
    voided: false,
  };

  const live = (state.partnerAssignments ?? []).filter(
    (item) => !item.voided && item.flatId === input.flatId && item.id !== input.excludeId,
  );
  const fromKey = ymdKeyFromIso(input.effectiveFrom);
  const untilKey = input.effectiveUntil ? ymdKeyFromIso(input.effectiveUntil) : "9999-12-31";
  const points = new Set<string>([fromKey, nextYmdKey(untilKey === "9999-12-31" ? fromKey : untilKey)]);
  for (const item of live) {
    points.add(ymdKeyFromIso(item.effectiveFrom));
    if (item.effectiveUntil) points.add(nextYmdKey(ymdKeyFromIso(item.effectiveUntil)));
  }
  const sorted = [...points].sort();
  for (const day of sorted) {
    if (day < fromKey || day > untilKey) continue;
    const covering = [...live.filter((item) => assignmentCoversYmd(item, day)), proposed];
    const best = new Map<string, PartnerAssignment>();
    for (const item of covering) {
      best.set(item.partnerId, preferLaterAssignment(best.get(item.partnerId), item));
    }
    const sum = [...best.values()].reduce((total, item) => total + item.sharePercent, 0);
    if (sum > 100) return SHARE_EXCEED_ERROR;
  }
  return null;
}

export function partnerNameById(state: LedgerState, partnerId: string): string {
  return (state.partners ?? []).find((item) => item.id === partnerId)?.name ?? "Partner";
}
