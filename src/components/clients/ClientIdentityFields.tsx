"use client";

import { useEffect, useMemo, useState } from "react";
import { Contact } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/ui/Sheet";
import {
  contactsPickerSupported,
  isLikelyIosDevice,
  pickContact,
} from "@/lib/contact-picker";
import { findClientByPhone, suggestClients } from "@/lib/ledger";
import { displayPhone, displayPhoneSpaced, normalizePhone } from "@/lib/phone";
import type { LedgerState } from "@/types";

export function ClientIdentityFields({
  nameId = "client-name",
  phoneId = "client-phone",
  name,
  phone,
  state,
  onNameChange,
  onPhoneChange,
  onUseExisting,
  phoneRequired = true,
  hideName = false,
}: {
  nameId?: string;
  phoneId?: string;
  name: string;
  phone: string;
  state: LedgerState;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onUseExisting?: (clientId: string) => void;
  phoneRequired?: boolean;
  hideName?: boolean;
}) {
  const [pickerAvailable, setPickerAvailable] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [phoneChoices, setPhoneChoices] = useState<string[]>([]);
  const [pendingContactName, setPendingContactName] = useState("");

  useEffect(() => {
    const supported = contactsPickerSupported();
    setPickerAvailable(supported);
    setIosHint(!supported && isLikelyIosDevice());
  }, []);

  const existing = useMemo(() => findClientByPhone(state, phone), [state, phone]);
  const suggestions = useMemo(() => {
    if (existing) return [];
    return suggestClients(state, name).filter((client) => client.name.toLowerCase() !== name.trim().toLowerCase());
  }, [existing, name, state]);

  function applyPickedPhone(raw: string, contactName: string) {
    setPhoneChoices([]);
    setPendingContactName("");
    if (!hideName) {
      const match = findClientByPhone(state, raw);
      if (match) {
        onNameChange(match.name);
        onPhoneChange(displayPhone(match.phone));
        return;
      }
      if (contactName) onNameChange(contactName);
    }
    onPhoneChange(displayPhone(raw));
  }

  async function chooseContact() {
    setPickerError(null);
    const result = await pickContact();
    if (result.status === "cancelled") return;
    if (result.status === "error") {
      setPickerError("Could not open contacts");
      return;
    }
    const nextName = result.contact.name;
    if (result.contact.phones.length === 1) {
      applyPickedPhone(result.contact.phones[0], nextName);
      return;
    }
    if (result.contact.phones.length > 1) {
      setPendingContactName(nextName);
      setPhoneChoices(result.contact.phones);
    }
  }

  function useClient(clientId: string) {
    const client = state.clients.find((item) => item.id === clientId);
    if (!client) return;
    onNameChange(client.name);
    if (client.phone) onPhoneChange(displayPhone(client.phone));
    setPhoneChoices([]);
    onUseExisting?.(client.id);
  }

  return (
    <div className="space-y-3">
      {hideName ? null : (
        <>
          <label className="block text-sm font-medium" htmlFor={nameId}>
            Name {phoneRequired ? "*" : ""}
            <input
              id={nameId}
              name="name"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              className={`${fieldClass} mt-1`}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Tufail Khan"
            />
          </label>
          {suggestions.length > 0 ? (
            <div className="space-y-1">
              {suggestions.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className="chip w-full justify-start"
                  onClick={() => useClient(client.id)}
                >
                  {client.name}
                  {client.phone ? ` · ${displayPhone(client.phone)}` : ""}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
      <label className="block text-sm font-medium" htmlFor={phoneId}>
        Phone {phoneRequired ? "*" : ""}
        <input
          id={phoneId}
          name="tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoCorrect="off"
          spellCheck={false}
          className={`${fieldClass} mt-1`}
          value={phone}
          onChange={(event) => {
            onPhoneChange(event.target.value);
            setPhoneChoices([]);
          }}
          placeholder="03001234567"
        />
      </label>
      {phone && !normalizePhone(phone) ? (
        <p className="text-sm font-normal text-warning">Enter a valid phone number.</p>
      ) : null}
      {pickerAvailable ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary"
          onClick={() => void chooseContact()}
        >
          <Contact className="h-4 w-4" aria-hidden="true" />
          From Contacts
        </button>
      ) : iosHint ? (
        <p className="text-[11px] font-normal text-muted">Use AutoFill Contact above keyboard</p>
      ) : null}
      {pickerError ? <p className="text-sm font-normal text-warning">{pickerError}</p> : null}
      {phoneChoices.length > 1 ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">Choose number</p>
          {phoneChoices.map((item) => (
            <button
              key={item}
              type="button"
              className="chip w-full justify-start"
              onClick={() => applyPickedPhone(item, pendingContactName)}
            >
              {displayPhoneSpaced(item)}
            </button>
          ))}
        </div>
      ) : null}
      {existing ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">Existing client found</p>
          <p className="text-sm">{existing.name}</p>
          <p className="text-sm font-normal text-muted">{displayPhoneSpaced(existing.phone)}</p>
          <Button type="button" className="w-full" onClick={() => useClient(existing.id)}>
            Use Client
          </Button>
        </div>
      ) : null}
    </div>
  );
}
