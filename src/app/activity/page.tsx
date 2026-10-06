"use client";

import { Suspense } from "react";
import { ActivityHistoryPage } from "@/components/activity/ActivityHistoryPage";

export default function ActivityRoute() {
  return (
    <Suspense fallback={<p className="text-sm font-normal text-muted">Loading activity…</p>}>
      <ActivityHistoryPage />
    </Suspense>
  );
}
