import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { asBool, toIso } from "@/lib/server/db";
import { KHIZER_PARTNER_ID, KHIZER_PARTNER_NAME } from "@/lib/partners";
import type { Partner, PartnerAssignment, PartnerPayment, PaymentMethod } from "@/types";

type Queryable = Pool | PoolConnection;

async function tableExists(queryable: Queryable, name: string): Promise<boolean> {
  const [rows] = await queryable.query<RowDataPacket[]>(
    "SELECT 1 AS ok FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [name],
  );
  return rows.length > 0;
}

function asMethod(value: unknown): PaymentMethod {
  const method = String(value ?? "CASH");
  if (
    method === "CASH" ||
    method === "EASYPAISA" ||
    method === "BANK_TRANSFER" ||
    method === "JAZZCASH" ||
    method === "OTHER"
  ) {
    return method;
  }
  return "OTHER";
}

export async function ensurePartnersSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS partners (
      id VARCHAR(191) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      name VARCHAR(191) NOT NULL,
      phone VARCHAR(191) NULL,
      notes TEXT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY partners_name_key (name),
      KEY partners_active_idx (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_assignments (
      id VARCHAR(191) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      partnerId VARCHAR(191) NOT NULL,
      flatId VARCHAR(191) NOT NULL,
      sharePercent TINYINT NOT NULL,
      effectiveFrom DATETIME(3) NOT NULL,
      effectiveUntil DATETIME(3) NULL,
      voided TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY partner_assignments_partnerId_idx (partnerId),
      KEY partner_assignments_flatId_idx (flatId),
      KEY partner_assignments_from_idx (effectiveFrom),
      KEY partner_assignments_voided_idx (voided)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_payments (
      id VARCHAR(191) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      partnerId VARCHAR(191) NOT NULL,
      profitYear SMALLINT NOT NULL,
      profitMonth TINYINT NOT NULL,
      amount BIGINT NOT NULL,
      method ENUM('CASH','EASYPAISA','BANK_TRANSFER','JAZZCASH','OTHER') NOT NULL,
      paidAt DATETIME(3) NOT NULL,
      note TEXT NULL,
      voided TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY partner_payments_partnerId_idx (partnerId),
      KEY partner_payments_month_idx (profitYear, profitMonth),
      KEY partner_payments_paidAt_idx (paidAt),
      KEY partner_payments_voided_idx (voided)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(
    `INSERT INTO partners (id, createdAt, updatedAt, name, phone, notes, active)
     SELECT ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?, NULL, NULL, 1
     WHERE NOT EXISTS (
       SELECT 1 FROM partners WHERE name = ? OR id = ?
     )`,
    [KHIZER_PARTNER_ID, KHIZER_PARTNER_NAME, KHIZER_PARTNER_NAME, KHIZER_PARTNER_ID],
  );

  if (await tableExists(pool, "profit_share_payments")) {
    await pool.query(
      `INSERT INTO partners (id, createdAt, updatedAt, name, phone, notes, active)
       SELECT CONCAT('ptr_', REPLACE(UUID(), '-', '')), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), x.partnerName, NULL, NULL, 1
       FROM (SELECT DISTINCT partnerName FROM profit_share_payments) x
       WHERE x.partnerName IS NOT NULL AND TRIM(x.partnerName) <> '' AND LOWER(x.partnerName) <> 'anas'
         AND NOT EXISTS (SELECT 1 FROM partners p WHERE p.name = x.partnerName)`,
    );
    await pool.query(
      `INSERT INTO partner_payments (
         id, createdAt, updatedAt, partnerId, profitYear, profitMonth, amount, method, paidAt, note, voided
       )
       SELECT psp.id, psp.createdAt, psp.updatedAt, p.id, psp.profitYear, psp.profitMonth, psp.amount, psp.method, psp.paidAt, psp.note, psp.voided
       FROM profit_share_payments psp
       INNER JOIN partners p ON p.name = psp.partnerName
       WHERE NOT EXISTS (SELECT 1 FROM partner_payments pp WHERE pp.id = psp.id)`,
    );
  }
}

function rowToPartner(row: RowDataPacket): Partner {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : null,
    notes: row.notes ? String(row.notes) : null,
    active: asBool(row.active),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt ?? row.createdAt),
  };
}

function rowToAssignment(row: RowDataPacket): PartnerAssignment {
  return {
    id: String(row.id),
    partnerId: String(row.partnerId),
    flatId: String(row.flatId),
    sharePercent: Number(row.sharePercent),
    effectiveFrom: toIso(row.effectiveFrom),
    effectiveUntil: row.effectiveUntil ? toIso(row.effectiveUntil) : null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt ?? row.createdAt),
    voided: asBool(row.voided),
  };
}

function rowToPayment(row: RowDataPacket): PartnerPayment {
  return {
    id: String(row.id),
    partnerId: String(row.partnerId),
    profitYear: Number(row.profitYear),
    profitMonth: Number(row.profitMonth),
    amount: Number(row.amount),
    method: asMethod(row.method),
    paidAt: toIso(row.paidAt),
    note: row.note ? String(row.note) : null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt ?? row.createdAt),
    voided: asBool(row.voided),
  };
}

export async function loadPartnersState(queryable: Queryable): Promise<{
  partners: Partner[];
  partnerAssignments: PartnerAssignment[];
  partnerPayments: PartnerPayment[];
}> {
  if (!(await tableExists(queryable, "partners"))) {
    return { partners: [], partnerAssignments: [], partnerPayments: [] };
  }
  const [partners] = await queryable.query<RowDataPacket[]>(
    "SELECT id, createdAt, updatedAt, name, phone, notes, active FROM partners ORDER BY name ASC",
  );
  const assignments = (await tableExists(queryable, "partner_assignments"))
    ? (
        await queryable.query<RowDataPacket[]>(
          "SELECT id, createdAt, updatedAt, partnerId, flatId, sharePercent, effectiveFrom, effectiveUntil, voided FROM partner_assignments ORDER BY effectiveFrom DESC, createdAt DESC",
        )
      )[0]
    : [];
  const payments = (await tableExists(queryable, "partner_payments"))
    ? (
        await queryable.query<RowDataPacket[]>(
          "SELECT id, createdAt, updatedAt, partnerId, profitYear, profitMonth, amount, method, paidAt, note, voided FROM partner_payments ORDER BY paidAt DESC, createdAt DESC",
        )
      )[0]
    : [];
  return {
    partners: partners.map(rowToPartner),
    partnerAssignments: assignments.map(rowToAssignment),
    partnerPayments: payments.map(rowToPayment),
  };
}
