"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { availableForWithdrawal } from "@/lib/ledger";
import { formatPKR, methodLabel } from "@/lib/money";
import {
  isConfirmable,
  parseQuickEntry,
  type ConfirmableDraft,
  type ParsedQuickEntry,
  type TransactionType,
} from "@/lib/parse-quick-entry";
import { useLedger } from "@/lib/store";

const PLACEHOLDER = "Yahan likho kya hua...";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-right text-sm font-medium">{value}</p>
    </div>
  );
}

function ConfirmBody({ parsed }: { parsed: ConfirmableDraft }) {
  if (parsed.type === "rent") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Flat rent</p>
        <Field label="Customer" value={parsed.clientName} />
        {parsed.flat ? <Field label="Flat" value={parsed.flat} /> : null}
        <Field label="Stay" value={`${parsed.nights} days`} />
        <Field label="Revenue" value={formatPKR(parsed.totalAmount)} />
        <Field label="Received" value={formatPKR(parsed.receivedAmount)} />
        <Field label="Pending" value={formatPKR(parsed.remaining)} />
        <Field label="Method" value={methodLabel(parsed.method)} />
      </>
    );
  }
  if (parsed.type === "payment") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
        <Field label="Customer" value={parsed.clientName} />
        {parsed.flat ? <Field label="Flat" value={parsed.flat} /> : null}
        <Field label="Amount" value={formatPKR(parsed.amount)} />
        <Field label="Method" value={methodLabel(parsed.method)} />
      </>
    );
  }
  if (parsed.type === "expense") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Expense</p>
        <Field label="Item" value={parsed.description} />
        {parsed.flat ? <Field label="Flat" value={parsed.flat} /> : null}
        <Field label="Amount" value={formatPKR(parsed.amount)} />
        <Field label="Method" value={methodLabel(parsed.method)} />
      </>
    );
  }
  if (parsed.type === "security") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Security</p>
        <Field label="Customer" value={parsed.clientName} />
        {parsed.flat ? <Field label="Flat" value={parsed.flat} /> : null}
        <Field label="Held" value={formatPKR(parsed.amount)} />
      </>
    );
  }
  if (parsed.type === "security_adjustment") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Security adjustment</p>
        <Field label="Customer" value={parsed.clientName} />
        <Field label="Applied to rent" value={formatPKR(parsed.amount)} />
        <p className="pt-2 text-sm text-muted">No new cash. This only moves security into rent.</p>
      </>
    );
  }
  if (parsed.type === "discount") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Discount</p>
        <Field label="Customer" value={parsed.clientName} />
        <Field label="Amount" value={formatPKR(parsed.amount)} />
      </>
    );
  }
  if (parsed.type === "extension") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stay extension</p>
        <Field label="Customer" value={parsed.clientName} />
        {parsed.flat ? <Field label="Flat" value={parsed.flat} /> : null}
        <Field label="Extra days" value={String(parsed.extraNights)} />
        <Field label="Added revenue" value={formatPKR(parsed.extraRevenue)} />
      </>
    );
  }
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Anas withdrawal</p>
      <Field label="Amount" value={formatPKR(parsed.amount)} />
    </>
  );
}

export function QuickEntry({ onAdded }: { onAdded: () => void }) {
  const { state, persist } = useLedger();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuickEntry | null>(null);
  const [phonePrompt, setPhonePrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const knownClients = useMemo(
    () => state.clients.map((client) => ({ name: client.name, phone: client.phone })),
    [state.clients],
  );

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    window.addEventListener("focus-quick-entry", focus);
    if (new URLSearchParams(window.location.search).get("entry") === "1") focus();
    return () => window.removeEventListener("focus-quick-entry", focus);
  }, []);

  function process(forceType?: TransactionType) {
    setError(null);
    setParsed(forceType ? parseQuickEntry(text, { knownClients }, forceType) : parseQuickEntry(text, { knownClients }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    process();
  }

  async function confirm() {
    if (!parsed || !isConfirmable(parsed) || saving) return;
    if (("needsPhone" in parsed && parsed.needsPhone && !phonePrompt.trim())) {
      setError("Add customer number");
      return;
    }
    if (parsed.type === "withdrawal") {
      const available = availableForWithdrawal(state);
      if (parsed.amount > available) {
        setError(`Only ${formatPKR(available)} is currently available.`);
        return;
      }
    }
    const next =
      "needsPhone" in parsed && parsed.needsPhone
        ? { ...parsed, phone: phonePrompt.trim(), needsPhone: false }
        : parsed;
    setSaving(true);
    try {
      await persist({ type: "APPLY_QUICK_ENTRY", parsed: next as ConfirmableDraft });
      setText("");
      setParsed(null);
      setPhonePrompt("");
      setError(null);
      setSaveFailed(false);
      onAdded();
    } catch {
      setSaveFailed(true);
      setError("Save failed. Your text is still here.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="section-title">Quick Entry</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="sr-only" htmlFor="quick-entry">
          Yahan likho kya hua...
        </label>
        <textarea
          id="quick-entry"
          ref={inputRef}
          value={text}
          rows={2}
          placeholder={PLACEHOLDER}
          className="w-full resize-none rounded-xl border border-border bg-input px-3 py-3 text-base"
          onChange={(event) => {
            setText(event.target.value);
            setParsed(null);
            setError(null);
            setSaveFailed(false);
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

      {error ? <p className="text-sm text-warning">{error}</p> : null}

      {parsed?.type === "ambiguous" ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
          <p className="text-sm">{parsed.reason}</p>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => process("RENT")}>Rent</Button>
            <Button onClick={() => process("PAYMENT")}>Payment</Button>
            <Button onClick={() => process("EXPENSE")}>Expense</Button>
          </div>
        </div>
      ) : null}

      {parsed && isConfirmable(parsed) ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
          <ConfirmBody parsed={parsed} />
          {"needsPhone" in parsed && parsed.needsPhone ? (
            <input
              className="w-full rounded-xl border border-border bg-input px-3 text-base"
              placeholder="Add customer number"
              value={phonePrompt}
              onChange={(event) => setPhonePrompt(event.target.value)}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="primary" onClick={() => void confirm()} disabled={saving}>
              {saveFailed ? "Retry" : "Confirm"}
            </Button>
            <Button onClick={() => setParsed(null)}>Edit</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
