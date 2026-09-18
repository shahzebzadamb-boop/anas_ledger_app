"use client";

import { useEffect, useMemo, useState } from "react";
import { startOfMonth } from "date-fns";
import Link from "next/link";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { QuickEntry } from "@/components/dashboard/QuickEntry";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PageHeader } from "@/components/layout/PageHeader";
import { rangeForPreset } from "@/lib/dates";
import { needsAttention, recentActivity } from "@/lib/ledger";
import { canUseBrowserNotifications } from "@/lib/notifications";
import { useLedger } from "@/lib/store";
import type { DashboardTotals, DateFilterPreset, DateRange } from "@/types";

const ZERO_TOTALS: DashboardTotals = { business: 0, received: 0, pending: 0, expenses: 0 };

export function Dashboard() {
  const { state } = useLedger();
  const [preset, setPreset] = useState<DateFilterPreset>("month");
  const [selectedFlat, setSelectedFlat] = useState("all");
  const [custom, setCustom] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [toast, setToast] = useState(false);
  const [totals, setTotals] = useState<DashboardTotals>(ZERO_TOTALS);

  const range = useMemo(() => rangeForPreset(preset, custom), [preset, custom]);
  const attention = useMemo(() => needsAttention(state, selectedFlat), [state, selectedFlat]);
  const activity = useMemo(() => recentActivity(state), [state]);
  const reviewCount = state.reviews.filter((item) => item.status === "NEEDS_REVIEW").length;

  useEffect(() => {
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      flat: selectedFlat,
    });
    let cancelled = false;
    fetch(`/api/dashboard?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { totals?: DashboardTotals };
        if (!cancelled) setTotals(data.totals ?? ZERO_TOTALS);
      })
      .catch(() => {
        if (!cancelled) setTotals(ZERO_TOTALS);
      });
    return () => {
      cancelled = true;
    };
  }, [range, selectedFlat, state]);

  return (
    <div className="space-y-3.5">
      {toast ? <p className="toast-ok">✓ Added</p> : null}
      <PageHeader title="ANAS LEDGER" subtitle="Fast mobile cash notebook" />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-normal text-secondary">
        <Link href="/settings" className="min-h-11 inline-flex items-center">
          Settings
        </Link>
        {reviewCount > 0 ? (
          <Link href="/migration" className="min-h-11 inline-flex items-center text-warning">
            Migration review ({reviewCount})
          </Link>
        ) : null}
        {canUseBrowserNotifications() && Notification.permission !== "granted" ? (
          <button
            type="button"
            className="min-h-11 text-secondary"
            onClick={() => Notification.requestPermission()}
          >
            Enable reminders
          </button>
        ) : null}
      </div>
      <SummaryCards totals={totals} />
      <DateFilter
        flats={state.flats}
        selectedFlat={selectedFlat}
        onFlat={setSelectedFlat}
        preset={preset}
        custom={custom}
        onPreset={setPreset}
        onCustom={setCustom}
      />
      <QuickEntry
        onAdded={() => {
          setToast(true);
          window.setTimeout(() => setToast(false), 1600);
        }}
      />
      <NeedsAttention items={attention} />
      <RecentActivity items={activity} />
    </div>
  );
}
