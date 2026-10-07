"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Field, Sheet, fieldClass } from "@/components/ui/Sheet";
import { dateInputToISO, formatMonthLabel, karachiDateInput } from "@/lib/dates";
import { listEarningMonths } from "@/lib/earnings";
import { moneyInputFromSaved, parseFormAmount } from "@/lib/money";
import { useLedger } from "@/lib/store";
import { PAYMENT_METHODS, type PartnerPayment, type PaymentMethod } from "@/types";

function paidAtFromDate(value: string): string {
  if (value === karachiDateInput()) return new Date().toISOString();
  return dateInputToISO(value);
}

export function PartnerPaymentSheet({
  year,
  month,
  partnerId,
  existing,
  onClose,
}: {
  year?: number;
  month?: number;
  partnerId?: string;
  existing?: PartnerPayment | null;
  onClose: () => void;
}) {
  const { persist, state } = useLedger();
  const months = useMemo(() => listEarningMonths(state), [state]);
  const partners = useMemo(
    () => state.partners.filter((item) => item.active || item.id === (existing?.partnerId ?? partnerId)),
    [existing?.partnerId, partnerId, state.partners],
  );
  const [selectedPartner, setSelectedPartner] = useState(existing?.partnerId ?? partnerId ?? partners[0]?.id ?? "");
  const [selectedMonth, setSelectedMonth] = useState(
    `${existing?.profitYear ?? year ?? months[0]?.year}-${existing?.profitMonth ?? month ?? months[0]?.month}`,
  );
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
    if (!selectedPartner) {
      setError("Choose a partner.");
      return;
    }
    const [profitYear, profitMonth] = selectedMonth.split("-").map(Number);
    if (!profitYear || !profitMonth) {
      setError("Choose a settlement month.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await persist({
          type: "UPDATE_PARTNER_PAYMENT",
          payload: {
            id: existing.id,
            partnerId: selectedPartner,
            amount,
            method,
            paidAt: paidAtFromDate(date),
            note: note.trim() || null,
            profitYear,
            profitMonth,
          },
        });
      } else {
        await persist({
          type: "RECORD_PARTNER_PAYMENT",
          payload: {
            partnerId: selectedPartner,
            profitYear,
            profitMonth,
            amount,
            method,
            paidAt: paidAtFromDate(date),
            note: note.trim() || null,
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

  return (
    <Sheet title={existing ? "Edit partner payment" : "Record partner payment"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Partner">
          <select className={fieldClass} value={selectedPartner} onChange={(event) => setSelectedPartner(event.target.value)}>
            {partners.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Settlement month">
          <select className={fieldClass} value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {months.map((item) => (
              <option key={`${item.year}-${item.month}`} value={`${item.year}-${item.month}`}>
                {formatMonthLabel(item.year, item.month)}
              </option>
            ))}
          </select>
        </Field>
        <MoneyInput label="Amount paid" value={amountRaw} onChange={setAmountRaw} allowZero={false} />
        <Field label="Payment date">
          <input type="date" className={fieldClass} value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Payment method">
          <select className={fieldClass} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.filter((item) => item.value !== "JAZZCASH").map((item) => (
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
