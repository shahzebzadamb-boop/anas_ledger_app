"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { KhizerPaymentSheet } from "@/components/reports/KhizerPaymentSheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatKarachiDateTime } from "@/lib/dates";
import { listEarningMonths, monthEarnings, type MonthEarnings } from "@/lib/earnings";
import { formatPKR, methodLabel } from "@/lib/money";
import { useLedger } from "@/lib/store";
import type { ProfitSharePayment } from "@/types";

function Row({ label, value, accent, strong }: { label: string; value: string; accent?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className={`font-normal ${strong ? "text-foreground" : "text-muted"}`}>{label}</span>
      <span className={`money ${accent ?? "text-foreground"} ${strong ? "text-base font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export function TotalEarningPage() {
  const { persist, state } = useLedger();
  const months = useMemo(() => listEarningMonths(state), [state]);
  const summaries = useMemo(() => months.map((item) => monthEarnings(state, item.year, item.month)), [months, state]);
  const [recordFor, setRecordFor] = useState<{ year: number; month: number } | null>(null);
  const [edit, setEdit] = useState<ProfitSharePayment | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [savingUndo, setSavingUndo] = useState(false);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-4">
      <PageHeader title="Total Earning" subtitle="Net cash profit split 50/50. Expected share updates live." />
      <Button variant="primary" className="w-full" disabled={busy || summaries.length === 0} onClick={() => void downloadOwner()}>
        Download owner summary
      </Button>
      {summaries.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm font-normal text-muted">
          Earnings appear after the first stay, payment, or expense.
        </p>
      ) : (
        summaries.map((item) => (
          <EarningsCard
            key={`${item.year}-${item.month}`}
            item={item}
            undoId={undoId}
            savingUndo={savingUndo}
            onRecord={() => setRecordFor({ year: item.year, month: item.month })}
            onEdit={setEdit}
            onUndoAsk={setUndoId}
            onUndoCancel={() => setUndoId(null)}
            onUndo={async (id) => {
              setSavingUndo(true);
              try {
                await persist({ type: "UNDO_ENTRY", payload: { entityType: "ProfitShare", entityId: id } });
                setUndoId(null);
              } finally {
                setSavingUndo(false);
              }
            }}
          />
        ))
      )}
      {recordFor ? <KhizerPaymentSheet year={recordFor.year} month={recordFor.month} onClose={() => setRecordFor(null)} /> : null}
      {edit ? (
        <KhizerPaymentSheet year={edit.profitYear} month={edit.profitMonth} existing={edit} onClose={() => setEdit(null)} />
      ) : null}
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
  onEdit: (row: ProfitSharePayment) => void;
  onUndoAsk: (id: string) => void;
  onUndoCancel: () => void;
  onUndo: (id: string) => Promise<void>;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{item.label}</h2>
        <p className="text-[11px] font-normal text-muted">{item.live ? "Live month" : "Closed month"}</p>
      </div>
      <Row label="Current month received" value={formatPKR(item.currentReceived)} />
      <Row label="Purana Khata recovered" value={formatPKR(item.puranaRecovered)} />
      <Row label="Total cash received" value={formatPKR(item.totalCashReceived)} accent="text-primary" />
      <Row label="Expenses" value={formatPKR(item.expenses)} />
      <Row label="Net cash profit" value={formatPKR(item.netCashProfit)} strong />
      <div className="border-t border-border pt-2">
        <Row label="Anas 50%" value={formatPKR(item.anasShare)} />
        <Row label="Khizer 50%" value={formatPKR(item.khizerShare)} />
        <Row label="Khizer paid" value={formatPKR(item.khizerPaid)} />
        {item.overpaid > 0 ? (
          <Row label="Overpaid to Khizer" value={formatPKR(item.overpaid)} accent="text-warning" />
        ) : (
          <Row label="Still owed to Khizer" value={formatPKR(item.stillOwed)} accent={item.stillOwed > 0 ? "text-warning" : undefined} />
        )}
      </div>
      <Button variant="primary" className="w-full" onClick={onRecord}>
        Record Khizer payment
      </Button>
      <div className="space-y-2">
        <p className="section-title">Khizer payment history</p>
        {item.payments.length === 0 ? (
          <p className="text-sm font-normal text-muted">No split payments recorded.</p>
        ) : (
          item.payments.map((payment) => {
            const when = formatKarachiDateTime(payment.paidAt);
            return (
              <div key={payment.id} className="space-y-1 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{when ?? payment.paidAt}</p>
                  <p className="money text-sm">{formatPKR(payment.amount)}</p>
                </div>
                <p className="text-xs font-normal text-muted">
                  {methodLabel(payment.method)}
                  {payment.note ? ` · ${payment.note}` : ""}
                </p>
                {undoId === payment.id ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" className="min-h-11 rounded-xl border border-border text-sm font-semibold" onClick={onUndoCancel}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingUndo}
                      className="min-h-11 rounded-xl border border-danger bg-transparent text-sm font-semibold text-danger"
                      onClick={() => void onUndo(payment.id)}
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-sm font-semibold"
                      onClick={() => onEdit(payment)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-xl border border-danger/70 bg-transparent px-3 text-sm font-semibold text-danger"
                      onClick={() => onUndoAsk(payment.id)}
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
