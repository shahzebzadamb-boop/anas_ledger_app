import type { PoolConnection } from "mysql2/promise";
import type { Action } from "@/lib/ledger-actions";
import { reducer, reviveAction } from "@/lib/ledger-actions";
import { getPool, toSqlDate } from "@/lib/server/db";
import { loadLedgerState } from "@/lib/server/load-ledger";
import { isPlausibleLedgerAmount } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { createId } from "@/lib/utils";
import type { LedgerState } from "@/types";

function assertPlausibleAmount(amount: number, label: string): void {
  if (!isPlausibleLedgerAmount(amount)) {
    throw new Error(`${label} amount is not a plausible PKR figure.`);
  }
}

function ids<T extends { id: string }>(items: T[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

function changed<T extends { id: string }>(before: T[], after: T[], id: string): { before: T; after: T } | null {
  const previous = before.find((item) => item.id === id);
  const next = after.find((item) => item.id === id);
  if (!previous || !next) return null;
  if (JSON.stringify(previous) === JSON.stringify(next)) return null;
  return { before: previous, after: next };
}

export async function applyLedgerAction(action: Action): Promise<LedgerState> {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const before = await loadLedgerState();
    const after = reducer(before, reviveAction(action));
    await persistDiff(connection, before, after);
    await connection.commit();
    return after;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function persistDiff(connection: PoolConnection, before: LedgerState, after: LedgerState): Promise<void> {
  const beforeClients = ids(before.clients);
  for (const client of after.clients) {
    const phone = client.phone ? normalizePhone(client.phone) : null;
    if (!beforeClients.has(client.id)) {
      await connection.execute(
        `INSERT INTO clients (id, createdAt, name, phone, phoneNormalized, phoneMissing, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [client.id, toSqlDate(client.createdAt), client.name, phone, phone, client.phoneMissing ? 1 : 0, client.notes],
      );
      continue;
    }
    const delta = changed(before.clients, after.clients, client.id);
    if (!delta) continue;
    await connection.execute(
      "UPDATE clients SET phone = ?, phoneNormalized = ?, phoneMissing = ?, name = ? WHERE id = ?",
      [phone, phone, client.phoneMissing ? 1 : 0, client.name, client.id],
    );
  }

  for (const flat of after.flats) {
    const delta = changed(before.flats, after.flats, flat.id);
    if (!delta) continue;
    await connection.execute("UPDATE flats SET name = ? WHERE id = ?", [flat.name, flat.id]);
  }

  const beforeStays = ids(before.stays);
  for (const stay of after.stays) {
    if (!beforeStays.has(stay.id)) {
      await connection.execute(
        `INSERT INTO stays (id, createdAt, flatId, clientId, checkIn, checkOut, nights, notifyEnabled, activePending, importKey)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stay.id,
          toSqlDate(stay.createdAt),
          stay.flatId,
          stay.clientId,
          toSqlDate(stay.checkIn),
          toSqlDate(stay.checkOut),
          stay.nights,
          stay.notifyEnabled ? 1 : 0,
          stay.activePending ? 1 : 0,
          stay.importKey,
        ],
      );
      continue;
    }
    const delta = changed(before.stays, after.stays, stay.id);
    if (!delta) continue;
    await connection.execute(
      `UPDATE stays SET checkIn = ?, checkOut = ?, nights = ?, notifyEnabled = ?, activePending = ?
       WHERE id = ?`,
      [
        toSqlDate(stay.checkIn),
        toSqlDate(stay.checkOut),
        stay.nights,
        stay.notifyEnabled ? 1 : 0,
        stay.activePending ? 1 : 0,
        stay.id,
      ],
    );
  }

  const beforeRent = ids(before.rentEntries);
  for (const item of after.rentEntries) {
    if (!beforeRent.has(item.id)) {
      assertPlausibleAmount(item.amount, "Rent");
      await connection.execute(
        `INSERT INTO business_entries (id, createdAt, stayId, clientId, flatId, amount, occurredAt, importKey, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          toSqlDate(item.occurredAt),
          item.stayId,
          item.clientId,
          item.flatId,
          item.amount,
          toSqlDate(item.occurredAt),
          null,
          item.note,
        ],
      );
      continue;
    }
    const delta = changed(before.rentEntries, after.rentEntries, item.id);
    if (!delta) continue;
    assertPlausibleAmount(item.amount, "Rent");
    await connection.execute("UPDATE business_entries SET amount = ?, note = ? WHERE id = ?", [
      item.amount,
      item.note,
      item.id,
    ]);
  }

  const beforePayments = ids(before.payments);
  for (const payment of after.payments) {
    if (beforePayments.has(payment.id)) continue;
    assertPlausibleAmount(payment.amount, "Payment");
    await connection.execute(
      `INSERT INTO payments (id, createdAt, stayId, clientId, flatId, amount, method, receivedAt, notes, importKey)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.id,
        toSqlDate(payment.createdAt),
        payment.stayId,
        payment.clientId,
        payment.flatId,
        payment.amount,
        payment.method,
        toSqlDate(payment.receivedAt),
        payment.notes,
        null,
      ],
    );
  }

  const beforeExpenses = ids(before.expenses);
  for (const expense of after.expenses) {
    if (beforeExpenses.has(expense.id)) continue;
    assertPlausibleAmount(expense.amount, "Expense");
    await connection.execute(
      `INSERT INTO expenses (id, createdAt, flatId, amount, category, description, method, spentAt, notes, importKey)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        toSqlDate(expense.createdAt),
        expense.flatId,
        expense.amount,
        expense.category,
        expense.description,
        expense.method,
        toSqlDate(expense.spentAt),
        expense.notes,
        null,
      ],
    );
  }

  const beforeSecurity = ids(before.security);
  for (const item of after.security) {
    if (beforeSecurity.has(item.id)) continue;
    assertPlausibleAmount(item.amount, "Security");
    await connection.execute(
      `INSERT INTO security_transactions (id, createdAt, clientId, stayId, flatId, kind, amount, occurredAt, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        toSqlDate(item.occurredAt),
        item.clientId,
        item.stayId,
        item.flatId,
        item.kind,
        item.amount,
        toSqlDate(item.occurredAt),
        item.notes,
      ],
    );
  }

  const beforeDiscounts = ids(before.discounts);
  for (const item of after.discounts) {
    if (beforeDiscounts.has(item.id)) continue;
    assertPlausibleAmount(item.amount, "Discount");
    await connection.execute(
      `INSERT INTO discounts (id, createdAt, stayId, clientId, flatId, amount, occurredAt, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        toSqlDate(item.occurredAt),
        item.stayId,
        item.clientId,
        item.flatId,
        item.amount,
        toSqlDate(item.occurredAt),
        item.note,
      ],
    );
  }

  const beforeWithdrawals = ids(before.withdrawals);
  for (const item of after.withdrawals) {
    if (beforeWithdrawals.has(item.id)) continue;
    assertPlausibleAmount(item.amount, "Withdrawal");
    await connection.execute(
      "INSERT INTO withdrawals (id, createdAt, amount, occurredAt, note) VALUES (?, ?, ?, ?, ?)",
      [item.id, toSqlDate(item.occurredAt), item.amount, toSqlDate(item.occurredAt), item.note],
    );
  }

  const beforeReviews = ids(before.reviews);
  for (const review of after.reviews) {
    if (!beforeReviews.has(review.id)) {
      await connection.execute(
        `INSERT INTO migration_records (
           id, createdAt, sourceFile, sourceSheet, sourceRow, sourceText, flatName, customer, occurredOn,
           proposedType, amount, reason, status, pendingDecision, stayId, monthLabel, currentInterpretation,
           previousInterpretation, lastQuickUpdate, originalValue, correctionText, importedAt, updatedAt, importKey
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          review.id,
          toSqlDate(review.importedAt ?? new Date().toISOString()),
          review.sourceFile,
          review.sourceSheet,
          review.sourceRow,
          review.sourceText,
          review.flatName,
          review.customer,
          toSqlDate(review.date),
          review.proposedType,
          review.amount,
          review.reason,
          review.status,
          review.pendingDecision,
          review.stayId,
          review.month,
          review.currentInterpretation,
          review.previousInterpretation,
          review.lastQuickUpdate,
          review.originalValue ?? review.sourceText,
          review.correctionText,
          toSqlDate(review.importedAt),
          toSqlDate(review.updatedAt),
          review.id,
        ],
      );
      continue;
    }
    const delta = changed(before.reviews, after.reviews, review.id);
    if (!delta) continue;
    await connection.execute(
      `UPDATE migration_records
       SET status = ?, pendingDecision = ?, stayId = ?, currentInterpretation = ?, previousInterpretation = ?,
           lastQuickUpdate = ?, originalValue = ?, correctionText = ?, updatedAt = ?
       WHERE id = ?`,
      [
        review.status,
        review.pendingDecision,
        review.stayId,
        review.currentInterpretation,
        review.previousInterpretation,
        review.lastQuickUpdate,
        review.originalValue ?? review.sourceText,
        review.correctionText,
        toSqlDate(review.updatedAt ?? new Date().toISOString()),
        review.id,
      ],
    );
  }

  const beforeActivity = ids(before.activityLogs);
  for (const item of after.activityLogs) {
    if (beforeActivity.has(item.id)) continue;
    await connection.execute(
      "INSERT INTO activity_logs (id, createdAt, action, entityType, entityId, summary) VALUES (?, ?, ?, ?, ?, ?)",
      [item.id, toSqlDate(item.createdAt), item.action, item.entityType, item.entityId, item.summary],
    );
  }

  const beforeAudit = ids(before.auditLogs);
  for (const item of after.auditLogs) {
    if (beforeAudit.has(item.id)) continue;
    await connection.execute(
      `INSERT INTO audit_logs (id, createdAt, action, entityType, entityId, originalValue, newValue, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        toSqlDate(item.createdAt),
        item.action,
        item.entityType,
        item.entityId,
        item.originalValue,
        item.newValue,
        item.reason,
      ],
    );
  }

  const beforeSilence = new Set(before.reminderSilences.map((item) => `${item.clientId}|${item.cycleDate}`));
  for (const item of after.reminderSilences) {
    const key = `${item.clientId}|${item.cycleDate}`;
    if (beforeSilence.has(key)) continue;
    await connection.execute("INSERT INTO reminder_silences (id, clientId, cycleDate) VALUES (?, ?, ?)", [
      createId("silence"),
      item.clientId,
      item.cycleDate,
    ]);
  }

  const beforeCycles = new Set(before.nightSummaryDates);
  for (const cycleDate of after.nightSummaryDates) {
    if (beforeCycles.has(cycleDate)) continue;
    await connection.execute(
      "INSERT INTO notification_cycles (id, cycleDate, summarySentAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE summarySentAt = VALUES(summarySentAt)",
      [createId("cycle"), cycleDate, toSqlDate(new Date().toISOString())],
    );
  }
}
