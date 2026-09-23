import type { DateFilterPreset } from "@/types";

export const LEDGER_VIEWS = ["business", "received", "pending", "expenses"] as const;
export type LedgerView = (typeof LEDGER_VIEWS)[number];

export function parseLedgerView(value: string | null | undefined): LedgerView {
  if (value === "received" || value === "pending" || value === "expenses") return value;
  return "business";
}

export function parseLedgerPreset(value: string | null | undefined): DateFilterPreset {
  if (value === "today" || value === "7days" || value === "custom") return value;
  return "month";
}

export function ledgerHref(opts: {
  view: LedgerView;
  flat?: string;
  preset?: DateFilterPreset;
  from?: string;
  to?: string;
}): string {
  const params = new URLSearchParams();
  params.set("view", opts.view);
  params.set("preset", opts.preset ?? "month");
  if (opts.flat && opts.flat !== "all") params.set("flat", opts.flat);
  if ((opts.preset ?? "month") === "custom" && opts.from && opts.to) {
    params.set("from", opts.from);
    params.set("to", opts.to);
  }
  return `/ledger?${params.toString()}`;
}
