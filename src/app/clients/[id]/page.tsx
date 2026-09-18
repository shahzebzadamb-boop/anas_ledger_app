"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import {
  clientBalance,
  computeReceivableStatus,
  remainingForReceivable,
  whatsappLink,
} from "@/lib/ledger";
import { formatFlat, formatPKR, methodLabel } from "@/lib/money";
import { useLedger } from "@/lib/store";

function statusTone(status: string) {
  if (status === "OVERDUE") return "danger" as const;
  if (status === "PAID") return "success" as const;
  if (status === "PARTIAL") return "warning" as const;
  return "neutral" as const;
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const { state } = useLedger();
  const client = state.clients.find((item) => item.id === params.id);

  if (!client) {
    return (
      <div className="space-y-4">
        <PageHeader title="Client not found" />
        <Link href="/clients" className="text-sm underline">
          Back to clients
        </Link>
      </div>
    );
  }

  const balance = clientBalance(client.id, state);
  const receivables = state.receivables.filter((item) => item.clientId === client.id);
  const payments = state.payments.filter((item) => item.clientId === client.id);
  const message = `Hi ${client.name}, just a reminder that Rs ${Math.max(0, balance).toLocaleString("en-PK")} is still pending. Thank you.`;

  return (
    <div className="space-y-4">
      <PageHeader title={client.name} subtitle={client.notes ?? "Client ledger"} />
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Balance</p>
        <p className="mt-2 text-2xl font-semibold">{formatPKR(balance)}</p>
        <p className="mt-1 text-sm text-muted">Total receivables − total payments</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium"
            href={client.phone ? `tel:+${client.phone}` : undefined}
          >
            <Phone size={16} /> Call
          </a>
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium"
            href={client.phone ? whatsappLink(client.phone, message) : undefined}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Receivables</h2>
        {receivables.map((item) => {
          const status = computeReceivableStatus(item, state.payments);
          return (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{formatPKR(remainingForReceivable(item, state.payments))} remaining</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatPKR(item.totalAmount)} total · due {formatDate(item.dueDate)}
                    {item.flat ? ` · ${formatFlat(item.flat)}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone(status)}>{status}</Badge>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Payments</h2>
        {payments.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{formatPKR(item.amount)}</p>
              <p className="mt-1 text-sm text-muted">
                {item.kind === "REFUND" ? "Refund" : methodLabel(item.method)} · {formatDate(item.receivedAt)}
              </p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
