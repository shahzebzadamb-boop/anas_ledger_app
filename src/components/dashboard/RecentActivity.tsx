"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { homeRecentActivity } from "@/lib/activity-feed";
import { useLedger } from "@/lib/store";

export function RecentActivity({
  emptyLabel = "No stays yet.",
}: {
  emptyLabel?: string;
}) {
  const { state } = useLedger();
  const router = useRouter();
  const items = useMemo(() => homeRecentActivity(state, 8), [state]);

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Recent activity</h2>
        <button
          type="button"
          className="text-sm font-medium text-secondary"
          onClick={() => router.push("/activity")}
        >
          See all
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm font-normal text-muted">
          {emptyLabel}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((item) => (
            <ActivityCard
              key={item.id}
              item={item}
              compact
              onSelect={() => router.push(`/activity?open=${encodeURIComponent(item.id)}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
