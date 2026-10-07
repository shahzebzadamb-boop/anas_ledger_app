"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Sheet, fieldClass } from "@/components/ui/Sheet";
import { dateInputToISO, karachiDateInput } from "@/lib/dates";
import { activeFlats } from "@/lib/flats";
import { SHARE_EXCEED_ERROR, validateAssignmentShares, ymdKeyFromIso } from "@/lib/partners";
import { useLedger } from "@/lib/store";

export function AssignPartnerSheet({
  partnerId,
  flatId,
  assignmentId,
  mode = "assign",
  onClose,
}: {
  partnerId?: string;
  flatId?: string;
  assignmentId?: string;
  mode?: "assign" | "change";
  onClose: () => void;
}) {
  const { persist, state } = useLedger();
  const assignment = assignmentId ? state.partnerAssignments.find((item) => item.id === assignmentId) : null;
  const flats = useMemo(() => activeFlats(state), [state]);
  const partners = useMemo(() => state.partners.filter((item) => item.active), [state.partners]);
  const [selectedPartner, setSelectedPartner] = useState(partnerId ?? assignment?.partnerId ?? partners[0]?.id ?? "");
  const [selectedFlat, setSelectedFlat] = useState(flatId ?? assignment?.flatId ?? flats[0]?.id ?? "");
  const [percent, setPercent] = useState(assignment ? String(assignment.sharePercent) : "50");
  const [from, setFrom] = useState(
    assignment && mode === "assign" ? ymdKeyFromIso(assignment.effectiveFrom) : karachiDateInput(),
  );
  const [until, setUntil] = useState(assignment?.effectiveUntil && mode === "assign" ? ymdKeyFromIso(assignment.effectiveUntil) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const sharePercent = Number(percent);
    if (!selectedPartner || !selectedFlat) {
      setError("Choose a partner and apartment.");
      return;
    }
    if (!Number.isInteger(sharePercent) || sharePercent < 1 || sharePercent > 100) {
      setError("Share must be a whole number from 1 to 100.");
      return;
    }
    const effectiveFrom = dateInputToISO(from);
    const effectiveUntil = until ? dateInputToISO(until) : null;
    if (mode === "change" && assignment) {
      const preview = validateAssignmentShares(
        {
          ...state,
          partnerAssignments: state.partnerAssignments.map((item) =>
            item.id === assignment.id ? { ...item, effectiveUntil: null, voided: true } : item,
          ),
        },
        { partnerId: assignment.partnerId, flatId: assignment.flatId, sharePercent, effectiveFrom },
      );
      if (preview) {
        setError(preview);
        return;
      }
    } else {
      const invalid = validateAssignmentShares(state, {
        partnerId: selectedPartner,
        flatId: selectedFlat,
        sharePercent,
        effectiveFrom,
        effectiveUntil,
        excludeId: assignment?.id,
      });
      if (invalid) {
        setError(invalid === SHARE_EXCEED_ERROR ? SHARE_EXCEED_ERROR : invalid);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === "change" && assignment) {
        await persist({
          type: "CHANGE_PARTNER_SHARE",
          payload: { assignmentId: assignment.id, sharePercent, effectiveFrom },
        });
      } else if (assignment) {
        await persist({
          type: "EDIT_ASSIGNMENT",
          payload: { id: assignment.id, sharePercent, effectiveFrom, effectiveUntil },
        });
      } else {
        await persist({
          type: "ASSIGN_PARTNER",
          payload: { partnerId: selectedPartner, flatId: selectedFlat, sharePercent, effectiveFrom, effectiveUntil },
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
    <Sheet title={mode === "change" ? "Change share" : "Assign Partner"} onClose={onClose}>
      <div className="space-y-3">
        {mode === "change" ? (
          <p className="text-sm font-normal text-muted">
            Closes the old share the day before the new start. Earlier months stay unchanged.
          </p>
        ) : null}
        <Field label="Apartment">
          <select
            className={fieldClass}
            value={selectedFlat}
            disabled={mode === "change"}
            onChange={(event) => setSelectedFlat(event.target.value)}
          >
            {flats.map((flat) => (
              <option key={flat.id} value={flat.id}>
                {flat.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Partner">
          <select
            className={fieldClass}
            value={selectedPartner}
            disabled={mode === "change"}
            onChange={(event) => setSelectedPartner(event.target.value)}
          >
            {partners.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Partner share %">
          <input
            className={fieldClass}
            inputMode="numeric"
            value={percent}
            onChange={(event) => setPercent(event.target.value.replace(/[^\d]/g, ""))}
          />
        </Field>
        <Field label={mode === "change" ? "New start date" : "Effective from"}>
          <input type="date" className={fieldClass} value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        {mode === "assign" ? (
          <Field label="Effective until (optional)">
            <input type="date" className={fieldClass} value={until} onChange={(event) => setUntil(event.target.value)} />
          </Field>
        ) : null}
        {error ? <p className="text-sm text-warning">{error}</p> : null}
        <Button variant="primary" className="w-full" disabled={saving} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Sheet>
  );
}
