"use client";

import { Suspense } from "react";
import { PuranaKhataPage } from "@/components/reports/PuranaKhataPage";

export default function PuranaKhataRoute() {
  return (
    <Suspense fallback={<p className="text-sm font-normal text-muted">Loading Purana Khata…</p>}>
      <PuranaKhataPage />
    </Suspense>
  );
}
