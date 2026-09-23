"use client";

import { useMemo, useState } from "react";
import { startOfMonth } from "date-fns";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { QuickEntry } from "@/components/dashboard/QuickEntry";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PageHeader } from "@/components/layout/PageHeader";
import { rangeForPreset } from "@/lib/dates";
import { dashboardTotals, needsAttention, stayLedgerRows } from "@/lib/ledger";
import { canUseBrowserNotifications } from "@/lib/notifications";
import { useLedger } from "@/lib/store";
import type { DateFilterPreset, DateRange } from "@/types";

export function Dashboard() {
  const { state } = useLedger();
  const [preset, setPreset] = useState<DateFilterPreset>("month");
  const [selectedFlat, setSelectedFlat] = useState("all");
  const [custom, setCustom] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [toast, setToast] = useState(false);

  const range = useMemo(() => rangeForPreset(preset, custom), [preset, custom]);
  const attention = useMemo(() => needsAttention(state, selectedFlat), [state, selectedFlat]);
  const stays = useMemo(() => stayLedgerRows(state, range, selectedFlat), [state, range, selectedFlat]);
  const totals = useMemo(() => dashboardTotals(state, range, selectedFlat), [state, range, selectedFlat]);
  const reviewCount = state.reviews.filter((item) => item.status === "NEEDS_REVIEW").length;

  return (
    <div className="space-y-3.5">
      {toast ? <p className="toast-ok">✓ Added</p> : null}
      <PageHeader
        title="ANAS LEDGER"
        subtitle="Fast mobile cash notebook"
        logo
        actions={
          <Link
            href="/calculator"
            aria-label="Calculator"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-secondary"
          >
            <Calculator size={20} strokeWidth={1.8} />
          </Link>
        }
      />
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
      <SummaryCards
        totals={totals}
        flat={selectedFlat}
        preset={preset}
        from={custom.from.toISOString().slice(0, 10)}
        to={custom.to.toISOString().slice(0, 10)}
      />
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
      <RecentActivity stays={stays} showFlat={selectedFlat === "all"} />
    </div>
  );
}
