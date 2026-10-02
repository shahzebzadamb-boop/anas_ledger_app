"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import {
  activeFlats,
  archivedFlats,
  findFlatByCode,
  flatHasHistory,
  isFlatActive,
  normalizeFlatCode,
} from "@/lib/flats";
import { useLedger } from "@/lib/store";

export function ApartmentsSettings({
  addOpen,
  onAddOpenChange,
}: {
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
}) {
  const { state, persist } = useLedger();
  const [localOpen, setLocalOpen] = useState(false);
  const open = addOpen ?? localOpen;
  function setOpen(next: boolean) {
    setLocalOpen(next);
    onAddOpenChange?.(next);
  }
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDisplay, setEditDisplay] = useState("");
  const active = useMemo(() => activeFlats(state), [state]);
  const archived = useMemo(() => archivedFlats(state), [state]);
  const editing = state.flats.find((flat) => flat.id === editId) ?? null;

  function openAdd() {
    setError(null);
    setCode("");
    setDisplayName("");
    setOpen(true);
  }

  async function addApartment() {
    const name = normalizeFlatCode(code);
    if (!name) {
      setError("Use a flat code like 912-C.");
      return;
    }
    const existing = findFlatByCode(state, name);
    if (existing) {
      setError(`${existing.name} already exists.`);
      return;
    }
    setError(null);
    await persist({ type: "ADD_FLAT", payload: { name, displayName: displayName.trim() || null } });
    setCode("");
    setDisplayName("");
    setOpen(false);
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="section-title">Apartments</h2>
        <p className="mt-1 text-sm font-normal text-muted">Manage the apartments used in Anas Ledger</p>
      </div>
      <Button variant="primary" className="w-full" onClick={openAdd}>
        + Add Apartment
      </Button>
      <Card className="space-y-2">
        {active.map((flat) => (
          <div key={flat.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
            <div className="min-w-0">
              <p className="text-sm font-medium">{flat.name}</p>
              <p className="text-xs font-normal text-muted">{flat.displayName ?? "Active"}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="min-h-11 text-sm font-medium text-secondary"
                onClick={() => {
                  setEditId(flat.id);
                  setEditDisplay(flat.displayName ?? "");
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="min-h-11 text-sm font-medium text-warning"
                onClick={() => {
                  if (flatHasHistory(state, flat.id)) {
                    void persist({ type: "ARCHIVE_FLAT", flatId: flat.id });
                    return;
                  }
                  if (window.confirm(`Delete unused apartment ${flat.name}?`)) {
                    void persist({ type: "DELETE_FLAT", flatId: flat.id });
                  }
                }}
              >
                {flatHasHistory(state, flat.id) ? "Archive" : "Delete"}
              </button>
            </div>
          </div>
        ))}
        {active.length === 0 ? <p className="text-sm font-normal text-muted">No active apartments.</p> : null}
      </Card>
      {archived.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted">Archived</h3>
          <Card className="space-y-2">
            {archived.map((flat) => (
              <div key={flat.id} className="flex items-center justify-between gap-3 py-1">
                <p className="text-sm">{flat.name}</p>
                <button type="button" className="min-h-11 text-sm font-medium text-secondary" onClick={() => void persist({ type: "RESTORE_FLAT", flatId: flat.id })}>
                  Restore
                </button>
              </div>
            ))}
          </Card>
        </div>
      ) : null}

      {open ? (
        <Sheet title="Add Apartment" onClose={() => setOpen(false)}>
          {error ? <p className="mb-3 text-sm text-warning">{error}</p> : null}
          <label className="block text-sm font-medium">
            Apartment / Flat Number *
            <input className="mt-1 w-full rounded-xl border border-border bg-input px-3 text-base" value={code} onChange={(event) => setCode(event.target.value)} placeholder="912-C" />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Display name (optional)
            <input className="mt-1 w-full rounded-xl border border-border bg-input px-3 text-base" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Centaurus 912-C" />
          </label>
          <Button className="mt-4 w-full" variant="primary" onClick={() => void addApartment()}>
            Add Apartment
          </Button>
        </Sheet>
      ) : null}

      {editing ? (
        <Sheet title={`Edit ${editing.name}`} onClose={() => setEditId(null)}>
          <p className="mb-3 text-sm font-normal text-muted">
            {isFlatActive(editing) && flatHasHistory(state, editing.id)
              ? "The apartment code stays locked because it has history."
              : "Display name can be changed any time."}
          </p>
          <label className="block text-sm font-medium">
            Display name
            <input className="mt-1 w-full rounded-xl border border-border bg-input px-3 text-base" value={editDisplay} onChange={(event) => setEditDisplay(event.target.value)} />
          </label>
          <Button
            className="mt-4 w-full"
            variant="primary"
            onClick={() => {
              void persist({ type: "UPDATE_FLAT", payload: { flatId: editing.id, displayName: editDisplay } });
              setEditId(null);
            }}
          >
            Save
          </Button>
        </Sheet>
      ) : null}
    </section>
  );
}
