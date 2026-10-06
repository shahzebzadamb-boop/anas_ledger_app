"use client";

import { useMemo, useState } from "react";
import { StayLedgerCard } from "@/components/dashboard/StayLedgerCard";
import { ClientSearch } from "@/components/clients/ClientSearch";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentReceiptNotice } from "@/components/receipts/PaymentReceiptNotice";
import { formatMonthLabel } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { listPuranaMonths, puranaKhataGroups } from "@/lib/purana-khata";
import { useLedger } from "@/lib/store";
import { activeFlats } from "@/lib/flats";
import type { AddedReceiptInfo } from "@/lib/receipts";

export function PuranaKhataPage() {
  const { state } = useLedger();
  const [clientId, setClientId] = useState<string | null>(null);
  const [flat, setFlat] = useState("all");
  const [monthKey, setMonthKey] = useState("all");
  const [showSettled, setShowSettled] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const origin =
    monthKey === "all"
      ? { originYear: null, originMonth: null }
      : { originYear: Number(monthKey.split("-")[0]), originMonth: Number(monthKey.split("-")[1]) };

  const months = useMemo(() => listPuranaMonths(state, { showSettled: true }), [state]);
  const groups = useMemo(
    () =>
      puranaKhataGroups(state, {
        clientId,
        selectedFlat: flat,
        originYear: origin.originYear,
        originMonth: origin.originMonth,
        showSettled,
      }),
    [clientId, flat, origin.originMonth, origin.originYear, showSettled, state],
  );
  const outstanding = groups.reduce((sum, group) => sum + group.totalOutstanding, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Purana Khata" subtitle="Unpaid balances from previous months. Original stays stay in place." />
      <p className="text-sm font-normal text-muted">
        Total outstanding <span className="money text-warning">{formatPKR(outstanding)}</span>
      </p>
      {receiptId ? <PaymentReceiptNotice receiptId={receiptId} onDismiss={() => setReceiptId(null)} /> : null}
      <ClientSearch selectedId={clientId} onSelect={setClientId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium">
          Month
          <select
            className="mt-1 w-full rounded-xl border border-border bg-input px-3 text-base"
            value={monthKey}
            onChange={(event) => setMonthKey(event.target.value)}
          >
            <option value="all">All months</option>
            {months.map((item) => (
              <option key={`${item.year}-${item.month}`} value={`${item.year}-${item.month}`}>
                {formatMonthLabel(item.year, item.month)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Apartment
          <select
            className="mt-1 w-full rounded-xl border border-border bg-input px-3 text-base"
            value={flat}
            onChange={(event) => setFlat(event.target.value)}
          >
            <option value="all">All apartments</option>
            {activeFlats(state).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={showSettled} onChange={(event) => setShowSettled(event.target.checked)} />
        Show settled
      </label>
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm font-normal text-muted">
          {showSettled ? "No old dues match these filters." : "No outstanding old dues."}
        </p>
      ) : (
        groups.map((group) => (
          <section key={`${group.year}-${group.month}`} className="space-y-2">
            <div className="px-0.5">
              <h2 className="text-sm font-semibold">{group.label}</h2>
              <p className="text-xs font-normal text-muted">
                Total outstanding <span className="money text-warning">{formatPKR(group.totalOutstanding)}</span>
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {group.rows.map((row) => (
                <StayLedgerCard
                  key={row.stayId}
                  row={row}
                  showFlat
                  showDates
                  showPhone
                  showWhatsApp={row.pending > 0}
                  showReceive={row.pending > 0}
                  showActions
                  onPaymentAdded={(info?: AddedReceiptInfo) => {
                    if (info?.receiptId) setReceiptId(info.receiptId);
                  }}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
