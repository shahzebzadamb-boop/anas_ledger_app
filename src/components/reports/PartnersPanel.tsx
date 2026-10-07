"use client";

import { useMemo, useState } from "react";
import { AddPartnerSheet } from "@/components/reports/AddPartnerSheet";
import { PartnerDetail } from "@/components/reports/PartnerDetail";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { partnerApartmentCount, partnerHasSettlementHistory } from "@/lib/partners";
import { useLedger } from "@/lib/store";

export function PartnersPanel({
  selectedId,
  onSelect,
  showAdd,
  onAddClose,
}: {
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  showAdd?: boolean;
  onAddClose?: () => void;
}) {
  const { persist, state } = useLedger();
  const [query, setQuery] = useState("");
  const [localAdd, setLocalAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const selected = selectedId ?? localSelected;
  const addOpen = showAdd || localAdd;

  const partners = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...state.partners]
      .filter((item) => !needle || item.name.toLowerCase().includes(needle) || (item.phone ?? "").includes(needle))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  }, [query, state.partners]);

  function select(id: string | null) {
    setLocalSelected(id);
    onSelect?.(id);
  }

  if (selected) {
    return <PartnerDetail partnerId={selected} onBack={() => select(null)} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Partners</h2>
        {showAdd == null ? (
          <Button variant="primary" onClick={() => setLocalAdd(true)}>
            + Add Partner
          </Button>
        ) : null}
      </div>
      <input
        className="w-full rounded-xl border border-border bg-input px-3 text-base"
        value={query}
        placeholder="Search partner..."
        onChange={(event) => setQuery(event.target.value)}
      />
      {partners.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm font-normal text-muted">
          No partners assigned. Anas keeps 100% until you add and assign a partner.
        </p>
      ) : (
        <Card className="space-y-2">
          {partners.map((partner) => {
            const apartments = partnerApartmentCount(state, partner.id);
            return (
              <div key={partner.id} className="space-y-2 border-b border-border py-2 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{partner.name}</p>
                    <p className="text-xs font-normal text-muted">
                      {apartments} apartment{apartments === 1 ? "" : "s"} · {partner.active ? "Active" : "Archived"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="min-h-11 text-sm font-medium text-secondary" onClick={() => select(partner.id)}>
                    View
                  </button>
                  <button type="button" className="min-h-11 text-sm font-medium text-secondary" onClick={() => setEditId(partner.id)}>
                    Edit
                  </button>
                  {partner.active ? (
                    <button
                      type="button"
                      className="min-h-11 text-sm font-medium text-warning"
                      onClick={() => {
                        if (!partnerHasSettlementHistory(state, partner.id) || window.confirm(`Archive ${partner.name}? Settlement history is kept.`)) {
                          void persist({ type: "ARCHIVE_PARTNER", payload: { id: partner.id } });
                        }
                      }}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="min-h-11 text-sm font-medium text-secondary"
                      onClick={() => void persist({ type: "EDIT_PARTNER", payload: { id: partner.id, active: true } })}
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
      {addOpen ? (
        <AddPartnerSheet
          onClose={() => {
            setLocalAdd(false);
            onAddClose?.();
          }}
        />
      ) : null}
      {editId ? <AddPartnerSheet existingId={editId} onClose={() => setEditId(null)} /> : null}
    </div>
  );
}
