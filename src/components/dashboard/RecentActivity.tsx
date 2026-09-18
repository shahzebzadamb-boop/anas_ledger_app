import { formatDateShort } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import type { RecentActivityItem } from "@/lib/ledger";

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Recent activity</h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          No recent activity yet.
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {item.detail} · {formatDateShort(item.at)}
                </p>
              </div>
              <p className="text-sm font-semibold">
                {item.kind === "expense" ? "−" : item.kind === "payment" ? "+" : ""}
                {formatPKR(item.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
