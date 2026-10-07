"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Sheet, fieldClass } from "@/components/ui/Sheet";
import { findPartnerByName, isAnasName } from "@/lib/partners";
import { useLedger } from "@/lib/store";

export function AddPartnerSheet({
  existingId,
  onClose,
}: {
  existingId?: string | null;
  onClose: () => void;
}) {
  const { persist, state } = useLedger();
  const existing = existingId ? state.partners.find((item) => item.id === existingId) : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (isAnasName(trimmed)) {
      setError("Anas is the owner, not an external partner.");
      return;
    }
    const duplicate = findPartnerByName(state, trimmed);
    if (duplicate && duplicate.id !== existing?.id) {
      setError("A partner with this name already exists.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await persist({
          type: "EDIT_PARTNER",
          payload: { id: existing.id, name: trimmed, phone, notes, active },
        });
      } else {
        await persist({
          type: "ADD_PARTNER",
          payload: { name: trimmed, phone, notes, active },
        });
      }
      onClose();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={existing ? "Edit partner" : "Add Partner"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name *">
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Khizer" />
        </Field>
        <Field label="Phone">
          <input className={fieldClass} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="Optional" />
        </Field>
        <Field label="Notes">
          <input className={fieldClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
        {error ? <p className="text-sm text-warning">{error}</p> : null}
        <Button variant="primary" className="w-full" disabled={saving} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Sheet>
  );
}
