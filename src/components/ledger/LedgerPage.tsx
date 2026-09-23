"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startOfMonth } from "date-fns";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { StayLedgerCard } from "@/components/dashboard/StayLedgerCard";
import { EntryEditor } from "@/components/dashboard/EntryEditor";
import { AddExpenseSheet } from "@/components/ledger/AddExpenseSheet";
import { AddPaymentSheet } from "@/components/ledger/AddPaymentSheet";
import { AddStaySheet } from "@/components/ledger/AddStaySheet";
import { Button } from "@/components/ui/Button";
import { formatDate, rangeForPreset } from "@/lib/dates";
import {
  dashboardTotals,
  expenseLedgerRows,
  operationalReconciled,
  paymentLedgerRows,
  pendingLedgerRows,
  stayLedgerRows,
} from "@/lib/ledger";
import { ledgerHref, parseLedgerPreset, parseLedgerView, type LedgerView } from "@/lib/ledger-href";
import { formatPKR } from "@/lib/money";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { DateFilterPreset, DateRange } from "@/types";

const tabs: { view: LedgerView; label: string }[] = [
  { view: "business", label: "Business" },
  { view: "received", label: "Received" },
  { view: "pending", label: "Pending" },
  { view: "expenses", label: "Expenses" },
];

export function LedgerPage() {
  const { state } = useLedger();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseLedgerView(searchParams.get("view"));
  const selectedFlat = searchParams.get("flat") || "all";
  const preset = parseLedgerPreset(searchParams.get("preset"));
  const [custom, setCustom] = useState<DateRange>(() => ({
    from: searchParams.get("from") ? new Date(`${searchParams.get("from")}T00:00:00`) : startOfMonth(new Date()),
    to: searchParams.get("to") ? new Date(`${searchParams.get("to")}T00:00:00`) : new Date(),
  }));
  const [sheet, setSheet] = useState<"stay" | "payment" | "expense" | null>(null);
  const [toast, setToast] = useState(false);

  const range = useMemo(() => rangeForPreset(preset, custom), [preset, custom]);
  const stays = useMemo(() => stayLedgerRows(state, range, selectedFlat), [state, range, selectedFlat]);
  const pending = useMemo(() => pendingLedgerRows(state, selectedFlat), [state, selectedFlat]);
  const payments = useMemo(() => paymentLedgerRows(state, range, selectedFlat), [state, range, selectedFlat]);
  const expenses = useMemo(() => expenseLedgerRows(state, range, selectedFlat), [state, range, selectedFlat]);
  const totals = useMemo(() => dashboardTotals(state, range, selectedFlat), [state, range, selectedFlat]);
  const reconciled = operationalReconciled(state, range, selectedFlat, totals);

  function go(next: {
    view?: LedgerView;
    flat?: string;
    preset?: DateFilterPreset;
    from?: string;
    to?: string;
  }) {
    router.replace(
      ledgerHref({
        view: next.view ?? view,
        flat: next.flat ?? selectedFlat,
        preset: next.preset ?? preset,
        from: next.from ?? (preset === "custom" ? toInput(custom.from) : undefined),
        to: next.to ?? (preset === "custom" ? toInput(custom.to) : undefined),
      }),
    );
  }

  function added() {
    setToast(true);
    window.setTimeout(() => setToast(false), 1600);
  }

  function openAdd() {
    if (view === "expenses") setSheet("expense");
    else if (view === "received") setSheet("payment");
    else setSheet("stay");
  }

  return (
    <div className="space-y-3.5">
      {toast ? <p className="toast-ok">✓ Added</p> : null}
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="min-h-11 inline-flex items-center text-sm font-medium text-secondary">
          ← Back
        </Link>
        <Button variant="primary" onClick={openAdd}>
          + Add
        </Button>
      </div>
      <h1 className="page-title">Ledger</h1>
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className={cn("chip", view === tab.view && "chip-active")}
            onClick={() => go({ view: tab.view })}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <DateFilter
        flats={state.flats}
        selectedFlat={selectedFlat}
        onFlat={(value) => go({ flat: value })}
        preset={preset}
        custom={custom}
        onPreset={(value) => go({ preset: value, from: toInput(custom.from), to: toInput(custom.to) })}
        onCustom={(value) => {
          setCustom(value);
          go({ preset: "custom", from: toInput(value.from), to: toInput(value.to) });
        }}
      />
      {!reconciled ? (
        <p className="text-sm font-normal text-warning">Totals do not match this ledger. Check the filters.</p>
      ) : null}

      {view === "business" ? (
        stays.length === 0 ? (
          <Empty label="No business entries yet" action="+ Add Stay" onAction={() => setSheet("stay")} />
        ) : (
          <List>
            {stays.map((row) => (
              <StayLedgerCard key={row.stayId} row={row} showFlat showDates showActions />
            ))}
          </List>
        )
      ) : null}

      {view === "received" ? (
        payments.length === 0 ? (
          <Empty label="No payments yet" action="+ Add Payment" onAction={() => setSheet("payment")} />
        ) : (
          <PaymentList rows={payments} />
        )
      ) : null}

      {view === "pending" ? (
        pending.length === 0 ? (
          <Empty label="No pending balances" />
        ) : (
          <List>
            {pending.map((row) => (
              <StayLedgerCard key={row.stayId} row={row} showFlat showDates showPhone showWhatsApp showActions />
            ))}
          </List>
        )
      ) : null}

      {view === "expenses" ? (
        expenses.length === 0 ? (
          <Empty label="No expenses yet" action="+ Add Expense" onAction={() => setSheet("expense")} />
        ) : (
          <ExpenseList rows={expenses} />
        )
      ) : null}

      {sheet === "stay" ? (
        <AddStaySheet defaultFlat={selectedFlat} onClose={() => setSheet(null)} onAdded={added} />
      ) : null}
      {sheet === "payment" ? (
        <AddPaymentSheet onClose={() => setSheet(null)} onAdded={added} />
      ) : null}
      {sheet === "expense" ? (
        <AddExpenseSheet defaultFlat={selectedFlat} onClose={() => setSheet(null)} onAdded={added} />
      ) : null}
    </div>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>;
}

function Empty({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface px-3.5 py-4">
      <p className="text-sm font-normal text-muted">{label}</p>
      {action && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}

function PaymentList({
  rows,
}: {
  rows: ReturnType<typeof paymentLedgerRows>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <>
      <List>
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="block w-full border-b border-border px-3.5 py-3 text-left last:border-b-0"
            onClick={() => setEditId(row.id)}
          >
            <p className="text-sm font-medium">{row.clientName}</p>
            <p className="mt-0.5 text-xs font-normal text-muted">{row.flat}</p>
            <p className="money mt-2 text-base text-primary">{formatPKR(row.amount)}</p>
            <p className="mt-1 text-xs font-normal text-muted">
              {row.method} · Received by {row.receivedBy}
            </p>
            <p className="mt-0.5 text-xs font-normal text-muted">{formatDate(row.receivedAt)}</p>
          </button>
        ))}
      </List>
      {editId ? <EntryEditor kind="payment" id={editId} onClose={() => setEditId(null)} /> : null}
    </>
  );
}

function ExpenseList({
  rows,
}: {
  rows: ReturnType<typeof expenseLedgerRows>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <>
      <List>
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="block w-full border-b border-border px-3.5 py-3 text-left last:border-b-0"
            onClick={() => setEditId(row.id)}
          >
            <p className="text-sm font-medium">{row.description || row.category}</p>
            <p className="mt-0.5 text-xs font-normal text-muted">{row.flat ?? "—"}</p>
            <p className="money mt-2 text-base">{formatPKR(row.amount)}</p>
            <p className="mt-1 text-xs font-normal text-muted">
              {formatDate(row.spentAt)} · {row.method}
            </p>
          </button>
        ))}
      </List>
      {editId ? <EntryEditor kind="expense" id={editId} onClose={() => setEditId(null)} /> : null}
    </>
  );
}

function toInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
