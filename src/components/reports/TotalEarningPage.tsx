"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddPartnerSheet } from "@/components/reports/AddPartnerSheet";
import { PartnerPaymentSheet } from "@/components/reports/PartnerPaymentSheet";
import { PartnersPanel } from "@/components/reports/PartnersPanel";
import { PaymentRow } from "@/components/reports/PartnerDetail";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { allPartnerPayments, listEarningMonths, monthEarnings, type MonthEarnings } from "@/lib/earnings";
import { formatPKR } from "@/lib/money";
import { partnerNameById } from "@/lib/partners";
import { useLedger } from "@/lib/store";
import type { PartnerPayment } from "@/types";

type Tab = "partners" | "earnings" | "history";

function Row({ label, value, accent, strong }: { label: string; value: string; accent?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className={`min-w-0 font-normal ${strong ? "text-foreground" : "text-muted"}`}>{label}</span>
      <span className={`money shrink-0 ${accent ?? "text-foreground"} ${strong ? "text-base font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export function TotalEarningPage() {
  const { persist, state } = useLedger();
  const search = useSearchParams();
  const router = useRouter();
  const tabParam = search.get("tab");
  const tab: Tab = tabParam === "partners" || tabParam === "history" ? tabParam : "earnings";
  const months = useMemo(() => listEarningMonths(state), [state]);
  const summaries = useMemo(() => months.map((item) => monthEarnings(state, item.year, item.month)), [months, state]);
  const history = useMemo(() => allPartnerPayments(state), [state]);
  const assigned = (state.partnerAssignments ?? []).some((item) => !item.voided);
  const [addOpen, setAddOpen] = useState(false);
  const [recordFor, setRecordFor] = useState<{ year: number; month: number } | null>(null);
  const [edit, setEdit] = useState<PartnerPayment | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [savingUndo, setSavingUndo] = useState(false);
  const [busy, setBusy] = useState(false);

  function setTab(next: Tab) {
    const url = next === "earnings" ? "/reports/earnings" : `/reports/earnings?tab=${next}`;
    router.replace(url);
  }

  async function downloadOwner() {
    setBusy(true);
    try {
      const { buildOwnerEarningsPdf } = await import("@/lib/pdf");
      const blob = buildOwnerEarningsPdf(summaries);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "anas-owner-earnings.pdf";
      link.click();
    } finally {
      setBusy(false);
    }
  }

  async function undoPayment(id: string) {
    setSavingUndo(true);
    try {
      await persist({ type: "UNDO_ENTRY", payload: { entityType: "PartnerPayment", entityId: id } });
      setUndoId(null);
    } finally {
      setSavingUndo(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Total Earning" subtitle="Apartment-level net cash profit. Anas keeps the remainder." />
      <Button variant="primary" className="w-full" onClick={() => setAddOpen(true)}>
        + Add Partner
      </Button>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["partners", "Partners"],
            ["earnings", "Earnings"],
            ["history", "History"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`min-h-11 rounded-xl px-2 text-sm font-semibold ${
              tab === value ? "bg-primary text-on-primary" : "border border-border bg-input"
            }`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "partners" ? <PartnersPanel /> : null}
      {tab === "earnings" ? (
        <div className="space-y-3">
          <h2 className="section-title">Monthly Earnings</h2>
          {!assigned ? <p className="text-sm font-normal text-muted">No partners assigned. Anas 100%.</p> : null}
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void downloadOwner()}>
            Download owner summary
          </Button>
          {summaries.map((item) => (
            <EarningsCard
              key={`${item.year}-${item.month}`}
              item={item}
              undoId={undoId}
              onRecord={() => setRecordFor({ year: item.year, month: item.month })}
              onEdit={setEdit}
              onUndoAsk={setUndoId}
              onUndoCancel={() => setUndoId(null)}
              onUndo={undoPayment}
              savingUndo={savingUndo}
            />
          ))}
        </div>
      ) : null}
      {tab === "history" ? (
        <div className="space-y-3">
          <h2 className="section-title">Settlement History</h2>
          {history.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm font-normal text-muted">
              No partner payments recorded.
            </p>
          ) : (
            <section className="space-y-2 rounded-2xl border border-border bg-surface px-3.5 py-3">
              {history.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  partnerName={partnerNameById(state, payment.partnerId)}
                  undoId={undoId}
                  onEdit={setEdit}
                  onUndoAsk={setUndoId}
                  onUndoCancel={() => setUndoId(null)}
                  onUndo={undoPayment}
                />
              ))}
            </section>
          )}
        </div>
      ) : null}
      {addOpen ? <AddPartnerSheet onClose={() => setAddOpen(false)} /> : null}
      {recordFor ? (
        <PartnerPaymentSheet year={recordFor.year} month={recordFor.month} onClose={() => setRecordFor(null)} />
      ) : null}
      {edit ? <PartnerPaymentSheet existing={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function EarningsCard({
  item,
  undoId,
  savingUndo,
  onRecord,
  onEdit,
  onUndoAsk,
  onUndoCancel,
  onUndo,
}: {
  item: MonthEarnings;
  undoId: string | null;
  savingUndo: boolean;
  onRecord: () => void;
  onEdit: (row: PartnerPayment) => void;
  onUndoAsk: (id: string) => void;
  onUndoCancel: () => void;
  onUndo: (id: string) => Promise<void>;
}) {
  const { state } = useLedger();
  const [open, setOpen] = useState(false);
  const activeFlats = item.flats.filter(
    (flat) => flat.cashReceived !== 0 || flat.expenses !== 0 || flat.netCashProfit !== 0,
  );

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{item.label}</h3>
        <p className="text-[11px] font-normal text-muted">{item.live ? "Live month" : "Closed month"}</p>
      </div>
      <Row label="Cash Received" value={formatPKR(item.totalCashReceived)} accent="text-primary" />
      <Row label="Purana Khata Recovered" value={formatPKR(item.puranaRecovered)} />
      <Row label="Expenses" value={formatPKR(item.expenses)} />
      <Row label="NET CASH PROFIT" value={formatPKR(item.netCashProfit)} strong />
      <div className="space-y-1 border-t border-border pt-2">
        <p className="text-xs font-medium text-muted">Partner Allocation</p>
        {item.allocations.map((line) => (
          <Row
            key={line.partnerId ?? "anas"}
            label={line.sharePercent > 0 ? `${line.partnerName} ${line.sharePercent}%` : line.partnerName}
            value={formatPKR(line.amount)}
          />
        ))}
      </div>
      <div className="space-y-1 border-t border-border pt-2">
        <Row label="Partner Paid" value={formatPKR(item.partnerPaid)} />
        <Row
          label="Partner Remaining"
          value={formatPKR(item.partnerRemaining)}
          accent={item.partnerRemaining > 0 ? "text-warning" : undefined}
        />
        {item.allocations
          .filter((line) => line.partnerId)
          .map((line) => (
            <Row
              key={`${line.partnerId}-remain`}
              label={line.overpaid > 0 ? `${line.partnerName} overpaid` : `${line.partnerName} remaining`}
              value={formatPKR(line.overpaid > 0 ? line.overpaid : line.remaining)}
              accent={line.remaining > 0 || line.overpaid > 0 ? "text-warning" : undefined}
            />
          ))}
      </div>
      <Button variant="primary" className="w-full" onClick={onRecord}>
        Record partner payment
      </Button>
      {activeFlats.length > 0 ? (
        <div>
          <button type="button" className="min-h-11 text-sm font-medium text-secondary" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide apartment breakdown" : "Apartment breakdown"}
          </button>
          {open
            ? activeFlats.map((flat) => (
                <div key={flat.flatId} className="mt-2 space-y-1 border-t border-border pt-2">
                  <p className="text-sm font-medium">{flat.flatName}</p>
                  <Row label="Cash received" value={formatPKR(flat.cashReceived)} />
                  <Row label="Purana Khata recovered" value={formatPKR(flat.puranaRecovered)} />
                  <Row label="Expenses" value={formatPKR(flat.expenses)} />
                  <Row label="Net cash profit" value={formatPKR(flat.netCashProfit)} />
                  {flat.allocations.map((line) => (
                    <Row
                      key={`${flat.flatId}-${line.partnerId ?? "anas"}`}
                      label={line.sharePercent > 0 ? `${line.partnerName} ${line.sharePercent}%` : line.partnerName}
                      value={formatPKR(line.amount)}
                    />
                  ))}
                </div>
              ))
            : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="section-title">Payment history</p>
        {item.payments.length === 0 ? (
          <p className="text-sm font-normal text-muted">No partner payments this month.</p>
        ) : (
          item.payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              partnerName={partnerNameById(state, payment.partnerId)}
              undoId={undoId}
              onEdit={onEdit}
              onUndoAsk={onUndoAsk}
              onUndoCancel={onUndoCancel}
              onUndo={onUndo}
            />
          ))
        )}
        {savingUndo ? <p className="text-xs font-normal text-muted">Saving…</p> : null}
      </div>
    </section>
  );
}
