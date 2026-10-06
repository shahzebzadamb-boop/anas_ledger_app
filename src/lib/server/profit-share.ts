import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { asBool, toIso } from "@/lib/server/db";
import type { PaymentMethod, ProfitSharePayment } from "@/types";

type Queryable = Pool | PoolConnection;

async function tableExists(queryable: Queryable, name: string): Promise<boolean> {
  const [rows] = await queryable.query<RowDataPacket[]>(
    "SELECT 1 AS ok FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [name],
  );
  return rows.length > 0;
}

export async function ensureProfitShareSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profit_share_payments (
      id VARCHAR(191) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      profitYear SMALLINT NOT NULL,
      profitMonth TINYINT NOT NULL,
      partnerName VARCHAR(191) NOT NULL,
      amount BIGINT NOT NULL,
      method ENUM('CASH','EASYPAISA','BANK_TRANSFER','JAZZCASH','OTHER') NOT NULL,
      paidAt DATETIME(3) NOT NULL,
      note TEXT NULL,
      voided TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY profit_share_payments_month_idx (profitYear, profitMonth),
      KEY profit_share_payments_paidAt_idx (paidAt),
      KEY profit_share_payments_voided_idx (voided)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
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

export function rowToProfitSharePayment(row: RowDataPacket): ProfitSharePayment {
  return {
    id: String(row.id),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt ?? row.createdAt),
    profitYear: Number(row.profitYear),
    profitMonth: Number(row.profitMonth),
    partnerName: String(row.partnerName || "Khizer"),
    amount: Number(row.amount),
    method: asMethod(row.method),
    paidAt: toIso(row.paidAt),
    note: row.note ? String(row.note) : null,
    voided: asBool(row.voided),
  };
}

export async function loadProfitSharePayments(queryable: Queryable): Promise<ProfitSharePayment[]> {
  if (!(await tableExists(queryable, "profit_share_payments"))) return [];
  const [rows] = await queryable.query<RowDataPacket[]>(
    "SELECT id, createdAt, updatedAt, profitYear, profitMonth, partnerName, amount, method, paidAt, note, voided FROM profit_share_payments ORDER BY paidAt DESC, createdAt DESC",
  );
  return rows.map(rowToProfitSharePayment);
}
