import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export default function LotsTable({ lots }: { lots: Lot[] }) {
  if (lots.length === 0) {
    return (
      <div className="rounded-2xl border border-admin-line bg-admin-card flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-admin-page text-admin-muted">
          <PackageOpen className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 font-display text-base font-semibold text-admin-ink">Aucun lot</p>
        <p className="mt-1 max-w-sm text-sm text-admin-muted">
          Aucun résultat pour ces critères. Ajuste les filtres ou ajoute un lot.
        </p>
        <Link href="/admin/lots/nouveau" className="inline-flex items-center justify-center gap-2 rounded-full border border-admin-line-strong bg-admin-card px-5 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card mt-5">
          Nouveau lot
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile : liste de cartes */}
      <ul className="rounded-2xl border border-admin-line bg-admin-card divide-y divide-admin-line-soft overflow-hidden md:hidden">
        {lots.map((lot) => {
          const profit =
            lot.sale_price != null
              ? Number(lot.sale_price) - Number(lot.purchase_price)
              : null;
          return (
            <li key={lot.id}>
              <Link
                href={`/admin/lots/${lot.id}`}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-admin-subtle"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-admin-ink">{lot.client_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={lot.status} />
                    <span className="text-xs text-admin-muted">{formatDate(lot.purchased_at)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-sm font-semibold tabular-nums text-admin-ink">
                    {formatMoney(lot.purchase_price)}
                  </p>
                  {profit !== null && (
                    <p
                      className={`text-xs font-medium tabular-nums ${
                        profit >= 0 ? "text-admin-green" : "text-admin-danger"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatMoney(profit)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-admin-faint" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop : tableau */}
      <div className="rounded-2xl border border-admin-line bg-admin-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-admin-line-soft">
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
                    className="group border-b border-admin-line-soft transition-colors last:border-b-0 hover:bg-admin-subtle"
                  >
                    <Td>
                      <RowLink id={lot.id}>
                        <span className="whitespace-nowrap text-sm tabular-nums text-admin-muted">
                          {formatDate(lot.purchased_at)}
                        </span>
                      </RowLink>
                    </Td>
                    <Td>
                      <RowLink id={lot.id}>
                        <p className="text-sm font-medium text-admin-ink">{lot.client_name}</p>
                        {lot.client_email && (
                          <p className="text-xs text-admin-muted">{lot.client_email}</p>
                        )}
                      </RowLink>
                    </Td>
                    <Td>
                      <StatusPill status={lot.status} />
                    </Td>
                    <Td align="right">
                      <span className="font-display text-sm tabular-nums text-admin-ink">
                        {formatMoney(lot.purchase_price)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-display text-sm tabular-nums text-admin-muted">
                        {lot.sale_price != null ? formatMoney(lot.sale_price) : "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <span
                        className={`font-display text-sm font-semibold tabular-nums ${
                          profit === null
                            ? "text-admin-faint"
                            : profit >= 0
                              ? "text-admin-green"
                              : "text-admin-danger"
                        }`}
                      >
                        {profit !== null ? formatMoney(profit) : "—"}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/lots/${lot.id}`}
                        aria-label={`Ouvrir le lot de ${lot.client_name}`}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card flex h-7 w-7 items-center justify-center rounded-md"
                      >
                        <ChevronRight
                          className="h-4 w-4 text-admin-faint transition-all group-hover:translate-x-0.5 group-hover:text-admin-green"
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
      className={`px-4 py-3 text-[13px] font-medium text-admin-muted ${
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
    <td className={`px-4 py-3.5 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}
