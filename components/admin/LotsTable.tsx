import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export default function LotsTable({ lots }: { lots: Lot[] }) {
  if (lots.length === 0) {
    return (
      <div className="admin-card flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500 ring-1 ring-inset ring-white/[0.06]">
          <PackageOpen className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 font-display text-base font-semibold text-white">Aucun lot</p>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          Aucun résultat pour ces critères. Ajuste les filtres ou ajoute un lot.
        </p>
        <Link href="/admin/lots/nouveau" className="admin-btn mt-5">
          Nouveau lot
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile : liste de cartes */}
      <ul className="admin-card divide-y divide-white/[0.05] overflow-hidden md:hidden">
        {lots.map((lot) => {
          const profit =
            lot.sale_price != null
              ? Number(lot.sale_price) - Number(lot.purchase_price)
              : null;
          return (
            <li key={lot.id}>
              <Link
                href={`/admin/lots/${lot.id}`}
                className="admin-focus flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{lot.client_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={lot.status} />
                    <span className="text-xs text-slate-500">{formatDate(lot.purchased_at)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-sm font-semibold tabular-nums text-white">
                    {formatMoney(lot.purchase_price)}
                  </p>
                  {profit !== null && (
                    <p
                      className={`text-xs font-medium tabular-nums ${
                        profit >= 0 ? "text-accent-bright" : "text-red-300"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatMoney(profit)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop : tableau */}
      <div className="admin-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                <Th>Date</Th>
                <Th>Client</Th>
                <Th>Statut</Th>
                <Th align="right">Achat</Th>
                <Th align="right">Vente</Th>
                <Th align="right">Profit</Th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const profit =
                  lot.sale_price != null
                    ? Number(lot.sale_price) - Number(lot.purchase_price)
                    : null;
                return (
                  <tr
                    key={lot.id}
                    className="group border-b border-white/[0.04] transition-colors last:border-b-0 hover:bg-white/[0.025]"
                  >
                    <Td>
                      <RowLink id={lot.id}>
                        <span className="whitespace-nowrap text-sm tabular-nums text-slate-400">
                          {formatDate(lot.purchased_at)}
                        </span>
                      </RowLink>
                    </Td>
                    <Td>
                      <RowLink id={lot.id}>
                        <p className="text-sm font-medium text-white">{lot.client_name}</p>
                        {lot.client_email && (
                          <p className="text-xs text-slate-500">{lot.client_email}</p>
                        )}
                      </RowLink>
                    </Td>
                    <Td>
                      <StatusPill status={lot.status} />
                    </Td>
                    <Td align="right">
                      <span className="font-display text-sm tabular-nums text-white">
                        {formatMoney(lot.purchase_price)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-display text-sm tabular-nums text-slate-400">
                        {lot.sale_price != null ? formatMoney(lot.sale_price) : "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <span
                        className={`font-display text-sm font-semibold tabular-nums ${
                          profit === null
                            ? "text-slate-600"
                            : profit >= 0
                              ? "text-accent-bright"
                              : "text-red-300"
                        }`}
                      >
                        {profit !== null ? formatMoney(profit) : "—"}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/lots/${lot.id}`}
                        aria-label={`Ouvrir le lot de ${lot.client_name}`}
                        className="admin-focus flex h-7 w-7 items-center justify-center rounded-md"
                      >
                        <ChevronRight
                          className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                          aria-hidden
                        />
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RowLink({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={`/admin/lots/${id}`} tabIndex={-1} className="block">
      {children}
    </Link>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[11px] font-medium text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}
