"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApartmentsSettings } from "@/components/settings/ApartmentsSettings";
import { AppVersionFooter } from "@/components/settings/AppVersionFooter";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Apartments used in Anas Ledger" />
      <Link
        href="/settings/partners"
        className="block rounded-2xl border border-border bg-surface px-3.5 py-3"
      >
        <p className="text-sm font-semibold">Partners</p>
        <p className="mt-1 text-sm font-normal text-muted">Manage profit-sharing partners</p>
      </Link>
      <ApartmentsSettings />
      <AppVersionFooter />
    </div>
  );
}
