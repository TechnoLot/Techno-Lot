import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

function daysSince(iso: string): number {
  const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

export default function PendingSales({ lots }: { lots: Lot[] }) {
  const pending = lots.filter((l) => l.status === "purchased" && l.sale_price == null);
  const tied = pending.reduce((s, l) => s + Number(l.purchase_price), 0);

  return (
    <section className="admin-card flex flex-col p-5 sm:p-6" aria-labelledby="pending-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pending-title" className="admin-card-title">
          Prix de vente à saisir
        </h2>
        {pending.length > 0 && (
          <span className="rounded-md bg-amber-400/10 px-2 py-0.5 font-display text-[11px] font-semibold tabular-nums text-amber-300 ring-1 ring-inset ring-amber-400/20">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.07] px-4 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-200">Tout est à jour</p>
          <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-slate-500">
            Tous les lots achetés ont un prix de vente enregistré.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-500">
            {formatMoney(tied)} en lots achetés sans vente enregistrée
          </p>
          <ul className="-mx-2 mt-3 flex flex-col">
            {pending.slice(0, 7).map((lot) => {
              const age = daysSince(lot.purchased_at);
              return (
                <li key={lot.id}>
                  <Link
                    href={`/admin/lots/${lot.id}`}
                    className="admin-focus group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      aria-hidden
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        age > 30 ? "bg-red-400" : age > 14 ? "bg-amber-400" : "bg-slate-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">
                        {lot.client_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(lot.purchased_at)} · {formatMoney(lot.purchase_price)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                      {age === 0 ? "auj." : `${age} j`}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-slate-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          {pending.length > 7 && (
            <Link
              href="/admin/lots?status=purchased"
              className="admin-focus mt-2 inline-flex items-center gap-1 self-start rounded-md text-xs font-medium text-slate-400 hover:text-accent-bright"
            >
              Voir les {pending.length} lots
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
