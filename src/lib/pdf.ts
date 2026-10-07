import { formatPKR } from "@/lib/money";
import type { DashboardTotals } from "@/types";
import type { MonthEarnings } from "@/lib/earnings";

function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildReportPdf(input: {
  periodLabel: string;
  flatLabel?: string;
  totals: DashboardTotals;
  flats: { name: string; business: number; received: number; pending: number; expenses: number; stays?: number; occupiedNights?: number }[];
  stays?: number;
  occupiedNights?: number;
  currentMonthReceived?: number;
  puranaRecovered?: number;
  netCashProfit?: number;
}): Blob {
  const lines = [
    "ANAS LEDGER",
    `${input.periodLabel} Business Report`,
    input.flatLabel ?? "All Flats",
    "",
    `Business ${formatPKR(input.totals.business)}`,
    `Received ${formatPKR(input.totals.received)}`,
    `Pending ${formatPKR(input.totals.pending)}`,
    `Expenses ${formatPKR(input.totals.expenses)}`,
  ];
  if (input.currentMonthReceived != null || input.puranaRecovered != null || input.netCashProfit != null) {
    lines.splice(
      5,
      3,
      `Current month received ${formatPKR(input.currentMonthReceived ?? input.totals.received)}`,
      `Purana Khata recovered ${formatPKR(input.puranaRecovered ?? 0)}`,
      `Expenses ${formatPKR(input.totals.expenses)}`,
      `Closing pending ${formatPKR(input.totals.pending)}`,
      `Net cash profit ${formatPKR(input.netCashProfit ?? input.totals.received - input.totals.expenses)}`,
    );
  }
  lines.push(
    "",
    "Flat performance",
    ...input.flats.map((flat) => {
      const nights = flat.occupiedNights != null ? `  Nights ${flat.occupiedNights}` : "";
      const stayCount = flat.stays != null ? `  Stays ${flat.stays}` : "";
      return `${flat.name}  Biz ${formatPKR(flat.business)}  Rec ${formatPKR(flat.received)}  Pend ${formatPKR(flat.pending)}  Exp ${formatPKR(flat.expenses)}${stayCount}${nights}`;
    }),
  );
  if (input.stays != null || input.occupiedNights != null) {
    lines.push("", "Operational summary");
    if (input.stays != null) lines.push(`Stays ${input.stays}`);
    if (input.occupiedNights != null) lines.push(`Occupied nights ${input.occupiedNights}`);
  }

  return linesToPdf(lines);
}

export function buildOwnerEarningsPdf(months: MonthEarnings[]): Blob {
  const lines = ["ANAS LEDGER", "PRIVATE OWNER SUMMARY", "Do not share with clients", ""];
  for (const month of months) {
    lines.push(
      `${month.label}${month.live ? " (Live)" : ""}`,
      `Cash received ${formatPKR(month.totalCashReceived)}`,
      `Purana Khata recovered ${formatPKR(month.puranaRecovered)}`,
      `Expenses ${formatPKR(month.expenses)}`,
      `Net cash profit ${formatPKR(month.netCashProfit)}`,
    );
    for (const line of month.allocations) {
      const pct = line.sharePercent > 0 ? ` ${line.sharePercent}%` : "";
      lines.push(`${line.partnerName}${pct} ${formatPKR(line.amount)}`);
      if (line.partnerId) {
        lines.push(
          line.overpaid > 0
            ? `${line.partnerName} overpaid ${formatPKR(line.overpaid)}`
            : `${line.partnerName} remaining ${formatPKR(line.remaining)}`,
        );
      }
    }
    lines.push("");
  }
  return linesToPdf(lines, 12);
}

function linesToPdf(lines: string[], fontSize = 11): Blob {
  const step = fontSize === 11 ? 16 : 13;
  const content = lines
    .map((line, index) => `BT /F1 ${fontSize} Tf 40 ${760 - index * step} Td (${escapePdf(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let offset = 9;
  const offsets = [0];
  const body = objects
    .map((object) => {
      offsets.push(offset);
      offset += object.length + 1;
      return object;
    })
    .join("\n");
  const xref = offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n `)
    .join("\n");
  const pdf = `%PDF-1.4
${body}
xref
0 6
0000000000 65535 f 
${xref}
trailer << /Size 6 /Root 1 0 R >>
startxref
${offset + 1}
%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
