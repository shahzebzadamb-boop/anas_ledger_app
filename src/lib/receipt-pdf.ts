import {
  RECEIPT_CONFIRMATION,
  RECEIPT_PROPERTY_NAME,
  RECEIPT_SIGNATORY_NAME,
  RECEIPT_SIGNATORY_TITLE,
  RECEIPT_THANK_YOU,
  receiptPdfFileName,
  type ReceiptView,
} from "@/lib/receipts";
import { formatPKR } from "@/lib/money";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;
const HEADER_BOTTOM = 668;
const FOOTER_TOP = 96;

function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function ascii(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, (char) => {
    if (char === "–" || char === "—" || char === "−") return "-";
    if (char === "’" || char === "‘") return "'";
    if (char === "“" || char === "”") return '"';
    if (char === "\u00a0") return " ";
    return " ";
  });
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function textWidth(text: string, size: number, bold = false): number {
  return text.length * size * (bold ? 0.52 : 0.48);
}

function wrapText(text: string, size: number, maxWidth: number, bold = false): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next, size, bold) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
}

type PdfFont = "F1" | "F2" | "F3" | "F4";
type DrawOp =
  | { kind: "text"; x: number; y: number; size: number; font: PdfFont; text: string }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; width: number }
  | { kind: "image"; x: number; y: number; width: number; height: number };

function opStream(ops: DrawOp[]): string {
  return ops
    .map((op) => {
      if (op.kind === "text") {
        return `BT /${op.font} ${op.size} Tf ${op.x.toFixed(2)} ${op.y.toFixed(2)} Td (${escapePdf(ascii(op.text))}) Tj ET`;
      }
      if (op.kind === "line") {
        return `${op.width} w ${op.x1.toFixed(2)} ${op.y1.toFixed(2)} m ${op.x2.toFixed(2)} ${op.y2.toFixed(2)} l S`;
      }
      return `q ${op.width.toFixed(2)} 0 0 ${op.height.toFixed(2)} ${op.x.toFixed(2)} ${op.y.toFixed(2)} cm /Im1 Do Q`;
    })
    .join("\n");
}

function addCentered(ops: DrawOp[], y: number, size: number, font: PdfFont, text: string) {
  ops.push({ kind: "text", x: (PAGE_W - textWidth(text, size, font === "F2" || font === "F4")) / 2, y, size, font, text });
}

function addRow(ops: DrawOp[], y: number, label: string, value: string, emphasize = false) {
  ops.push({ kind: "text", x: MARGIN, y, size: 10, font: "F1", text: label });
  const font = emphasize ? "F2" : "F1";
  const size = emphasize ? 11 : 10;
  ops.push({
    kind: "text",
    x: PAGE_W - MARGIN - textWidth(value, size, emphasize),
    y,
    size,
    font,
    text: value,
  });
}

export function buildReceiptPdf(view: ReceiptView, logoJpeg?: Uint8Array | null): Blob {
  const ops: DrawOp[] = [];
  const jpeg = logoJpeg && jpegSize(logoJpeg) ? logoJpeg : null;
  const jpegMeta = jpeg ? jpegSize(jpeg) : null;

  let cursor = PAGE_H - 36;
  if (jpeg && jpegMeta) {
    const logoW = 78;
    const logoH = (logoW * jpegMeta.height) / jpegMeta.width;
    ops.push({
      kind: "image",
      x: (PAGE_W - logoW) / 2,
      y: cursor - logoH,
      width: logoW,
      height: logoH,
    });
    cursor -= logoH + 14;
  } else {
    cursor -= 8;
  }

  addCentered(ops, cursor, 14, "F4", RECEIPT_PROPERTY_NAME.toUpperCase());
  cursor -= 16;
  ops.push({ kind: "line", x1: MARGIN, y1: cursor, x2: PAGE_W - MARGIN, y2: cursor, width: 1.1 });
  cursor -= 18;
  const dateText = `Date: ${view.dateLabel}`;
  ops.push({
    kind: "text",
    x: PAGE_W - MARGIN - textWidth(dateText, 10, false),
    y: cursor,
    size: 10,
    font: "F1",
    text: dateText,
  });
  cursor -= 28;
  addCentered(ops, cursor, 16, "F2", "PAYMENT RECEIPT");
  if (view.receipt.status === "VOID") {
    cursor -= 16;
    addCentered(ops, cursor, 11, "F2", "VOID");
  }

  cursor = Math.min(cursor - 36, HEADER_BOTTOM);
  const lines: Array<{ label: string; value: string; money?: boolean; paid?: boolean }> = [
    { label: "Receipt No.", value: view.receipt.receiptNumber },
    { label: "Date", value: view.dateLabel },
    { label: "Client", value: view.clientName },
    { label: "Flat", value: view.flat },
    { label: "Check-in", value: view.checkInLabel },
    { label: "Check-out", value: view.checkOutLabel },
    { label: "Stay", value: `${view.nights} Night${view.nights === 1 ? "" : "s"}` },
  ];
  for (const line of lines) {
    addRow(ops, cursor, line.label, line.value);
    cursor -= 16;
  }

  cursor -= 8;
  ops.push({ kind: "line", x1: MARGIN, y1: cursor, x2: PAGE_W - MARGIN, y2: cursor, width: 0.6 });
  cursor -= 22;
  addRow(ops, cursor, "Total Stay Amount", formatPKR(view.totalStayAmount));
  cursor -= 18;
  addRow(ops, cursor, "Amount Received", formatPKR(view.amountReceived), true);
  cursor -= 18;
  addRow(ops, cursor, "Total Received To Date", formatPKR(view.totalReceivedToDate));
  cursor -= 18;
  if (view.paidInFull) {
    addRow(ops, cursor, "Balance", "PAID IN FULL", true);
  } else {
    addRow(ops, cursor, "Remaining Balance", formatPKR(view.remaining));
  }
  cursor -= 22;
  ops.push({ kind: "line", x1: MARGIN, y1: cursor, x2: PAGE_W - MARGIN, y2: cursor, width: 0.6 });
  cursor -= 22;
  addRow(ops, cursor, "Payment Method", view.paymentMethod);
  cursor -= 16;
  addRow(ops, cursor, "Received By", view.receivedBy);

  cursor -= 28;
  for (const line of wrapText(RECEIPT_CONFIRMATION, 9.5, PAGE_W - MARGIN * 2)) {
    ops.push({ kind: "text", x: MARGIN, y: cursor, size: 9.5, font: "F1", text: line });
    cursor -= 13;
  }
  cursor -= 10;
  for (const line of wrapText(RECEIPT_THANK_YOU, 9.5, PAGE_W - MARGIN * 2)) {
    ops.push({ kind: "text", x: MARGIN, y: cursor, size: 9.5, font: "F1", text: line });
    cursor -= 13;
  }

  ops.push({ kind: "text", x: MARGIN, y: 70, size: 11, font: "F4", text: RECEIPT_SIGNATORY_NAME });
  ops.push({ kind: "text", x: MARGIN, y: 56, size: 9, font: "F3", text: RECEIPT_SIGNATORY_TITLE });

  if (cursor < FOOTER_TOP + 8) {
    // Content is clipped by reserved footer; layout is sized so this should not happen.
  }

  const content = opStream(ops);
  const contentBytes = encode(content);
  const parts: Uint8Array[] = [encode("%PDF-1.4\n")];
  const offsets = [0];
  let offset = 9;
  const addObject = (bytes: Uint8Array) => {
    offsets.push(offset);
    parts.push(bytes);
    offset += bytes.length;
    parts.push(encode("\n"));
    offset += 1;
  };

  addObject(encode("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj"));
  addObject(encode("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj"));
  const resources = jpeg
    ? "/Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> /XObject << /Im1 9 0 R >>"
    : "/Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >>";
  addObject(
    encode(
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R /Resources << ${resources} >> >> endobj`,
    ),
  );
  addObject(concat([encode(`4 0 obj << /Length ${contentBytes.length} >> stream\n`), contentBytes, encode("\nendstream endobj")]));
  addObject(encode("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"));
  addObject(encode("6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj"));
  addObject(encode("7 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> endobj"));
  addObject(encode("8 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> endobj"));
  if (jpeg && jpegMeta) {
    addObject(
      concat([
        encode(
          `9 0 obj << /Type /XObject /Subtype /Image /Width ${jpegMeta.width} /Height ${jpegMeta.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`,
        ),
        jpeg,
        encode("\nendstream endobj"),
      ]),
    );
  }

  const startxref = offset;
  const objectCount = offsets.length;
  const xref = offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n `)
    .join("\n");
  parts.push(
    encode(`xref\n0 ${objectCount}\n0000000000 65535 f \n${xref}\ntrailer << /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`),
  );
  const bytes = concat(parts);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/pdf" });
}

let cachedLogo: Uint8Array | null | undefined;

export async function loadLetterheadLogo(): Promise<Uint8Array | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  if (typeof fetch !== "function") {
    cachedLogo = null;
    return null;
  }
  try {
    const response = await fetch("/letterhead-logo.jpg", { cache: "force-cache" });
    if (!response.ok) {
      cachedLogo = null;
      return null;
    }
    cachedLogo = new Uint8Array(await response.arrayBuffer());
    return cachedLogo;
  } catch {
    cachedLogo = null;
    return null;
  }
}

export async function buildReceiptPdfFile(view: ReceiptView): Promise<File> {
  const logo = await loadLetterheadLogo();
  const blob = buildReceiptPdf(view, logo);
  return new File([blob], receiptPdfFileName(view.receipt.receiptNumber), { type: "application/pdf" });
}
