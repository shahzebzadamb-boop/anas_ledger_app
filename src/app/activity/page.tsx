"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { formatDate } from "@/lib/dates";
import { useLedger } from "@/lib/store";

export default function ActivityPage() {
  const { state } = useLedger();

  return (
    <div className="space-y-4">
      <PageHeader title="Activity" subtitle="What was recorded." />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {state.activityLogs.map((item) => (
          <div key={item.id} className="border-b border-border px-3.5 py-2.5 last:border-b-0">
            <p className="text-sm font-medium">{item.summary}</p>
            <p className="mt-0.5 text-xs font-normal text-muted">{formatDate(item.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
