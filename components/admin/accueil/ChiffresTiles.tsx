import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PeriodeSelect from "@/components/admin/PeriodeSelect";
import { formatMoney } from "@/lib/admin/format";
import type { PeriodeKey } from "@/lib/admin/periodes";
import type { SerieEvolution } from "@/lib/admin/evolution";
import type { AdPlatform, AdsSyncState } from "@/lib/ads/types";
import AdsAutoSync from "@/components/admin/ads/AdsAutoSync";
import ChiffresGraphique from "@/components/admin/accueil/ChiffresGraphique";

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
  /** Synchro automatique Meta / Google (pastilles sous la tuile « Pubs ») */
  pubsSync?: Record<AdPlatform, AdsSyncState>;
};

/** Périodes proposées sur l'accueil (paramètre d'URL `periode`). */
export const CHIFFRES_OPTIONS: PeriodeKey[] = ["hier", "semaine", "7j", "30j", "mois", "moisdernier", "annee", "tout"];

/**
 * « Chiffres » : 3 grands nombres (Ventes, Profit, Pubs), le sélecteur de
 * période et le graphique « Évolution » du profit.
 */
export default function ChiffresTiles({
  periode,
  legende,
  evolution,
  data,
}: {
  periode: PeriodeKey;
  /** Dates de la période (« Année fiscale 2026-2027 · du 1er avr. au 29 oct. 2026 ») */
  legende: string;
  /** Série du graphique ; null quand la période tient en un jour */
  evolution: SerieEvolution | null;
  data: Chiffres;
}) {
  const profitNegatif = data.profit < 0;
  return (
    <section aria-labelledby="chiffres-titre">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2
            id="chiffres-titre"
            className="font-display text-lg font-semibold tracking-tight text-admin-ink"
          >
            Chiffres
          </h2>
          <p className="mt-0.5 text-[13px] text-admin-muted">{legende}</p>
        </div>
        <div className="min-w-0 max-w-full">
          <PeriodeSelect current={periode} options={CHIFFRES_OPTIONS} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Tile label="Ventes" value={formatMoney(data.ventes)}>
          eBay {data.ebayConfigured ? formatMoney(data.ventesEbay) : "—"} · lots {formatMoney(data.ventesLots)} ·
          ventes {formatMoney(data.ventesManuelles)}
        </Tile>

        <Tile
          label="Profit"
          value={formatMoney(data.profit)}
          valueClass={profitNegatif ? "text-admin-danger" : "text-admin-green"}
        >
          {data.nbLots === 0
            ? data.fraisEbay
              ? `Ventes − frais eBay (${formatMoney(data.fraisEbay)}) · aucun lot acheté`
              : "Aucun lot acheté"
            : data.fraisEbay
              ? `Ventes − achats (${formatMoney(data.achats)}) − frais eBay (${formatMoney(data.fraisEbay)})`
              : `Ventes − achats (${formatMoney(data.achats)})`}
        </Tile>

        {data.pubsConfigured ? (
          <Tile
            label="Pubs"
            value={formatMoney(data.pubs)}
            footer={
              data.pubsSync && (
                <AdsAutoSync
                  variant="badge"
                  platforms={(["meta", "google"] as const).filter((p) => data.pubsSync?.[p].configured)}
                  state={data.pubsSync}
                />
              )
            }
          >
            Non retirées du profit
          </Tile>
        ) : (
          <div className="flex min-h-[132px] flex-col justify-between gap-3 rounded-2xl border border-admin-line bg-admin-card p-4 sm:p-5">
            <p className="text-[13px] font-medium text-admin-muted">Pubs</p>
            <p className="text-[15px] font-semibold leading-snug text-admin-ink">
              Meta pas encore connecté
            </p>
            <Link
              href="/admin/pubs"
              className="admin-focus inline-flex items-center gap-1 self-start rounded-md text-[13px] font-semibold text-admin-green hover:underline"
            >
              Voir les publicités
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </div>

      <ChiffresGraphique periode={periode} serie={evolution} />
    </section>
  );
}

function Tile({
  label,
  value,
  valueClass = "text-admin-ink",
  children,
  footer,
}: {
  label: string;
  value: string;
  valueClass?: string;
  children: React.ReactNode;
  /** Sous le texte (ex. pastilles de synchro) */
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[132px] min-w-0 flex-col justify-between gap-3 rounded-2xl border border-admin-line bg-admin-card p-4 sm:p-5">
      <p className="text-[13px] font-medium text-admin-muted">{label}</p>
      <p
        className={`truncate font-display text-[26px] font-semibold leading-none tracking-tight tabular-nums sm:text-[34px] ${valueClass}`}
      >
        {value}
      </p>
      <p className="text-[12.5px] leading-snug text-admin-muted">{children}</p>
      {footer}
    </div>
  );
}
