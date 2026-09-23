"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Sheet, fieldClass } from "@/components/ui/Sheet";
import { dateInputToISO, formatDateShort, karachiDateInput, nightsBetween } from "@/lib/dates";
import { formatPKR, parseFormAmount } from "@/lib/money";
import { displayPhone, normalizePhone } from "@/lib/phone";
import { useLedger } from "@/lib/store";
import { FLAT_NAMES, PAYMENT_METHODS, type PaymentMethod } from "@/types";

export function AddStaySheet({
  defaultFlat,
  onClose,
  onAdded,
}: {
  defaultFlat?: string;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { persist, state } = useLedger();
  const today = karachiDateInput();
  const [flat, setFlat] = useState(
    defaultFlat && defaultFlat !== "all" ? defaultFlat : (state.flats[0]?.name ?? FLAT_NAMES[0]),
  );
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState("");
  const [businessRaw, setBusinessRaw] = useState("");
  const [receivedRaw, setReceivedRaw] = useState("0");
  const [securityRaw, setSecurityRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [receivedById, setReceivedById] = useState(
    state.receivers.find((item) => item.name === "Anas")?.id ?? "recv_anas",
  );
  const [newReceiver, setNewReceiver] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [overpayOk, setOverpayOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return nightsBetween(dateInputToISO(checkIn), dateInputToISO(checkOut));
  }, [checkIn, checkOut]);
  const business = parseFormAmount(businessRaw, false);
  const received = parseFormAmount(receivedRaw, true) ?? 0;
  const security = securityRaw.trim() === "" ? 0 : parseFormAmount(securityRaw, true);
  const pending = business == null ? 0 : Math.max(0, business - received);
  const overpay = business != null && received > business ? received - business : 0;
  const activeReceivers = state.receivers.filter((item) => item.active);
  const addingReceiver = receivedById === "__new";

  function validate(): string | null {
    if (!flat) return "Choose a flat.";
    if (!clientName.trim()) return "Enter the client name.";
    if (!normalizePhone(phone)) return "Enter a valid phone number.";
    if (!checkIn || !checkOut) return "Choose check-in and check-out.";
    if (nights < 1) return "Checkout must be after check-in.";
    if (business == null) return "Enter a valid total rent.";
    if (parseFormAmount(receivedRaw, true) == null) return "Enter a valid amount received.";
    if (security == null) return "Enter a valid security amount, or leave it blank.";
    if (received > 0 && addingReceiver && !newReceiver.trim()) return "Enter the receiver name.";
    if (overpay > 0 && !overpayOk) {
      return `This is ${formatPKR(overpay)} more than the business amount.`;
    }
    return null;
  }

  async function save() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    if (!confirm) {
      setConfirm(true);
      setError(null);
      return;
    }
    if (saving || business == null) return;
    setSaving(true);
    try {
      await persist({
        type: "ADD_STAY",
        payload: {
          flat,
          clientName: clientName.trim(),
          phone,
          checkIn: dateInputToISO(checkIn),
          checkOut: dateInputToISO(checkOut),
          nights,
          business,
          received,
          method: received > 0 ? method : undefined,
          receivedById: received > 0 && !addingReceiver ? receivedById : undefined,
          receivedByName: received > 0 && addingReceiver ? newReceiver.trim() : undefined,
          security: security || undefined,
          notes: notes.trim() || null,
        },
      });
      onAdded?.();
      onClose();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={confirm ? "Add stay" : "Add stay / booking"} onClose={onClose}>
      {error ? <p className="mb-3 text-sm font-normal text-warning">{error}</p> : null}

      {confirm ? (
        <div className="space-y-2 text-sm">
          <p className="text-base font-medium">{clientName.trim()}</p>
          <p className="font-normal text-muted">
            {flat}
            {phone ? ` · ${displayPhone(phone)}` : ""}
          </p>
          <p className="font-normal text-muted">
            {formatDateShort(dateInputToISO(checkIn))} → {formatDateShort(dateInputToISO(checkOut))}
            {` · ${nights} night${nights === 1 ? "" : "s"}`}
          </p>
          <MoneyLine label="Business" value={business ?? 0} />
          <MoneyLine label="Received" value={received} accent="text-primary" />
          <MoneyLine label="Pending" value={pending} accent={pending > 0 ? "text-warning" : undefined} />
          {received > 0 ? (
            <p className="font-normal text-muted">
              {PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method}
              {" · Received by "}
              {addingReceiver
                ? newReceiver.trim()
                : (activeReceivers.find((item) => item.id === receivedById)?.name ?? "Anas")}
            </p>
          ) : null}
          {security ? <MoneyLine label="Security" value={security} /> : null}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button onClick={() => setConfirm(false)}>Edit</Button>
            <Button variant="primary" disabled={saving} onClick={() => void save()}>
              Confirm
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Flat *">
            <select className={fieldClass} value={flat} onChange={(event) => setFlat(event.target.value)}>
              {state.flats.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Client name *">
            <input
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              className={fieldClass}
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Tufail Khan"
            />
          </Field>
          <Field label="Phone number *">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={fieldClass}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="03001234567"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Check-in *">
              <input
                type="date"
                className={fieldClass}
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
              />
            </Field>
            <Field label="Check-out *">
              <input
                type="date"
                className={fieldClass}
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
              />
            </Field>
          </div>
          <p className={nights < 1 ? "text-sm font-medium text-warning" : "text-sm font-medium"}>
            {nights < 1 ? "Checkout must be after check-in." : `${nights} Night${nights === 1 ? "" : "s"}`}
          </p>
          <Field label="Total rent / Business *">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={fieldClass}
              value={businessRaw}
              onChange={(event) => {
                setBusinessRaw(event.target.value);
                setOverpayOk(false);
              }}
              placeholder="60000"
            />
            {business != null ? <p className="mt-1 money text-sm text-muted">{formatPKR(business)}</p> : null}
          </Field>
          <Field label="Amount received">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={fieldClass}
              value={receivedRaw}
              onChange={(event) => {
                setReceivedRaw(event.target.value);
                setOverpayOk(false);
              }}
              placeholder="0"
            />
            {parseFormAmount(receivedRaw, true) != null ? (
              <p className="mt-1 money text-sm text-muted">{formatPKR(received)}</p>
            ) : null}
          </Field>
          <div>
            <p className="text-sm font-medium">Pending</p>
            <p className={`money mt-1 text-lg ${pending > 0 ? "text-warning" : "text-foreground"}`}>
              {formatPKR(pending)}
            </p>
          </div>
          {received > 0 ? (
            <>
              <Field label="Payment method">
                <select
                  className={fieldClass}
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Received by">
                <select
                  className={fieldClass}
                  value={receivedById}
                  onChange={(event) => setReceivedById(event.target.value)}
                >
                  {activeReceivers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                  <option value="__new">Add new…</option>
                </select>
              </Field>
              {addingReceiver ? (
                <Field label="New receiver">
                  <input
                    type="text"
                    autoCapitalize="words"
                    className={fieldClass}
                    value={newReceiver}
                    onChange={(event) => setNewReceiver(event.target.value)}
                    placeholder="Name"
                  />
                </Field>
              ) : null}
            </>
          ) : null}
          <Field label="Security deposit">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={fieldClass}
              value={securityRaw}
              onChange={(event) => setSecurityRaw(event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Notes">
            <input
              type="text"
              className={fieldClass}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="late checkout, repeat guest"
            />
          </Field>
          {overpay > 0 ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-sm font-normal text-warning">
                This is {formatPKR(overpay)} more than the business amount.
              </p>
              <Button onClick={() => setOverpayOk(true)}>Record anyway</Button>
            </div>
          ) : null}
          <div className="rounded-xl border border-border p-3">
            <p className="text-sm font-medium">
              {nights > 0 ? `${nights} Night${nights === 1 ? "" : "s"}` : "Dates"} · {flat}
            </p>
            <div className="mt-2 space-y-1">
              <MoneyLine label="Business" value={business ?? 0} />
              <MoneyLine label="Received" value={received} accent="text-primary" />
              <MoneyLine label="Pending" value={pending} accent={pending > 0 ? "text-warning" : undefined} />
              <MoneyLine label="Security" value={security ?? 0} />
            </div>
          </div>
          <Button variant="primary" className="w-full" disabled={saving} onClick={() => void save()}>
            Add Stay
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function MoneyLine({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-normal text-muted">{label}</span>
      <span className={`money text-sm ${accent ?? "text-foreground"}`}>{formatPKR(value)}</span>
    </div>
  );
}
