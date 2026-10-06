"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clientProfile, suggestClients } from "@/lib/ledger";
import { displayPhoneSpaced } from "@/lib/phone";
import { useLedger } from "@/lib/store";
import type { Client } from "@/types";

export function ClientSearch({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (clientId: string | null) => void;
}) {
  const { state } = useLedger();
  const selected = selectedId ? state.clients.find((item) => item.id === selectedId) : null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected]);

  const matches = useMemo(() => {
    if (selectedId) return [];
    return suggestClients(state, query, { minChars: 1, limit: 8 });
  }, [query, selectedId, state]);

  const showMenu = open && !selectedId && query.trim().length > 0;

  function choose(client: Client) {
    onSelect(client.id);
    setQuery(client.name);
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    onSelect(null);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative z-20">
      <label className="sr-only" htmlFor="activity-client-search">
        Search client
      </label>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-input pr-1">
        <input
          id="activity-client-search"
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          placeholder="Search client..."
          value={query}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-base shadow-none"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            if (selectedId) onSelect(null);
            setOpen(true);
          }}
        />
        {selectedId || query ? (
          <button
            type="button"
            aria-label="Clear client"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-medium text-muted"
            onClick={clear}
          >
            ×
          </button>
        ) : null}
      </div>
      {showMenu ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[40vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          {matches.length === 0 ? (
            <p className="px-3.5 py-3 text-sm font-normal text-muted">No clients found</p>
          ) : (
            matches.map((client) => {
              const profile = clientProfile(client.id, state);
              return (
                <button
                  key={client.id}
                  type="button"
                  className="block w-full border-b border-border px-3.5 py-2.5 text-left last:border-b-0 active:bg-input"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(client);
                  }}
                >
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  <p className="mt-0.5 truncate text-xs font-normal text-muted">
                    {client.phone ? displayPhoneSpaced(client.phone) : "No phone"}
                  </p>
                  {profile.lastFlat ? (
                    <p className="mt-0.5 truncate text-xs font-normal text-muted">{profile.lastFlat}</p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
