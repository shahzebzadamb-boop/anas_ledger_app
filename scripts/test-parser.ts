import { emptyLedgerState } from "../src/lib/empty-state";
import { dashboardTotals } from "../src/lib/ledger";
import { parseAmountToken } from "../src/lib/money";
import { parseMigrationUpdate } from "../src/lib/parse-migration-update";
import { detectFlat, parseQuickEntry } from "../src/lib/parse-quick-entry";

const known = [{ name: "Tufail Khan", phone: "923001234567" }];
const cases: [string, string][] = [
  ["tufail khan 03001234567 802a 3 din total 60k 30k advance cash", "rent"],
  ["tufail khan 03001234567 802a 20k wasol cash", "payment"],
  ["tufail ka 10k baki 802a", "rent"],
  ["sofa clean 5k 408b", "expense"],
  ["electric bill 18k 802a bank", "expense"],
  ["plumber ko 3k diya 802a", "expense"],
  ["tufail security 10k 802a cash", "security"],
  ["adjust tufail 10k security rent mein", "security_adjustment"],
  ["tufail 2 din aur extend 20k 802a", "extension"],
  ["anas 30k nikal liya", "withdrawal"],
  ["tufail 20k received cash 802a", "payment"],
  ["802a cash 20k tufail receive", "payment"],
  ["tufail se 20k aya 802a", "payment"],
  ["tufail 20k wasol 802a", "payment"],
];

let failed = 0;
for (const [text, expected] of cases) {
  const parsed = parseQuickEntry(text, { knownClients: known });
  if (parsed.type !== expected) {
    failed += 1;
    console.error("FAIL", text, "=>", parsed);
  } else {
    console.log("OK", expected, text);
  }
}

const flats = ["802a", "802-a", "802 A", "408b", "204d", "204c", "811d", "815b"];
const want = ["802-A", "802-A", "802-A", "408-B", "204-D", "204-C", "811-D", "815-B"];
flats.forEach((item, i) => {
  const got = detectFlat(item);
  if (got !== want[i]) {
    failed += 1;
    console.error("FLAT FAIL", item, got);
  }
});

const mig: [string, (p: Record<string, unknown>) => boolean][] = [
  ["still pending", (p) => p.stillPending === true],
  ["abhi baki hai", (p) => p.stillPending === true],
  ["already paid", (p) => p.alreadyPaid === true],
  ["full wasol", (p) => p.alreadyPaid === true],
  ["15k cash mil gaya", (p) => p.receiveAmount === 15000],
  ["10k mil gaya 5k baki", (p) => p.receiveAmount === 10000 && p.remainingAmount === 5000],
  ["ye expense tha", (p) => p.keepExpense === true],
  ["maintenance correct customer paid", (p) => p.keepExpense === true && p.settlePending === true],
  ["ignore this", (p) => p.ignore === true],
  ["2 night tha", (p) => p.nights === 2],
  ["rent 20k tha 15k nahi", (p) => p.rentAmount === 20000],
  ["15k received tha remaining nahi", (p) => p.receiveAmount === 15000 && p.remainingAmount === 0],
];

for (const [text, check] of mig) {
  const parsed = parseMigrationUpdate(text, "802-A");
  if (parsed.type !== "patch" || !check(parsed as unknown as Record<string, unknown>)) {
    failed += 1;
    console.error("MIG FAIL", text, parsed);
  } else {
    console.log("OK mig", text);
  }
}

const phoneAsRent = parseQuickEntry("Sept booked by 03324000842 802a 2 nights", { knownClients: known });
if (phoneAsRent.type !== "ambiguous") {
  failed += 1;
  console.error("PHONE AMOUNT FAIL", phoneAsRent);
} else {
  console.log("OK rejected phone-as-rent");
}

const phoneWithRent = parseQuickEntry("Sept booked by 03324000842 802a 2 nights total 40k", {
  knownClients: known,
});
if (phoneWithRent.type !== "rent" || phoneWithRent.totalAmount !== 40000) {
  failed += 1;
  console.error("PHONE+RENT FAIL", phoneWithRent);
} else {
  console.log("OK phone stripped, rent 40000");
}

if (parseAmountToken("03324000842") !== null || parseAmountToken("3324000842") !== null) {
  failed += 1;
  console.error("TOKEN PHONE FAIL");
} else {
  console.log("OK parseAmountToken rejects phone digits");
}

if (parseAmountToken("330000") !== 330000) {
  failed += 1;
  console.error("LEGIT 330000 FAIL");
} else {
  console.log("OK kept historical 330000");
}

const month = {
  from: new Date("2026-09-01T00:00:00.000Z"),
  to: new Date("2026-09-30T23:59:59.999Z"),
};
const histStay = {
  id: "stay_hist",
  createdAt: "2026-07-08T00:00:00.000Z",
  flatId: "flat_802-A",
  clientId: "c1",
  checkIn: "2026-07-08T00:00:00.000Z",
  checkOut: "2026-07-10T00:00:00.000Z",
  nights: 2,
  notifyEnabled: false,
  activePending: false,
  importKey: "imp_hist",
};
const liveStay = {
  id: "stay_live",
  createdAt: "2026-09-18T00:00:00.000Z",
  flatId: "flat_802-A",
  clientId: "c2",
  checkIn: "2026-09-18T00:00:00.000Z",
  checkOut: "2026-09-20T00:00:00.000Z",
  nights: 2,
  notifyEnabled: true,
  activePending: true,
  importKey: null,
};
const dashState = {
  ...emptyLedgerState(),
  clients: [
    { id: "c1", createdAt: histStay.createdAt, name: "Hist", phone: null, phoneMissing: true, notes: null },
    { id: "c2", createdAt: liveStay.createdAt, name: "Live", phone: "923001234567", phoneMissing: false, notes: null },
  ],
  stays: [histStay, liveStay],
  rentEntries: [
    {
      id: "r1",
      stayId: histStay.id,
      clientId: "c1",
      flatId: "flat_802-A",
      amount: 121000,
      occurredAt: "2026-07-08T00:00:00.000Z",
      note: null,
    },
    {
      id: "r2",
      stayId: liveStay.id,
      clientId: "c2",
      flatId: "flat_802-A",
      amount: 40000,
      occurredAt: "2026-09-18T00:00:00.000Z",
      note: null,
    },
  ],
};
const totals = dashboardTotals(dashState, month, "all");
if (totals.business !== 40000 || totals.pending !== 40000) {
  failed += 1;
  console.error("PENDING FILTER FAIL", totals);
} else {
  console.log("OK pending excludes activePending=false and respects month");
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("all parser checks passed");
