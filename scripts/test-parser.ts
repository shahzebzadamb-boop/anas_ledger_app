import { emptyLedgerState } from "../src/lib/empty-state";
import { applyCalcInput, formatCalcDisplay, initialCalcState } from "../src/lib/calculator";
import { nightsBetween } from "../src/lib/dates";
import {
  dashboardTotals,
  expenseLedgerRows,
  paymentLedgerRows,
  paymentStayChoices,
  stayLedgerRows,
  totalsMatchStayLedger,
  uniquePaymentStayId,
} from "../src/lib/ledger";
import { reducer } from "../src/lib/ledger-actions";
import { parseAmountToken, parseFormAmount } from "../src/lib/money";
import { parseMigrationUpdate } from "../src/lib/parse-migration-update";
import { detectFlat, parseQuickEntry } from "../src/lib/parse-quick-entry";
import { looksLikeCorrection } from "../src/lib/parse-correction";
import { detectReceiverName } from "../src/lib/receivers";

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

const overflowState = {
  ...dashState,
  rentEntries: [
    ...dashState.rentEntries,
    {
      id: "r_bad",
      stayId: liveStay.id,
      clientId: "c2",
      flatId: "flat_802-A",
      amount: 2147483647,
      occurredAt: "2026-09-18T00:00:00.000Z",
      note: null,
    },
  ],
};
const overflowTotals = dashboardTotals(overflowState, month, "all");
if (overflowTotals.business !== 40000 || overflowTotals.pending !== 40000) {
  failed += 1;
  console.error("INT_MAX FILTER FAIL", overflowTotals);
} else {
  console.log("OK dashboard excludes INT_MAX phone-as-rent");
}

const caseA = parseQuickEntry("tufail khan 03001234567 802a 2 din total 40k 20k advance cash", {
  knownClients: known,
});
if (
  caseA.type !== "rent" ||
  caseA.totalAmount !== 40000 ||
  caseA.receivedAmount !== 20000 ||
  caseA.remaining !== 20000 ||
  caseA.receivedByName !== "Anas"
) {
  failed += 1;
  console.error("CASE A FAIL", caseA);
} else {
  console.log("OK case A rent 40k / received 20k / Anas");
}

const caseB = parseQuickEntry("tufail khan 03001234567 802a 10k wasol by khizer cash", {
  knownClients: known,
});
if (caseB.type !== "payment" || caseB.amount !== 10000 || caseB.receivedByName !== "Khizer") {
  failed += 1;
  console.error("CASE B FAIL", caseB);
} else {
  console.log("OK case B payment 10k Khizer");
}

const caseC = parseQuickEntry("tufail se 5k khizer k pas aya 802a", { knownClients: known });
if (caseC.type !== "payment" || caseC.amount !== 5000 || caseC.receivedByName !== "Khizer") {
  failed += 1;
  console.error("CASE C FAIL", caseC);
} else {
  console.log("OK case C 5k Khizer");
}

const caseD = parseQuickEntry("electric bill 18k bank 802a", { knownClients: known });
if (caseD.type !== "expense" || caseD.amount !== 18000 || "receivedByName" in caseD) {
  failed += 1;
  console.error("CASE D FAIL", caseD);
} else {
  console.log("OK case D expense 18k no receiver");
}

const khizerPhrases = [
  "tufail 20k received by khizer cash 802a",
  "tufail 20k wasol khizer 802a",
  "khizer ne tufail se 20k lia 802a",
  "20k tufail ka khizer ne receive kia",
  "tufail se 20k khizer k pas aya",
  "tufail 20k khizer ne lia",
  "tufail 20k wasol by khizer",
  "tufail 20k wasol by khizar cash 802a",
  "tufail 20k wasol by khizr cash 802a",
];
for (const text of khizerPhrases) {
  const parsed = parseQuickEntry(text, { knownClients: known });
  if (parsed.type !== "payment" || parsed.receivedByName !== "Khizer" || parsed.amount !== 20000) {
    failed += 1;
    console.error("KHIZER FAIL", text, parsed);
  } else {
    console.log("OK khizer", text);
  }
}

const defaultAnas = parseQuickEntry("tufail 20k wasol cash 802a", { knownClients: known });
if (defaultAnas.type !== "payment" || defaultAnas.receivedByName !== "Anas") {
  failed += 1;
  console.error("DEFAULT ANAS FAIL", defaultAnas);
} else {
  console.log("OK default receiver Anas");
}

const newReceiver = parseQuickEntry("tufail 20k received by saad cash 802a", { knownClients: known });
if (newReceiver.type !== "payment" || newReceiver.receivedByName !== "Saad") {
  failed += 1;
  console.error("SAAD RECEIVER FAIL", newReceiver);
} else {
  console.log("OK new receiver Saad");
}

if (detectReceiverName("tufail 20k wasol cash") !== "Anas") {
  failed += 1;
  console.error("DETECT DEFAULT FAIL");
}

let calc = initialCalcState();
for (const key of ["1", "+", "2", "="]) calc = applyCalcInput(calc, key);
if (formatCalcDisplay(calc) !== "3") {
  failed += 1;
  console.error("CALC ADD FAIL", formatCalcDisplay(calc));
} else {
  console.log("OK calculator 1+2=3");
}

calc = initialCalcState();
for (const key of ["8", "÷", "0", "="]) calc = applyCalcInput(calc, key);
if (formatCalcDisplay(calc) !== "Error") {
  failed += 1;
  console.error("CALC DIV0 FAIL", formatCalcDisplay(calc));
} else {
  console.log("OK calculator divide by zero");
}

calc = applyCalcInput(calc, "AC");
if (formatCalcDisplay(calc) !== "0") {
  failed += 1;
  console.error("CALC AC FAIL", formatCalcDisplay(calc));
} else {
  console.log("OK calculator AC after error");
}

const now = new Date("2026-09-22T00:00:00.000Z");
const monthRange = {
  from: new Date("2026-09-01T00:00:00.000Z"),
  to: new Date("2026-09-30T23:59:59.999Z"),
};
const rentParsed = parseQuickEntry("tufail khan 03001234567 802a 3 din total 60k 20k advance cash", {
  knownClients: known,
  now,
});
let ledger = emptyLedgerState();
if (rentParsed.type === "rent") {
  ledger = reducer(ledger, { type: "APPLY_QUICK_ENTRY", parsed: rentParsed });
}
const stayRows = stayLedgerRows(ledger, monthRange, "802-A");
const stayTotals = dashboardTotals(ledger, monthRange, "802-A");
if (
  stayRows.length !== 1 ||
  stayRows[0].business !== 60000 ||
  stayRows[0].received !== 20000 ||
  stayRows[0].pending !== 40000 ||
  stayRows[0].payments.length !== 1 ||
  stayRows[0].payments[0].receivedBy !== "Anas" ||
  !totalsMatchStayLedger(stayTotals, stayRows, expenseLedgerRows(ledger, monthRange, "802-A"))
) {
  failed += 1;
  console.error("STAY LEDGER FAIL", stayRows[0], stayTotals);
} else {
  console.log("OK stay ledger 60k / 20k / 40k");
}

const followOn = parseQuickEntry("tufail 10k wasol by khizer cash 802a", { knownClients: known, now });
if (followOn.type === "payment") {
  ledger = reducer(ledger, { type: "APPLY_QUICK_ENTRY", parsed: followOn });
}
const afterPay = stayLedgerRows(ledger, monthRange, "802-A")[0];
const receivers = new Set(afterPay?.payments.map((item) => item.receivedBy) ?? []);
if (
  !afterPay ||
  afterPay.received !== 30000 ||
  afterPay.pending !== 30000 ||
  afterPay.payments.length !== 2 ||
  !receivers.has("Anas") ||
  !receivers.has("Khizer")
) {
  failed += 1;
  console.error("FOLLOW-ON PAY FAIL", afterPay);
} else {
  console.log("OK same stay received 30k with Anas then Khizer");
}

const secondStay = parseQuickEntry("tufail khan 03001234567 408b 2 din total 35k", { knownClients: known, now });
if (secondStay.type === "rent") {
  ledger = reducer(ledger, { type: "APPLY_QUICK_ENTRY", parsed: secondStay });
}
const ambiguousPay = parseQuickEntry("tufail 10k wasol cash", { knownClients: known, now });
const beforeCount = ledger.payments.length;
if (ambiguousPay.type === "payment") {
  ledger = reducer(ledger, { type: "APPLY_QUICK_ENTRY", parsed: ambiguousPay });
}
const choices = paymentStayChoices(ledger, ledger.clients[0].id, null);
if (uniquePaymentStayId(choices) !== null || ledger.payments.length !== beforeCount) {
  failed += 1;
  console.error("MULTI STAY GUESS FAIL", choices, ledger.payments.length, beforeCount);
} else {
  console.log("OK payment not guessed across multiple open stays");
}

const knownCorr = [{ name: "Tufail Khan", phone: "03001234567" }];
let corrState = emptyLedgerState();
const corrRent = parseQuickEntry("tufail khan 03001234567 802a 3 din total 40k 20k advance cash", {
  knownClients: knownCorr,
  now,
});
if (corrRent.type === "rent") {
  corrState = reducer(corrState, { type: "APPLY_QUICK_ENTRY", parsed: corrRent });
}
const corrAText = "20k received galat pending hai";
if (!looksLikeCorrection(corrAText)) {
  failed += 1;
  console.error("CORR LOOKS FAIL", corrAText);
}
const corrA = parseQuickEntry(corrAText, { knownClients: knownCorr, now });
if (corrA.type === "correction") {
  corrState = reducer(corrState, { type: "APPLY_CORRECTION", parsed: corrA });
}
const rowA = stayLedgerRows(corrState, monthRange, "802-A")[0];
if (!rowA || rowA.business !== 40000 || rowA.received !== 0 || rowA.pending !== 40000) {
  failed += 1;
  console.error("CORR A FAIL", corrA, rowA);
} else {
  console.log("OK correction A received voided, business 40k pending 40k");
}

const corrB = parseQuickEntry("tufail 20k wasol by khizer", { knownClients: knownCorr, now });
if (corrB.type === "payment") {
  corrState = reducer(corrState, { type: "APPLY_QUICK_ENTRY", parsed: corrB });
}
const rowB = stayLedgerRows(corrState, monthRange, "802-A")[0];
if (
  !rowB ||
  rowB.business !== 40000 ||
  rowB.received !== 20000 ||
  rowB.pending !== 20000 ||
  !rowB.receivedBy.includes("Khizer")
) {
  failed += 1;
  console.error("CORR B FAIL", corrB, rowB);
} else {
  console.log("OK correction B 20k Khizer");
}

const corrCText = "khizer nahi anas ne receive kia";
const corrC = parseQuickEntry(corrCText, { knownClients: knownCorr, now });
if (corrC.type === "correction") {
  corrState = reducer(corrState, { type: "APPLY_CORRECTION", parsed: corrC });
}
const rowC = stayLedgerRows(corrState, monthRange, "802-A")[0];
const livePay = corrState.payments.filter((item) => !item.voided);
if (
  !rowC ||
  rowC.received !== 20000 ||
  livePay.length !== 1 ||
  !rowC.receivedBy.includes("Anas") ||
  rowC.receivedBy.includes("Khizer")
) {
  failed += 1;
  console.error("CORR C FAIL", corrC, rowC, livePay);
} else {
  console.log("OK correction C receiver Anas");
}

const expD = parseQuickEntry("electric 18k 802a", { knownClients: knownCorr, now });
if (expD.type === "expense") {
  corrState = reducer(corrState, { type: "APPLY_QUICK_ENTRY", parsed: expD });
}
const corrD = parseQuickEntry("electric 18k nahi 8k tha", { knownClients: knownCorr, now });
if (corrD.type === "correction") {
  corrState = reducer(corrState, { type: "APPLY_CORRECTION", parsed: corrD });
}
const expRow = expenseLedgerRows(corrState, monthRange, "802-A").find((item) => item.description === "Electricity");
if (!expRow || expRow.amount !== 8000) {
  failed += 1;
  console.error("CORR D FAIL", corrD, expRow, corrState.expenses);
} else {
  console.log("OK correction D expense 8k");
}

const expenseId = corrState.expenses.find((item) => item.description === "Electricity" && !item.voided)?.id;
if (expenseId) {
  corrState = reducer(corrState, {
    type: "UPDATE_EXPENSE",
    payload: { expenseId, amount: 9000 },
  });
}
const expE = corrState.expenses.find((item) => item.id === expenseId);
const audits = corrState.auditLogs.filter((item) => item.entityId === expenseId);
if (!expE || expE.amount !== 9000 || audits.length < 2) {
  failed += 1;
  console.error("CORR E FAIL", expE, audits);
} else {
  console.log("OK correction E manual 9k with audit 18k→8k→9k");
}

if (parseFormAmount("03001234567") !== null || parseFormAmount("abc") !== null || parseFormAmount("-20000", true) !== null) {
  failed += 1;
  console.error("FORM AMOUNT PHONE FAIL", parseFormAmount("03001234567"));
} else if (parseFormAmount("0", true) !== 0 || parseFormAmount("20000") !== 20000) {
  failed += 1;
  console.error("FORM AMOUNT FAIL");
} else {
  console.log("OK form amount rejects phone and accepts 20000");
}

if (nightsBetween("2026-09-22", "2026-09-25") !== 3 || nightsBetween("2026-09-22", "2026-09-22") !== 0) {
  failed += 1;
  console.error("NIGHTS FAIL", nightsBetween("2026-09-22", "2026-09-25"));
} else {
  console.log("OK nights 22 Sep → 25 Sep = 3");
}

let manual = emptyLedgerState();
manual = reducer(manual, {
  type: "ADD_STAY",
  payload: {
    flat: "802-A",
    clientName: "Tufail Khan",
    phone: "03001234567",
    checkIn: "2026-09-22T00:00:00.000Z",
    checkOut: "2026-09-25T00:00:00.000Z",
    nights: 3,
    business: 60000,
    received: 20000,
    method: "CASH",
    receivedByName: "Anas",
    security: 10000,
  },
});
const manualRows = stayLedgerRows(manual, monthRange, "802-A");
const manualTotals = dashboardTotals(manual, monthRange, "802-A");
const payRows = paymentLedgerRows(manual, monthRange, "802-A");
const securityAmt = manual.security.filter((item) => !item.voided).reduce((sum, item) => sum + item.amount, 0);
if (
  !manualRows[0] ||
  manualRows[0].nights !== 3 ||
  manualRows[0].business !== 60000 ||
  manualRows[0].received !== 20000 ||
  manualRows[0].pending !== 40000 ||
  manualTotals.business !== 60000 ||
  manualTotals.received !== 20000 ||
  manualTotals.pending !== 40000 ||
  payRows.length !== 1 ||
  payRows.reduce((sum, item) => sum + item.amount, 0) !== 20000 ||
  securityAmt !== 10000 ||
  manual.clients.length !== 1
) {
  failed += 1;
  console.error("ADD STAY FAIL", manualRows[0], manualTotals, payRows, securityAmt);
} else {
  console.log("OK add stay 60k/20k/40k security 10k separate");
}

manual = reducer(manual, {
  type: "RECORD_PAYMENT",
  payload: {
    clientId: manual.clients[0].id,
    stayId: manual.stays[0].id,
    amount: 10000,
    method: "EASYPAISA",
    receivedByName: "Khizer",
  },
});
const afterKhizer = stayLedgerRows(manual, monthRange, "802-A")[0];
const afterTotals = dashboardTotals(manual, monthRange, "802-A");
if (
  !afterKhizer ||
  afterKhizer.business !== 60000 ||
  afterKhizer.received !== 30000 ||
  afterKhizer.pending !== 30000 ||
  afterTotals.business !== 60000 ||
  afterTotals.received !== 30000 ||
  afterTotals.pending !== 30000 ||
  !afterKhizer.receivedBy.includes("Khizer") ||
  !afterKhizer.receivedBy.includes("Anas")
) {
  failed += 1;
  console.error("ADD PAYMENT KHIZER FAIL", afterKhizer, afterTotals);
} else {
  console.log("OK add payment 10k Khizer, business unchanged");
}

manual = reducer(manual, {
  type: "ADD_EXPENSE",
  payload: {
    amount: 5000,
    category: "CLEANING",
    description: "Sofa Cleaning",
    method: "CASH",
    flat: "802-A",
    spentAt: "2026-09-23T00:00:00.000Z",
  },
});
const expLedger = expenseLedgerRows(manual, monthRange, "802-A");
const withExpense = dashboardTotals(manual, monthRange, "802-A");
if (
  withExpense.expenses !== 5000 ||
  withExpense.business !== 60000 ||
  !expLedger.some((item) => item.amount === 5000 && item.description === "Sofa Cleaning")
) {
  failed += 1;
  console.error("ADD EXPENSE FAIL", withExpense, expLedger);
} else {
  console.log("OK add expense 5k sofa cleaning");
}

const beforeDup = manual.clients.length;
manual = reducer(manual, {
  type: "ADD_STAY",
  payload: {
    flat: "408-B",
    clientName: "Other Name",
    phone: "03001234567",
    checkIn: "2026-09-26T00:00:00.000Z",
    checkOut: "2026-09-28T00:00:00.000Z",
    nights: 2,
    business: 20000,
    received: 0,
  },
});
if (manual.clients.length !== beforeDup) {
  failed += 1;
  console.error("DUP CLIENT FAIL", manual.clients);
} else {
  console.log("OK existing phone reuses client");
}

const unchanged = reducer(manual, {
  type: "ADD_STAY",
  payload: {
    flat: "802-A",
    clientName: "Bad Dates",
    phone: "03111234567",
    checkIn: "2026-09-25T00:00:00.000Z",
    checkOut: "2026-09-22T00:00:00.000Z",
    nights: 0,
    business: 10000,
    received: 0,
  },
});
if (unchanged.stays.length !== manual.stays.length) {
  failed += 1;
  console.error("BAD DATES STAY CREATED");
} else {
  console.log("OK checkout before check-in rejected");
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("all parser checks passed");
