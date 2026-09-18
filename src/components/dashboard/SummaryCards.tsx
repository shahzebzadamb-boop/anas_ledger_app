import { Card } from "@/components/ui/Card";
import { formatPKR } from "@/lib/money";
import type { DashboardTotals } from "@/types";

const cards = [
  { key: "received", label: "Received", hint: "Cash in" },
  { key: "pending", label: "Pending From Clients", hint: "Not cash" },
  { key: "expenses", label: "Expenses", hint: "Cash out" },
  { key: "netCash", label: "Net Cash", hint: "Received − expenses − refunds" },
] as const;

export function SummaryCards({ totals }: { totals: DashboardTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
        const value = totals[card.key];
        const isPending = card.key === "pending";
        const isNegative = card.key === "netCash" && value < 0;
        return (
          <Card key={card.key}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {card.label}
            </p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                isNegative ? "text-danger" : "text-foreground"
              }`}
            >
              {formatPKR(value)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {isPending ? `${card.hint} · unpaid balances` : card.hint}
              {card.key === "netCash" && totals.refunds > 0
                ? ` · refunds ${formatPKR(totals.refunds)}`
                : ""}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
