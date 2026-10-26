import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export default function RecentActivity({ lots }: { lots: Lot[] }) {
  return (
    <section className="admin-card flex flex-col p-5 sm:p-6" aria-labelledby="recent-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="admin-card-title">
          Activité récente
        </h2>
        <Link
          href="/admin/lots"
          className="admin-focus inline-flex items-center gap-1 rounded-md text-xs font-medium text-slate-400 transition-colors hover:text-accent-bright"
        >
          Tous les lots
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {lots.length === 0 ? (
        <EmptyState
          title="Aucune activité"
          text="Ajoute ton premier lot pour voir l'activité ici."
          href="/admin/lots/nouveau"
          cta="Nouveau lot"
        />
      ) : (
        <ul className="-mx-2 mt-3 flex flex-col">
          {lots.map((lot) => {
            const sold = lot.sale_price != null;
            const profit = sold ? Number(lot.sale_price) - Number(lot.purchase_price) : null;
            return (
              <li key={lot.id}>
                <Link
                  href={`/admin/lots/${lot.id}`}
                  className="admin-focus group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.04] font-display text-xs font-semibold text-slate-300 ring-1 ring-inset ring-white/[0.06]"
                  >
                    {initials(lot.client_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">
                      {lot.client_name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {formatDate(lot.purchased_at)}
                      </span>
                      <StatusPill status={lot.status} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-sm font-semibold tabular-nums text-white">
                      {formatMoney(lot.purchase_price)}
                    </p>
                    {profit !== null ? (
                      <p
                        className={`text-xs font-medium tabular-nums ${
                          profit >= 0 ? "text-accent" : "text-red-400"
                        }`}
                        title={`Vendu ${formatMoney(lot.sale_price)}`}
                      >
                        {profit >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(profit))}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600">acheté</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function EmptyState({
  title,
  text,
  href,
  cta,
}: {
  title: string;
  text: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.07] px-4 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-slate-500">
        <Inbox className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-200">{title}</p>
      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-slate-500">{text}</p>
      {href && cta && (
        <Link href={href} className="admin-btn mt-4">
          {cta}
        </Link>
      )}
    </div>
  );
}
