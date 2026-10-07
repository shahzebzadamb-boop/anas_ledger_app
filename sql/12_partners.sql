-- Multi-partner profit sharing. Safe to re-run.
-- Does NOT drop tables. Does NOT delete profit_share_payments or financial rows.
-- Apply on the live Anas Ledger database only (phpMyAdmin or app boot ensure*).

SET NAMES utf8mb4;
SET time_zone = '+00:00';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO partners (id, createdAt, updatedAt, name, phone, notes, active)
SELECT 'partner_khizer', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), 'Khizer', NULL, NULL, 1
WHERE NOT EXISTS (
  SELECT 1 FROM partners WHERE name = 'Khizer' OR id = 'partner_khizer'
);

INSERT INTO partner_payments (
  id, createdAt, updatedAt, partnerId, profitYear, profitMonth, amount, method, paidAt, note, voided
)
SELECT
  psp.id,
  psp.createdAt,
  psp.updatedAt,
  p.id,
  psp.profitYear,
  psp.profitMonth,
  psp.amount,
  psp.method,
  psp.paidAt,
  psp.note,
  psp.voided
FROM profit_share_payments psp
INNER JOIN partners p ON p.name = psp.partnerName
WHERE NOT EXISTS (
  SELECT 1 FROM partner_payments pp WHERE pp.id = psp.id
);
