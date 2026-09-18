import { detectFlat, parseQuickEntry } from "../src/lib/parse-quick-entry";
import { parseMigrationUpdate } from "../src/lib/parse-migration-update";

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

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("all parser checks passed");
