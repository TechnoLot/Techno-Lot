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
  const clients = aggregate(lots).slice(0, limit);
  const max = clients[0]?.spent ?? 1;

  return (
    <div className="glass p-6">
      <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        Top clients
      </h2>

      {clients.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Aucun lot enregistré pour cette période.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {clients.map(({ name, spent, count }) => {
            const pct = (spent / max) * 100;
            return (
              <li key={name} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-white">
                    {name}
                  </span>
                  <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-white">
                    {formatMoney(spent)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-accent-gradient"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                    {count} lot{count > 1 ? "s" : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
