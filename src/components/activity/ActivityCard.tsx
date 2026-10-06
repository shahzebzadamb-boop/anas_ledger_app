"use client";

import { useState } from "react";
import { formatKarachiDateTime } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { activityEditorKind, type ActivityFeedItem } from "@/lib/activity-feed";
import { EntryEditor } from "@/components/dashboard/EntryEditor";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ActivityCard({
  item,
  compact = false,
  autoEdit = false,
  onSelect,
}: {
  item: ActivityFeedItem;
  compact?: boolean;
  autoEdit?: boolean;
  onSelect?: () => void;
}) {
  const { persist } = useLedger();
  const [edit, setEdit] = useState(autoEdit);
  const [undo, setUndo] = useState(false);
  const [saving, setSaving] = useState(false);
  const kind = activityEditorKind(item);
  const at = formatKarachiDateTime(item.at);
  const amountLabel = item.signed ? `+ ${formatPKR(item.amount)}` : formatPKR(item.amount);

  async function confirmUndo() {
    if (!item.entityType || saving) return;
    setSaving(true);
    try {
      await persist({
        type: "UNDO_ENTRY",
        payload: { entityType: item.entityType, entityId: item.entityId },
      });
      setUndo(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={cn("border-b border-border px-3.5 py-3 last:border-b-0", item.voided && "opacity-60")}>
      <button
        type="button"
        className="w-full min-w-0 text-left"
        onClick={() => {
          if (onSelect) {
            onSelect();
            return;
          }
          if (kind) setEdit(true);
        }}
      >
        <p className="truncate text-sm font-medium">{item.title}</p>
        {item.subtitle ? <p className="mt-0.5 truncate text-xs font-normal text-muted">{item.subtitle}</p> : null}
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-xs font-normal text-muted">{item.label}</p>
          <p className="money shrink-0 text-sm">{amountLabel}</p>
        </div>
        {item.detail ? <p className="mt-1 text-xs font-normal text-muted">{item.detail}</p> : null}
        {at ? <p className="mt-0.5 text-[11px] font-normal leading-4 text-muted">{at}</p> : null}
        {item.kind === "payment" && item.remainingAfter != null ? (
          <p className="mt-1 text-xs font-normal text-muted">
            {compact ? "Remaining" : "Remaining after payment:"} {formatPKR(item.remainingAfter)}
          </p>
        ) : null}
      </button>
      {!compact && item.editable && kind ? (
        undo ? (
          <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">Undo this entry?</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="min-h-11 rounded-xl border border-border text-sm font-semibold" onClick={() => setUndo(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="min-h-11 rounded-xl border border-danger bg-transparent text-sm font-semibold text-danger"
                onClick={() => void confirmUndo()}
              >
                Undo
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-border px-3 text-sm font-semibold"
              onClick={() => setEdit(true)}
            >
              Edit
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-danger/70 bg-transparent px-3 text-sm font-semibold text-danger"
              onClick={() => setUndo(true)}
            >
              Undo
            </button>
          </div>
        )
      ) : null}
      {edit && kind ? <EntryEditor kind={kind} id={item.entityId} onClose={() => setEdit(false)} /> : null}
    </article>
  );
}
