"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLedger } from "@/lib/store";

export default function SettingsPage() {
  const { state, persist } = useLedger();
  const [names, setNames] = useState(() => Object.fromEntries(state.flats.map((flat) => [flat.id, flat.name])));

  useEffect(() => {
    setNames(Object.fromEntries(state.flats.map((flat) => [flat.id, flat.name])));
  }, [state.flats]);

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Flat names can be edited here." />
      {state.flats.map((flat) => (
        <Card key={flat.id} className="space-y-2">
          <label className="text-sm text-muted">Flat name</label>
          <input
            className="w-full rounded-xl border border-border bg-input px-3 text-base"
            value={names[flat.id] ?? flat.name}
            onChange={(event) => setNames((current) => ({ ...current, [flat.id]: event.target.value }))}
          />
          <Button
            onClick={() => void persist({ type: "RENAME_FLAT", flatId: flat.id, name: names[flat.id] ?? flat.name })}
          >
            Save
          </Button>
        </Card>
      ))}
    </div>
  );
}
