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
  const supabase = await createClient();

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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">
          Clients
        </h1>
        <p className="mt-2 max-w-lg text-sm text-admin-muted">
          Les prospects convertis en clients, avec leur compagnie et le lot
          lié.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Impossible de charger les données : {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="glass p-12 text-center">
          <Trophy className="mx-auto h-8 w-8 text-admin-faint" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-admin-ink">
            Aucun client converti pour l&apos;instant
          </p>
          <p className="mt-2 text-sm text-admin-muted">
            Utilise « Marquer comme client » sur un contact pour qu&apos;il
            apparaisse ici.
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-line-soft">
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
                    className="group border-b border-admin-line-soft transition-colors last:border-b-0 hover:bg-admin-subtle"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-admin-ink">
                        {contactName(r)}
                      </p>
                      {r.title && (
                        <p className="text-xs text-admin-muted">{r.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.companies ? (
                        <Link
                          href={`/admin/crm/${r.companies.id}`}
                          className="text-sm text-admin-ink hover:text-admin-green"
                        >
                          {r.companies.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-admin-faint">—</span>
                      )}
                      {r.companies?.region && (
                        <p className="text-xs text-admin-muted">
                          {r.companies.region}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.email && (
                        <a
                          href={`mailto:${r.email}`}
                          className="block text-xs text-admin-ink hover:text-admin-green"
                        >
                          {r.email}
                        </a>
                      )}
                      {(r.phone ?? r.companies?.main_phone) && (
                        <a
                          href={`tel:${r.phone ?? r.companies?.main_phone}`}
                          className="block text-xs text-admin-muted hover:text-admin-green"
                        >
                          {r.phone ?? r.companies?.main_phone}
                        </a>
                      )}
                      {!r.email && !r.phone && !r.companies?.main_phone && (
                        <span className="text-sm text-admin-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.lots ? (
                        <Link href={`/admin/lots/${r.lots.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <StatusPill status={r.lots.status} />
                            <span className="font-display text-sm tabular-nums text-admin-ink">
                              {formatMoney(r.lots.purchase_price)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-admin-muted">
                            {formatDate(r.lots.purchased_at)}
                          </p>
                        </Link>
                      ) : (
                        <span className="text-sm text-admin-faint">—</span>
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
                            className="h-4 w-4 text-admin-muted transition-colors group-hover:text-admin-green"
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
    <th className="whitespace-nowrap px-4 py-3 text-left text-[13px] font-medium text-admin-muted">
      {children}
    </th>
  );
}
