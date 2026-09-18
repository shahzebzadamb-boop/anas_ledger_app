"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import type { DateFilterPreset, DateRange } from "@/types";
import { cn } from "@/lib/utils";

const presets: { id: DateFilterPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7days", label: "7 Days" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

export function DateFilter({
  preset,
  custom,
  onPreset,
  onCustom,
}: {
  preset: DateFilterPreset;
  custom: DateRange;
  onPreset: (preset: DateFilterPreset) => void;
  onCustom: (range: DateRange) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {presets.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={preset === item.id ? "primary" : "secondary"}
            className={cn("shrink-0 px-4", preset === item.id && "shadow-none")}
            onClick={() => onPreset(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            From
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
              value={format(custom.from, "yyyy-MM-dd")}
              onChange={(event) =>
                onCustom({ ...custom, from: new Date(`${event.target.value}T00:00:00`) })
              }
            />
          </label>
          <label className="text-xs text-muted">
            To
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
              value={format(custom.to, "yyyy-MM-dd")}
              onChange={(event) =>
                onCustom({ ...custom, to: new Date(`${event.target.value}T23:59:59`) })
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
