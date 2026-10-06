"use client";

import { Suspense } from "react";
import { TotalEarningPage } from "@/components/reports/TotalEarningPage";

export default function EarningsRoute() {
  return (
    <Suspense fallback={<p className="text-sm font-normal text-muted">Loading earnings…</p>}>
      <TotalEarningPage />
    </Suspense>
  );
}
