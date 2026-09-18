"use client";

import { useMemo, useState } from "react";
import { startOfMonth } from "date-fns";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { QuickEntry } from "@/components/dashboard/QuickEntry";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PageHeader } from "@/components/layout/PageHeader";
import { rangeForPreset } from "@/lib/dates";
import { dashboardTotals, needsAttention, recentActivity } from "@/lib/ledger";
import { useLedger } from "@/lib/store";
import type { DateFilterPreset, DateRange } from "@/types";

export function Dashboard() {
  const { state } = useLedger();
  const [preset, setPreset] = useState<DateFilterPreset>("month");
  const [custom, setCustom] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const range = useMemo(() => rangeForPreset(preset, custom), [preset, custom]);
  const totals = useMemo(() => dashboardTotals(state, range), [state, range]);
  const attention = useMemo(() => needsAttention(state), [state]);
  const activity = useMemo(() => recentActivity(state), [state]);

  return (
    <div className="space-y-5">
      <PageHeader title="Anas Ledger" subtitle="Fast mobile cash ledger" />
      <DateFilter
        preset={preset}
        custom={custom}
        onPreset={setPreset}
        onCustom={setCustom}
      />
      <SummaryCards totals={totals} />
      <QuickEntry />
      <NeedsAttention items={attention} />
      <RecentActivity items={activity} />
    </div>
  );
}
