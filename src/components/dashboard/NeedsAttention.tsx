"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RecordPaymentModal } from "@/components/dashboard/RecordPaymentModal";
import { dueLabel } from "@/lib/dates";
import { reminderMessage, whatsappLink } from "@/lib/ledger";
import { formatFlat, formatPKR } from "@/lib/money";
import type { AttentionItem } from "@/types";

function AttentionCard({ item }: { item: AttentionItem }) {
  const [open, setOpen] = useState(false);
  const due = dueLabel(item.dueDate);
  const overdue = item.urgency === "overdue";

  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.clientName}</p>
          {item.flat ? <p className="mt-0.5 text-sm text-muted">{formatFlat(item.flat)}</p> : null}
          <p className={`mt-0.5 text-sm ${overdue ? "text-danger" : "text-muted"}`}>{due}</p>
        </div>
        <p className="text-lg font-semibold">{formatPKR(item.remaining)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => setOpen(true)}>
          Record Payment
        </Button>
        {item.phone ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium"
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
          receivableId={item.receivableId}
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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Needs attention</h2>
      {items.length === 0 ? (
        <Card className="p-3">
          <p className="text-sm text-muted">Nothing needs attention right now.</p>
        </Card>
      ) : (
        items.map((item) => <AttentionCard key={item.receivableId} item={item} />)
      )}
    </section>
  );
}
