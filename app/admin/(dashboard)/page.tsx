import Link from "next/link";
import { Plus } from "lucide-react";
import { exigerAdminPage } from "@/lib/securite/garde";
import { journaliserErreur } from "@/lib/admin/erreurs-admin";
import { resolvePrenom } from "@/lib/admin/config";
import { site } from "@/lib/site";
import type { Lot } from "@/lib/admin/types";
import { bornesPeriode, formatJour, legendeDates, nomAnneeFiscale, parsePeriode } from "@/lib/admin/periodes";
import { revenusJournaliers } from "@/lib/admin/revenus";
import { pageDepuisParam, paginer } from "@/lib/admin/pagination";
import {
  classerSuivis,
  commandesAExpedier,
  debutLectureEbay,
  prochainsAccueil,
  resumeAccueil,
  tachesAccueil,
  ventesEbayAccueil,
  type SuiviCandidat,
} from "@/lib/admin/accueil";
import { FILTRE_SUIVIS_POSSIBLES } from "@/lib/crm/types";
import { getEbayOrderRows, getEbayOrdersToShip, getEbayTotals } from "@/lib/ebay/ventes";
import { isEbayConfigured } from "@/lib/ebay/client";
import { getAdSpend } from "@/lib/ads/depenses";
import { getAdsSyncState } from "@/lib/ads/queries";
import PageHeader from "@/components/admin/PageHeader";
import CalculatriceButton from "@/components/admin/CalculatriceButton";
import AFaire from "@/components/admin/accueil/AFaire";
import VentesEbayCarte from "@/components/admin/accueil/VentesEbayCarte";
import ChiffresTiles, { CHIFFRES_OPTIONS } from "@/components/admin/accueil/ChiffresTiles";
import DernieresSoumissions from "@/components/admin/accueil/DernieresSoumissions";
import { A_TRAITER_JOURS, estATraiter, fetchSoumissions } from "@/lib/admin/soumissions";

/*
 * Accueil de l'admin : « À faire aujourd’hui » et carte « Ventes eBay », puis
 * les Chiffres de la période et les soumissions à traiter (calculs purs dans lib/admin/accueil.ts).
 */

export const dynamic = "force-dynamic";

const TZ = "America/Toronto";

/** Demandes par page dans « Soumissions à traiter » (paramètre `sp`). */
const SOUMISSIONS_PAR_PAGE = 10;

type Sale = { sale_price: number | string; sold_at: string };
type LotPeriode = Pick<Lot, "purchase_price" | "sale_price" | "purchased_at">;
type LotTache = { id: string; client_name: string };

/** Date du jour « YYYY-MM-DD » à l'heure de Toronto. */
function torontoToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** Jour de l'en-tête (« lundi 2 novembre ») : jour « YYYY-MM-DD » formaté en UTC. */
const jourEnteteFmt = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default async function AccueilPage(
  props: {
    searchParams: Promise<{ periode?: string | string[]; sp?: string | string[] }>;
  }
) {
  const ctx = await exigerAdminPage("/admin");
  const { supabase, user } = ctx;
  const searchParams = await props.searchParams;
  // Prénom : user_metadata.prenom, sinon table par défaut (lib/admin/config.ts).
  // Sans session (contournement local), on retombe sur le courriel de l'entreprise.
  const prenom = resolvePrenom(user?.email ?? site.email, user?.user_metadata);
  const now = new Date();
  const todayIso = torontoToday(now);

  // Chiffres : jours inclusifs à l'heure de Toronto (l'ancien paramètre `period` est ignoré).
  const choix = parsePeriode(
    Array.isArray(searchParams.periode) ? searchParams.periode[0] : searchParams.periode,
    "mois",
  );
  const periode = CHIFFRES_OPTIONS.includes(choix) ? choix : "mois";
  const { from, to } = bornesPeriode(periode, todayIso);

  // Lots achetés dans la période (purchased_at) + ventes manuelles (sold_at)
  let lotsQuery = supabase.from("lots").select("purchase_price, sale_price, purchased_at");
  if (from) lotsQuery = lotsQuery.gte("purchased_at", from);
  if (to) lotsQuery = lotsQuery.lte("purchased_at", to);

  let salesQuery = supabase.from("sales").select("sale_price, sold_at");
  if (from) salesQuery = salesQuery.gte("sold_at", from);
  if (to) salesQuery = salesQuery.lte("sold_at", to);

  const [
    { data: lotsRaw, error },
    { data: salesRaw },
    { data: companiesRaw },
    { data: negoRaw, count: negoCount },
    { data: prixRaw, count: prixCount },
    soumissions,
    ebay,
    pubs,
    ebayCarteRows,
    aExpedier,
    pubsSync,
  ] = await Promise.all([
    lotsQuery,
    salesQuery,
    // Suivis : seules ces compagnies peuvent en avoir un (date notée ou délai de
    // statut) ; le filtre évite aussi la limite de 1 000 lignes de l'API.
    supabase
      .from("companies")
      .select("id, name, lead_status, lead_status_changed_at, next_followup_on")
      .eq("is_partner_not_client", false)
      .or(FILTRE_SUIVIS_POSSIBLES),
    supabase
      .from("lots")
      .select("id, client_name", { count: "exact" })
      .eq("status", "negotiating")
      .order("created_at", { ascending: true })
      .limit(20),
    // Prix de vente à saisir : même règle que l'ancien bloc « Ventes en attente »
    supabase
      .from("lots")
      .select("id, client_name", { count: "exact" })
      .eq("status", "purchased")
      .is("sale_price", null)
      .order("purchased_at", { ascending: true })
      .limit(20),
    fetchSoumissions(supabase, {
      since: new Date(now.getTime() - A_TRAITER_JOURS * 86_400_000).toISOString(),
      limit: 200,
    }),
    getEbayTotals(from, to),
    getAdSpend(from, to),
    // Carte « Ventes eBay » : du plus ancien début (hier, semaine, mois, année fiscale) à aujourd'hui
    getEbayOrderRows(debutLectureEbay(todayIso), todayIso, [
      "created_at",
      "total",
      "refunded",
      "fees",
      "cancelled",
      "payment_status",
    ]).catch(() => []),
    getEbayOrdersToShip().catch(() => []),
    getAdsSyncState(supabase).catch(() => undefined),
  ]);

  let achats = 0;
  let ventesLots = 0;
  const lotsPeriode = (lotsRaw ?? []) as LotPeriode[];
  for (const l of lotsPeriode) {
    achats += Number(l.purchase_price);
    if (l.sale_price != null) ventesLots += Number(l.sale_price);
  }
  const ventesPeriode = (salesRaw ?? []) as Sale[];
  let ventesManuelles = 0;
  for (const s of ventesPeriode) ventesManuelles += Number(s.sale_price);
  const ventesEbay = ebay.revenue;
  const ventes = ventesLots + ventesManuelles + ventesEbay;
  const profit = ventes - achats - (ebay.fees ?? 0);

  // Graphique « Revenus journaliers » : les ventes de la tuile, jour par jour
  const revenus = revenusJournaliers(from, to ?? todayIso, lotsPeriode, ventesPeriode, ebay.rows);
  const dates = legendeDates(from, to);
  const legende =
    periode === "annee" ? `Année fiscale ${nomAnneeFiscale(todayIso)} · ${dates.charAt(0).toLowerCase()}${dates.slice(1)}` : dates;

  const soumissionsATraiter = soumissions.rows.filter((s) => estATraiter(s, now));
  const soumissionsPage = paginer(soumissionsATraiter, pageDepuisParam(searchParams.sp), SOUMISSIONS_PAR_PAGE);

  // « À faire aujourd’hui », « Prochains jours » et carte « Ventes eBay »
  const negoLots = (negoRaw ?? []) as LotTache[];
  const prixLots = (prixRaw ?? []) as LotTache[];
  const { dus, aVenir } = classerSuivis((companiesRaw ?? []) as SuiviCandidat[], now);
  const taches = tachesAccueil(
    {
      expeditions: commandesAExpedier(aExpedier),
      soumissions: {
        erreur: Boolean(soumissions.error),
        liste: soumissionsATraiter.map((s) => ({ nom: s.nom, date: s.date })),
      },
      suivis: dus,
      negociation: { total: negoCount ?? negoLots.length, lots: negoLots },
      prix: { total: prixCount ?? prixLots.length, lots: prixLots },
    },
    now,
  );
  const prochains = prochainsAccueil(aVenir, now);
  const ventesEbayCarte = ventesEbayAccueil(ebayCarteRows, todayIso);

  const jour = formatJour(todayIso, jourEnteteFmt);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        title={prenom ? `Bonjour ${prenom}` : "Bonjour"}
        description={`${jour.charAt(0).toUpperCase() + jour.slice(1)} · ${resumeAccueil(taches.length)}`}
        actions={
          <>
            <Link href="/admin/lots/nouveau" className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden />
              Nouveau lot
            </Link>
            <CalculatriceButton />
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Impossible de charger les données. Réf. : {await journaliserErreur(error, "accueil.lots_lire", ctx)}
        </div>
      )}

      <div className="flex flex-col gap-8 sm:gap-10">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
          <AFaire taches={taches} prochains={prochains} />
          <VentesEbayCarte configured={isEbayConfigured()} ventes={ventesEbayCarte} lastSync={ebay.lastSync} />
        </div>

        <ChiffresTiles
          periode={periode}
          legende={legende}
          revenus={revenus}
          data={{
            ventes,
            ventesLots,
            ventesManuelles,
            ventesEbay,
            ebayConfigured: ebay.configured,
            achats,
            nbLots: lotsPeriode.length,
            fraisEbay: ebay.fees,
            profit,
            pubsConfigured: pubs.configured,
            pubs: pubs.spend,
            pubsSync,
          }}
        />

        {soumissionsATraiter.length > 0 && (
          <DernieresSoumissions
            rows={soumissionsPage.items}
            page={soumissionsPage.page}
            pageCount={soumissionsPage.pageCount}
            parPage={SOUMISSIONS_PAR_PAGE}
            total={soumissionsPage.total}
          />
        )}
      </div>
    </div>
  );
}
