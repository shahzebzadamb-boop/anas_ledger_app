"use client";

import { useMemo, useState } from "react";
import { AddPartnerSheet } from "@/components/reports/AddPartnerSheet";
import { AssignPartnerSheet } from "@/components/reports/AssignPartnerSheet";
import { PartnerPaymentSheet } from "@/components/reports/PartnerPaymentSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { partnerLifetime } from "@/lib/earnings";
import { formatKarachiDateTime } from "@/lib/dates";
import { currentAssignmentsForPartner, partnerNameById } from "@/lib/partners";
import { formatPKR, methodLabel } from "@/lib/money";
import { useLedger } from "@/lib/store";
import type { PartnerPayment } from "@/types";

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="font-normal text-muted">{label}</span>
      <span className={`money ${accent ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function PartnerDetail({
  partnerId,
  onBack,
}: {
  partnerId: string;
  onBack: () => void;
}) {
  const { persist, state } = useLedger();
  const partner = state.partners.find((item) => item.id === partnerId);
  const assignments = useMemo(() => currentAssignmentsForPartner(state, partnerId), [partnerId, state]);
  const lifetime = useMemo(() => partnerLifetime(state, partnerId), [partnerId, state]);
  const [edit, setEdit] = useState(false);
  const [assign, setAssign] = useState(false);
  const [changeId, setChangeId] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const [editPay, setEditPay] = useState<PartnerPayment | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);

  if (!partner) {
    return (
      <div className="space-y-3">
        <button type="button" className="min-h-11 text-sm font-medium text-secondary" onClick={onBack}>
          Back
        </button>
        <p className="text-sm text-muted">Partner not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" className="min-h-11 text-sm font-medium text-secondary" onClick={onBack}>
        Back
      </button>
      <div>
        <h2 className="text-lg font-semibold">{partner.name}</h2>
        <p className="text-sm font-normal text-muted">
          {partner.phone || "No phone"}
          {partner.active ? "" : " · Archived"}
        </p>
        {partner.notes ? <p className="mt-1 text-sm font-normal text-muted">{partner.notes}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setEdit(true)}>
          Edit
        </Button>
        <Button variant="primary" onClick={() => setAssign(true)}>
          Assign
        </Button>
      </div>
      <Card className="space-y-2">
        <p className="section-title">Lifetime</p>
        <Row label="Expected" value={formatPKR(lifetime.expected)} />
        <Row label="Paid" value={formatPKR(lifetime.paid)} />
        <Row label="Outstanding" value={formatPKR(lifetime.outstanding)} accent={lifetime.outstanding > 0 ? "text-warning" : undefined} />
      </Card>
      <Card className="space-y-2">
        <p className="section-title">Current assignments</p>
        {assignments.length === 0 ? (
          <p className="text-sm font-normal text-muted">No apartments assigned.</p>
        ) : (
          assignments.map((item) => {
            const flat = state.flats.find((row) => row.id === item.flatId);
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{flat?.name ?? "Apartment"}</p>
                  <p className="text-xs font-normal text-muted">{item.sharePercent}% partner share</p>
                </div>
                <button type="button" className="min-h-11 text-sm font-medium text-secondary" onClick={() => setChangeId(item.id)}>
                  Change share
                </button>
              </div>
            );
          })
        )}
      </Card>
      <Button variant="primary" className="w-full" onClick={() => setPay(true)}>
        Record payment
      </Button>
      <Card className="space-y-2">
        <p className="section-title">Monthly history</p>
        {lifetime.monthly.every((item) => item.expected === 0 && item.paid === 0) ? (
          <p className="text-sm font-normal text-muted">No partner activity yet.</p>
        ) : (
          lifetime.monthly
            .filter((item) => item.expected > 0 || item.paid > 0)
            .map((item) => (
              <div key={`${item.year}-${item.month}`} className="space-y-1 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium">{item.label}</p>
                <Row label="Expected" value={formatPKR(item.expected)} />
                <Row label="Paid" value={formatPKR(item.paid)} />
                <Row label="Remaining" value={formatPKR(item.remaining)} accent={item.remaining > 0 ? "text-warning" : undefined} />
              </div>
            ))
        )}
      </Card>
      <Card className="space-y-2">
        <p className="section-title">Payments</p>
        {state.partnerPayments.filter((item) => item.partnerId === partner.id && !item.voided).length === 0 ? (
          <p className="text-sm font-normal text-muted">No payments recorded.</p>
        ) : (
          state.partnerPayments
            .filter((item) => item.partnerId === partner.id && !item.voided)
            .map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                partnerName={partnerNameById(state, payment.partnerId)}
                undoId={undoId}
                onEdit={setEditPay}
                onUndoAsk={setUndoId}
                onUndoCancel={() => setUndoId(null)}
                onUndo={async (id) => {
                  await persist({ type: "UNDO_ENTRY", payload: { entityType: "PartnerPayment", entityId: id } });
                  setUndoId(null);
                }}
              />
            ))
        )}
      </Card>
      {edit ? <AddPartnerSheet existingId={partner.id} onClose={() => setEdit(false)} /> : null}
      {assign ? <AssignPartnerSheet partnerId={partner.id} onClose={() => setAssign(false)} /> : null}
      {changeId ? <AssignPartnerSheet assignmentId={changeId} mode="change" onClose={() => setChangeId(null)} /> : null}
      {pay ? <PartnerPaymentSheet partnerId={partner.id} onClose={() => setPay(false)} /> : null}
      {editPay ? <PartnerPaymentSheet existing={editPay} onClose={() => setEditPay(null)} /> : null}
    </div>
  );
}

export function PaymentRow({
  payment,
  partnerName,
  undoId,
  onEdit,
  onUndoAsk,
  onUndoCancel,
  onUndo,
}: {
  payment: PartnerPayment;
  partnerName?: string;
  undoId: string | null;
  onEdit: (row: PartnerPayment) => void;
  onUndoAsk: (id: string) => void;
  onUndoCancel: () => void;
  onUndo: (id: string) => Promise<void>;
}) {
  const when = formatKarachiDateTime(payment.paidAt);
  return (
    <div className="space-y-1 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{when ?? payment.paidAt}</p>
        <p className="money text-sm">{formatPKR(payment.amount)}</p>
      </div>
      <p className="text-xs font-normal text-muted">
        {partnerName ? `${partnerName} · ` : ""}
        {methodLabel(payment.method)} · {payment.profitMonth}/{payment.profitYear}
        {payment.note ? ` · ${payment.note}` : ""}
      </p>
      {undoId === payment.id ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" className="min-h-11 rounded-xl border border-border text-sm font-semibold" onClick={onUndoCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-danger bg-transparent text-sm font-semibold text-danger"
            onClick={() => void onUndo(payment.id)}
          >
            Undo
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-sm font-semibold"
            onClick={() => onEdit(payment)}
          >
            Edit
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-danger/70 bg-transparent px-3 text-sm font-semibold text-danger"
            onClick={() => onUndoAsk(payment.id)}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
