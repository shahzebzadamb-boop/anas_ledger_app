"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import { formatPKR, methodLabel } from "@/lib/money";
import {
  isConfirmable,
  parseQuickEntry,
  type ParsedQuickEntry,
  type TransactionType,
} from "@/lib/parse-quick-entry";
import { useLedger } from "@/lib/store";

const PLACEHOLDER = "tufail flat 802 rent 40k received 20k cash";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-sm font-medium text-right">{value}</p>
    </div>
  );
}

function ConfirmBody({ parsed }: { parsed: Exclude<ParsedQuickEntry, { type: "ambiguous" }> }) {
  if (parsed.type === "rent") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Room rent</p>
        <div className="mt-3 divide-y divide-border">
          <Field label="Client" value={parsed.clientName} />
          {parsed.flat ? <Field label="Flat" value={parsed.flat} /> : null}
          <Field label="Total" value={formatPKR(parsed.totalAmount)} />
          <Field label="Received" value={formatPKR(parsed.receivedAmount)} />
          <Field label="Remaining" value={formatPKR(parsed.remaining)} />
          <Field label="Method" value={methodLabel(parsed.method)} />
          <Field label="Due" value={formatDate(parsed.dueDate.toISOString())} />
        </div>
      </>
    );
  }

  if (parsed.type === "payment") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
        <div className="mt-3 divide-y divide-border">
          <Field label="Client" value={parsed.clientName} />
          <Field label="Amount" value={formatPKR(parsed.amount)} />
          <Field label="Method" value={methodLabel(parsed.method)} />
        </div>
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Expense</p>
      <div className="mt-3 divide-y divide-border">
        <Field label="Item" value={parsed.categoryLabel} />
        <Field label="Amount" value={formatPKR(parsed.amount)} />
        {parsed.flat ? <Field label="Flat" value={parsed.flat} /> : null}
        <Field label="Method" value={methodLabel(parsed.method)} />
      </div>
    </>
  );
}

export function QuickEntry() {
  const { state, dispatch } = useLedger();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuickEntry | null>(null);
  const knownClients = useMemo(() => state.clients.map((client) => client.name), [state.clients]);

  function process(forceType?: TransactionType) {
    const next = forceType
      ? parseQuickEntry(text, { knownClients }, forceType)
      : parseQuickEntry(text, { knownClients });
    setParsed(next);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    process();
  }

  function confirm() {
    if (!parsed || !isConfirmable(parsed)) return;
    dispatch({ type: "APPLY_QUICK_ENTRY", parsed });
    setText("");
    setParsed(null);
  }

  function chooseType(type: TransactionType) {
    process(type);
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Quick Entry</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="sr-only" htmlFor="quick-entry">
          What happened?
        </label>
        <textarea
          id="quick-entry"
          value={text}
          rows={3}
          placeholder={PLACEHOLDER}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-base"
          onChange={(event) => {
            setText(event.target.value);
            setParsed(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (text.trim()) process();
            }
          }}
        />
        <Button type="submit" variant="primary" className="w-full" disabled={!text.trim()}>
          Process
        </Button>
      </form>

      {parsed?.type === "ambiguous" ? (
        <div className="space-y-3 rounded-xl bg-background p-3">
          <p className="text-sm">{parsed.reason}</p>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => chooseType("RENT")}>Rent</Button>
            <Button onClick={() => chooseType("PAYMENT")}>Payment</Button>
            <Button onClick={() => chooseType("EXPENSE")}>Expense</Button>
          </div>
        </div>
      ) : null}

      {parsed && isConfirmable(parsed) ? (
        <div className="space-y-3 rounded-xl bg-background p-3">
          <ConfirmBody parsed={parsed} />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="primary" onClick={confirm}>
              Confirm
            </Button>
            <Button onClick={() => setParsed(null)}>Edit</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
