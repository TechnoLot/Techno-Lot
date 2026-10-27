import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export default function LotsTable({ lots }: { lots: Lot[] }) {
  if (lots.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e3eadf] bg-white flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f7f2] text-[#4f5a52]">
          <PackageOpen className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 font-display text-base font-semibold text-[#0a0a0a]">Aucun lot</p>
        <p className="mt-1 max-w-sm text-sm text-[#4f5a52]">
          Aucun résultat pour ces critères. Ajuste les filtres ou ajoute un lot.
        </p>
        <Link href="/admin/lots/nouveau" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c9d6c3] bg-white px-5 py-2.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 mt-5">
          Nouveau lot
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile : liste de cartes */}
      <ul className="rounded-2xl border border-[#e3eadf] bg-white divide-y divide-[#edf2ea] overflow-hidden md:hidden">
        {lots.map((lot) => {
          const profit =
            lot.sale_price != null
              ? Number(lot.sale_price) - Number(lot.purchase_price)
              : null;
          return (
            <li key={lot.id}>
              <Link
                href={`/admin/lots/${lot.id}`}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-[#f8faf6]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0a0a0a]">{lot.client_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={lot.status} />
                    <span className="text-xs text-[#4f5a52]">{formatDate(lot.purchased_at)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-sm font-semibold tabular-nums text-[#0a0a0a]">
                    {formatMoney(lot.purchase_price)}
                  </p>
                  {profit !== null && (
                    <p
                      className={`text-xs font-medium tabular-nums ${
                        profit >= 0 ? "text-[#257a10]" : "text-[#b42318]"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatMoney(profit)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#5f6b62]" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop : tableau */}
      <div className="rounded-2xl border border-[#e3eadf] bg-white hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#edf2ea]">
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
                    className="group border-b border-[#edf2ea] transition-colors last:border-b-0 hover:bg-[#f8faf6]"
                  >
                    <Td>
                      <RowLink id={lot.id}>
                        <span className="whitespace-nowrap text-sm tabular-nums text-[#4f5a52]">
                          {formatDate(lot.purchased_at)}
                        </span>
                      </RowLink>
                    </Td>
                    <Td>
                      <RowLink id={lot.id}>
                        <p className="text-sm font-medium text-[#0a0a0a]">{lot.client_name}</p>
                        {lot.client_email && (
                          <p className="text-xs text-[#4f5a52]">{lot.client_email}</p>
                        )}
                      </RowLink>
                    </Td>
                    <Td>
                      <StatusPill status={lot.status} />
                    </Td>
                    <Td align="right">
                      <span className="font-display text-sm tabular-nums text-[#0a0a0a]">
                        {formatMoney(lot.purchase_price)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-display text-sm tabular-nums text-[#4f5a52]">
                        {lot.sale_price != null ? formatMoney(lot.sale_price) : "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <span
                        className={`font-display text-sm font-semibold tabular-nums ${
                          profit === null
                            ? "text-[#5f6b62]"
                            : profit >= 0
                              ? "text-[#257a10]"
                              : "text-[#b42318]"
                        }`}
                      >
                        {profit !== null ? formatMoney(profit) : "—"}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/lots/${lot.id}`}
                        aria-label={`Ouvrir le lot de ${lot.client_name}`}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 flex h-7 w-7 items-center justify-center rounded-md"
                      >
                        <ChevronRight
                          className="h-4 w-4 text-[#5f6b62] transition-all group-hover:translate-x-0.5 group-hover:text-[#257a10]"
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
      className={`px-4 py-3 text-[13px] font-medium text-[#4f5a52] ${
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
