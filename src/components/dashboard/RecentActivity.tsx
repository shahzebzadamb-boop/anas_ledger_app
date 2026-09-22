import { formatDateShort } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import type { RecentActivityItem } from "@/lib/ledger";

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section className="space-y-2.5">
      <h2 className="section-title">Recent activity</h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm font-normal text-muted">
          No recent activity yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs font-normal text-muted">{item.detail}</p>
                <p className="mt-0.5 text-xs font-normal text-muted">
                  {item.extra ? `${item.extra} · ` : ""}
                  {formatDateShort(item.at)}
                </p>
              </div>
              <p className="money shrink-0 text-sm">{formatPKR(item.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
