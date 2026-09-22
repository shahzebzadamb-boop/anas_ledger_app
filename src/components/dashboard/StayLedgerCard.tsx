"use client";

import { useState } from "react";
import { formatDate, formatStayDates } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { displayPhone } from "@/lib/phone";
import type { StayLedgerRow } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { EntryEditor } from "@/components/dashboard/EntryEditor";

function MoneyRow({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-normal text-muted">{label}</span>
      <span className={cn("money text-sm", accent ?? "text-foreground")}>{formatPKR(value)}</span>
    </div>
  );
}

export function StayLedgerCard({
  row,
  showFlat,
}: {
  row: StayLedgerRow;
  showFlat: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<{ kind: "stay" | "payment"; id: string } | null>(null);

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        className="w-full px-3.5 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.clientName}</p>
            <p className="mt-0.5 text-xs font-normal text-muted">
              {showFlat ? `Flat ${row.flat} · ` : ""}
              {row.nights} night{row.nights === 1 ? "" : "s"}
              {showFlat ? "" : ` · ${formatStayDates(row.checkIn, row.checkOut)}`}
            </p>
          </div>
          <p className={cn("shrink-0 text-[11px] font-medium", row.pending > 0 ? "text-warning" : "text-muted")}>
            {row.status}
          </p>
        </div>
        <div className="mt-2 space-y-1">
          <MoneyRow label="Business" value={row.business} />
          <MoneyRow label="Received" value={row.received} accent="text-primary" />
          <MoneyRow label="Pending" value={row.pending} accent={row.pending > 0 ? "text-warning" : undefined} />
        </div>
        {row.methods.length > 0 ? (
          <p className="mt-2 text-xs font-normal text-muted">
            {row.methods.join(" · ")}
            {row.receivedBy.length > 0 ? ` · Received by ${row.receivedBy.join(", ")}` : ""}
          </p>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-2.5 border-t border-border px-3.5 py-3">
          {showFlat ? (
            <p className="text-xs font-normal text-muted">{formatStayDates(row.checkIn, row.checkOut)}</p>
          ) : null}
          {row.phone ? <p className="text-xs font-normal text-muted">{displayPhone(row.phone)}</p> : null}
          <button
            type="button"
            className="text-sm font-medium text-secondary"
            onClick={() => setEdit({ kind: "stay", id: row.stayId })}
          >
            Edit
          </button>
          {row.payments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payments</p>
              {row.payments.map((payment) => (
                <button
                  key={payment.id}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setEdit({ kind: "payment", id: payment.id })}
                >
                  <p className="text-xs font-normal text-muted">{formatDate(payment.receivedAt)}</p>
                  <p className="text-sm">
                    <span className="money">{formatPKR(payment.amount)}</span>
                    <span className="text-muted"> · {payment.method}</span>
                  </p>
                  <p className="text-xs font-normal text-muted">Received by {payment.receivedBy}</p>
                </button>
              ))}
              <MoneyRow label="Total received" value={row.received} accent="text-primary" />
              <MoneyRow label="Pending" value={row.pending} accent={row.pending > 0 ? "text-warning" : undefined} />
            </div>
          ) : (
            <p className="text-xs font-normal text-muted">No payments yet.</p>
          )}
          {row.security.map((item) => (
            <p key={item.id} className="text-xs font-normal text-muted">
              {item.kind === "RECEIVED" ? "Security" : "Security applied"} {formatPKR(item.amount)}
            </p>
          ))}
          {row.discounts.map((item) => (
            <p key={item.id} className="text-xs font-normal text-muted">
              Discount {formatPKR(item.amount)}
              {item.note ? ` · ${item.note}` : ""}
            </p>
          ))}
          {row.extensionNotes.map((note) => (
            <p key={note} className="text-xs font-normal text-muted">
              {note}
            </p>
          ))}
        </div>
      ) : null}
      {edit ? <EntryEditor kind={edit.kind} id={edit.id} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}
