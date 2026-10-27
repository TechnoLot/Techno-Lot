import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PeriodPills from "@/components/admin/PeriodPills";
import { formatCount, formatMoney } from "@/lib/admin/format";
import type { PeriodKey } from "@/lib/admin/types";

export type Chiffres = {
  /** Ventes totales = lots + ventes manuelles + eBay */
  ventes: number;
  ventesLots: number;
  ventesManuelles: number;
  ventesEbay: number;
  ebayConfigured: boolean;
  /** Achats = somme des purchase_price des lots de la période */
  achats: number;
  nbLots: number;
  /** Frais eBay connus (null = inconnus, non retirés) */
  fraisEbay: number | null;
  /** Profit = ventes − achats − frais eBay connus */
  profit: number;
  pubsConfigured: boolean;
  pubs: number;
};

export const CHIFFRES_PERIODES: PeriodKey[] = ["month", "lastmonth", "ytd", "all"];

/** « Chiffres » : 4 grands nombres (Ventes, Achats, Profit, Pubs) et le sélecteur de période. */
export default function ChiffresTiles({
  period,
  data,
}: {
  period: PeriodKey;
  data: Chiffres;
}) {
  const profitNegatif = data.profit < 0;
  return (
    <section aria-labelledby="chiffres-titre">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="chiffres-titre"
          className="font-display text-lg font-semibold tracking-tight text-[#0a0a0a]"
        >
          Chiffres
        </h2>
        <PeriodPills current={period} options={CHIFFRES_PERIODES} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Ventes" value={formatMoney(data.ventes)}>
          Lots {formatMoney(data.ventesLots)} · Ventes {formatMoney(data.ventesManuelles)} · eBay{" "}
          {data.ebayConfigured ? formatMoney(data.ventesEbay) : "—"}
        </Tile>

        <Tile label="Achats" value={formatMoney(data.achats)}>
          {data.nbLots === 0
            ? "Aucun lot acheté"
            : `${formatCount(data.nbLots)} lot${data.nbLots > 1 ? "s" : ""}`}
        </Tile>

        <Tile
          label="Profit"
          value={formatMoney(data.profit)}
          valueClass={profitNegatif ? "text-[#b42318]" : "text-[#257a10]"}
        >
          {data.fraisEbay
            ? `Ventes − achats − frais eBay (${formatMoney(data.fraisEbay)})`
            : "Ventes − achats"}
        </Tile>

        {data.pubsConfigured ? (
          <Tile label="Pubs" value={formatMoney(data.pubs)}>
            Non retirées du profit
          </Tile>
        ) : (
          <div className="flex min-h-[132px] flex-col justify-between gap-3 rounded-2xl border border-[#e3eadf] bg-white p-4 sm:p-5">
            <p className="text-[13px] font-medium text-[#4f5a52]">Pubs</p>
            <p className="text-[15px] font-semibold leading-snug text-[#0a0a0a]">
              Meta pas encore connecté
            </p>
            <Link
              href="/admin/pubs"
              className="admin-focus inline-flex items-center gap-1 self-start rounded-md text-[13px] font-semibold text-[#257a10] hover:underline"
            >
              Voir les publicités
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  valueClass = "text-[#0a0a0a]",
  children,
}: {
  label: string;
  value: string;
  valueClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[132px] min-w-0 flex-col justify-between gap-3 rounded-2xl border border-[#e3eadf] bg-white p-4 sm:p-5">
      <p className="text-[13px] font-medium text-[#4f5a52]">{label}</p>
      <p
        className={`truncate font-display text-[26px] font-semibold leading-none tracking-tight tabular-nums sm:text-[34px] ${valueClass}`}
      >
        {value}
      </p>
      <p className="text-[12.5px] leading-snug text-[#4f5a52]">{children}</p>
    </div>
  );
}
