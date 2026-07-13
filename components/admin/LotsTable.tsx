import Link from "next/link";
import { ChevronRight } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export default function LotsTable({ lots }: { lots: Lot[] }) {
  if (lots.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <p className="font-display text-lg font-semibold text-white">
          Aucun lot
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Aucun résultat pour ces critères. Ajuste les filtres ou ajoute un lot.
        </p>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <Th>Date</Th>
              <Th>Client</Th>
              <Th>Statut</Th>
              <Th align="right">Achat</Th>
              <Th align="right">Vente</Th>
              <Th align="right">Profit</Th>
              <th className="w-8" />
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
                  className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <Td>
                    <RowLink id={lot.id}>
                      <span className="text-sm text-slate-400 whitespace-nowrap">
                        {formatDate(lot.purchased_at)}
                      </span>
                    </RowLink>
                  </Td>
                  <Td>
                    <RowLink id={lot.id}>
                      <p className="text-sm font-medium text-white">
                        {lot.client_name}
                      </p>
                      {lot.client_email && (
                        <p className="text-xs text-slate-500">
                          {lot.client_email}
                        </p>
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
                      {lot.sale_price != null
                        ? formatMoney(lot.sale_price)
                        : "—"}
                    </span>
                  </Td>
                  <Td align="right">
                    <span
                      className={`font-display text-sm font-semibold tabular-nums ${
                        profit === null
                          ? "text-slate-500"
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
                      aria-label="Ouvrir le lot"
                      className="block"
                    >
                      <ChevronRight
                        className="h-4 w-4 text-slate-500 transition-colors group-hover:text-accent"
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
    <Link href={`/admin/lots/${id}`} className="block">
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
      className={`px-4 py-3 font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 ${
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
    <td
      className={`px-4 py-3 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}
