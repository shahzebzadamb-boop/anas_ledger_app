"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PAYMENT_METHODS } from "@/types";
import { useLedger } from "@/lib/store";
import { formatPKR } from "@/lib/money";

export function RecordPaymentModal({
  clientId,
  stayId,
  remaining,
  clientName,
  onClose,
}: {
  clientId: string;
  stayId: string;
  remaining: number;
  clientName: string;
  onClose: () => void;
}) {
  const { persist } = useLedger();
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4">
        <h3 className="section-title">Record payment</h3>
        <p className="mt-1 text-sm font-normal text-muted">
          {clientName} · remaining {formatPKR(remaining)}
        </p>
        <label className="mt-4 block text-sm font-medium">
          Amount
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-xl border border-border bg-input px-3 text-base"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Method
          <select
            className="mt-1 w-full rounded-xl border border-border bg-input px-3 text-base"
            value={method}
            onChange={(event) => setMethod(event.target.value as typeof method)}
          >
            {PAYMENT_METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const value = Number(amount);
              if (!value || value <= 0) return;
              void persist({
                type: "RECORD_PAYMENT",
                payload: { clientId, stayId, amount: value, method },
              }).then(() => onClose());
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
