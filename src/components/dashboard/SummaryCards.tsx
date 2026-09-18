import { Card } from "@/components/ui/Card";
import { formatPKR } from "@/lib/money";
import type { DashboardTotals } from "@/types";

const cards = [
  { key: "business", label: "Business", amountClass: "text-foreground" },
  { key: "received", label: "Received", amountClass: "text-primary" },
  { key: "pending", label: "Pending", amountClass: "text-warning" },
  { key: "expenses", label: "Expenses", amountClass: "text-foreground" },
] as const;

export function SummaryCards({ totals }: { totals: DashboardTotals }) {
  return (
    <section className="space-y-2">
      <h2 className="section-title">Money summary</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => (
          <Card key={card.key} className="p-3">
            <p className="card-label">{card.label}</p>
            <p className={`money mt-1.5 text-lg ${card.amountClass}`}>{formatPKR(totals[card.key])}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
