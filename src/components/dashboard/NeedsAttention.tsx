"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RecordPaymentModal } from "@/components/dashboard/RecordPaymentModal";
import { overdueDays } from "@/lib/dates";
import { reminderMessage, whatsappLink } from "@/lib/ledger";
import { formatPKR } from "@/lib/money";
import type { AttentionItem } from "@/types";

function AttentionCard({ item }: { item: AttentionItem }) {
  const [open, setOpen] = useState(false);
  const overdue = overdueDays(item.checkOut) > 0;

  return (
    <Card className="space-y-2.5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{item.clientName}</p>
          <p className="mt-0.5 text-sm font-normal text-muted">Flat {item.flat}</p>
          <p className={`mt-0.5 text-sm font-medium ${overdue ? "text-danger" : "text-warning"}`}>
            {overdue ? "Overdue" : "Pending"}
          </p>
        </div>
        <p className={`money text-base ${overdue ? "text-danger" : "text-warning"}`}>
          {formatPKR(item.remaining)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Record Payment
        </Button>
        {item.phone ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary text-sm font-semibold text-primary"
            href={whatsappLink(item.phone, reminderMessage(item))}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        ) : (
          <Button disabled>WhatsApp</Button>
        )}
      </div>
      {open ? (
        <RecordPaymentModal
          clientId={item.clientId}
          stayId={item.stayId}
          remaining={item.remaining}
          clientName={item.clientName}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Card>
  );
}

export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <section className="space-y-2.5">
      <h2 className="section-title">Needs attention</h2>
      {items.length === 0 ? (
        <Card className="p-3">
          <p className="text-sm font-normal text-muted">No confirmed unpaid balances.</p>
        </Card>
      ) : (
        items.map((item) => <AttentionCard key={item.stayId} item={item} />)
      )}
    </section>
  );
}
