import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolvePrenom } from "@/lib/admin/config";
import { site } from "@/lib/site";
import type { Lot } from "@/lib/admin/types";
import { bornesPeriode, legendeDates, nomAnneeFiscale, parsePeriode } from "@/lib/admin/periodes";
import { revenusJournaliers } from "@/lib/admin/revenus";
import { pageDepuisParam, paginer } from "@/lib/admin/pagination";
import { fusionnerVentes, type LotVendu, type VenteManuelle } from "@/lib/admin/dernieres-ventes";
import { daysSince, followupOverdueDays, type LeadStatus } from "@/lib/crm/types";
import { getEbayOrderRows, getEbayTotals, getRecentEbayOrders } from "@/lib/ebay/ventes";
import { isEbayConfigured } from "@/lib/ebay/client";
import { addDays, inTorontoRange, sumEbayOrders, torontoDay } from "@/lib/ebay/totaux";
import { getAdSpend } from "@/lib/ads/depenses";
import { getAdsSyncState } from "@/lib/ads/queries";
import PageHeader from "@/components/admin/PageHeader";
import CalculatriceButton from "@/components/admin/CalculatriceButton";
import Aujourdhui from "@/components/admin/accueil/Aujourdhui";
import DernieresVentes from "@/components/admin/accueil/DernieresVentes";
import ChiffresTiles, { CHIFFRES_OPTIONS } from "@/components/admin/accueil/ChiffresTiles";
import DernieresSoumissions from "@/components/admin/accueil/DernieresSoumissions";
import { A_TRAITER_JOURS, estATraiter, fetchSoumissions } from "@/lib/admin/soumissions";

export const dynamic = "force-dynamic";

const TZ = "America/Toronto";
/** Demandes par page dans « Dernières soumissions » (paramètre `sp`). */
const SOUMISSIONS_PAR_PAGE = 10;
/** Rangées de « Dernières ventes ». */
const NB_VENTES = 8;

type Sale = { sale_price: number | string; sold_at: string };
type LotPeriode = Pick<Lot, "purchase_price" | "sale_price" | "purchased_at">;
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Date du jour « YYYY-MM-DD » à l'heure de Toronto. */
function torontoToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** Même règle que /admin/crm/suivis : rappels dus (note ou délai de statut). */
async function countSuivisAFaire(supabase: SupabaseServer, todayIso: string) {
  const { data } = await supabase
    .from("companies")
    .select("lead_status, lead_status_changed_at, next_followup_on")
    .eq("is_partner_not_client", false);
  let count = 0;
  for (const c of (data ?? []) as {
    lead_status: LeadStatus;
    lead_status_changed_at: string;
    next_followup_on: string | null;
  }[]) {
    const planned = c.next_followup_on;
    if (planned && planned > todayIso) continue;
    const noteOverdue = planned ? daysSince(planned + "T00:00:00") : null;
    const statusOverdue = followupOverdueDays(c);
    if (noteOverdue === null && statusOverdue === null) continue;
    count++;
  }
  return count;
}

export default async function AccueilPage(
  props: {
    searchParams: Promise<{ periode?: string | string[]; sp?: string | string[] }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // eBay aujourd'hui / hier (jours à l'heure de Toronto)
  const ebayToday = torontoDay(now);
  const ebayYesterday = addDays(ebayToday, -1);

  const [
    { data: lotsRaw, error },
    { data: salesRaw },
    ebayRecentes,
    { data: lotsVendusRaw },
    { data: ventesRaw },
    { count: negoCount },
    { count: prixCount },
    suivisCount,
    soumissions,
    ebay,
    pubs,
    ebayRecentRows,
    pubsSync,
  ] = await Promise.all([
    lotsQuery,
    salesQuery,
    // Dernières ventes : commandes eBay, lots vendus et ventes manuelles
    getRecentEbayOrders(NB_VENTES).catch(() => []),
    supabase
      .from("lots")
      .select("id, client_name, description, purchase_price, sale_price, sold_at")
      .eq("status", "sold")
      .order("sold_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(NB_VENTES),
    supabase
      .from("sales")
      .select("id, buyer_name, description, sale_price, sold_at, source")
      .order("sold_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(NB_VENTES),
    supabase
      .from("lots")
      .select("id", { count: "exact", head: true })
      .eq("status", "negotiating"),
    // Prix de vente à saisir : même règle que l'ancien bloc « Ventes en attente »
    supabase
      .from("lots")
      .select("id", { count: "exact", head: true })
      .eq("status", "purchased")
      .is("sale_price", null),
    countSuivisAFaire(supabase, todayIso),
    fetchSoumissions(supabase, {
      since: new Date(now.getTime() - A_TRAITER_JOURS * 86_400_000).toISOString(),
      limit: 200,
    }),
    getEbayTotals(from, to),
    getAdSpend(from, to),
    getEbayOrderRows(ebayYesterday, ebayToday, [
      "created_at",
      "total",
      "refunded",
      "fees",
      "cancelled",
      "payment_status",
    ]).catch(() => []),
    getAdsSyncState(supabase).catch(() => undefined),
  ]);

  const ebayAujourdhui = sumEbayOrders(
    ebayRecentRows.filter((r) => inTorontoRange(r.created_at, ebayToday, ebayToday)),
  );
  const ebayHier = sumEbayOrders(
    ebayRecentRows.filter((r) => inTorontoRange(r.created_at, ebayYesterday, ebayYesterday)),
  );

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

  const dernieresVentes = fusionnerVentes(
    ebayRecentes,
    (lotsVendusRaw ?? []) as LotVendu[],
    (ventesRaw ?? []) as VenteManuelle[],
    NB_VENTES,
  );

  const today = new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(now);

  const soumissionsATraiter = soumissions.rows.filter((s) => estATraiter(s, now));
  const soumissionsCount = soumissions.error ? null : soumissionsATraiter.length;
  const soumissionsPage = paginer(soumissionsATraiter, pageDepuisParam(searchParams.sp), SOUMISSIONS_PAR_PAGE);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow={today.charAt(0).toUpperCase() + today.slice(1)}
        title={prenom ? `Bonjour ${prenom}` : "Bonjour"}
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
          Impossible de charger les données : {error.message}
        </div>
      )}

      <div className="flex flex-col gap-8 sm:gap-10">
        <Aujourdhui
          ebay={{
            configured: isEbayConfigured(),
            lastSync: ebay.lastSync,
            today: ebayAujourdhui,
            yesterday: ebayHier,
          }}
          soumissions={{
            count: soumissionsCount,
            hint: soumissions.error ? "Lecture impossible" : "Reçues ces 30 derniers jours",
            // Liste complète dans l'onglet Soumissions
            href:
              soumissionsATraiter.length > 0
                ? "/admin/soumissions?statut=a-traiter"
                : "/admin/soumissions",
          }}
          suivis={suivisCount}
          negociation={negoCount ?? 0}
          prixASaisir={prixCount ?? 0}
        />

        <DernieresVentes ventes={dernieresVentes} aujourdhui={todayIso} />

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
