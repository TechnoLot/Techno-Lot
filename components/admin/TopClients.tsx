import { EmptyState } from "@/components/admin/RecentActivity";
import { formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

type ClientAgg = { name: string; spent: number; count: number };

function aggregate(lots: Lot[]): ClientAgg[] {
  const map = new Map<string, ClientAgg>();
  for (const l of lots) {
    const key = l.client_name.trim().toLowerCase();
    const existing = map.get(key) ?? { name: l.client_name, spent: 0, count: 0 };
    existing.spent += Number(l.purchase_price);
    existing.count += 1;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
}

export default function TopClients({
  lots,
  limit = 5,
}: {
  lots: Lot[];
  limit?: number;
}) {
  const all = aggregate(lots);
  const clients = all.slice(0, limit);
  const max = clients[0]?.spent || 1;
  const total = all.reduce((s, c) => s + c.spent, 0) || 1;

  return (
    <section className="admin-card flex flex-col p-5 sm:p-6" aria-labelledby="top-clients-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="top-clients-title" className="admin-card-title">
          Meilleurs clients
        </h2>
        <span className="text-xs text-slate-500">par montant acheté</span>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Aucun client sur la période"
          text="Les clients avec qui tu achètes des lots apparaîtront ici."
        />
      ) : (
        <ol className="mt-5 space-y-4">
          {clients.map(({ name, spent, count }, i) => {
            const pct = (spent / max) * 100;
            const share = Math.round((spent / total) * 100);
            return (
              <li key={name} className="group">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-4 shrink-0 font-display text-xs font-semibold tabular-nums ${
                      i === 0 ? "text-accent" : "text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                    {name}
                  </span>
                  <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-white">
                    {formatMoney(spent)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 pl-7">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full origin-left animate-grow-x rounded-full bg-accent-gradient opacity-80 transition-opacity group-hover:opacity-100"
                      style={{ width: `${pct}%`, animationDelay: `${i * 60}ms` }}
                    />
                  </div>
                  <span className="w-[86px] shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                    {count} lot{count > 1 ? "s" : ""} · {share} %
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
