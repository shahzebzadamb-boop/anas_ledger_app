"use client";

import { useEffect, useMemo, useState } from "react";
import { startOfMonth } from "date-fns";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { inRange, rangeForPreset } from "@/lib/dates";
import { formatPKR, methodLabel } from "@/lib/money";
import { useLedger } from "@/lib/store";
import type { DashboardTotals, DateFilterPreset, DateRange } from "@/types";

const ZERO_TOTALS: DashboardTotals = { business: 0, received: 0, pending: 0, expenses: 0 };

export default function ReportsPage() {
  const { state } = useLedger();
  const [preset, setPreset] = useState<DateFilterPreset>("month");
  const [selectedFlat, setSelectedFlat] = useState("all");
  const [custom, setCustom] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [busy, setBusy] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [totals, setTotals] = useState<DashboardTotals>(ZERO_TOTALS);
  const [flats, setFlats] = useState<Array<DashboardTotals & { name: string }>>([]);

  const range = useMemo(() => rangeForPreset(preset, custom), [preset, custom]);

  useEffect(() => {
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      flat: selectedFlat,
      breakdown: "1",
    });
    let cancelled = false;
    fetch(`/api/dashboard?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          totals?: DashboardTotals;
          flats?: Array<DashboardTotals & { name: string }>;
        };
        if (cancelled) return;
        setTotals(data.totals ?? ZERO_TOTALS);
        setFlats(data.flats ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setTotals(ZERO_TOTALS);
        setFlats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [range, selectedFlat, state]);
  const methods = useMemo(() => {
    const counts = new Map<string, number>();
    for (const payment of state.payments) {
      const inFlat = selectedFlat === "all" || payment.flatId === `flat_${selectedFlat}`;
      if (!inFlat) continue;
      if (!inRange(payment.receivedAt, range)) continue;
      counts.set(payment.method, (counts.get(payment.method) ?? 0) + payment.amount);
    }
    return [...counts.entries()];
  }, [range, selectedFlat, state.payments]);

  async function makePdf() {
    setBusy(true);
    const { buildReportPdf } = await import("@/lib/pdf");
    const blob = buildReportPdf({
      periodLabel: preset === "today" ? "Today" : preset === "7days" ? "Last 7 days" : preset === "custom" ? "Custom" : "This month",
      flatLabel: selectedFlat === "all" ? "All Flats" : `Flat ${selectedFlat}`,
      totals,
      flats,
    });
    setBusy(false);
    return new File([blob], "anas-ledger-report.pdf", { type: "application/pdf" });
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Business totals only. No customer names or phones." />
      <DateFilter
        flats={state.flats}
        selectedFlat={selectedFlat}
        onFlat={setSelectedFlat}
        preset={preset}
        custom={custom}
        onPreset={setPreset}
        onCustom={setCustom}
      />
      <Card className="space-y-2">
        <Row label="Business" value={formatPKR(totals.business)} />
        <Row label="Received" value={formatPKR(totals.received)} accent="text-primary" />
        <Row label="Pending" value={formatPKR(totals.pending)} accent="text-warning" />
        <Row label="Expenses" value={formatPKR(totals.expenses)} />
      </Card>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={showMethods} onChange={(event) => setShowMethods(event.target.checked)} />
        Show payment methods
      </label>
      {showMethods ? (
        <Card className="space-y-2">
          <p className="section-title">Payment methods</p>
          {methods.length === 0 ? <p className="text-sm text-muted">No rent payments in this period.</p> : null}
          {methods.map(([method, amount]) => (
            <Row key={method} label={methodLabel(method)} value={formatPKR(amount)} />
          ))}
        </Card>
      ) : null}
      <Card className="space-y-3">
        <p className="section-title">Per flat</p>
        {flats.map((flat) => (
          <div key={flat.name} className="space-y-1 border-t border-border pt-2 first:border-t-0 first:pt-0">
            <p className="text-sm font-medium">{flat.name}</p>
            <Row label="Business" value={formatPKR(flat.business)} />
            <Row label="Received" value={formatPKR(flat.received)} />
            <Row label="Pending" value={formatPKR(flat.pending)} />
            <Row label="Expenses" value={formatPKR(flat.expenses)} />
          </div>
        ))}
      </Card>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <Button
          onClick={async () => {
            const file = await makePdf();
            const url = URL.createObjectURL(file);
            window.open(url, "_blank");
          }}
          disabled={busy}
        >
          Preview
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            const file = await makePdf();
            const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
            if (nav.canShare?.({ files: [file] }) && nav.share) {
              await nav.share({ files: [file], title: "Anas Ledger report" });
              return;
            }
            download(file);
          }}
        >
          Share
        </Button>
        <Button
          variant="primary"
          className="col-span-2"
          disabled={busy}
          onClick={async () => {
            download(await makePdf());
          }}
        >
          Generate PDF
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="font-normal text-muted">{label}</span>
      <span className={`money ${accent ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
}
