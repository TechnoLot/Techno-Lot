import Link from "next/link";
import { ArrowLeft, ChevronRight, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";
import {
  contactName,
  type Company,
  type Contact,
} from "@/lib/crm/types";

export const dynamic = "force-dynamic";

type ClientRow = Contact & {
  companies: Pick<Company, "id" | "name" | "region" | "main_phone"> | null;
  lots: Pick<
    Lot,
    "id" | "status" | "purchase_price" | "sale_price" | "purchased_at"
  > | null;
};

/**
 * Section Clients : tous les contacts convertis, avec leur compagnie et
 * le lot lié — pour les retrouver d'un coup d'œil sans fouiller la liste
 * de prospection.
 */
export default async function ClientsPage() {
  const supabase = createClient();

  const { data: rowsRaw, error } = await supabase
    .from("contacts")
    .select(
      "*, companies(id, name, region, main_phone), lots:lot_id(id, status, purchase_price, sale_price, purchased_at)",
    )
    .eq("stage", "converted")
    .order("updated_at", { ascending: false });
  const rows = (rowsRaw ?? []) as unknown as ClientRow[];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <Link
        href="/admin/crm"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-accent-bright"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-8 mt-4">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Prospection
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
          Clients
        </h1>
        <p className="mt-2 max-w-lg text-sm text-slate-400">
          Les prospects convertis en clients, avec leur compagnie et le lot
          lié.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          Impossible de charger les données : {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="glass p-12 text-center">
          <Trophy className="mx-auto h-8 w-8 text-slate-600" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-white">
            Aucun client converti pour l&apos;instant
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Utilise « Marquer comme client » sur un contact pour qu&apos;il
            apparaisse ici.
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <Th>Client</Th>
                  <Th>Compagnie</Th>
                  <Th>Coordonnées</Th>
                  <Th>Lot lié</Th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">
                        {contactName(r)}
                      </p>
                      {r.title && (
                        <p className="text-xs text-slate-500">{r.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.companies ? (
                        <Link
                          href={`/admin/crm/${r.companies.id}`}
                          className="text-sm text-slate-300 hover:text-accent-bright"
                        >
                          {r.companies.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-600">—</span>
                      )}
                      {r.companies?.region && (
                        <p className="text-xs text-slate-500">
                          {r.companies.region}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.email && (
                        <a
                          href={`mailto:${r.email}`}
                          className="block text-xs text-slate-300 hover:text-accent-bright"
                        >
                          {r.email}
                        </a>
                      )}
                      {(r.phone ?? r.companies?.main_phone) && (
                        <a
                          href={`tel:${r.phone ?? r.companies?.main_phone}`}
                          className="block text-xs text-slate-400 hover:text-accent-bright"
                        >
                          {r.phone ?? r.companies?.main_phone}
                        </a>
                      )}
                      {!r.email && !r.phone && !r.companies?.main_phone && (
                        <span className="text-sm text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.lots ? (
                        <Link href={`/admin/lots/${r.lots.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <StatusPill status={r.lots.status} />
                            <span className="font-display text-sm tabular-nums text-white">
                              {formatMoney(r.lots.purchase_price)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatDate(r.lots.purchased_at)}
                          </p>
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.companies && (
                        <Link
                          href={`/admin/crm/${r.companies.id}`}
                          aria-label={`Ouvrir ${r.companies.name}`}
                          className="block"
                        >
                          <ChevronRight
                            className="h-4 w-4 text-slate-500 transition-colors group-hover:text-accent"
                            aria-hidden
                          />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
      {children}
    </th>
  );
}
