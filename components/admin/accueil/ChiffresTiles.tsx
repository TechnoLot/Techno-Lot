import PeriodeSelect from "@/components/admin/PeriodeSelect";
import AdsAutoSync from "@/components/admin/ads/AdsAutoSync";
import EbaySalesChart from "@/components/admin/ebay/EbaySalesChart";
import MontantAnime from "@/components/admin/accueil/MontantAnime";
import { formatMoney } from "@/lib/admin/format";
import type { PeriodeKey } from "@/lib/admin/periodes";
import type { RevenuJour } from "@/lib/admin/revenus";
import type { AdPlatform, AdsSyncState } from "@/lib/ads/types";

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
  /** Synchro automatique Meta / Google (visible seulement en cas d’échec) */
  pubsSync?: Record<AdPlatform, AdsSyncState>;
};

/** Périodes proposées sur l'accueil (paramètre d'URL `periode`). */
export const CHIFFRES_OPTIONS: PeriodeKey[] = [
  "aujourdhui",
  "hier",
  "semaine",
  "7j",
  "30j",
  "mois",
  "moisdernier",
  "annee",
  "tout",
];

/**
 * « Nos profits » : le sélecteur de période, puis une plaque de verre avec le
 * profit en très gros à gauche, les ventes à droite et le graphique
 * « Revenus journaliers ». Posée sur le ciel du haut de l'accueil.
 */
export default function ChiffresTiles({
  periode,
  legende,
  revenus,
  data,
}: {
  periode: PeriodeKey;
  /** Dates de la période (« Année fiscale 2026-2027 · du 1er avr. au 29 oct. 2026 ») */
  legende: string;
  /** Revenus de chaque jour (graphique) ; null quand la période tient en un jour */
  revenus: RevenuJour[] | null;
  data: Chiffres;
}) {
  const profitNegatif = data.profit < 0;
  return (
    <section aria-labelledby="profits-titre">
      <div className="mb-3 flex flex-col gap-3 px-1 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id="profits-titre" className="font-display text-[22px] font-bold tracking-[-0.01em] text-admin-ink">
            Nos profits
          </h2>
          <p className="mt-0.5 text-[13px] text-admin-muted">{legende}</p>
        </div>
        <div className="min-w-0 max-w-full">
          <PeriodeSelect current={periode} options={CHIFFRES_OPTIONS} />
        </div>
      </div>

      <div className="admin-cadre">
        <div className="admin-verre p-5 sm:p-7">
          <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-10">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-admin-muted">Profit</p>
              <p
                className={`admin-profit mt-1 whitespace-nowrap font-display text-[56px] font-bold leading-none tracking-[-0.03em] sm:text-[84px] ${
                  profitNegatif ? "text-admin-danger" : "text-admin-green"
                }`}
              >
                <MontantAnime value={data.profit} />
              </p>
              <p className="mt-3 text-[13px] leading-snug text-admin-muted">
                {data.nbLots === 0
                  ? data.fraisEbay
                    ? `Ventes − frais eBay (${formatMoney(data.fraisEbay)}) · aucun lot acheté`
                    : "Aucun lot acheté"
                  : data.fraisEbay
                    ? `Ventes − achats (${formatMoney(data.achats)}) − frais eBay (${formatMoney(data.fraisEbay)})`
                    : `Ventes − achats (${formatMoney(data.achats)})`}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-admin-muted">Ventes</p>
              <p className="mt-1 truncate font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-admin-ink sm:text-[52px]">
                <MontantAnime value={data.ventes} />
              </p>
              <p className="mt-3 text-[13px] leading-snug text-admin-muted">
                eBay {data.ebayConfigured ? formatMoney(data.ventesEbay) : "—"} · lots {formatMoney(data.ventesLots)} ·
                ventes {formatMoney(data.ventesManuelles)}
              </p>
            </div>
          </div>

          {revenus && (
            <div className="mt-6 border-t border-admin-line pt-5">
              <h3 className="font-display text-sm font-semibold text-admin-ink">Revenus journaliers</h3>
              <EbaySalesChart data={revenus} label="Revenus" hauteur="h-44" />
            </div>
          )}
        </div>
      </div>

      {/* La synchro des pubs continue en fond : visible seulement en cas d'échec */}
      {data.pubsConfigured && data.pubsSync && (
        <AdsAutoSync
          variant="silencieux"
          platforms={(["meta", "google"] as const).filter((p) => data.pubsSync?.[p].configured)}
          state={data.pubsSync}
        />
      )}
    </section>
  );
}
