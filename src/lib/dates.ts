import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import type { DateFilterPreset, DateRange } from "@/types";

export function toISO(date: Date): string {
  return date.toISOString();
}

export function fromISO(value: string): Date {
  return new Date(value);
}

export function startOfToday(now = new Date()): Date {
  return startOfDay(now);
}

export function rangeForPreset(
  preset: DateFilterPreset,
  custom: DateRange | null,
  now = new Date(),
): DateRange {
  if (preset === "custom" && custom) {
    return {
      from: startOfDay(custom.from),
      to: endOfDay(custom.to),
    };
  }

  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === "7days") {
    return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  }

  return { from: startOfMonth(now), to: endOfMonth(now) };
}

export function inRange(isoDate: string, range: DateRange): boolean {
  const date = new Date(isoDate);
  return date >= range.from && date <= range.to;
}

export function formatDate(isoDate: string): string {
  return format(new Date(isoDate), "d MMM yyyy");
}

export function formatDateShort(isoDate: string): string {
  return format(new Date(isoDate), "d MMM");
}

export function formatStayDates(checkIn: string, checkOut: string): string {
  return `${formatDateShort(checkIn)} – ${formatDateShort(checkOut)}`;
}

export function overdueDays(dueDateISO: string, now = new Date()): number {
  const due = startOfDay(new Date(dueDateISO));
  const today = startOfDay(now);
  if (!isBefore(due, today)) return 0;
  return differenceInCalendarDays(today, due);
}

export function dueLabel(dueDateISO: string, now = new Date()): string {
  const due = startOfDay(new Date(dueDateISO));
  const today = startOfDay(now);
  if (isSameDay(due, today)) return "Due today";
  if (isSameDay(due, addDays(today, 1))) return "Due tomorrow";
  const days = overdueDays(dueDateISO, now);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} overdue`;
  return `Due ${formatDateShort(dueDateISO)}`;
}

export function daysFromToday(days: number, now = new Date()): Date {
  return startOfDay(addDays(now, days));
}
