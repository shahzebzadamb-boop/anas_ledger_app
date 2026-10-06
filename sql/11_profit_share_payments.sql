-- Profit-share payments (Anas / Khizer monthly split).
-- Safe to re-run. Does NOT drop tables or rewrite stays/payments.
-- Apply on the live Anas Ledger database only.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
