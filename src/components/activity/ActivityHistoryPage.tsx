"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { activityFeed, filterActivityFeed, type ActivityKind } from "@/lib/activity-feed";
import { rangeForPreset, karachiYmd, karachiMonthRange } from "@/lib/dates";
import { flatsForChips } from "@/lib/flats";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { DateFilterPreset, DateRange } from "@/types";

const PAGE = 40;
const kinds: { value: "all" | ActivityKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "business", label: "Business" },
  { value: "payment", label: "Payments" },
  { value: "expense", label: "Expenses" },
  { value: "correction", label: "Corrections" },
];

export function ActivityHistoryPage() {
  const { state } = useLedger();
  const searchParams = useSearchParams();
  const today = karachiYmd();
  const monthRange = karachiMonthRange(today.year, today.month);
  const openId = searchParams.get("open");
  const [preset, setPreset] = useState<DateFilterPreset>(openId ? "all" : "month");
  const [custom, setCustom] = useState<DateRange>(monthRange);
  const [flat, setFlat] = useState("all");
  const [kind, setKind] = useState<"all" | ActivityKind>("all");
  const [limit, setLimit] = useState(PAGE);
  const range = useMemo(() => rangeForPreset(preset, custom), [custom, preset]);
  const items = useMemo(() => {
    const feed = activityFeed(state);
    return filterActivityFeed(feed, { range, flat, kind, includeVoided: true });
  }, [flat, kind, range, state]);
  const chips = flatsForChips(state);

  useEffect(() => {
    if (!openId) return;
    const index = items.findIndex((item) => item.id === openId);
    if (index >= 0) setLimit((value) => Math.max(value, index + 1));
  }, [items, openId]);

  const visible = items.slice(0, limit);

  return (
    <div className="space-y-3.5">
      <PageHeader title="Activity History" subtitle="Every stay, payment, expense, and correction." />
      <DateFilter
        flats={chips}
        selectedFlat={flat}
        onFlat={(value) => {
          setFlat(value);
          setLimit(PAGE);
        }}
        preset={preset}
        custom={custom}
        onPreset={(value) => {
          setPreset(value);
          setLimit(PAGE);
        }}
        onCustom={(value) => {
          setCustom(value);
          setPreset("custom");
          setLimit(PAGE);
        }}
      />
      <div className="flex gap-1 overflow-x-auto">
        {kinds.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn("chip", kind === item.value && "chip-active")}
            onClick={() => {
              setKind(item.value);
              setLimit(PAGE);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm font-normal text-muted">
          No activity in this period.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {visible.map((item) => (
            <ActivityCard key={item.id} item={item} compact={false} autoEdit={openId === item.id} />
          ))}
        </div>
      )}
      {items.length > limit ? (
        <Button className="w-full" onClick={() => setLimit((value) => value + PAGE)}>
          Load more
        </Button>
      ) : null}
      {openId ? <p className="sr-only">Opened {openId}</p> : null}
    </div>
  );
}
