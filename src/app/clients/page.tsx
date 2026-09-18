"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { clientBalance } from "@/lib/ledger";
import { formatPKR } from "@/lib/money";
import { useLedger } from "@/lib/store";

export default function ClientsPage() {
  const { state } = useLedger();
  const clients = [...state.clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <PageHeader title="Clients" subtitle="People who owe or pay money." />
      {clients.map((client) => {
        const balance = clientBalance(client.id, state);
        return (
          <Link key={client.id} href={`/clients/${client.id}`} className="block">
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {client.phone ? `+${client.phone}` : "No phone"}
                </p>
              </div>
              <p className={`text-base font-semibold ${balance > 0 ? "text-warning" : "text-success"}`}>
                {formatPKR(balance)}
              </p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
