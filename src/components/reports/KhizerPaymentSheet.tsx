"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Field, Sheet, fieldClass } from "@/components/ui/Sheet";
import { dateInputToISO, formatMonthLabel, karachiDateInput } from "@/lib/dates";
import { moneyInputFromSaved, parseFormAmount } from "@/lib/money";
import { useLedger } from "@/lib/store";
import { PAYMENT_METHODS, type PaymentMethod, type ProfitSharePayment } from "@/types";

function paidAtFromDate(value: string): string {
  if (value === karachiDateInput()) return new Date().toISOString();
  return dateInputToISO(value);
}

export function KhizerPaymentSheet({
  year,
  month,
  existing,
  onClose,
}: {
  year: number;
  month: number;
  existing?: ProfitSharePayment | null;
  onClose: () => void;
}) {
  const { persist } = useLedger();
  const [amountRaw, setAmountRaw] = useState(existing ? moneyInputFromSaved(existing.amount) : "");
  const [method, setMethod] = useState<PaymentMethod>(existing?.method ?? "CASH");
  const [date, setDate] = useState(existing ? karachiDateInput(new Date(existing.paidAt)) : karachiDateInput());
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = parseFormAmount(amountRaw, false);

  async function save() {
    if (amount == null) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await persist({
          type: "UPDATE_PROFIT_SHARE",
          payload: {
            id: existing.id,
            amount,
            method,
            paidAt: paidAtFromDate(date),
            note: note.trim() || null,
            profitYear: year,
            profitMonth: month,
          },
        });
      } else {
        await persist({
          type: "RECORD_PROFIT_SHARE",
          payload: {
            profitYear: year,
            profitMonth: month,
            amount,
            method,
            paidAt: paidAtFromDate(date),
            note: note.trim() || null,
            partnerName: "Khizer",
          },
        });
      }
      onClose();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const methods = useMemo(() => PAYMENT_METHODS, []);

  return (
    <Sheet title={existing ? "Edit Khizer payment" : "Record Khizer payment"} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm font-normal text-muted">Profit month {formatMonthLabel(year, month)}</p>
        <MoneyInput label="Amount paid" value={amountRaw} onChange={setAmountRaw} allowZero={false} />
        <Field label="Payment date">
          <input type="date" className={fieldClass} value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Payment method">
          <select className={fieldClass} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {methods.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note">
          <input
            type="text"
            className={fieldClass}
            value={note}
            placeholder="Optional"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-warning">{error}</p> : null}
        <Button variant="primary" className="w-full" disabled={saving} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Sheet>
  );
}
