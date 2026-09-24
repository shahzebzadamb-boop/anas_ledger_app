import {
  RECEIPT_PROPERTY_NAME,
  RECEIPT_SIGNATORY_NAME,
  RECEIPT_SIGNATORY_TITLE,
  type ReceiptView,
} from "@/lib/receipts";
import { formatPKR } from "@/lib/money";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
      <span style={{ color: "#444", fontSize: 12.5 }}>{label}</span>
      <span style={{ fontSize: strong ? 13.5 : 12.5, fontWeight: strong ? 700 : 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function ReceiptDocument({ view }: { view: ReceiptView }) {
  return (
    <article
      className="receipt-sheet"
      style={{
        background: "#ffffff",
        color: "#111111",
        width: "210mm",
        minHeight: "297mm",
        padding: "18mm 18mm 22mm",
        boxSizing: "border-box",
        fontFamily: 'Helvetica, Arial, "Segoe UI", sans-serif',
        colorScheme: "light",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ textAlign: "center", paddingBottom: 18 }}>
        <img
          src="/letterhead-logo.png"
          alt="Capital Lagoon"
          width={92}
          height={86}
          style={{ display: "block", margin: "0 auto 10px", objectFit: "contain" }}
        />
        <p
          style={{
            margin: 0,
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
            fontSize: 16,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {RECEIPT_PROPERTY_NAME}
        </p>
        <div style={{ height: 1, background: "#111", margin: "12px 0 10px" }} />
        <p style={{ margin: 0, textAlign: "right", fontSize: 12 }}>Date: {view.dateLabel}</p>
        <p style={{ margin: "22px 0 0", fontSize: 18, fontWeight: 700, letterSpacing: "0.12em" }}>PAYMENT RECEIPT</p>
        {view.receipt.status === "VOID" ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 700, letterSpacing: "0.16em" }}>VOID</p>
        ) : null}
      </header>

      <section style={{ flex: 1, paddingTop: 8 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <Row label="Receipt No." value={view.receipt.receiptNumber} />
          <Row label="Date" value={view.dateLabel} />
          <Row label="Client" value={view.clientName} />
          <Row label="Flat" value={view.flat} />
          <Row label="Check-in" value={view.checkInLabel} />
          <Row label="Check-out" value={view.checkOutLabel} />
          <Row label="Stay" value={`${view.nights} Night${view.nights === 1 ? "" : "s"}`} />
        </div>
        <div style={{ height: 1, background: "#111", margin: "18px 0" }} />
        <div style={{ display: "grid", gap: 10 }}>
          <Row label="Total Stay Amount" value={formatPKR(view.totalStayAmount)} />
          <Row label="Amount Received" value={formatPKR(view.amountReceived)} strong />
          <Row label="Total Received To Date" value={formatPKR(view.totalReceivedToDate)} />
          {view.paidInFull ? (
            <Row label="Balance" value="PAID IN FULL" strong />
          ) : (
            <Row label="Remaining Balance" value={formatPKR(view.remaining)} />
          )}
        </div>
        <div style={{ height: 1, background: "#111", margin: "18px 0" }} />
        <div style={{ display: "grid", gap: 8 }}>
          <Row label="Payment Method" value={view.paymentMethod} />
          <Row label="Received By" value={view.receivedBy} />
        </div>
        <p style={{ margin: "28px 0 0", fontSize: 12, lineHeight: 1.5, color: "#222", fontWeight: 400 }}>
          {view.confirmation}
        </p>
        <p style={{ margin: "14px 0 0", fontSize: 12, lineHeight: 1.5, color: "#222", fontWeight: 400 }}>
          {view.thankYou}
        </p>
      </section>

      <footer style={{ paddingTop: 36 }}>
        <p
          style={{
            margin: 0,
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {RECEIPT_SIGNATORY_NAME}
        </p>
        <p style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", Times, serif', fontSize: 11 }}>
          {RECEIPT_SIGNATORY_TITLE}
        </p>
      </footer>
    </article>
  );
}
