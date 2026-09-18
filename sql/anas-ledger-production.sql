-- Anas Ledger production schema + historical seed
-- phpMyAdmin-ready. Import into an empty Hostinger MySQL database.
-- Safe, deterministic, utf8mb4 / InnoDB. Integer PKR only.
-- Do not store credentials in this file.
-- Historical pending stays stay quiet (activePending=0) until Migration Review confirms.

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `reminder_silences`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `notification_cycles`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `migration_records`;
DROP TABLE IF EXISTS `withdrawals`;
DROP TABLE IF EXISTS `discounts`;
DROP TABLE IF EXISTS `security_transactions`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `business_entries`;
DROP TABLE IF EXISTS `stays`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `flats`;
DROP TABLE IF EXISTS `app_settings`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE users (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  name VARCHAR(191) NOT NULL,
  role VARCHAR(191) NOT NULL DEFAULT 'owner',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_settings (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  settingKey VARCHAR(191) NOT NULL,
  settingValue TEXT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY app_settings_settingKey (settingKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE flats (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  name VARCHAR(191) NOT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY flats_name_key (name),
  KEY flats_sortOrder_idx (sortOrder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clients (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  name VARCHAR(191) NOT NULL,
  phone VARCHAR(191) NULL,
  phoneNormalized VARCHAR(191) NULL,
  phoneMissing TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY clients_phoneNormalized_key (phoneNormalized),
  KEY clients_name_idx (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stays (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  flatId VARCHAR(191) NOT NULL,
  clientId VARCHAR(191) NOT NULL,
  checkIn DATETIME(3) NOT NULL,
  checkOut DATETIME(3) NOT NULL,
  nights INT NOT NULL,
  notifyEnabled TINYINT(1) NOT NULL DEFAULT 0,
  activePending TINYINT(1) NOT NULL DEFAULT 0,
  importKey VARCHAR(191) NULL,
  legacyNote TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY stays_importKey_key (importKey),
  KEY stays_flatId_idx (flatId),
  KEY stays_clientId_idx (clientId),
  KEY stays_checkIn_idx (checkIn),
  KEY stays_activePending_idx (activePending),
  CONSTRAINT stays_flatId_fkey FOREIGN KEY (flatId) REFERENCES flats(id),
  CONSTRAINT stays_clientId_fkey FOREIGN KEY (clientId) REFERENCES clients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE business_entries (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  stayId VARCHAR(191) NOT NULL,
  clientId VARCHAR(191) NOT NULL,
  flatId VARCHAR(191) NOT NULL,
  amount INT NOT NULL,
  occurredAt DATETIME(3) NOT NULL,
  importKey VARCHAR(191) NULL,
  note TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY business_entries_importKey_key (importKey),
  KEY business_entries_stayId_idx (stayId),
  KEY business_entries_flatId_idx (flatId),
  KEY business_entries_occurredAt_idx (occurredAt),
  KEY business_entries_flat_occurred_idx (flatId, occurredAt),
  CONSTRAINT business_entries_stayId_fkey FOREIGN KEY (stayId) REFERENCES stays(id) ON DELETE CASCADE,
  CONSTRAINT business_entries_clientId_fkey FOREIGN KEY (clientId) REFERENCES clients(id),
  CONSTRAINT business_entries_flatId_fkey FOREIGN KEY (flatId) REFERENCES flats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  stayId VARCHAR(191) NULL,
  clientId VARCHAR(191) NOT NULL,
  flatId VARCHAR(191) NULL,
  amount INT NOT NULL,
  method ENUM('CASH','EASYPAISA','BANK_TRANSFER','JAZZCASH','OTHER') NOT NULL,
  receivedAt DATETIME(3) NOT NULL,
  notes TEXT NULL,
  importKey VARCHAR(191) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY payments_importKey_key (importKey),
  KEY payments_clientId_idx (clientId),
  KEY payments_stayId_idx (stayId),
  KEY payments_flatId_idx (flatId),
  KEY payments_receivedAt_idx (receivedAt),
  KEY payments_flat_received_idx (flatId, receivedAt),
  CONSTRAINT payments_stayId_fkey FOREIGN KEY (stayId) REFERENCES stays(id) ON DELETE SET NULL,
  CONSTRAINT payments_clientId_fkey FOREIGN KEY (clientId) REFERENCES clients(id),
  CONSTRAINT payments_flatId_fkey FOREIGN KEY (flatId) REFERENCES flats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expenses (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  flatId VARCHAR(191) NULL,
  amount INT NOT NULL,
  category ENUM('CLEANING','GROCERIES','ELECTRICITY','GAS','INTERNET','MAINTENANCE','PLUMBING','REPAIRS','FURNITURE','BEDSHEETS_LINEN','SUPPLIES','STAFF','COMMISSION','WATER','OTHER') NOT NULL,
  description VARCHAR(191) NOT NULL,
  method ENUM('CASH','EASYPAISA','BANK_TRANSFER','JAZZCASH','OTHER') NOT NULL,
  spentAt DATETIME(3) NOT NULL,
  notes TEXT NULL,
  importKey VARCHAR(191) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY expenses_importKey_key (importKey),
  KEY expenses_spentAt_idx (spentAt),
  KEY expenses_flatId_idx (flatId),
  KEY expenses_flat_spent_idx (flatId, spentAt),
  CONSTRAINT expenses_flatId_fkey FOREIGN KEY (flatId) REFERENCES flats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE security_transactions (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  clientId VARCHAR(191) NOT NULL,
  stayId VARCHAR(191) NULL,
  flatId VARCHAR(191) NULL,
  kind ENUM('RECEIVED','ADJUSTED_TO_RENT') NOT NULL,
  amount INT NOT NULL,
  occurredAt DATETIME(3) NOT NULL,
  notes TEXT NULL,
  PRIMARY KEY (id),
  KEY security_clientId_idx (clientId),
  KEY security_occurredAt_idx (occurredAt),
  CONSTRAINT security_clientId_fkey FOREIGN KEY (clientId) REFERENCES clients(id),
  CONSTRAINT security_stayId_fkey FOREIGN KEY (stayId) REFERENCES stays(id) ON DELETE SET NULL,
  CONSTRAINT security_flatId_fkey FOREIGN KEY (flatId) REFERENCES flats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE discounts (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  stayId VARCHAR(191) NOT NULL,
  clientId VARCHAR(191) NOT NULL,
  flatId VARCHAR(191) NOT NULL,
  amount INT NOT NULL,
  occurredAt DATETIME(3) NOT NULL,
  note TEXT NULL,
  PRIMARY KEY (id),
  KEY discounts_stayId_idx (stayId),
  KEY discounts_occurredAt_idx (occurredAt),
  CONSTRAINT discounts_stayId_fkey FOREIGN KEY (stayId) REFERENCES stays(id) ON DELETE CASCADE,
  CONSTRAINT discounts_clientId_fkey FOREIGN KEY (clientId) REFERENCES clients(id),
  CONSTRAINT discounts_flatId_fkey FOREIGN KEY (flatId) REFERENCES flats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE withdrawals (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  amount INT NOT NULL,
  occurredAt DATETIME(3) NOT NULL,
  note TEXT NULL,
  PRIMARY KEY (id),
  KEY withdrawals_occurredAt_idx (occurredAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  kind ENUM('CLIENT_PENDING','NIGHT_SUMMARY') NOT NULL,
  title VARCHAR(191) NOT NULL,
  body TEXT NOT NULL,
  scheduledFor DATETIME(3) NOT NULL,
  sentAt DATETIME(3) NULL,
  clientId VARCHAR(191) NULL,
  stayId VARCHAR(191) NULL,
  cycleDate VARCHAR(191) NOT NULL,
  hour INT NOT NULL,
  PRIMARY KEY (id),
  KEY notifications_scheduledFor_idx (scheduledFor),
  KEY notifications_cycle_idx (cycleDate, hour),
  CONSTRAINT notifications_clientId_fkey FOREIGN KEY (clientId) REFERENCES clients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_cycles (
  id VARCHAR(191) NOT NULL,
  cycleDate VARCHAR(191) NOT NULL,
  summarySentAt DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY notification_cycles_cycleDate_key (cycleDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reminder_silences (
  id VARCHAR(191) NOT NULL,
  clientId VARCHAR(191) NOT NULL,
  cycleDate VARCHAR(191) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY reminder_silences_client_cycle (clientId, cycleDate),
  CONSTRAINT reminder_silences_clientId_fkey FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  action VARCHAR(191) NOT NULL,
  entityType VARCHAR(191) NOT NULL,
  entityId VARCHAR(191) NOT NULL,
  summary TEXT NOT NULL,
  PRIMARY KEY (id),
  KEY activity_logs_createdAt_idx (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  action VARCHAR(191) NOT NULL,
  entityType VARCHAR(191) NOT NULL,
  entityId VARCHAR(191) NOT NULL,
  originalValue TEXT NULL,
  newValue TEXT NULL,
  reason TEXT NULL,
  PRIMARY KEY (id),
  KEY audit_logs_createdAt_idx (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE migration_records (
  id VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  sourceFile VARCHAR(191) NOT NULL,
  sourceSheet VARCHAR(191) NOT NULL,
  sourceRow INT NOT NULL,
  sourceText TEXT NOT NULL,
  flatName VARCHAR(191) NOT NULL,
  customer VARCHAR(191) NULL,
  occurredOn DATETIME(3) NULL,
  proposedType VARCHAR(191) NOT NULL,
  amount INT NULL,
  reason TEXT NOT NULL,
  status ENUM('NEEDS_REVIEW','CONFIRMED','IGNORED') NOT NULL DEFAULT 'NEEDS_REVIEW',
  pendingDecision ENUM('UNDECIDED','STILL_PENDING','ALREADY_PAID','IGNORE') NOT NULL DEFAULT 'UNDECIDED',
  stayId VARCHAR(191) NULL,
  monthLabel VARCHAR(191) NULL,
  currentInterpretation TEXT NULL,
  previousInterpretation TEXT NULL,
  lastQuickUpdate TEXT NULL,
  originalValue TEXT NULL,
  correctionText TEXT NULL,
  importedAt DATETIME(3) NULL,
  updatedAt DATETIME(3) NULL,
  importKey VARCHAR(191) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY migration_records_importKey_key (importKey),
  KEY migration_records_status_idx (status),
  KEY migration_records_stayId_idx (stayId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Owner and app settings
INSERT INTO users (id, createdAt, name, role) VALUES ('user_anas', '2026-04-01 00:00:00.000', 'Anas', 'owner');
INSERT INTO app_settings (id, settingKey, settingValue) VALUES ('set_timezone', 'timezone', 'Asia/Karachi'), ('set_currency', 'currency', 'PKR'), ('set_owner', 'ownerName', 'Anas');

-- Six flats. 204-D, 204-C, 811-D, 815-B start with zero financial rows.
INSERT INTO flats (id, createdAt, name, sortOrder) VALUES
  ('flat_802-A', '2026-04-01 00:00:00.000', '802-A', 1),
  ('flat_408-B', '2026-04-01 00:00:00.000', '408-B', 2),
  ('flat_204-D', '2026-04-01 00:00:00.000', '204-D', 3),
  ('flat_204-C', '2026-04-01 00:00:00.000', '204-C', 4),
  ('flat_811-D', '2026-04-01 00:00:00.000', '811-D', 5),
  ('flat_815-B', '2026-04-01 00:00:00.000', '815-B', 6);

-- Clients from the already-generated 802-A / 408-B migration
INSERT INTO clients (id, createdAt, name, phone, phoneNormalized, phoneMissing, notes) VALUES
  ('imp_2f884f9a288b9d4d', '2026-04-01 00:00:00.000', 'Trader', NULL, NULL, 1, NULL),
  ('imp_c9283e7aa55dadc4', '2026-04-01 00:00:00.000', 'Maryam TikToker', NULL, NULL, 1, NULL),
  ('imp_2fe12f5b50c89166', '2026-04-01 00:00:00.000', 'Ejaz Kashif bro', NULL, NULL, 1, NULL),
  ('imp_e2849f297f290d60', '2026-04-01 00:00:00.000', 'Tahir bhai', NULL, NULL, 1, NULL),
  ('imp_2254696a429987c1', '2026-04-01 00:00:00.000', 'Farman pesh guest', NULL, NULL, 1, NULL),
  ('imp_110bf1053b25ec45', '2026-04-01 00:00:00.000', 'Khalid Ref Maryam', NULL, NULL, 1, NULL),
  ('imp_e264cc3b323dc240', '2026-04-01 00:00:00.000', 'Bilal/ Yousif guest pesh', NULL, NULL, 1, NULL),
  ('imp_47e183dbabb7c952', '2026-04-01 00:00:00.000', 'Amjid Imroza', NULL, NULL, 1, NULL),
  ('imp_f3f5e35cfbac74f2', '2026-04-01 00:00:00.000', 'Naeem dealer ref', NULL, NULL, 1, NULL),
  ('imp_f1953889a9352c08', '2026-04-01 00:00:00.000', 'Dr.Nader shah', NULL, NULL, 1, NULL),
  ('imp_01597bb7ffe37f44', '2026-04-01 00:00:00.000', 'Dr Nadar shah', NULL, NULL, 1, NULL),
  ('imp_c0c359c40d8173c5', '2026-04-01 00:00:00.000', 'Salman imam', NULL, NULL, 1, NULL),
  ('imp_6a08cd01067ddeda', '2026-04-01 00:00:00.000', 'Dr Nadar Friends', NULL, NULL, 1, NULL),
  ('imp_bec13d2e484dfcd2', '2026-04-01 00:00:00.000', 'Khalid guest', NULL, NULL, 1, NULL),
  ('imp_16ab02ad3ff11ede', '2026-04-01 00:00:00.000', 'Ahmad ullah ref 402B guest', NULL, NULL, 1, NULL),
  ('imp_8903ed5cf5d60fa1', '2026-04-01 00:00:00.000', 'Adil ref Tahir Afridi', NULL, NULL, 1, NULL),
  ('imp_7a78f16a2d9367fb', '2026-04-01 00:00:00.000', 'Asad ullah khan /khalid pesh', NULL, NULL, 1, NULL),
  ('imp_40c316188131f652', '2026-04-01 00:00:00.000', 'Qasim c block', NULL, NULL, 1, NULL),
  ('imp_889c675c0ba00d96', '2026-04-01 00:00:00.000', 'Mudasir karachi', NULL, NULL, 1, NULL),
  ('imp_5925e97b1a326ecd', '2026-04-01 00:00:00.000', 'Dost Muhmmad', NULL, NULL, 1, NULL),
  ('imp_88b8b813e5efa271', '2026-04-01 00:00:00.000', 'Nadir shah', NULL, NULL, 1, NULL),
  ('imp_0539842d17b0f786', '2026-04-01 00:00:00.000', 'Aman ullah', NULL, NULL, 1, NULL),
  ('imp_c92ae260d5f0fbc1', '2026-04-01 00:00:00.000', 'Abdul Haq', NULL, NULL, 1, NULL),
  ('imp_30bd1a1b0a54a41d', '2026-04-01 00:00:00.000', 'Khalid pesh', NULL, NULL, 1, NULL),
  ('imp_c58a7c89a4b7e8cf', '2026-04-01 00:00:00.000', 'Maiz ullah Fareed bhai', NULL, NULL, 1, NULL),
  ('imp_d555ad18072b60a9', '2026-04-01 00:00:00.000', 'Asif pesh guest', NULL, NULL, 1, NULL),
  ('imp_f4ca0cfe4aa20a27', '2026-04-01 00:00:00.000', 'Asad Afridi', NULL, NULL, 1, NULL),
  ('imp_c0ae1e194a94c875', '2026-04-01 00:00:00.000', 'Saad dealer', NULL, NULL, 1, NULL),
  ('imp_ba9c4008ebd2e5d9', '2026-04-01 00:00:00.000', 'Hayat guest', NULL, NULL, 1, NULL),
  ('imp_36f7f2f0a5e3f2b1', '2026-04-01 00:00:00.000', 'Aman ulllah', NULL, NULL, 1, NULL),
  ('imp_4eeacbdf4fe7a3e5', '2026-04-01 00:00:00.000', 'Arsalan Zarar', NULL, NULL, 1, NULL),
  ('imp_760919e5d59c2972', '2026-04-01 00:00:00.000', 'Amjid bhai', NULL, NULL, 1, NULL),
  ('imp_5ed0d5f307a33034', '2026-04-01 00:00:00.000', 'Saddeq guest', NULL, NULL, 1, NULL),
  ('imp_a8f851b8b57321bb', '2026-04-01 00:00:00.000', 'Amam Salman', NULL, NULL, 1, NULL),
  ('imp_f6a52a378318b0b4', '2026-04-01 00:00:00.000', 'Hamza saleem lhr', NULL, NULL, 1, NULL),
  ('imp_dc7c2dec9d7a4388', '2026-04-01 00:00:00.000', 'Hassan molvi /shahzeb zada', NULL, NULL, 1, NULL),
  ('imp_fbce2334d71a46cc', '2026-04-01 00:00:00.000', 'Yasir ref aqif khan', NULL, NULL, 1, NULL),
  ('imp_42736944d86475f6', '2026-04-01 00:00:00.000', 'Main Syed Ali shah', NULL, NULL, 1, NULL),
  ('imp_7aec445eec67d5f4', '2026-04-01 00:00:00.000', 'Khadem Khaksar', NULL, NULL, 1, NULL),
  ('imp_b1eb190a224b91d2', '2026-04-01 00:00:00.000', 'Swat wala guest', NULL, NULL, 1, NULL),
  ('imp_d830c81ebdf58845', '2026-04-01 00:00:00.000', 'Nader shah', NULL, NULL, 1, NULL),
  ('imp_3002bb995edaaee3', '2026-04-01 00:00:00.000', 'Farman Guest khyber', NULL, NULL, 1, NULL),
  ('imp_54b58b1c0871a40e', '2026-04-01 00:00:00.000', 'Adil dubai Guest', NULL, NULL, 1, NULL),
  ('imp_fb3c3bf67d115061', '2026-04-01 00:00:00.000', 'Abdur Raziq guest', NULL, NULL, 1, NULL),
  ('imp_fb4cf83ba52d3102', '2026-04-01 00:00:00.000', 'Malamjaba guest', NULL, NULL, 1, NULL),
  ('imp_7d5c5218a1c6deee', '2026-04-01 00:00:00.000', 'Basit Fasalabad guest', NULL, NULL, 1, NULL),
  ('imp_b4d438ce63c718b6', '2026-04-01 00:00:00.000', 'Khan zada dir guest', NULL, NULL, 1, NULL),
  ('imp_b5361ae04a476da4', '2026-04-01 00:00:00.000', 'Riaz guest pesh', NULL, NULL, 1, NULL),
  ('imp_7a40fb36474ce1d6', '2026-04-01 00:00:00.000', 'Wahed ref kashif', NULL, NULL, 1, NULL),
  ('imp_e42c6c09636faf3f', '2026-04-01 00:00:00.000', 'Shekh Shani', NULL, NULL, 1, NULL),
  ('imp_b9ba1393cfffb122', '2026-04-01 00:00:00.000', 'Yousaf Afridi', NULL, NULL, 1, NULL),
  ('imp_d89bac45e0304ec6', '2026-04-01 00:00:00.000', 'Kashif', NULL, NULL, 1, NULL),
  ('imp_acfee24230919b89', '2026-04-01 00:00:00.000', 'Adnan ref Adil', NULL, NULL, 1, NULL),
  ('imp_ea723712e46bf28b', '2026-04-01 00:00:00.000', 'Khalid Dubai guest', NULL, NULL, 1, NULL),
  ('imp_36051a3782639e28', '2026-04-01 00:00:00.000', 'Yasir pesh', NULL, NULL, 1, NULL),
  ('imp_46b25d3cbd37539e', '2026-04-01 00:00:00.000', 'Tesbhi ref Safdar', NULL, NULL, 1, NULL),
  ('imp_58d87a1c06d2894b', '2026-04-01 00:00:00.000', 'Bilal dealer', NULL, NULL, 1, NULL),
  ('imp_400a88b653430ee7', '2026-04-01 00:00:00.000', 'Awis Lhr guest', NULL, NULL, 1, NULL),
  ('imp_f1c14ffed200a8c2', '2026-04-01 00:00:00.000', 'Tajwali', NULL, NULL, 1, NULL);

-- Historical stays. activePending=0 so imported remaining stays quiet.
INSERT INTO stays (id, createdAt, flatId, clientId, checkIn, checkOut, nights, notifyEnabled, activePending, importKey, legacyNote) VALUES
  ('imp_a99a5774796f5bce', '2026-04-17 00:00:00.000', 'flat_802-A', 'imp_2f884f9a288b9d4d', '2026-04-17 00:00:00.000', '2026-05-10 00:00:00.000', 22, 0, 0, 'imp_a99a5774796f5bce', '17/04/2026 | 2026-05-10 | 22 night | Trader | 15000*22=330,000'),
  ('imp_44914c693a287113', '2026-05-12 00:00:00.000', 'flat_802-A', 'imp_c9283e7aa55dadc4', '2026-05-12 00:00:00.000', '2026-05-13 00:00:00.000', 1, 0, 0, 'imp_44914c693a287113', '2026-05-12 | 13/05/2026 | 1 Night /2Bed | Maryam TikToker | 15000 Anas received'),
  ('imp_7ec62963e94f2c0c', '2026-05-13 00:00:00.000', 'flat_802-A', 'imp_2fe12f5b50c89166', '2026-05-13 00:00:00.000', '2026-05-14 00:00:00.000', 1, 0, 0, 'imp_7ec62963e94f2c0c', '13/05/2026 | 14/05/2026 | 1 night /2 Bed | Ejaz Kashif bro | 10000 Anas received'),
  ('imp_e279ce08615ce796', '2026-05-14 00:00:00.000', 'flat_802-A', 'imp_e2849f297f290d60', '2026-05-14 00:00:00.000', '2026-05-15 00:00:00.000', 1, 0, 0, 'imp_e279ce08615ce796', '14/05/2026 | 15/05/2026 | 1 night | Tahir bhai | 15000'),
  ('imp_7437f6ed3b33d6dc', '2026-05-19 00:00:00.000', 'flat_802-A', 'imp_2254696a429987c1', '2026-05-19 00:00:00.000', '2026-05-20 00:00:00.000', 1, 0, 0, 'imp_7437f6ed3b33d6dc', '19/05/2026 | 20/05/2026 | 1 Night | Farman pesh guest | 18000 Anas received'),
  ('imp_85a73cac27c3d4fb', '2026-05-20 00:00:00.000', 'flat_802-A', 'imp_110bf1053b25ec45', '2026-05-20 00:00:00.000', '2026-05-21 00:00:00.000', 1, 0, 0, 'imp_85a73cac27c3d4fb', '20/05/2026 | 21/05/2026 | 1 Night | Khalid Ref Maryam | 18000 capital lagoon'),
  ('imp_2f6f2f6eba64f899', '2026-05-21 00:00:00.000', 'flat_802-A', 'imp_2254696a429987c1', '2026-05-21 00:00:00.000', '2026-05-22 00:00:00.000', 1, 0, 0, 'imp_2f6f2f6eba64f899', '21/05/2026 | 22/05/2026 | 1 Night | Farman pesh guest | 18000 Anas Easypisa'),
  ('imp_5aba05bc19bf440f', '2026-06-01 00:00:00.000', 'flat_802-A', 'imp_e2849f297f290d60', '2026-06-01 00:00:00.000', '2026-06-02 00:00:00.000', 1, 0, 0, 'imp_5aba05bc19bf440f', '2026-06-01 | 2026-06-02 | 1 Night | Tahir Bhai | 15000 Khizer account'),
  ('imp_772fa0adda8f11ed', '2026-06-02 00:00:00.000', 'flat_802-A', 'imp_e264cc3b323dc240', '2026-06-02 00:00:00.000', '2026-06-03 00:00:00.000', 1, 0, 0, 'imp_772fa0adda8f11ed', '2026-06-02 | 2026-06-03 | 1 Night | Bilal/ Yousif guest pesh | 18000 Capital Lagoon | 1000 sikander'),
  ('imp_f1a6f2a7b27e463e', '2026-06-03 00:00:00.000', 'flat_802-A', 'imp_47e183dbabb7c952', '2026-06-03 00:00:00.000', '2026-06-04 00:00:00.000', 1, 0, 0, 'imp_f1a6f2a7b27e463e', '2026-06-03 | 2026-06-04 | 1 Night | Amjid Imroza | 15000 remaining | 12500 maintenance Anas'),
  ('imp_06256e0e3b6a388a', '2026-06-04 00:00:00.000', 'flat_802-A', 'imp_f3f5e35cfbac74f2', '2026-06-04 00:00:00.000', '2026-06-06 00:00:00.000', 2, 0, 0, 'imp_06256e0e3b6a388a', '2026-06-04 | 2026-06-06 | 2 Nights | Naeem dealer ref | 28000 khizer | 7250 sofa cover'),
  ('imp_2cc06b4881f73178', '2026-06-06 00:00:00.000', 'flat_802-A', 'imp_f1953889a9352c08', '2026-06-06 00:00:00.000', '2026-06-09 00:00:00.000', 3, 0, 0, 'imp_2cc06b4881f73178', '2026-06-06 | 2026-06-09 | 3 Nights | Dr.Nader shah | 45000 capital lagoon | 1000 sikandar 30 June'),
  ('imp_21b81fe8048dcc47', '2026-06-09 00:00:00.000', 'flat_802-A', 'imp_01597bb7ffe37f44', '2026-06-09 00:00:00.000', '2026-06-10 00:00:00.000', 1, 0, 0, 'imp_21b81fe8048dcc47', '2026-06-09 | 2026-06-10 | 1 Night | Dr Nadar shah | 15000 Anas Easypisa | 1000 sikandar 31 june'),
  ('imp_68e829de97e616d3', '2026-06-11 00:00:00.000', 'flat_802-A', 'imp_c0c359c40d8173c5', '2026-06-11 00:00:00.000', '2026-06-11 00:00:00.000', 1, 0, 0, 'imp_68e829de97e616d3', '2026-06-11 | 2026-06-11 | 1 Day | Salman imam | 12000 cash shahzeb'),
  ('imp_9d64c33afd0b9ee7', '2026-06-11 00:00:00.000', 'flat_802-A', 'imp_6a08cd01067ddeda', '2026-06-11 00:00:00.000', '2026-06-12 00:00:00.000', 1, 0, 0, 'imp_9d64c33afd0b9ee7', '2026-06-11 | 2026-06-12 | 1 Night | Dr Nadar Friends | 18000 khizer cash'),
  ('imp_79b2cd86ee22782d', '2026-06-12 00:00:00.000', 'flat_802-A', 'imp_bec13d2e484dfcd2', '2026-06-12 00:00:00.000', '2026-06-13 00:00:00.000', 1, 0, 0, 'imp_79b2cd86ee22782d', '2026-06-12 | 13/06/2026 | 1 Night | Khalid guest | 18000 Anas'),
  ('imp_6486121fb96bb139', '2026-06-13 00:00:00.000', 'flat_802-A', 'imp_16ab02ad3ff11ede', '2026-06-13 00:00:00.000', '2026-06-14 00:00:00.000', 1, 0, 0, 'imp_6486121fb96bb139', '13/06/2026 | 14/06/2026 | 1 Night | Ahmad ullah ref 402B guest | 18000 capital lagoon'),
  ('imp_6820b811eeea8f1a', '2026-06-15 00:00:00.000', 'flat_802-A', 'imp_8903ed5cf5d60fa1', '2026-06-15 00:00:00.000', '2026-06-16 00:00:00.000', 1, 0, 0, 'imp_6820b811eeea8f1a', '15/06/2026 | 16/06/2026 | 1 Night | Adil ref Tahir Afridi | 18000 Anas wasol'),
  ('imp_dc0d8a4a22f397da', '2026-06-17 00:00:00.000', 'flat_802-A', 'imp_7a78f16a2d9367fb', '2026-06-17 00:00:00.000', '2026-06-18 00:00:00.000', 1, 0, 0, 'imp_dc0d8a4a22f397da', '17/06/2026 | 18/06/2026 | 1 Night | Asad ullah khan /khalid pesh | 18000 capital lagoon'),
  ('imp_34256365e9b1f17e', '2026-06-18 00:00:00.000', 'flat_802-A', 'imp_40c316188131f652', '2026-06-18 00:00:00.000', '2026-06-19 00:00:00.000', 1, 0, 0, 'imp_34256365e9b1f17e', '18/06/2026 | 19/06/2026 | 1 Nigh | Qasim c block | 10000 khizer'),
  ('imp_eb0b1733381e6b60', '2026-06-19 00:00:00.000', 'flat_802-A', 'imp_889c675c0ba00d96', '2026-06-19 00:00:00.000', '2026-06-20 00:00:00.000', 1, 0, 0, 'imp_eb0b1733381e6b60', '19/06/2026 | 20/06/2026 | 1 Night | Mudasir karachi | 16000 khizer'),
  ('imp_6b369ea43bc62b94', '2026-06-24 00:00:00.000', 'flat_802-A', 'imp_5925e97b1a326ecd', '2026-06-24 00:00:00.000', '2026-06-25 00:00:00.000', 1, 0, 0, 'imp_6b369ea43bc62b94', '24/06/2026 | 25/06/2026 | 2 bed/1 Night | Dost Muhmmad | 8000 anas'),
  ('imp_4fd0048082bd241c', '2026-06-25 00:00:00.000', 'flat_802-A', 'imp_88b8b813e5efa271', '2026-06-25 00:00:00.000', '2026-06-26 00:00:00.000', 1, 0, 0, 'imp_4fd0048082bd241c', '25/06/2026 | 26/06/2026 | 1 Night | Nadir shah | 15000 khizer cash'),
  ('imp_2d13dc1b9066a76e', '2026-06-26 00:00:00.000', 'flat_802-A', 'imp_88b8b813e5efa271', '2026-06-26 00:00:00.000', '2026-06-27 00:00:00.000', 1, 0, 0, 'imp_2d13dc1b9066a76e', '26/06/2026 | 27/06/2026 | 1 Night | Nadir  shah | 20000 khizer cash'),
  ('imp_2e3eaac3bfea7841', '2026-06-29 00:00:00.000', 'flat_802-A', 'imp_0539842d17b0f786', '2026-06-29 00:00:00.000', '2026-06-30 00:00:00.000', 1, 0, 0, 'imp_2e3eaac3bfea7841', '29/06/2026 | 30/06/2626 | 1 Night | Aman ullah | 15000 anas Easypisa'),
  ('imp_40b01c581350a43b', '2026-07-01 00:00:00.000', 'flat_802-A', 'imp_c92ae260d5f0fbc1', '2026-07-01 00:00:00.000', '2026-07-02 00:00:00.000', 1, 0, 0, 'imp_40b01c581350a43b', '2026-07-01 | 2026-07-02 | 1 Night /2 Bed | Abdul Haq | 12000 Anas cash | 12500 Maintenance'),
  ('imp_672f6234c4e119f6', '2026-07-02 00:00:00.000', 'flat_802-A', 'imp_30bd1a1b0a54a41d', '2026-07-02 00:00:00.000', '2026-07-03 00:00:00.000', 1, 0, 0, 'imp_672f6234c4e119f6', '2026-07-02 | 2026-07-03 | 1 Nigh/3 bed | Khalid pesh | 18000  Easypisa anas | 3600 watar house +340'),
  ('imp_201dad1f5ff9fb18', '2026-07-05 00:00:00.000', 'flat_802-A', 'imp_f1953889a9352c08', '2026-07-05 00:00:00.000', '2026-07-08 00:00:00.000', 3, 0, 0, 'imp_201dad1f5ff9fb18', '2026-07-05 | 2026-07-08 | 3 Nights | Dr.Nader shah | 2023-03-15 | 300 electric'),
  ('imp_7ead95ba9fcfa395', '2026-07-08 00:00:00.000', 'flat_802-A', 'imp_c58a7c89a4b7e8cf', '2026-07-08 00:00:00.000', '2026-07-10 00:00:00.000', 2, 0, 0, 'imp_7ead95ba9fcfa395', '2026-07-08 | 2026-07-10 | 2Nights | Maiz ullah Fareed bhai | 30000 Remaining fareed | 8620 PTCL bill'),
  ('imp_7f3194ad18340b69', '2026-07-10 00:00:00.000', 'flat_802-A', 'imp_d555ad18072b60a9', '2026-07-10 00:00:00.000', '2026-07-11 00:00:00.000', 1, 0, 0, 'imp_7f3194ad18340b69', '2026-07-10 | 2026-07-11 | 1 Night | Asif pesh guest | 20000 received capital lagoon | 6600 gas and dewdrop'),
  ('imp_9dfeb706966b9c98', '2026-07-11 00:00:00.000', 'flat_802-A', 'imp_f4ca0cfe4aa20a27', '2026-07-11 00:00:00.000', '2026-07-13 00:00:00.000', 2, 0, 0, 'imp_9dfeb706966b9c98', '2026-07-11 | 13/07/2026 | 2 Night | Asad Afridi | 40000 anas Easypisa | Total expanse= 31960'),
  ('imp_4150194f21d1ef35', '2026-07-15 00:00:00.000', 'flat_802-A', 'imp_c0ae1e194a94c875', '2026-07-15 00:00:00.000', '2026-07-17 00:00:00.000', 2, 0, 0, 'imp_4150194f21d1ef35', '15/07/2026 | 17/07/2026 | 2 Nights | Saad dealer | 30000 anas Alfalah | Electricity bill:37683'),
  ('imp_aead092b7dddf7d6', '2026-07-19 00:00:00.000', 'flat_802-A', 'imp_ba9c4008ebd2e5d9', '2026-07-19 00:00:00.000', '2026-07-20 00:00:00.000', 1, 0, 0, 'imp_aead092b7dddf7d6', '19/07/2026 | 20/07/2026 | 1 Night | Hayat guest | 18000 anas Easypisa | Room rent 8000'),
  ('imp_4efe90bc133c9d0a', '2026-07-24 00:00:00.000', 'flat_802-A', 'imp_36f7f2f0a5e3f2b1', '2026-07-24 00:00:00.000', '2026-07-25 00:00:00.000', 1, 0, 0, 'imp_4efe90bc133c9d0a', '24/07/2026 | 25/07/2026 | 1 night | Aman ulllah | 16000 Easypisa | 77643 total'),
  ('imp_29fec63a4ebbefd2', '2026-07-25 00:00:00.000', 'flat_802-A', 'imp_4eeacbdf4fe7a3e5', '2026-07-25 00:00:00.000', '2026-07-27 00:00:00.000', 2, 0, 0, 'imp_29fec63a4ebbefd2', '25/07/2026 | 27/07/2026 | 2 Nights | Arsalan Zarar | 30000 Easypisa account'),
  ('imp_040c2459a8b906f1', '2026-07-27 00:00:00.000', 'flat_802-A', 'imp_760919e5d59c2972', '2026-07-27 00:00:00.000', '2026-07-28 00:00:00.000', 1, 0, 0, 'imp_040c2459a8b906f1', '27/07/2026 | 28/07/2027 | 1 Night | Amjid bhai | 15000 Easypisa'),
  ('imp_923031dec2472a9d', '2026-07-28 00:00:00.000', 'flat_802-A', 'imp_5ed0d5f307a33034', '2026-07-28 00:00:00.000', '2026-07-29 00:00:00.000', 1, 0, 0, 'imp_923031dec2472a9d', '28/07/2026 | 29/07/2026 | 1 night | Saddeq guest | 15000 remaining CNIC leave'),
  ('imp_8568348c0d6b1541', '2026-07-29 00:00:00.000', 'flat_802-A', 'imp_a8f851b8b57321bb', '2026-07-29 00:00:00.000', '2026-07-30 00:00:00.000', 1, 0, 0, 'imp_8568348c0d6b1541', '29/07/2026 | 30/07/2026 | 1 Night | Amam Salman | 18000 Easypisa'),
  ('imp_ee81ebc5371f0c01', '2026-07-31 00:00:00.000', 'flat_802-A', 'imp_f6a52a378318b0b4', '2026-07-31 00:00:00.000', '2026-08-01 00:00:00.000', 1, 0, 0, 'imp_ee81ebc5371f0c01', '31/07/2026 | 2026-01-08 | 1 night /2 Bedroom | Hamza saleem lhr | 12000 Easypisa'),
  ('imp_310d8e2291ffc682', '2026-08-03 00:00:00.000', 'flat_802-A', 'imp_dc7c2dec9d7a4388', '2026-08-03 00:00:00.000', '2026-08-04 00:00:00.000', 1, 0, 0, 'imp_310d8e2291ffc682', '2026-08-03 | 2026-08-04 | 1 Night | Hassan molvi /shahzeb zada | 20000 remaining | 12500+5200+55000=72,700'),
  ('imp_99426bab79121f82', '2026-08-04 00:00:00.000', 'flat_802-A', 'imp_fbce2334d71a46cc', '2026-08-04 00:00:00.000', '2026-08-06 00:00:00.000', 2, 0, 0, 'imp_99426bab79121f82', '2026-08-04 | 2026-08-06 | 2 Nights | Yasir  ref aqif khan | 40000 cash | 15000 Rohed'),
  ('imp_e9454399aaa7689f', '2026-09-01 00:00:00.000', 'flat_802-A', 'imp_42736944d86475f6', '2026-09-01 00:00:00.000', '2026-09-03 00:00:00.000', 2, 0, 0, 'imp_e9454399aaa7689f', '2026-09-01 | 2026-09-03 | 2 Nights | Main Syed Ali shah | 26000 Remaining | 25000 electricity'),
  ('imp_eccd214d8646f957', '2026-09-07 00:00:00.000', 'flat_802-A', 'imp_7aec445eec67d5f4', '2026-09-07 00:00:00.000', '2026-09-08 00:00:00.000', 1, 0, 0, 'imp_eccd214d8646f957', '2026-09-07 | 2026-09-08 | 1 Night | Khadem Khaksar | 15000 Remaining | 3000 +3000amin safayi'),
  ('imp_628cae629d8ea4f8', '2026-09-09 00:00:00.000', 'flat_802-A', 'imp_b1eb190a224b91d2', '2026-09-09 00:00:00.000', '2026-09-10 00:00:00.000', 1, 0, 0, 'imp_628cae629d8ea4f8', '2026-09-09 | 2026-09-10 | 1 Night | Swat wala guest | 18000 Easypisa | 12500 Maintenance'),
  ('imp_1a70cb68fafe8d4c', '2026-09-10 00:00:00.000', 'flat_802-A', 'imp_e2849f297f290d60', '2026-09-10 00:00:00.000', '2026-09-11 00:00:00.000', 1, 0, 0, 'imp_1a70cb68fafe8d4c', '2026-09-10 | 2026-09-11 | 1 Night | Tahir bhai | 30000 Easypisa | 3000 safyai asif'),
  ('imp_10114096ee399342', '2026-09-13 00:00:00.000', 'flat_802-A', 'imp_d830c81ebdf58845', '2026-09-13 00:00:00.000', '2026-09-14 00:00:00.000', 1, 0, 0, 'imp_10114096ee399342', '13/09/2026 | 14/09/2026 | 1 Night | Nader shah | 15000 Easypisa | 6300 sofa safayi'),
  ('imp_4cd8bf5723e942ac', '2026-09-14 00:00:00.000', 'flat_802-A', 'imp_3002bb995edaaee3', '2026-09-14 00:00:00.000', '2026-09-17 00:00:00.000', 3, 0, 0, 'imp_4cd8bf5723e942ac', '14/09/2026 | 17/09/2026 | 3 Nights | Farman Guest khyber | 67000 send capital lagoon'),
  ('imp_c494a1f27c1aab89', '2026-07-15 00:00:00.000', 'flat_408-B', 'imp_54b58b1c0871a40e', '2026-07-15 00:00:00.000', '2026-07-17 00:00:00.000', 2, 0, 0, 'imp_c494a1f27c1aab89', '15/07/2026 | 17/07/2026 | 2 nights /2 Bed | Adil dubai Guest | 20000 bank Alfalah | 3460 PTCL bill'),
  ('imp_b172806f7b003fea', '2026-07-20 00:00:00.000', 'flat_408-B', 'imp_f1953889a9352c08', '2026-07-20 00:00:00.000', '2026-07-21 00:00:00.000', 1, 0, 0, 'imp_b172806f7b003fea', '20/07/2026 | 21/07/2026 | 1 Night | Dr.Nader shah | 15000 Easypisa'),
  ('imp_77a3c9a36a43f9a5', '2026-07-23 00:00:00.000', 'flat_408-B', 'imp_fb3c3bf67d115061', '2026-07-23 00:00:00.000', '2026-07-24 00:00:00.000', 1, 0, 0, 'imp_77a3c9a36a43f9a5', '23/07/2026 | 24/07/2026 | 1 Night /2 Bed | Abdur Raziq guest | 10000 Easypisa'),
  ('imp_95d515e77d5c1445', '2026-07-29 00:00:00.000', 'flat_408-B', 'imp_fb4cf83ba52d3102', '2026-07-29 00:00:00.000', '2026-07-31 00:00:00.000', 3, 0, 0, 'imp_95d515e77d5c1445', '29/07/2026 | 31/07/2026 | 3 Nights | Malamjaba guest | 30000 Easypisa'),
  ('imp_92ed59b76ac1615f', '2026-08-01 00:00:00.000', 'flat_408-B', 'imp_d830c81ebdf58845', '2026-08-01 00:00:00.000', '2026-08-02 00:00:00.000', 1, 0, 0, 'imp_92ed59b76ac1615f', '2026-08-01 | 2026-08-02 | 1 Night | Nader shah | 15000 Easypisa | 1500  plamber fareed'),
  ('imp_7a6f4071998d48b0', '2026-08-02 00:00:00.000', 'flat_408-B', 'imp_7d5c5218a1c6deee', '2026-08-02 00:00:00.000', '2026-08-03 00:00:00.000', 1, 0, 0, 'imp_7a6f4071998d48b0', '2026-08-02 | 2026-08-03 | 1 Night /2 | Basit Fasalabad guest | 8000 Anas Easypisa | 1000 toker'),
  ('imp_4c5da940a9739eb4', '2026-08-03 00:00:00.000', 'flat_408-B', 'imp_b4d438ce63c718b6', '2026-08-03 00:00:00.000', '2026-08-04 00:00:00.000', 1, 0, 0, 'imp_4c5da940a9739eb4', '2026-08-03 | 2026-08-04 | 1 Night /1 bed | Khan zada dir guest | 6000 anas Easypisa | 15000 rohed'),
  ('imp_d31e231d7e699c91', '2026-08-05 00:00:00.000', 'flat_408-B', 'imp_b5361ae04a476da4', '2026-08-05 00:00:00.000', '2026-08-07 00:00:00.000', 2, 0, 0, 'imp_d31e231d7e699c91', '2026-08-05 | 2026-08-07 | 2 Nights | Riaz guest pesh | 30000 remaining'),
  ('imp_1c018bb5e980ae36', '2026-08-07 00:00:00.000', 'flat_408-B', 'imp_0539842d17b0f786', '2026-08-07 00:00:00.000', '2026-08-08 00:00:00.000', 1, 0, 0, 'imp_1c018bb5e980ae36', '2026-08-07 | 2026-08-08 | 1 Night | Aman Ullah | 10000 Easypisa'),
  ('imp_7daf9e580ec20ff1', '2026-08-10 00:00:00.000', 'flat_408-B', 'imp_7a40fb36474ce1d6', '2026-08-10 00:00:00.000', '2026-08-11 00:00:00.000', 1, 0, 0, 'imp_7daf9e580ec20ff1', '2026-08-10 | 2026-08-11 | 1 Night | Wahed ref kashif | 6000 anas cash'),
  ('imp_0aafd1d5d2b596ec', '2026-08-16 00:00:00.000', 'flat_408-B', 'imp_c92ae260d5f0fbc1', '2026-08-16 00:00:00.000', '2026-08-17 00:00:00.000', 1, 0, 0, 'imp_0aafd1d5d2b596ec', '16/08/2026 | Abdul haq | 12000 remaining'),
  ('imp_8b4b69993fc492f7', '2026-08-18 00:00:00.000', 'flat_408-B', 'imp_e42c6c09636faf3f', '2026-08-18 00:00:00.000', '2026-08-19 00:00:00.000', 1, 0, 0, 'imp_8b4b69993fc492f7', '18/08/2026 | Shekh Shani | 10000 Easypisa'),
  ('imp_002175b46c578ec4', '2026-08-19 00:00:00.000', 'flat_408-B', 'imp_b9ba1393cfffb122', '2026-08-19 00:00:00.000', '2026-08-22 00:00:00.000', 3, 0, 0, 'imp_002175b46c578ec4', '19/08/2026 | 22/08/2026 | 3 Nights | Yousaf Afridi | 30000 Easypisa'),
  ('imp_78403a45ced4af1f', '2026-08-23 00:00:00.000', 'flat_408-B', 'imp_d89bac45e0304ec6', '2026-08-23 00:00:00.000', '2026-08-24 00:00:00.000', 1, 0, 0, 'imp_78403a45ced4af1f', '23/08/2026 | 24/08/2026 | 1 night | Kashif | 11000 Easypisa'),
  ('imp_129cf2af770f58de', '2026-09-01 00:00:00.000', 'flat_408-B', 'imp_acfee24230919b89', '2026-09-01 00:00:00.000', '2026-09-02 00:00:00.000', 1, 0, 0, 'imp_129cf2af770f58de', '2026-09-01 | 2026-09-02 | 1 Night /2Bed | Adnan ref Adil | 10000 Easypisa | 12500 Maintenance'),
  ('imp_9daedc215b835e6e', '2026-09-03 00:00:00.000', 'flat_408-B', 'imp_ea723712e46bf28b', '2026-09-03 00:00:00.000', '2026-09-04 00:00:00.000', 1, 0, 0, 'imp_9daedc215b835e6e', '2026-09-03 | 2026-09-04 | 1 Night | Khalid Dubai guest | 12000 Easypisa | 600 hand wash'),
  ('imp_2eaba44dfe630c99', '2026-09-05 00:00:00.000', 'flat_408-B', 'imp_0539842d17b0f786', '2026-09-05 00:00:00.000', '2026-09-06 00:00:00.000', 1, 0, 0, 'imp_2eaba44dfe630c99', '2026-09-05 | 2026-09-06 | 1 Night | Aman ullah | 10000 Easypisa | 15000 Rohed'),
  ('imp_8ed6f6a83c669d29', '2026-09-07 00:00:00.000', 'flat_408-B', 'imp_b1eb190a224b91d2', '2026-09-07 00:00:00.000', '2026-09-08 00:00:00.000', 1, 0, 0, 'imp_8ed6f6a83c669d29', '2026-09-07 | 2026-09-08 | 1 Night | Swat wala guest | 12000 Easypisa | 2000 safyai'),
  ('imp_dd6de6e835630a11', '2026-09-09 00:00:00.000', 'flat_408-B', 'imp_36051a3782639e28', '2026-09-09 00:00:00.000', '2026-09-10 00:00:00.000', 1, 0, 0, 'imp_dd6de6e835630a11', '2026-09-09 | 2026-09-10 | 1 Night | Yasir pesh | 15000 Wasol Easypisa | 500 carpanter'),
  ('imp_208acd59e9c54a43', '2026-09-11 00:00:00.000', 'flat_408-B', 'imp_0539842d17b0f786', '2026-09-11 00:00:00.000', '2026-09-12 00:00:00.000', 1, 0, 0, 'imp_208acd59e9c54a43', '2026-09-11 | 2026-09-12 | 1 Night | Aman ullah | 10000 cash | 4800 sofa safayi'),
  ('imp_cac5c4e3a7d07e6d', '2026-09-12 00:00:00.000', 'flat_408-B', 'imp_46b25d3cbd37539e', '2026-09-12 00:00:00.000', '2026-09-13 00:00:00.000', 1, 0, 0, 'imp_cac5c4e3a7d07e6d', '2026-09-12 | 13/09/2026 | 1 Night | Tesbhi ref Safdar | 9000 wasol | 900 tezab etc'),
  ('imp_5a14fd58a410c953', '2026-09-13 00:00:00.000', 'flat_408-B', 'imp_58d87a1c06d2894b', '2026-09-13 00:00:00.000', '2026-09-14 00:00:00.000', 1, 0, 0, 'imp_5a14fd58a410c953', '13/09/2026 | 14/09/2026 | 1 Night | Bilal dealer | 10000 cash | 80000 Send to kashif'),
  ('imp_2779335aaaf8eae2', '2026-09-14 00:00:00.000', 'flat_408-B', 'imp_400a88b653430ee7', '2026-09-14 00:00:00.000', '2026-09-15 00:00:00.000', 1, 0, 0, 'imp_2779335aaaf8eae2', '14/09/2026 | 15/09/2026 | 1 Night | Awis Lhr guest | 9000 Cash'),
  ('imp_198b2e835d3c7373', '2026-09-15 00:00:00.000', 'flat_408-B', 'imp_f1c14ffed200a8c2', '2026-09-15 00:00:00.000', '2026-09-18 00:00:00.000', 3, 0, 0, 'imp_198b2e835d3c7373', '15/09/2026 | 18/09/2026 | 3 Night | Tajwali | 30000 Alfalah');

-- Business (rent) entries
INSERT INTO business_entries (id, createdAt, stayId, clientId, flatId, amount, occurredAt, importKey, note) VALUES
  ('imp_7e073049edeee39a', '2026-04-17 00:00:00.000', 'imp_a99a5774796f5bce', 'imp_2f884f9a288b9d4d', 'flat_802-A', 330000, '2026-04-17 00:00:00.000', 'imp_7e073049edeee39a', NULL),
  ('imp_a86f4838ad3adbeb', '2026-05-12 00:00:00.000', 'imp_44914c693a287113', 'imp_c9283e7aa55dadc4', 'flat_802-A', 15000, '2026-05-12 00:00:00.000', 'imp_a86f4838ad3adbeb', NULL),
  ('imp_9b69cc5dcbfd82b2', '2026-05-13 00:00:00.000', 'imp_7ec62963e94f2c0c', 'imp_2fe12f5b50c89166', 'flat_802-A', 10000, '2026-05-13 00:00:00.000', 'imp_9b69cc5dcbfd82b2', NULL),
  ('imp_673e64b4fbed10eb', '2026-05-14 00:00:00.000', 'imp_e279ce08615ce796', 'imp_e2849f297f290d60', 'flat_802-A', 15000, '2026-05-14 00:00:00.000', 'imp_673e64b4fbed10eb', NULL),
  ('imp_dc01c52cffcba345', '2026-05-19 00:00:00.000', 'imp_7437f6ed3b33d6dc', 'imp_2254696a429987c1', 'flat_802-A', 18000, '2026-05-19 00:00:00.000', 'imp_dc01c52cffcba345', NULL),
  ('imp_092c6c6b810228a1', '2026-05-20 00:00:00.000', 'imp_85a73cac27c3d4fb', 'imp_110bf1053b25ec45', 'flat_802-A', 18000, '2026-05-20 00:00:00.000', 'imp_092c6c6b810228a1', NULL),
  ('imp_dd95a20e5a00541c', '2026-05-21 00:00:00.000', 'imp_2f6f2f6eba64f899', 'imp_2254696a429987c1', 'flat_802-A', 18000, '2026-05-21 00:00:00.000', 'imp_dd95a20e5a00541c', NULL),
  ('imp_973a9c45185212ed', '2026-06-01 00:00:00.000', 'imp_5aba05bc19bf440f', 'imp_e2849f297f290d60', 'flat_802-A', 15000, '2026-06-01 00:00:00.000', 'imp_973a9c45185212ed', NULL),
  ('imp_ff716e5f6cfe0ea6', '2026-06-02 00:00:00.000', 'imp_772fa0adda8f11ed', 'imp_e264cc3b323dc240', 'flat_802-A', 18000, '2026-06-02 00:00:00.000', 'imp_ff716e5f6cfe0ea6', NULL),
  ('imp_3cbbd952ddf3684e', '2026-06-03 00:00:00.000', 'imp_f1a6f2a7b27e463e', 'imp_47e183dbabb7c952', 'flat_802-A', 15000, '2026-06-03 00:00:00.000', 'imp_3cbbd952ddf3684e', NULL),
  ('imp_a35664c3fe21b37f', '2026-06-04 00:00:00.000', 'imp_06256e0e3b6a388a', 'imp_f3f5e35cfbac74f2', 'flat_802-A', 28000, '2026-06-04 00:00:00.000', 'imp_a35664c3fe21b37f', NULL),
  ('imp_f57ffcf5076f462b', '2026-06-06 00:00:00.000', 'imp_2cc06b4881f73178', 'imp_f1953889a9352c08', 'flat_802-A', 45000, '2026-06-06 00:00:00.000', 'imp_f57ffcf5076f462b', NULL),
  ('imp_9bc1046ffdfb361c', '2026-06-09 00:00:00.000', 'imp_21b81fe8048dcc47', 'imp_01597bb7ffe37f44', 'flat_802-A', 15000, '2026-06-09 00:00:00.000', 'imp_9bc1046ffdfb361c', NULL),
  ('imp_9ac48bcfbeb98bef', '2026-06-11 00:00:00.000', 'imp_68e829de97e616d3', 'imp_c0c359c40d8173c5', 'flat_802-A', 12000, '2026-06-11 00:00:00.000', 'imp_9ac48bcfbeb98bef', NULL),
  ('imp_a68dca4f0ef183b4', '2026-06-11 00:00:00.000', 'imp_9d64c33afd0b9ee7', 'imp_6a08cd01067ddeda', 'flat_802-A', 18000, '2026-06-11 00:00:00.000', 'imp_a68dca4f0ef183b4', NULL),
  ('imp_71b3d62cfbfd9dfe', '2026-06-12 00:00:00.000', 'imp_79b2cd86ee22782d', 'imp_bec13d2e484dfcd2', 'flat_802-A', 18000, '2026-06-12 00:00:00.000', 'imp_71b3d62cfbfd9dfe', NULL),
  ('imp_74a3d0592f681c63', '2026-06-13 00:00:00.000', 'imp_6486121fb96bb139', 'imp_16ab02ad3ff11ede', 'flat_802-A', 18000, '2026-06-13 00:00:00.000', 'imp_74a3d0592f681c63', NULL),
  ('imp_da6d065ebdf28434', '2026-06-15 00:00:00.000', 'imp_6820b811eeea8f1a', 'imp_8903ed5cf5d60fa1', 'flat_802-A', 18000, '2026-06-15 00:00:00.000', 'imp_da6d065ebdf28434', NULL),
  ('imp_43d77fc22cbbbae0', '2026-06-17 00:00:00.000', 'imp_dc0d8a4a22f397da', 'imp_7a78f16a2d9367fb', 'flat_802-A', 18000, '2026-06-17 00:00:00.000', 'imp_43d77fc22cbbbae0', NULL),
  ('imp_c136f902b8a9b121', '2026-06-18 00:00:00.000', 'imp_34256365e9b1f17e', 'imp_40c316188131f652', 'flat_802-A', 10000, '2026-06-18 00:00:00.000', 'imp_c136f902b8a9b121', NULL),
  ('imp_50d799555f756345', '2026-06-19 00:00:00.000', 'imp_eb0b1733381e6b60', 'imp_889c675c0ba00d96', 'flat_802-A', 16000, '2026-06-19 00:00:00.000', 'imp_50d799555f756345', NULL),
  ('imp_d911c9885cad1fdc', '2026-06-24 00:00:00.000', 'imp_6b369ea43bc62b94', 'imp_5925e97b1a326ecd', 'flat_802-A', 8000, '2026-06-24 00:00:00.000', 'imp_d911c9885cad1fdc', NULL),
  ('imp_e7e21b98026eebf6', '2026-06-25 00:00:00.000', 'imp_4fd0048082bd241c', 'imp_88b8b813e5efa271', 'flat_802-A', 15000, '2026-06-25 00:00:00.000', 'imp_e7e21b98026eebf6', NULL),
  ('imp_384209e0db82844e', '2026-06-26 00:00:00.000', 'imp_2d13dc1b9066a76e', 'imp_88b8b813e5efa271', 'flat_802-A', 20000, '2026-06-26 00:00:00.000', 'imp_384209e0db82844e', NULL),
  ('imp_b135f333c005141e', '2026-06-29 00:00:00.000', 'imp_2e3eaac3bfea7841', 'imp_0539842d17b0f786', 'flat_802-A', 15000, '2026-06-29 00:00:00.000', 'imp_b135f333c005141e', NULL),
  ('imp_94306b6de66c5220', '2026-07-01 00:00:00.000', 'imp_40b01c581350a43b', 'imp_c92ae260d5f0fbc1', 'flat_802-A', 12000, '2026-07-01 00:00:00.000', 'imp_94306b6de66c5220', NULL),
  ('imp_54fe05c93b8b0a85', '2026-07-02 00:00:00.000', 'imp_672f6234c4e119f6', 'imp_30bd1a1b0a54a41d', 'flat_802-A', 18000, '2026-07-02 00:00:00.000', 'imp_54fe05c93b8b0a85', NULL),
  ('imp_d0ebf99a09e33f2b', '2026-07-05 00:00:00.000', 'imp_201dad1f5ff9fb18', 'imp_f1953889a9352c08', 'flat_802-A', 45000, '2026-07-05 00:00:00.000', 'imp_d0ebf99a09e33f2b', NULL),
  ('imp_27b2a17b00f83958', '2026-07-08 00:00:00.000', 'imp_7ead95ba9fcfa395', 'imp_c58a7c89a4b7e8cf', 'flat_802-A', 30000, '2026-07-08 00:00:00.000', 'imp_27b2a17b00f83958', NULL),
  ('imp_5e656ed24991be16', '2026-07-10 00:00:00.000', 'imp_7f3194ad18340b69', 'imp_d555ad18072b60a9', 'flat_802-A', 20000, '2026-07-10 00:00:00.000', 'imp_5e656ed24991be16', NULL),
  ('imp_f0dd7de583150967', '2026-07-11 00:00:00.000', 'imp_9dfeb706966b9c98', 'imp_f4ca0cfe4aa20a27', 'flat_802-A', 40000, '2026-07-11 00:00:00.000', 'imp_f0dd7de583150967', NULL),
  ('imp_66e57a91b2c6b7f2', '2026-07-15 00:00:00.000', 'imp_4150194f21d1ef35', 'imp_c0ae1e194a94c875', 'flat_802-A', 30000, '2026-07-15 00:00:00.000', 'imp_66e57a91b2c6b7f2', NULL),
  ('imp_a86b93bebfe4298f', '2026-07-19 00:00:00.000', 'imp_aead092b7dddf7d6', 'imp_ba9c4008ebd2e5d9', 'flat_802-A', 18000, '2026-07-19 00:00:00.000', 'imp_a86b93bebfe4298f', NULL),
  ('imp_41e454e5faa845c0', '2026-07-24 00:00:00.000', 'imp_4efe90bc133c9d0a', 'imp_36f7f2f0a5e3f2b1', 'flat_802-A', 16000, '2026-07-24 00:00:00.000', 'imp_41e454e5faa845c0', NULL),
  ('imp_fc55fba2a803ed48', '2026-07-25 00:00:00.000', 'imp_29fec63a4ebbefd2', 'imp_4eeacbdf4fe7a3e5', 'flat_802-A', 30000, '2026-07-25 00:00:00.000', 'imp_fc55fba2a803ed48', NULL),
  ('imp_ad37691f17585b88', '2026-07-27 00:00:00.000', 'imp_040c2459a8b906f1', 'imp_760919e5d59c2972', 'flat_802-A', 15000, '2026-07-27 00:00:00.000', 'imp_ad37691f17585b88', NULL),
  ('imp_293df48ba2664f13', '2026-07-28 00:00:00.000', 'imp_923031dec2472a9d', 'imp_5ed0d5f307a33034', 'flat_802-A', 15000, '2026-07-28 00:00:00.000', 'imp_293df48ba2664f13', NULL),
  ('imp_4100d4c078a96499', '2026-07-29 00:00:00.000', 'imp_8568348c0d6b1541', 'imp_a8f851b8b57321bb', 'flat_802-A', 18000, '2026-07-29 00:00:00.000', 'imp_4100d4c078a96499', NULL),
  ('imp_75b6db17684e25fd', '2026-07-31 00:00:00.000', 'imp_ee81ebc5371f0c01', 'imp_f6a52a378318b0b4', 'flat_802-A', 12000, '2026-07-31 00:00:00.000', 'imp_75b6db17684e25fd', NULL),
  ('imp_7dfe4efc1518c774', '2026-08-03 00:00:00.000', 'imp_310d8e2291ffc682', 'imp_dc7c2dec9d7a4388', 'flat_802-A', 20000, '2026-08-03 00:00:00.000', 'imp_7dfe4efc1518c774', NULL),
  ('imp_72cebe931d332114', '2026-08-04 00:00:00.000', 'imp_99426bab79121f82', 'imp_fbce2334d71a46cc', 'flat_802-A', 40000, '2026-08-04 00:00:00.000', 'imp_72cebe931d332114', NULL),
  ('imp_bf4b28b454fe7e81', '2026-09-01 00:00:00.000', 'imp_e9454399aaa7689f', 'imp_42736944d86475f6', 'flat_802-A', 26000, '2026-09-01 00:00:00.000', 'imp_bf4b28b454fe7e81', NULL),
  ('imp_ffb8f241cfbb3a4e', '2026-09-07 00:00:00.000', 'imp_eccd214d8646f957', 'imp_7aec445eec67d5f4', 'flat_802-A', 15000, '2026-09-07 00:00:00.000', 'imp_ffb8f241cfbb3a4e', NULL),
  ('imp_8e1773fe1b61e1e4', '2026-09-09 00:00:00.000', 'imp_628cae629d8ea4f8', 'imp_b1eb190a224b91d2', 'flat_802-A', 18000, '2026-09-09 00:00:00.000', 'imp_8e1773fe1b61e1e4', NULL),
  ('imp_47b570a3b1eefe80', '2026-09-10 00:00:00.000', 'imp_1a70cb68fafe8d4c', 'imp_e2849f297f290d60', 'flat_802-A', 30000, '2026-09-10 00:00:00.000', 'imp_47b570a3b1eefe80', NULL),
  ('imp_8809239fd19432a7', '2026-09-13 00:00:00.000', 'imp_10114096ee399342', 'imp_d830c81ebdf58845', 'flat_802-A', 15000, '2026-09-13 00:00:00.000', 'imp_8809239fd19432a7', NULL),
  ('imp_34073bd3a9f4d6f4', '2026-09-14 00:00:00.000', 'imp_4cd8bf5723e942ac', 'imp_3002bb995edaaee3', 'flat_802-A', 67000, '2026-09-14 00:00:00.000', 'imp_34073bd3a9f4d6f4', NULL),
  ('imp_056bd243a9a1534d', '2026-07-15 00:00:00.000', 'imp_c494a1f27c1aab89', 'imp_54b58b1c0871a40e', 'flat_408-B', 20000, '2026-07-15 00:00:00.000', 'imp_056bd243a9a1534d', NULL),
  ('imp_a932d24689c21577', '2026-07-20 00:00:00.000', 'imp_b172806f7b003fea', 'imp_f1953889a9352c08', 'flat_408-B', 15000, '2026-07-20 00:00:00.000', 'imp_a932d24689c21577', NULL),
  ('imp_1721605fe7554e23', '2026-07-23 00:00:00.000', 'imp_77a3c9a36a43f9a5', 'imp_fb3c3bf67d115061', 'flat_408-B', 10000, '2026-07-23 00:00:00.000', 'imp_1721605fe7554e23', NULL),
  ('imp_f96f3dc419661910', '2026-07-29 00:00:00.000', 'imp_95d515e77d5c1445', 'imp_fb4cf83ba52d3102', 'flat_408-B', 30000, '2026-07-29 00:00:00.000', 'imp_f96f3dc419661910', NULL),
  ('imp_84428748124ae708', '2026-08-01 00:00:00.000', 'imp_92ed59b76ac1615f', 'imp_d830c81ebdf58845', 'flat_408-B', 15000, '2026-08-01 00:00:00.000', 'imp_84428748124ae708', NULL),
  ('imp_70e540a95b07ce08', '2026-08-02 00:00:00.000', 'imp_7a6f4071998d48b0', 'imp_7d5c5218a1c6deee', 'flat_408-B', 8000, '2026-08-02 00:00:00.000', 'imp_70e540a95b07ce08', NULL),
  ('imp_b889b2b0918a168c', '2026-08-03 00:00:00.000', 'imp_4c5da940a9739eb4', 'imp_b4d438ce63c718b6', 'flat_408-B', 6000, '2026-08-03 00:00:00.000', 'imp_b889b2b0918a168c', NULL),
  ('imp_90e40e1d62639ee6', '2026-08-05 00:00:00.000', 'imp_d31e231d7e699c91', 'imp_b5361ae04a476da4', 'flat_408-B', 30000, '2026-08-05 00:00:00.000', 'imp_90e40e1d62639ee6', NULL),
  ('imp_0c934d0b2fb1848d', '2026-08-07 00:00:00.000', 'imp_1c018bb5e980ae36', 'imp_0539842d17b0f786', 'flat_408-B', 10000, '2026-08-07 00:00:00.000', 'imp_0c934d0b2fb1848d', NULL),
  ('imp_9176d3d1860db9ba', '2026-08-10 00:00:00.000', 'imp_7daf9e580ec20ff1', 'imp_7a40fb36474ce1d6', 'flat_408-B', 6000, '2026-08-10 00:00:00.000', 'imp_9176d3d1860db9ba', NULL),
  ('imp_4fbd7c65e7688635', '2026-08-16 00:00:00.000', 'imp_0aafd1d5d2b596ec', 'imp_c92ae260d5f0fbc1', 'flat_408-B', 12000, '2026-08-16 00:00:00.000', 'imp_4fbd7c65e7688635', NULL),
  ('imp_7b33862b99edf662', '2026-08-18 00:00:00.000', 'imp_8b4b69993fc492f7', 'imp_e42c6c09636faf3f', 'flat_408-B', 10000, '2026-08-18 00:00:00.000', 'imp_7b33862b99edf662', NULL),
  ('imp_e61592c150d24748', '2026-08-19 00:00:00.000', 'imp_002175b46c578ec4', 'imp_b9ba1393cfffb122', 'flat_408-B', 30000, '2026-08-19 00:00:00.000', 'imp_e61592c150d24748', NULL),
  ('imp_c6a5dfd06e0a3e29', '2026-08-23 00:00:00.000', 'imp_78403a45ced4af1f', 'imp_d89bac45e0304ec6', 'flat_408-B', 11000, '2026-08-23 00:00:00.000', 'imp_c6a5dfd06e0a3e29', NULL),
  ('imp_aac084aff82be4e1', '2026-09-01 00:00:00.000', 'imp_129cf2af770f58de', 'imp_acfee24230919b89', 'flat_408-B', 10000, '2026-09-01 00:00:00.000', 'imp_aac084aff82be4e1', NULL),
  ('imp_6efef42ddb2ef89b', '2026-09-03 00:00:00.000', 'imp_9daedc215b835e6e', 'imp_ea723712e46bf28b', 'flat_408-B', 12000, '2026-09-03 00:00:00.000', 'imp_6efef42ddb2ef89b', NULL),
  ('imp_c1bf79a34c2c8782', '2026-09-05 00:00:00.000', 'imp_2eaba44dfe630c99', 'imp_0539842d17b0f786', 'flat_408-B', 10000, '2026-09-05 00:00:00.000', 'imp_c1bf79a34c2c8782', NULL),
  ('imp_d2d26167f227abbe', '2026-09-07 00:00:00.000', 'imp_8ed6f6a83c669d29', 'imp_b1eb190a224b91d2', 'flat_408-B', 12000, '2026-09-07 00:00:00.000', 'imp_d2d26167f227abbe', NULL),
  ('imp_aa805b3f2a302051', '2026-09-09 00:00:00.000', 'imp_dd6de6e835630a11', 'imp_36051a3782639e28', 'flat_408-B', 15000, '2026-09-09 00:00:00.000', 'imp_aa805b3f2a302051', NULL),
  ('imp_145b2a468e4e1ba4', '2026-09-11 00:00:00.000', 'imp_208acd59e9c54a43', 'imp_0539842d17b0f786', 'flat_408-B', 10000, '2026-09-11 00:00:00.000', 'imp_145b2a468e4e1ba4', NULL),
  ('imp_26aab82382c4b506', '2026-09-12 00:00:00.000', 'imp_cac5c4e3a7d07e6d', 'imp_46b25d3cbd37539e', 'flat_408-B', 9000, '2026-09-12 00:00:00.000', 'imp_26aab82382c4b506', NULL),
  ('imp_7bec755fec21fe08', '2026-09-13 00:00:00.000', 'imp_5a14fd58a410c953', 'imp_58d87a1c06d2894b', 'flat_408-B', 10000, '2026-09-13 00:00:00.000', 'imp_7bec755fec21fe08', NULL),
  ('imp_94c61981bab38f63', '2026-09-14 00:00:00.000', 'imp_2779335aaaf8eae2', 'imp_400a88b653430ee7', 'flat_408-B', 9000, '2026-09-14 00:00:00.000', 'imp_94c61981bab38f63', NULL),
  ('imp_a3273506d9c0d738', '2026-09-15 00:00:00.000', 'imp_198b2e835d3c7373', 'imp_f1c14ffed200a8c2', 'flat_408-B', 30000, '2026-09-15 00:00:00.000', 'imp_a3273506d9c0d738', NULL);

-- Historical payments. Earlier payment rows are never overwritten later.
INSERT INTO payments (id, createdAt, stayId, clientId, flatId, amount, method, receivedAt, notes, importKey) VALUES
  ('imp_637cffcc08d41640', '2026-04-17 00:00:00.000', 'imp_a99a5774796f5bce', 'imp_2f884f9a288b9d4d', 'flat_802-A', 330000, 'OTHER', '2026-04-17 00:00:00.000', '15000*22=330,000', 'imp_637cffcc08d41640'),
  ('imp_92fcf69887156c02', '2026-05-12 00:00:00.000', 'imp_44914c693a287113', 'imp_c9283e7aa55dadc4', 'flat_802-A', 15000, 'OTHER', '2026-05-12 00:00:00.000', '15000 Anas received', 'imp_92fcf69887156c02'),
  ('imp_acda8e58354b8e9f', '2026-05-13 00:00:00.000', 'imp_7ec62963e94f2c0c', 'imp_2fe12f5b50c89166', 'flat_802-A', 10000, 'OTHER', '2026-05-13 00:00:00.000', '10000 Anas received', 'imp_acda8e58354b8e9f'),
  ('imp_1026181a45ec9e4e', '2026-05-14 00:00:00.000', 'imp_e279ce08615ce796', 'imp_e2849f297f290d60', 'flat_802-A', 15000, 'OTHER', '2026-05-14 00:00:00.000', '15000', 'imp_1026181a45ec9e4e'),
  ('imp_3b6167d2325e10d9', '2026-05-19 00:00:00.000', 'imp_7437f6ed3b33d6dc', 'imp_2254696a429987c1', 'flat_802-A', 18000, 'OTHER', '2026-05-19 00:00:00.000', '18000 Anas received', 'imp_3b6167d2325e10d9'),
  ('imp_2d930ac435c96fc9', '2026-05-20 00:00:00.000', 'imp_85a73cac27c3d4fb', 'imp_110bf1053b25ec45', 'flat_802-A', 18000, 'OTHER', '2026-05-20 00:00:00.000', '18000 capital lagoon', 'imp_2d930ac435c96fc9'),
  ('imp_eb3a8dc5d9fc0853', '2026-05-21 00:00:00.000', 'imp_2f6f2f6eba64f899', 'imp_2254696a429987c1', 'flat_802-A', 18000, 'EASYPAISA', '2026-05-21 00:00:00.000', '18000 Anas Easypisa', 'imp_eb3a8dc5d9fc0853'),
  ('imp_7cdc886145400321', '2026-06-01 00:00:00.000', 'imp_5aba05bc19bf440f', 'imp_e2849f297f290d60', 'flat_802-A', 15000, 'OTHER', '2026-06-01 00:00:00.000', '15000 Khizer account', 'imp_7cdc886145400321'),
  ('imp_ea0c68b6a1a1076d', '2026-06-02 00:00:00.000', 'imp_772fa0adda8f11ed', 'imp_e264cc3b323dc240', 'flat_802-A', 18000, 'OTHER', '2026-06-02 00:00:00.000', '18000 Capital Lagoon', 'imp_ea0c68b6a1a1076d'),
  ('imp_87c4f3b067137783', '2026-06-04 00:00:00.000', 'imp_06256e0e3b6a388a', 'imp_f3f5e35cfbac74f2', 'flat_802-A', 28000, 'OTHER', '2026-06-04 00:00:00.000', '28000 khizer', 'imp_87c4f3b067137783'),
  ('imp_c9f699cb6c4df845', '2026-06-06 00:00:00.000', 'imp_2cc06b4881f73178', 'imp_f1953889a9352c08', 'flat_802-A', 45000, 'OTHER', '2026-06-06 00:00:00.000', '45000 capital lagoon', 'imp_c9f699cb6c4df845'),
  ('imp_fd1c24d0fb4a1182', '2026-06-09 00:00:00.000', 'imp_21b81fe8048dcc47', 'imp_01597bb7ffe37f44', 'flat_802-A', 15000, 'EASYPAISA', '2026-06-09 00:00:00.000', '15000 Anas Easypisa', 'imp_fd1c24d0fb4a1182'),
  ('imp_207435ccdc692984', '2026-06-11 00:00:00.000', 'imp_68e829de97e616d3', 'imp_c0c359c40d8173c5', 'flat_802-A', 12000, 'CASH', '2026-06-11 00:00:00.000', '12000 cash shahzeb', 'imp_207435ccdc692984'),
  ('imp_75fe59f16f0157ee', '2026-06-11 00:00:00.000', 'imp_9d64c33afd0b9ee7', 'imp_6a08cd01067ddeda', 'flat_802-A', 18000, 'CASH', '2026-06-11 00:00:00.000', '18000 khizer cash', 'imp_75fe59f16f0157ee'),
  ('imp_621a1afb688d6d7d', '2026-06-12 00:00:00.000', 'imp_79b2cd86ee22782d', 'imp_bec13d2e484dfcd2', 'flat_802-A', 18000, 'OTHER', '2026-06-12 00:00:00.000', '18000 Anas', 'imp_621a1afb688d6d7d'),
  ('imp_b07582c41e1f2427', '2026-06-13 00:00:00.000', 'imp_6486121fb96bb139', 'imp_16ab02ad3ff11ede', 'flat_802-A', 18000, 'OTHER', '2026-06-13 00:00:00.000', '18000 capital lagoon', 'imp_b07582c41e1f2427'),
  ('imp_5627805ebe0ed28c', '2026-06-15 00:00:00.000', 'imp_6820b811eeea8f1a', 'imp_8903ed5cf5d60fa1', 'flat_802-A', 18000, 'OTHER', '2026-06-15 00:00:00.000', '18000 Anas wasol', 'imp_5627805ebe0ed28c'),
  ('imp_b2d8c0bec3488dfd', '2026-06-17 00:00:00.000', 'imp_dc0d8a4a22f397da', 'imp_7a78f16a2d9367fb', 'flat_802-A', 18000, 'OTHER', '2026-06-17 00:00:00.000', '18000 capital lagoon', 'imp_b2d8c0bec3488dfd'),
  ('imp_e567dc50b7410ddc', '2026-06-18 00:00:00.000', 'imp_34256365e9b1f17e', 'imp_40c316188131f652', 'flat_802-A', 10000, 'OTHER', '2026-06-18 00:00:00.000', '10000 khizer', 'imp_e567dc50b7410ddc'),
  ('imp_4dba8baf6568b0b7', '2026-06-19 00:00:00.000', 'imp_eb0b1733381e6b60', 'imp_889c675c0ba00d96', 'flat_802-A', 16000, 'OTHER', '2026-06-19 00:00:00.000', '16000 khizer', 'imp_4dba8baf6568b0b7'),
  ('imp_99ffbf8ecd99663d', '2026-06-24 00:00:00.000', 'imp_6b369ea43bc62b94', 'imp_5925e97b1a326ecd', 'flat_802-A', 8000, 'OTHER', '2026-06-24 00:00:00.000', '8000 anas', 'imp_99ffbf8ecd99663d'),
  ('imp_29c52b7ef3328f77', '2026-06-25 00:00:00.000', 'imp_4fd0048082bd241c', 'imp_88b8b813e5efa271', 'flat_802-A', 15000, 'CASH', '2026-06-25 00:00:00.000', '15000 khizer cash', 'imp_29c52b7ef3328f77'),
  ('imp_dc9983488518893b', '2026-06-26 00:00:00.000', 'imp_2d13dc1b9066a76e', 'imp_88b8b813e5efa271', 'flat_802-A', 20000, 'CASH', '2026-06-26 00:00:00.000', '20000 khizer cash', 'imp_dc9983488518893b'),
  ('imp_e70b046a1e1e412e', '2026-06-29 00:00:00.000', 'imp_2e3eaac3bfea7841', 'imp_0539842d17b0f786', 'flat_802-A', 15000, 'EASYPAISA', '2026-06-29 00:00:00.000', '15000 anas Easypisa', 'imp_e70b046a1e1e412e'),
  ('imp_9a8480bf03776eab', '2026-07-01 00:00:00.000', 'imp_40b01c581350a43b', 'imp_c92ae260d5f0fbc1', 'flat_802-A', 12000, 'CASH', '2026-07-01 00:00:00.000', '12000 Anas cash', 'imp_9a8480bf03776eab'),
  ('imp_6f010db722a04aec', '2026-07-02 00:00:00.000', 'imp_672f6234c4e119f6', 'imp_30bd1a1b0a54a41d', 'flat_802-A', 18000, 'EASYPAISA', '2026-07-02 00:00:00.000', '18000  Easypisa anas', 'imp_6f010db722a04aec'),
  ('imp_c4655b377a791315', '2026-07-05 00:00:00.000', 'imp_201dad1f5ff9fb18', 'imp_f1953889a9352c08', 'flat_802-A', 45000, 'OTHER', '2026-07-05 00:00:00.000', '45000', 'imp_c4655b377a791315'),
  ('imp_c4b050fac027fa01', '2026-07-10 00:00:00.000', 'imp_7f3194ad18340b69', 'imp_d555ad18072b60a9', 'flat_802-A', 20000, 'OTHER', '2026-07-10 00:00:00.000', '20000 received capital lagoon', 'imp_c4b050fac027fa01'),
  ('imp_86ced11d391d0bf9', '2026-07-11 00:00:00.000', 'imp_9dfeb706966b9c98', 'imp_f4ca0cfe4aa20a27', 'flat_802-A', 40000, 'EASYPAISA', '2026-07-11 00:00:00.000', '40000 anas Easypisa', 'imp_86ced11d391d0bf9'),
  ('imp_19a33ebbabfa58d3', '2026-07-15 00:00:00.000', 'imp_4150194f21d1ef35', 'imp_c0ae1e194a94c875', 'flat_802-A', 30000, 'BANK_TRANSFER', '2026-07-15 00:00:00.000', '30000 anas Alfalah', 'imp_19a33ebbabfa58d3'),
  ('imp_963d85d5bc75e92e', '2026-07-19 00:00:00.000', 'imp_aead092b7dddf7d6', 'imp_ba9c4008ebd2e5d9', 'flat_802-A', 18000, 'EASYPAISA', '2026-07-19 00:00:00.000', '18000 anas Easypisa', 'imp_963d85d5bc75e92e'),
  ('imp_975c100748fa1869', '2026-07-24 00:00:00.000', 'imp_4efe90bc133c9d0a', 'imp_36f7f2f0a5e3f2b1', 'flat_802-A', 16000, 'EASYPAISA', '2026-07-24 00:00:00.000', '16000 Easypisa', 'imp_975c100748fa1869'),
  ('imp_b87a756c9c1fee92', '2026-07-25 00:00:00.000', 'imp_29fec63a4ebbefd2', 'imp_4eeacbdf4fe7a3e5', 'flat_802-A', 30000, 'EASYPAISA', '2026-07-25 00:00:00.000', '30000 Easypisa account', 'imp_b87a756c9c1fee92'),
  ('imp_255cd87a5f2f0d93', '2026-07-27 00:00:00.000', 'imp_040c2459a8b906f1', 'imp_760919e5d59c2972', 'flat_802-A', 15000, 'EASYPAISA', '2026-07-27 00:00:00.000', '15000 Easypisa', 'imp_255cd87a5f2f0d93'),
  ('imp_d458249b65b000ac', '2026-07-29 00:00:00.000', 'imp_8568348c0d6b1541', 'imp_a8f851b8b57321bb', 'flat_802-A', 18000, 'EASYPAISA', '2026-07-29 00:00:00.000', '18000 Easypisa', 'imp_d458249b65b000ac'),
  ('imp_174f4c751a783c42', '2026-07-31 00:00:00.000', 'imp_ee81ebc5371f0c01', 'imp_f6a52a378318b0b4', 'flat_802-A', 12000, 'EASYPAISA', '2026-07-31 00:00:00.000', '12000 Easypisa', 'imp_174f4c751a783c42'),
  ('imp_6df7f492bf73fdfd', '2026-08-04 00:00:00.000', 'imp_99426bab79121f82', 'imp_fbce2334d71a46cc', 'flat_802-A', 40000, 'CASH', '2026-08-04 00:00:00.000', '40000 cash', 'imp_6df7f492bf73fdfd'),
  ('imp_84a44b406b7c0fd5', '2026-09-09 00:00:00.000', 'imp_628cae629d8ea4f8', 'imp_b1eb190a224b91d2', 'flat_802-A', 18000, 'EASYPAISA', '2026-09-09 00:00:00.000', '18000 Easypisa', 'imp_84a44b406b7c0fd5'),
  ('imp_2fc3f7cc2cf10209', '2026-09-10 00:00:00.000', 'imp_1a70cb68fafe8d4c', 'imp_e2849f297f290d60', 'flat_802-A', 30000, 'EASYPAISA', '2026-09-10 00:00:00.000', '30000 Easypisa', 'imp_2fc3f7cc2cf10209'),
  ('imp_05bdf2d6e7d7d8c7', '2026-09-13 00:00:00.000', 'imp_10114096ee399342', 'imp_d830c81ebdf58845', 'flat_802-A', 15000, 'EASYPAISA', '2026-09-13 00:00:00.000', '15000 Easypisa', 'imp_05bdf2d6e7d7d8c7'),
  ('imp_a6edbc6fddca81cb', '2026-09-14 00:00:00.000', 'imp_4cd8bf5723e942ac', 'imp_3002bb995edaaee3', 'flat_802-A', 67000, 'OTHER', '2026-09-14 00:00:00.000', '67000 send capital lagoon', 'imp_a6edbc6fddca81cb'),
  ('imp_28eae63bcffd8957', '2026-07-15 00:00:00.000', 'imp_c494a1f27c1aab89', 'imp_54b58b1c0871a40e', 'flat_408-B', 20000, 'BANK_TRANSFER', '2026-07-15 00:00:00.000', '20000 bank Alfalah', 'imp_28eae63bcffd8957'),
  ('imp_63f2e22d49d8ca6d', '2026-07-20 00:00:00.000', 'imp_b172806f7b003fea', 'imp_f1953889a9352c08', 'flat_408-B', 15000, 'EASYPAISA', '2026-07-20 00:00:00.000', '15000 Easypisa', 'imp_63f2e22d49d8ca6d'),
  ('imp_d00ac3bf68dda3f6', '2026-07-23 00:00:00.000', 'imp_77a3c9a36a43f9a5', 'imp_fb3c3bf67d115061', 'flat_408-B', 10000, 'EASYPAISA', '2026-07-23 00:00:00.000', '10000 Easypisa', 'imp_d00ac3bf68dda3f6'),
  ('imp_bf58b3570e7f97e0', '2026-07-29 00:00:00.000', 'imp_95d515e77d5c1445', 'imp_fb4cf83ba52d3102', 'flat_408-B', 30000, 'EASYPAISA', '2026-07-29 00:00:00.000', '30000 Easypisa', 'imp_bf58b3570e7f97e0'),
  ('imp_f3e11ce375202e65', '2026-08-01 00:00:00.000', 'imp_92ed59b76ac1615f', 'imp_d830c81ebdf58845', 'flat_408-B', 15000, 'EASYPAISA', '2026-08-01 00:00:00.000', '15000 Easypisa', 'imp_f3e11ce375202e65'),
  ('imp_606bca42d12282ec', '2026-08-02 00:00:00.000', 'imp_7a6f4071998d48b0', 'imp_7d5c5218a1c6deee', 'flat_408-B', 8000, 'EASYPAISA', '2026-08-02 00:00:00.000', '8000 Anas Easypisa', 'imp_606bca42d12282ec'),
  ('imp_3f532497edbcfe28', '2026-08-03 00:00:00.000', 'imp_4c5da940a9739eb4', 'imp_b4d438ce63c718b6', 'flat_408-B', 6000, 'EASYPAISA', '2026-08-03 00:00:00.000', '6000 anas Easypisa', 'imp_3f532497edbcfe28'),
  ('imp_1da0569f037ed867', '2026-08-07 00:00:00.000', 'imp_1c018bb5e980ae36', 'imp_0539842d17b0f786', 'flat_408-B', 10000, 'EASYPAISA', '2026-08-07 00:00:00.000', '10000 Easypisa', 'imp_1da0569f037ed867'),
  ('imp_a48dddcd616d60e9', '2026-08-10 00:00:00.000', 'imp_7daf9e580ec20ff1', 'imp_7a40fb36474ce1d6', 'flat_408-B', 6000, 'CASH', '2026-08-10 00:00:00.000', '6000 anas cash', 'imp_a48dddcd616d60e9'),
  ('imp_f2dff7ddabe44af0', '2026-08-18 00:00:00.000', 'imp_8b4b69993fc492f7', 'imp_e42c6c09636faf3f', 'flat_408-B', 10000, 'EASYPAISA', '2026-08-18 00:00:00.000', '10000 Easypisa', 'imp_f2dff7ddabe44af0'),
  ('imp_8d8ae19986f21d22', '2026-08-19 00:00:00.000', 'imp_002175b46c578ec4', 'imp_b9ba1393cfffb122', 'flat_408-B', 30000, 'EASYPAISA', '2026-08-19 00:00:00.000', '30000 Easypisa', 'imp_8d8ae19986f21d22'),
  ('imp_59ce04c8280f1d7e', '2026-08-23 00:00:00.000', 'imp_78403a45ced4af1f', 'imp_d89bac45e0304ec6', 'flat_408-B', 11000, 'EASYPAISA', '2026-08-23 00:00:00.000', '11000 Easypisa', 'imp_59ce04c8280f1d7e'),
  ('imp_5e928848623e1b2d', '2026-09-01 00:00:00.000', 'imp_129cf2af770f58de', 'imp_acfee24230919b89', 'flat_408-B', 10000, 'EASYPAISA', '2026-09-01 00:00:00.000', '10000 Easypisa', 'imp_5e928848623e1b2d'),
  ('imp_4d5dd867a6983112', '2026-09-03 00:00:00.000', 'imp_9daedc215b835e6e', 'imp_ea723712e46bf28b', 'flat_408-B', 12000, 'EASYPAISA', '2026-09-03 00:00:00.000', '12000 Easypisa', 'imp_4d5dd867a6983112'),
  ('imp_af4ffa3ed1a33f85', '2026-09-05 00:00:00.000', 'imp_2eaba44dfe630c99', 'imp_0539842d17b0f786', 'flat_408-B', 10000, 'EASYPAISA', '2026-09-05 00:00:00.000', '10000 Easypisa', 'imp_af4ffa3ed1a33f85'),
  ('imp_50240af7a45491a9', '2026-09-07 00:00:00.000', 'imp_8ed6f6a83c669d29', 'imp_b1eb190a224b91d2', 'flat_408-B', 12000, 'EASYPAISA', '2026-09-07 00:00:00.000', '12000 Easypisa', 'imp_50240af7a45491a9'),
  ('imp_be76b233d05332f7', '2026-09-09 00:00:00.000', 'imp_dd6de6e835630a11', 'imp_36051a3782639e28', 'flat_408-B', 15000, 'EASYPAISA', '2026-09-09 00:00:00.000', '15000 Wasol Easypisa', 'imp_be76b233d05332f7'),
  ('imp_418391fc796d50d3', '2026-09-11 00:00:00.000', 'imp_208acd59e9c54a43', 'imp_0539842d17b0f786', 'flat_408-B', 10000, 'CASH', '2026-09-11 00:00:00.000', '10000 cash', 'imp_418391fc796d50d3'),
  ('imp_2a88d81f03989a4e', '2026-09-12 00:00:00.000', 'imp_cac5c4e3a7d07e6d', 'imp_46b25d3cbd37539e', 'flat_408-B', 9000, 'OTHER', '2026-09-12 00:00:00.000', '9000 wasol', 'imp_2a88d81f03989a4e'),
  ('imp_4be24113fa6ddea8', '2026-09-13 00:00:00.000', 'imp_5a14fd58a410c953', 'imp_58d87a1c06d2894b', 'flat_408-B', 10000, 'CASH', '2026-09-13 00:00:00.000', '10000 cash', 'imp_4be24113fa6ddea8'),
  ('imp_b1a0df5ac6bfc6b6', '2026-09-14 00:00:00.000', 'imp_2779335aaaf8eae2', 'imp_400a88b653430ee7', 'flat_408-B', 9000, 'CASH', '2026-09-14 00:00:00.000', '9000 Cash', 'imp_b1a0df5ac6bfc6b6'),
  ('imp_33ccb9d2ed73c0ca', '2026-09-15 00:00:00.000', 'imp_198b2e835d3c7373', 'imp_f1c14ffed200a8c2', 'flat_408-B', 30000, 'BANK_TRANSFER', '2026-09-15 00:00:00.000', '30000 Alfalah', 'imp_33ccb9d2ed73c0ca');

-- Historical expenses
INSERT INTO expenses (id, createdAt, flatId, amount, category, description, method, spentAt, notes, importKey) VALUES
  ('imp_923b7d2bc5e1a101', '2026-06-02 00:00:00.000', 'flat_802-A', 1000, 'STAFF', 'Staff', 'OTHER', '2026-06-02 00:00:00.000', NULL, 'imp_923b7d2bc5e1a101'),
  ('imp_0c49c433212f64e2', '2026-06-03 00:00:00.000', 'flat_802-A', 12500, 'MAINTENANCE', 'Maintenance', 'OTHER', '2026-06-03 00:00:00.000', NULL, 'imp_0c49c433212f64e2'),
  ('imp_a96778428cf0376d', '2026-06-04 00:00:00.000', 'flat_802-A', 7250, 'CLEANING', 'Sofa cleaning', 'OTHER', '2026-06-04 00:00:00.000', NULL, 'imp_a96778428cf0376d'),
  ('imp_de2735528beceff2', '2026-06-06 00:00:00.000', 'flat_802-A', 1000, 'STAFF', 'Staff', 'OTHER', '2026-06-06 00:00:00.000', NULL, 'imp_de2735528beceff2'),
  ('imp_a8f60958afd8e2ec', '2026-06-09 00:00:00.000', 'flat_802-A', 1000, 'STAFF', 'Staff', 'OTHER', '2026-06-09 00:00:00.000', NULL, 'imp_a8f60958afd8e2ec'),
  ('imp_807d1733a782d749', '2026-07-01 00:00:00.000', 'flat_802-A', 12500, 'MAINTENANCE', 'Maintenance', 'OTHER', '2026-07-01 00:00:00.000', NULL, 'imp_807d1733a782d749'),
  ('imp_ed07e6012f6ef2cf', '2026-07-05 00:00:00.000', 'flat_802-A', 300, 'ELECTRICITY', 'Electricity', 'OTHER', '2026-07-05 00:00:00.000', NULL, 'imp_ed07e6012f6ef2cf'),
  ('imp_6280f942fbe4029d', '2026-07-08 00:00:00.000', 'flat_802-A', 8620, 'INTERNET', 'PTCL / Internet', 'OTHER', '2026-07-08 00:00:00.000', NULL, 'imp_6280f942fbe4029d'),
  ('imp_efbad1a92bb98ce7', '2026-07-15 00:00:00.000', 'flat_802-A', 37683, 'ELECTRICITY', 'Electricity', 'OTHER', '2026-07-15 00:00:00.000', NULL, 'imp_efbad1a92bb98ce7'),
  ('imp_5839235129e0e9c1', '2026-08-02 00:00:00.000', 'flat_802-A', 8610, 'INTERNET', 'PTCL / Internet', 'OTHER', '2026-08-02 00:00:00.000', NULL, 'imp_5839235129e0e9c1'),
  ('imp_c6aea4de27100477', '2026-09-01 00:00:00.000', 'flat_802-A', 25000, 'ELECTRICITY', 'Electricity', 'OTHER', '2026-09-01 00:00:00.000', NULL, 'imp_c6aea4de27100477'),
  ('imp_5dabd34bd44fcf73', '2026-09-09 00:00:00.000', 'flat_802-A', 12500, 'MAINTENANCE', 'Maintenance', 'OTHER', '2026-09-09 00:00:00.000', NULL, 'imp_5dabd34bd44fcf73'),
  ('imp_efd679f8b60d2eda', '2026-09-10 00:00:00.000', 'flat_802-A', 3000, 'CLEANING', 'Cleaning', 'OTHER', '2026-09-10 00:00:00.000', NULL, 'imp_efd679f8b60d2eda'),
  ('imp_d628e18182ca40ca', '2026-09-12 00:00:00.000', 'flat_802-A', 1950, 'SUPPLIES', 'Supplies', 'OTHER', '2026-09-12 00:00:00.000', NULL, 'imp_d628e18182ca40ca'),
  ('imp_4572af13195ec1e6', '2026-09-13 00:00:00.000', 'flat_802-A', 6300, 'CLEANING', 'Sofa cleaning', 'OTHER', '2026-09-13 00:00:00.000', NULL, 'imp_4572af13195ec1e6'),
  ('imp_a102e6679c3f96d2', '2026-07-15 00:00:00.000', 'flat_408-B', 3460, 'INTERNET', 'PTCL / Internet', 'OTHER', '2026-07-15 00:00:00.000', NULL, 'imp_a102e6679c3f96d2'),
  ('imp_d2d9232203d135e7', '2026-08-01 00:00:00.000', 'flat_408-B', 1500, 'PLUMBING', 'Plumbing', 'OTHER', '2026-08-01 00:00:00.000', NULL, 'imp_d2d9232203d135e7'),
  ('imp_5657fa4494e714e9', '2026-09-01 00:00:00.000', 'flat_408-B', 12500, 'MAINTENANCE', 'Maintenance', 'OTHER', '2026-09-01 00:00:00.000', NULL, 'imp_5657fa4494e714e9'),
  ('imp_71ee632482f99f39', '2026-09-03 00:00:00.000', 'flat_408-B', 600, 'SUPPLIES', 'Supplies', 'OTHER', '2026-09-03 00:00:00.000', NULL, 'imp_71ee632482f99f39'),
  ('imp_18fccfea7eb1d739', '2026-09-07 00:00:00.000', 'flat_408-B', 2000, 'CLEANING', 'Cleaning', 'OTHER', '2026-09-07 00:00:00.000', NULL, 'imp_18fccfea7eb1d739'),
  ('imp_982a36d35742eece', '2026-09-09 00:00:00.000', 'flat_408-B', 500, 'SUPPLIES', 'Supplies', 'OTHER', '2026-09-09 00:00:00.000', NULL, 'imp_982a36d35742eece'),
  ('imp_c6a0f550f02a3156', '2026-09-11 00:00:00.000', 'flat_408-B', 4800, 'CLEANING', 'Sofa cleaning', 'OTHER', '2026-09-11 00:00:00.000', NULL, 'imp_c6a0f550f02a3156'),
  ('imp_2897254e9076db11', '2026-09-12 00:00:00.000', 'flat_408-B', 900, 'SUPPLIES', 'Supplies', 'OTHER', '2026-09-12 00:00:00.000', NULL, 'imp_2897254e9076db11');

-- Migration Review rows. Historical pending candidates stay UNDECIDED.
INSERT INTO migration_records (id, createdAt, sourceFile, sourceSheet, sourceRow, sourceText, flatName, customer, occurredOn, proposedType, amount, reason, status, pendingDecision, stayId, monthLabel, currentInterpretation, previousInterpretation, lastQuickUpdate, originalValue, correctionText, importedAt, updatedAt, importKey) VALUES
  ('imp_976ca6e274ce0bed', '2026-09-18 22:48:22.986308', '802 Booking-2026.xlsx', 'May', 9, '27/05/2026 | 29/05/2026 | 2 Nights | Tahir bhai', '802-A', 'Tahir bhai', '2026-05-27 00:00:00.000', 'STAY', NULL, 'Stay payment is missing, combined, or unclear.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'May 2026', 'Stay needs a clearer date or payment.', NULL, NULL, '27/05/2026 | 29/05/2026 | 2 Nights | Tahir bhai', NULL, '2026-09-18 22:48:22.986308', NULL, 'imp_976ca6e274ce0bed'),
  ('imp_346c9b2226175719', '2026-09-18 22:48:22.986874', '802 Booking-2026.xlsx', 'May', 10, '29/05/2026 | 30/05/2026 | 1 Night | Saad dealer', '802-A', 'Saad dealer', '2026-05-29 00:00:00.000', 'STAY', NULL, 'Stay payment is missing, combined, or unclear.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'May 2026', 'Stay needs a clearer date or payment.', NULL, NULL, '29/05/2026 | 30/05/2026 | 1 Night | Saad dealer', NULL, '2026-09-18 22:48:22.986874', NULL, 'imp_346c9b2226175719'),
  ('imp_6b94c105d9f0c4b7', '2026-09-18 22:48:22.987021', '802 Booking-2026.xlsx', 'June', 4, '2026-06-03 | 2026-06-04 | 1 Night | Amjid Imroza | 15000 remaining | 12500 maintenance Anas', '802-A', 'Amjid Imroza', '2026-06-03 00:00:00.000', 'PENDING_BALANCE', 15000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_f1a6f2a7b27e463e', 'June 2026', 'Open balance Rs 15,000. Reminders off until you confirm still pending.', NULL, NULL, '2026-06-03 | 2026-06-04 | 1 Night | Amjid Imroza | 15000 remaining | 12500 maintenance Anas | imported 15000', NULL, '2026-09-18 22:48:22.987021', NULL, 'imp_6b94c105d9f0c4b7'),
  ('imp_cd03e519bfc36417', '2026-09-18 22:48:22.987608', '802 Booking-2026.xlsx', 'July', 3, '2026-07-02 | 2026-07-03 | 1 Nigh/3 bed | Khalid pesh | 18000  Easypisa anas | 3600 watar house +340', '802-A', 'Khalid pesh', '2026-07-02 00:00:00.000', 'EXPENSE', 3600, 'Service cell looks like a total or mixed amounts.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-07-02 | 2026-07-03 | 1 Nigh/3 bed | Khalid pesh | 18000  Easypisa anas | 3600 watar house +340 | imported 3600', NULL, '2026-09-18 22:48:22.987608', NULL, 'imp_cd03e519bfc36417'),
  ('imp_57455d7d3708fc84', '2026-09-18 22:48:22.987679', '802 Booking-2026.xlsx', 'July', 5, '2026-07-08 | 2026-07-10 | 2Nights | Maiz ullah Fareed bhai | 30000 Remaining fareed | 8620 PTCL bill', '802-A', 'Maiz ullah Fareed bhai', '2026-07-08 00:00:00.000', 'PENDING_BALANCE', 30000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_7ead95ba9fcfa395', 'July 2026', 'Open balance Rs 30,000. Reminders off until you confirm still pending.', NULL, NULL, '2026-07-08 | 2026-07-10 | 2Nights | Maiz ullah Fareed bhai | 30000 Remaining fareed | 8620 PTCL bill | imported 30000', NULL, '2026-09-18 22:48:22.987679', NULL, 'imp_57455d7d3708fc84'),
  ('imp_ecf237357ed14ae9', '2026-09-18 22:48:22.987738', '802 Booking-2026.xlsx', 'July', 6, '2026-07-10 | 2026-07-11 | 1 Night | Asif pesh guest | 20000 received capital lagoon | 6600 gas and dewdrop', '802-A', 'Asif pesh guest', '2026-07-10 00:00:00.000', 'EXPENSE', 6600, 'Service cell looks like a total or mixed amounts.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-07-10 | 2026-07-11 | 1 Night | Asif pesh guest | 20000 received capital lagoon | 6600 gas and dewdrop | imported 6600', NULL, '2026-09-18 22:48:22.987738', NULL, 'imp_ecf237357ed14ae9'),
  ('imp_2bf1373c85cf0fcd', '2026-09-18 22:48:22.987779', '802 Booking-2026.xlsx', 'July', 7, '2026-07-11 | 13/07/2026 | 2 Night | Asad Afridi | 40000 anas Easypisa | Total expanse= 31960', '802-A', 'Asad Afridi', '2026-07-11 00:00:00.000', 'EXPENSE', 31960, 'Service cell looks like a total or mixed amounts.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-07-11 | 13/07/2026 | 2 Night | Asad Afridi | 40000 anas Easypisa | Total expanse= 31960 | imported 31960', NULL, '2026-09-18 22:48:22.987779', NULL, 'imp_2bf1373c85cf0fcd'),
  ('imp_c572d6d1e41b405b', '2026-09-18 22:48:22.987862', '802 Booking-2026.xlsx', 'July', 9, '19/07/2026 | 20/07/2026 | 1 Night | Hayat guest | 18000 anas Easypisa | Room rent 8000', '802-A', 'Hayat guest', '2026-07-19 00:00:00.000', 'EXPENSE', 8000, 'Service cell looks like a total or mixed amounts.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '19/07/2026 | 20/07/2026 | 1 Night | Hayat guest | 18000 anas Easypisa | Room rent 8000 | imported 8000', NULL, '2026-09-18 22:48:22.987862', NULL, 'imp_c572d6d1e41b405b'),
  ('imp_a6e29dc71528b9ff', '2026-09-18 22:48:22.987898', '802 Booking-2026.xlsx', 'July', 10, '24/07/2026 | 25/07/2026 | 1 night | Aman ulllah | 16000 Easypisa | 77643 total', '802-A', 'Aman ulllah', '2026-07-24 00:00:00.000', 'EXPENSE', 77643, 'Service cell looks like a total or mixed amounts.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '24/07/2026 | 25/07/2026 | 1 night | Aman ulllah | 16000 Easypisa | 77643 total | imported 77643', NULL, '2026-09-18 22:48:22.987898', NULL, 'imp_a6e29dc71528b9ff'),
  ('imp_f51b4934a14c6bdb', '2026-09-18 22:48:22.987978', '802 Booking-2026.xlsx', 'July', 13, '28/07/2026 | 29/07/2026 | 1 night | Saddeq guest | 15000 remaining CNIC leave', '802-A', 'Saddeq guest', '2026-07-28 00:00:00.000', 'PENDING_BALANCE', 15000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_923031dec2472a9d', 'July 2026', 'Open balance Rs 15,000. Reminders off until you confirm still pending.', NULL, NULL, '28/07/2026 | 29/07/2026 | 1 night | Saddeq guest | 15000 remaining CNIC leave | imported 15000', NULL, '2026-09-18 22:48:22.987978', NULL, 'imp_f51b4934a14c6bdb'),
  ('imp_8aff957fc84885e8', '2026-09-18 22:48:22.988042', '802 Booking-2026.xlsx', 'July', 16, 'Total amount: 319000', '802-A', NULL, NULL, 'SUMMARY', 319000, 'Looks like a summary or total row. Not imported as a transaction.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Spreadsheet total — not counted.', NULL, NULL, 'Total amount: 319000 | imported 319000', NULL, '2026-09-18 22:48:22.988042', NULL, 'imp_8aff957fc84885e8'),
  ('imp_f36a7a219739b03e', '2026-09-18 22:48:22.988058', '802 Booking-2026.xlsx', 'July', 18, 'Asif guest Send capital lagoon | 20000 khizer', '802-A', 'Asif guest Send capital lagoon', NULL, 'STAY', 20000, 'Stay date is missing or unreadable.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Stay needs a clearer date or payment.', NULL, NULL, 'Asif guest Send capital lagoon | 20000 khizer | imported 20000', NULL, '2026-09-18 22:48:22.988058', NULL, 'imp_f36a7a219739b03e'),
  ('imp_63eae6704bc0ab54', '2026-09-18 22:48:22.988070', '802 Booking-2026.xlsx', 'July', 19, 'Anas received | 254000 Anas received', '802-A', 'Anas received', NULL, 'SUMMARY', 254000, 'Looks like a summary or total row. Not imported as a transaction.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Spreadsheet total — not counted.', NULL, NULL, 'Anas received | 254000 Anas received | imported 254000', NULL, '2026-09-18 22:48:22.988070', NULL, 'imp_63eae6704bc0ab54'),
  ('imp_d8b647d07a780bcd', '2026-09-18 22:48:22.988094', '802 Booking-2026.xlsx', 'Aug', 2, '2026-08-01 | Empty | 4730 watar and gass', '802-A', NULL, '2026-08-01 00:00:00.000', 'EXPENSE', 4730, 'Service text is unclear or combined. Confirm before counting.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-08-01 | Empty | 4730 watar and gass | imported 4730', NULL, '2026-09-18 22:48:22.988094', NULL, 'imp_d8b647d07a780bcd'),
  ('imp_ea4af8622d0e29fd', '2026-09-18 22:48:22.988140', '802 Booking-2026.xlsx', 'Aug', 4, '2026-08-03 | 2026-08-04 | 1 Night | Hassan molvi /shahzeb zada | 20000 remaining | 12500+5200+55000=72,700', '802-A', 'Hassan molvi /shahzeb zada', '2026-08-03 00:00:00.000', 'PENDING_BALANCE', 20000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_310d8e2291ffc682', 'August 2026', 'Open balance Rs 20,000. Reminders off until you confirm still pending.', NULL, NULL, '2026-08-03 | 2026-08-04 | 1 Night | Hassan molvi /shahzeb zada | 20000 remaining | 12500+5200+55000=72,700 | imported 20000', NULL, '2026-09-18 22:48:22.988140', NULL, 'imp_ea4af8622d0e29fd'),
  ('imp_19c277358b7c70bb', '2026-09-18 22:48:22.988152', '802 Booking-2026.xlsx', 'Aug', 4, '2026-08-03 | 2026-08-04 | 1 Night | Hassan molvi /shahzeb zada | 20000 remaining | 12500+5200+55000=72,700', '802-A', 'Hassan molvi /shahzeb zada', '2026-08-03 00:00:00.000', 'EXPENSE', 12500, 'Service cell looks like a total or mixed amounts.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-08-03 | 2026-08-04 | 1 Night | Hassan molvi /shahzeb zada | 20000 remaining | 12500+5200+55000=72,700 | imported 12500', NULL, '2026-09-18 22:48:22.988152', NULL, 'imp_19c277358b7c70bb'),
  ('imp_e09d92f7623d03eb', '2026-09-18 22:48:22.988193', '802 Booking-2026.xlsx', 'Aug', 5, '2026-08-04 | 2026-08-06 | 2 Nights | Yasir  ref aqif khan | 40000 cash | 15000 Rohed', '802-A', 'Yasir ref aqif khan', '2026-08-04 00:00:00.000', 'EXPENSE', 15000, 'Service text is not a clear expense.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-08-04 | 2026-08-06 | 2 Nights | Yasir  ref aqif khan | 40000 cash | 15000 Rohed | imported 15000', NULL, '2026-09-18 22:48:22.988193', NULL, 'imp_e09d92f7623d03eb'),
  ('imp_c5985628d26fa4ad', '2026-09-18 22:48:22.988215', '802 Booking-2026.xlsx', 'Aug', 6, '2026-08-08 | 31/08/2026 | 4 Nights | Shahid swat guest | 30000+30000+480000+ 40000+130000+50000', '802-A', 'Shahid swat guest', '2026-08-08 00:00:00.000', 'STAY', 30000, 'Stay payment is missing, combined, or unclear.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Stay needs a clearer date or payment.', NULL, NULL, '2026-08-08 | 31/08/2026 | 4 Nights | Shahid swat guest | 30000+30000+480000+ 40000+130000+50000 | imported 30000', NULL, '2026-09-18 22:48:22.988215', NULL, 'imp_c5985628d26fa4ad'),
  ('imp_ff66e276dd97aa05', '2026-09-18 22:48:22.988246', '802 Booking-2026.xlsx', 'Sept', 2, '2026-09-01 | 2026-09-03 | 2 Nights | Main Syed Ali shah | 26000 Remaining | 25000 electricity', '802-A', 'Main Syed Ali shah', '2026-09-01 00:00:00.000', 'PENDING_BALANCE', 26000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_e9454399aaa7689f', 'September 2026', 'Open balance Rs 26,000. Reminders off until you confirm still pending.', NULL, NULL, '2026-09-01 | 2026-09-03 | 2 Nights | Main Syed Ali shah | 26000 Remaining | 25000 electricity | imported 26000', NULL, '2026-09-18 22:48:22.988246', NULL, 'imp_ff66e276dd97aa05'),
  ('imp_ef77cee701073412', '2026-09-18 22:48:22.988288', '802 Booking-2026.xlsx', 'Sept', 3, '2026-09-07 | 2026-09-08 | 1 Night | Khadem Khaksar | 15000 Remaining | 3000 +3000amin safayi', '802-A', 'Khadem Khaksar', '2026-09-07 00:00:00.000', 'PENDING_BALANCE', 15000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_eccd214d8646f957', 'September 2026', 'Open balance Rs 15,000. Reminders off until you confirm still pending.', NULL, NULL, '2026-09-07 | 2026-09-08 | 1 Night | Khadem Khaksar | 15000 Remaining | 3000 +3000amin safayi | imported 15000', NULL, '2026-09-18 22:48:22.988288', NULL, 'imp_ef77cee701073412'),
  ('imp_33edf0dcbd3240f9', '2026-09-18 22:48:22.988300', '802 Booking-2026.xlsx', 'Sept', 3, '2026-09-07 | 2026-09-08 | 1 Night | Khadem Khaksar | 15000 Remaining | 3000 +3000amin safayi', '802-A', 'Khadem Khaksar', '2026-09-07 00:00:00.000', 'EXPENSE', 3000, 'Service cell looks like a total or mixed amounts.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'September 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-09-07 | 2026-09-08 | 1 Night | Khadem Khaksar | 15000 Remaining | 3000 +3000amin safayi | imported 3000', NULL, '2026-09-18 22:48:22.988300', NULL, 'imp_33edf0dcbd3240f9'),
  ('imp_f820a722df305350', '2026-09-18 22:48:22.988399', '802 Booking-2026.xlsx', 'Sept', 6, '2026-09-12 | 13/09/2026 | 1 night | Waleed ref raiwan bhai Pesh | 1950 sapry tezab etc', '802-A', 'Waleed ref raiwan bhai Pesh', '2026-09-12 00:00:00.000', 'STAY', NULL, 'Stay payment is missing, combined, or unclear.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'September 2026', 'Stay needs a clearer date or payment.', NULL, NULL, '2026-09-12 | 13/09/2026 | 1 night | Waleed ref raiwan bhai Pesh | 1950 sapry tezab etc', NULL, '2026-09-18 22:48:22.988399', NULL, 'imp_f820a722df305350'),
  ('imp_fc5079324789faf2', '2026-09-18 22:48:22.990410', '408 B block.xlsx', 'July', 5, '24/07/2026 | 26/07/2026 | 2 Nights | Sadya dealer', '408-B', 'Sadya dealer', '2026-07-24 00:00:00.000', 'STAY', NULL, 'Stay payment is missing, combined, or unclear.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Stay needs a clearer date or payment.', NULL, NULL, '24/07/2026 | 26/07/2026 | 2 Nights | Sadya dealer', NULL, '2026-09-18 22:48:22.990410', NULL, 'imp_fc5079324789faf2'),
  ('imp_3d7b969f93f8239b', '2026-09-18 22:48:22.990428', '408 B block.xlsx', 'July', 6, '27/07/2026 | 28/07/2026 | 1 Night | Sadya', '408-B', 'Sadya', '2026-07-27 00:00:00.000', 'STAY', NULL, 'Stay payment is missing, combined, or unclear.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'July 2026', 'Stay needs a clearer date or payment.', NULL, NULL, '27/07/2026 | 28/07/2026 | 1 Night | Sadya', NULL, '2026-09-18 22:48:22.990428', NULL, 'imp_3d7b969f93f8239b'),
  ('imp_4ef9e5ee4c542e03', '2026-09-18 22:48:22.990553', '408 B block.xlsx', 'Aug', 3, '2026-08-02 | 2026-08-03 | 1 Night /2 | Basit Fasalabad guest | 8000 Anas Easypisa | 1000 toker', '408-B', 'Basit Fasalabad guest', '2026-08-02 00:00:00.000', 'EXPENSE', 1000, 'Service text is not a clear expense.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-08-02 | 2026-08-03 | 1 Night /2 | Basit Fasalabad guest | 8000 Anas Easypisa | 1000 toker | imported 1000', NULL, '2026-09-18 22:48:22.990553', NULL, 'imp_4ef9e5ee4c542e03'),
  ('imp_65a7d3e4f2dac64c', '2026-09-18 22:48:22.990595', '408 B block.xlsx', 'Aug', 4, '2026-08-03 | 2026-08-04 | 1 Night /1 bed | Khan zada dir guest | 6000 anas Easypisa | 15000 rohed', '408-B', 'Khan zada dir guest', '2026-08-03 00:00:00.000', 'EXPENSE', 15000, 'Service text is not a clear expense.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-08-03 | 2026-08-04 | 1 Night /1 bed | Khan zada dir guest | 6000 anas Easypisa | 15000 rohed | imported 15000', NULL, '2026-09-18 22:48:22.990595', NULL, 'imp_65a7d3e4f2dac64c'),
  ('imp_bc39efd0b4063067', '2026-09-18 22:48:22.990624', '408 B block.xlsx', 'Aug', 5, '2026-08-05 | 2026-08-07 | 2 Nights | Riaz guest pesh | 30000 remaining', '408-B', 'Riaz guest pesh', '2026-08-05 00:00:00.000', 'PENDING_BALANCE', 30000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_d31e231d7e699c91', 'August 2026', 'Open balance Rs 30,000. Reminders off until you confirm still pending.', NULL, NULL, '2026-08-05 | 2026-08-07 | 2 Nights | Riaz guest pesh | 30000 remaining | imported 30000', NULL, '2026-09-18 22:48:22.990624', NULL, 'imp_bc39efd0b4063067'),
  ('imp_9811fc79748aa11e', '2026-09-18 22:48:22.990666', '408 B block.xlsx', 'Aug', 7, '2026-09-09 | 2026-08-10 | 1 night | Kashif ref guest Haji sahb', '408-B', 'Kashif ref guest Haji sahb', '2026-09-09 00:00:00.000', 'STAY', NULL, 'Stay payment is missing, combined, or unclear.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'September 2026', 'Stay needs a clearer date or payment.', NULL, NULL, '2026-09-09 | 2026-08-10 | 1 night | Kashif ref guest Haji sahb', NULL, '2026-09-18 22:48:22.990666', NULL, 'imp_9811fc79748aa11e'),
  ('imp_51636afcd21222ff', '2026-09-18 22:48:22.990705', '408 B block.xlsx', 'Aug', 9, 'Atta Ullah ref Khizer', '408-B', 'Atta Ullah ref Khizer', NULL, 'STAY', NULL, 'Stay date is missing or unreadable.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Stay needs a clearer date or payment.', NULL, NULL, 'Atta Ullah ref Khizer', NULL, '2026-09-18 22:48:22.990705', NULL, 'imp_51636afcd21222ff'),
  ('imp_2b0b416f5b8550ec', '2026-09-18 22:48:22.990730', '408 B block.xlsx', 'Aug', 10, '16/08/2026 | Abdul haq | 12000 remaining', '408-B', 'Abdul haq', '2026-08-16 00:00:00.000', 'PENDING_BALANCE', 12000, 'Sheet says remaining. Confirm whether this is still unpaid.', 'NEEDS_REVIEW', 'UNDECIDED', 'imp_0aafd1d5d2b596ec', 'August 2026', 'Open balance Rs 12,000. Reminders off until you confirm still pending.', NULL, NULL, '16/08/2026 | Abdul haq | 12000 remaining | imported 12000', NULL, '2026-09-18 22:48:22.990730', NULL, 'imp_2b0b416f5b8550ec'),
  ('imp_a94de1266446e254', '2026-09-18 22:48:22.990817', '408 B block.xlsx', 'Aug', 14, '11000 Easypisa', '408-B', NULL, NULL, 'UNKNOWN', 11000, 'Row does not clearly describe a stay or expense.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'August 2026', 'Row does not clearly describe a stay or expense.', NULL, NULL, '11000 Easypisa | imported 11000', NULL, '2026-09-18 22:48:22.990817', NULL, 'imp_a94de1266446e254'),
  ('imp_9a5b05b27df66efc', '2026-09-18 22:48:22.990942', '408 B block.xlsx', 'Sept', 4, '2026-09-05 | 2026-09-06 | 1 Night | Aman ullah | 10000 Easypisa | 15000 Rohed', '408-B', 'Aman ullah', '2026-09-05 00:00:00.000', 'EXPENSE', 15000, 'Service text is not a clear expense.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'September 2026', 'Possible expense. Confirm before counting.', NULL, NULL, '2026-09-05 | 2026-09-06 | 1 Night | Aman ullah | 10000 Easypisa | 15000 Rohed | imported 15000', NULL, '2026-09-18 22:48:22.990942', NULL, 'imp_9a5b05b27df66efc'),
  ('imp_0004e62d63c2c12c', '2026-09-18 22:48:22.991133', '408 B block.xlsx', 'Sept', 9, '13/09/2026 | 14/09/2026 | 1 Night | Bilal dealer | 10000 cash | 80000 Send to kashif', '408-B', 'Bilal dealer', '2026-09-13 00:00:00.000', 'TRANSFER', 80000, 'Looks like money sent/transferred, not a new stay or expense.', 'NEEDS_REVIEW', 'UNDECIDED', NULL, 'September 2026', 'Money sent/transferred — not rent or expense.', NULL, NULL, '13/09/2026 | 14/09/2026 | 1 Night | Bilal dealer | 10000 cash | 80000 Send to kashif | imported 80000', NULL, '2026-09-18 22:48:22.991133', NULL, 'imp_0004e62d63c2c12c');

SET FOREIGN_KEY_CHECKS = 1;

-- Validation snapshot at generation time (read-only comment)
-- flats=6 clients=59 stays=71 business_entries=71
-- payments=63 expenses=23 migration_review=33
-- historical_pending_candidates=8
-- spreadsheet_rows 802-A=56 408-B=29
-- pending names: Amjid Imroza, Maiz ullah Fareed bhai, Saddeq guest, Hassan molvi /shahzeb zada, Main Syed Ali shah, Khadem Khaksar, Riaz guest pesh, Abdul haq
