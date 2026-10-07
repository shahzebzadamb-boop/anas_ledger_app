"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { PartnersPanel } from "@/components/reports/PartnersPanel";

export default function SettingsPartnersPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Partners" subtitle="Manage profit-sharing partners" />
      <PartnersPanel />
    </div>
  );
}
