"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import {
  clientProfile,
  flatName,
  receiverName,
  reminderMessage,
  stayCollectible,
  stayRemaining,
  stayRevenue,
  whatsappLink,
} from "@/lib/ledger";
import { formatPKR, methodLabel } from "@/lib/money";
import { displayPhone } from "@/lib/phone";
import { useLedger } from "@/lib/store";
import { EntryEditor } from "@/components/dashboard/EntryEditor";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, persist } = useLedger();
  const [phone, setPhone] = useState("");
  const [edit, setEdit] = useState<{ kind: "stay" | "payment" | "security"; id: string } | null>(null);
  const client = state.clients.find((item) => item.id === params.id);

  if (!client) {
    return (
      <div className="space-y-4">
        <PageHeader title="Client not found" />
        <Link href="/clients" className="text-sm font-medium text-secondary">Back to clients</Link>
      </div>
    );
  }

  const profile = clientProfile(client.id, state);
  const message = reminderMessage({
    stayId: profile.stays[0]?.id ?? "",
    clientId: client.id,
    clientName: client.name,
    phone: client.phone,
    remaining: profile.currentlyPending,
    flat: profile.lastFlat ?? "",
    checkOut: profile.lastStay ?? "",
  });

  return (
    <div className="space-y-4">
      <PageHeader title={client.name} subtitle={displayPhone(client.phone)} />
      {client.phone ? (
        <a
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-primary text-sm font-semibold text-primary"
          href={whatsappLink(client.phone, message)}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      ) : (
        <div className="space-y-2">
          <input
            className="w-full rounded-xl border border-border bg-input px-3 text-base"
            placeholder="Add customer number"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              if (!phone.trim()) return;
              void persist({ type: "SET_CLIENT_PHONE", clientId: client.id, phone }).then(() => setPhone(""));
            }}
          >
            Save phone
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Summary label="Stays" value={String(profile.totalStays)} />
        <Summary label="Business" value={formatPKR(profile.lifetimeBusiness)} money />
        <Summary label="Received" value={formatPKR(profile.totalReceived)} money accent="text-primary" />
        <Summary
          label="Pending"
          value={formatPKR(profile.currentlyPending)}
          money
          accent={profile.currentlyPending > 0 ? "text-warning" : undefined}
        />
        <Summary label="Security" value={formatPKR(profile.securityHeld)} money />
        <Summary label="Last flat" value={profile.lastFlat ?? "—"} />
      </div>
      <p className="text-sm font-normal text-muted">
        Last stay {profile.lastStay ? formatDate(profile.lastStay) : "—"}
      </p>

      {profile.stays.map((stay) => (
        <button
          key={stay.id}
          type="button"
          className="w-full border-b border-border py-2.5 text-left last:border-b-0"
          onClick={() => setEdit({ kind: "stay", id: stay.id })}
        >
          <p className="font-semibold">Flat {flatName(state, stay.flatId)}</p>
          <p className="mt-0.5 text-sm font-normal text-muted">
            {formatDate(stay.checkIn)} · {stay.nights} days
          </p>
          <p className="mt-1 text-sm font-normal text-secondary">
            Revenue <span className="money text-foreground">{formatPKR(stayRevenue(stay.id, state))}</span>
            {" · "}Collectible <span className="money text-foreground">{formatPKR(stayCollectible(stay.id, state))}</span>
            {" · "}Pending <span className="money text-warning">{formatPKR(stayRemaining(stay.id, state))}</span>
          </p>
        </button>
      ))}

      <section>
        <h2 className="section-title mb-2">History</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface empty:hidden">
          {state.rentEntries.filter((item) => item.clientId === client.id && !item.voided).map((item) => (
            <TimelineRow
              key={item.id}
              title={`Rent ${formatPKR(item.amount)}`}
              detail={`${formatDate(item.occurredAt)}${item.note ? ` · ${item.note}` : ""}`}
            />
          ))}
          {state.payments.filter((item) => item.clientId === client.id && !item.voided).map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full border-b border-border px-3.5 py-2.5 text-left last:border-b-0"
              onClick={() => setEdit({ kind: "payment", id: item.id })}
            >
              <p className="text-xs font-normal text-muted">{formatDate(item.receivedAt)}</p>
              <p className="mt-0.5 text-sm font-medium">{formatPKR(item.amount)}</p>
              <p className="mt-0.5 text-xs font-normal text-muted">
                {methodLabel(item.method)} · {receiverName(state, item.receivedById)}
              </p>
              {item.flatId ? (
                <p className="mt-0.5 text-xs font-normal text-muted">Flat {flatName(state, item.flatId)}</p>
              ) : null}
            </button>
          ))}
          {state.security.filter((item) => item.clientId === client.id && !item.voided).map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full text-left"
              onClick={() => setEdit({ kind: "security", id: item.id })}
            >
              <TimelineRow
                title={`${item.kind === "RECEIVED" ? "Security" : "Security adjusted"} ${formatPKR(item.amount)}`}
                detail={formatDate(item.occurredAt)}
              />
            </button>
          ))}
          {state.discounts.filter((item) => item.clientId === client.id && !item.voided).map((item) => (
            <TimelineRow
              key={item.id}
              title={`Discount ${formatPKR(item.amount)}`}
              detail={formatDate(item.occurredAt)}
            />
          ))}
        </div>
      </section>
      {edit ? <EntryEditor kind={edit.kind} id={edit.id} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function Summary({
  label,
  value,
  money,
  accent,
}: {
  label: string;
  value: string;
  money?: boolean;
  accent?: string;
}) {
  return (
    <Card className="p-3">
      <p className="card-label">{label}</p>
      <p className={`${money ? "money" : "font-semibold"} mt-1.5 text-base ${accent ?? "text-foreground"}`}>
        {value}
      </p>
    </Card>
  );
}

function TimelineRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b border-border px-3.5 py-2.5 last:border-b-0">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs font-normal text-muted">{detail}</p>
    </div>
  );
}
