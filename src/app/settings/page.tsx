"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { ApartmentsSettings } from "@/components/settings/ApartmentsSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Apartments, receivers, and app tools." />
      <ApartmentsSettings />
    </div>
  );
}
