"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { formatDate } from "@/lib/dates";
import { formatPKR, methodLabel } from "@/lib/money";
import { useLedger } from "@/lib/store";

export default function PaymentsPage() {
  const { state } = useLedger();
  const payments = [...state.payments].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" subtitle="Money received toward rent." />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0">
            <div className="min-w-0">
              <p className="font-medium">
                {state.clients.find((client) => client.id === payment.clientId)?.name ?? "Customer"}
              </p>
              <p className="mt-0.5 text-sm font-normal text-muted">
                {methodLabel(payment.method)} · {formatDate(payment.receivedAt)}
              </p>
            </div>
            <p className="money shrink-0 text-sm">{formatPKR(payment.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
