"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import { formatPKR, methodLabel } from "@/lib/money";
import { useLedger } from "@/lib/store";
import { PAYMENT_METHODS } from "@/types";

export default function PaymentsPage() {
  const { state, dispatch } = useLedger();
  const [clientId, setClientId] = useState(state.clients[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);

  const payments = [...state.payments].sort((a, b) =>
    a.receivedAt < b.receivedAt ? 1 : -1,
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" subtitle="Money actually received from clients." />
      <Card className="space-y-3">
        <h2 className="font-medium">Record payment</h2>
        <select
          className="w-full rounded-xl border border-border bg-surface px-3"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        >
          {state.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          placeholder="Amount"
          className="w-full rounded-xl border border-border px-3"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <select
          className="w-full rounded-xl border border-border bg-surface px-3"
          value={method}
          onChange={(event) => setMethod(event.target.value as typeof method)}
        >
          {PAYMENT_METHODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            const value = Number(amount);
            if (!value || !clientId) return;
            dispatch({
              type: "RECORD_PAYMENT",
              payload: { clientId, amount: value, method },
            });
            setAmount("");
          }}
        >
          Save payment
        </Button>
      </Card>
      {payments.map((payment) => {
        const client = state.clients.find((item) => item.id === payment.clientId);
        return (
          <Card key={payment.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{client?.name ?? "Client"}</p>
              <p className="mt-1 text-sm text-muted">
                {payment.kind === "REFUND" ? "Refund" : methodLabel(payment.method)} · {formatDate(payment.receivedAt)}
              </p>
            </div>
            <p className={`font-semibold ${payment.kind === "REFUND" ? "text-danger" : "text-success"}`}>
              {payment.kind === "REFUND" ? "−" : "+"}
              {formatPKR(payment.amount)}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
