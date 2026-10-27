import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail, resolvePrenom } from "@/lib/admin/config";
import { site } from "@/lib/site";
import { endOfPeriod, startOfPeriod } from "@/lib/admin/dates";
import type { Lot, PeriodKey } from "@/lib/admin/types";
import { daysSince, followupOverdueDays, type LeadStatus } from "@/lib/crm/types";
import { getEbayTotals } from "@/lib/ebay/ventes";
import { getAdSpend } from "@/lib/ads/depenses";
import PageHeader from "@/components/admin/PageHeader";
import CalculatriceButton from "@/components/admin/CalculatriceButton";
import AFaireTiles from "@/components/admin/accueil/AFaireTiles";
import ChiffresTiles, { CHIFFRES_PERIODES } from "@/components/admin/accueil/ChiffresTiles";
import DerniersLots from "@/components/admin/accueil/DerniersLots";
import DernieresSoumissions, {
  type SoumissionRow,
} from "@/components/admin/accueil/DernieresSoumissions";

export const dynamic = "force-dynamic";

const TZ = "America/Toronto";

type Sale = { sale_price: number | string; sold_at: string };
type SupabaseServer = ReturnType<typeof createClient>;

/** Date du jour « YYYY-MM-DD » à l'heure de Toronto. */
function torontoToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** Les 10 derniers chiffres d'un téléphone (null si moins de 10 chiffres). */
function phoneKey(v: string | null | undefined): string | null {
  const digits = (v ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/**
 * Soumissions des 30 derniers jours qui ne sont liées à aucun lot
 * (lots.soumission_id, ou même courriel ou téléphone). La table soumissions n'a pas de politique de
 * lecture pour « authenticated » : on la lit avec la clé service (serveur
 * seulement, admin vérifié) quand elle est configurée. Sans clé, `readable`
 * est faux et le compte reste inconnu.
 */
async function fetchSoumissionsATraiter(
  user: User | null,
  now: Date,
): Promise<{ readable: boolean; rows: SoumissionRow[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { readable: false, rows: [] };

  if (!user || !isAdminEmail(user.email)) return { readable: false, rows: [] };

  const service = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const { data, error } = await service
    .from("soumissions")
    .select('id, "DATE", nom, courriel, telephone, message')
    .gte("DATE", since)
    .order("DATE", { ascending: false })
    .limit(200);
  if (error || !data) return { readable: false, rows: [] };

  type Raw = {
    id: string;
    DATE: string;
    nom: string | null;
    courriel: string | null;
    telephone: string | null;
    message: string | null;
  };
  const raw = data as unknown as Raw[];
  const ids = raw.map((r) => r.id);
  const linked = new Set<string>();
  // Créer un lot ne remplit pas toujours lots.soumission_id : un lot créé
  // depuis la plus ancienne soumission pour le même courriel ou le même
  // téléphone compte aussi comme « traité ».
  const emails = new Set<string>();
  const phones = new Set<string>();
  if (ids.length > 0) {
    const oldest = raw[raw.length - 1]?.DATE ?? since;
    const [{ data: lotsLinked }, { data: lotsRecent }] = await Promise.all([
      service.from("lots").select("soumission_id").in("soumission_id", ids),
      service.from("lots").select("client_email, client_phone").gte("created_at", oldest),
    ]);
    for (const l of (lotsLinked ?? []) as { soumission_id: string | null }[]) {
      if (l.soumission_id) linked.add(l.soumission_id);
    }
    for (const l of (lotsRecent ?? []) as { client_email: string | null; client_phone: string | null }[]) {
      const email = l.client_email?.trim().toLowerCase();
      if (email) emails.add(email);
      const phone = phoneKey(l.client_phone);
      if (phone) phones.add(phone);
    }
  }
  const handled = (r: Raw) => {
    if (linked.has(r.id)) return true;
    const email = r.courriel?.trim().toLowerCase();
    if (email && emails.has(email)) return true;
    const phone = phoneKey(r.telephone);
    return phone !== null && phones.has(phone);
  };
  return {
    readable: true,
    rows: raw
      .filter((r) => !handled(r))
      .map((r) => ({
        id: r.id,
        date: r.DATE,
        nom: r.nom,
        courriel: r.courriel,
        telephone: r.telephone,
        message: r.message,
      })),
  };
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

export default async function AccueilPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period: PeriodKey = CHIFFRES_PERIODES.includes(searchParams.period as PeriodKey)
    ? (searchParams.period as PeriodKey)
    : "month";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Prénom : user_metadata.prenom, sinon table par défaut (lib/admin/config.ts).
  // Sans session (contournement local), on retombe sur le courriel de l'entreprise.
  const prenom = resolvePrenom(user?.email ?? site.email, user?.user_metadata);
  const now = new Date();
  const todayIso = torontoToday(now);
  // Bornes calculées sur la date de Toronto (startOfPeriod lit la date UTC).
  const torontoNow = new Date(todayIso + "T12:00:00Z");
  const start = startOfPeriod(period, torontoNow);
  const end = endOfPeriod(period, torontoNow);

  // Chiffres : lots achetés dans la période (purchased_at) + ventes manuelles (sold_at)
  let lotsQuery = supabase.from("lots").select("purchase_price, sale_price");
  if (start) lotsQuery = lotsQuery.gte("purchased_at", start);
  if (end) lotsQuery = lotsQuery.lte("purchased_at", end);

  let salesQuery = supabase.from("sales").select("sale_price, sold_at");
  if (start) salesQuery = salesQuery.gte("sold_at", start);
  if (end) salesQuery = salesQuery.lte("sold_at", end);

  const [
    { data: lotsRaw, error },
    { data: salesRaw },
    { data: derniersRaw },
    { count: negoCount },
    { count: prixCount },
    suivisCount,
    soumissions,
    ebay,
    pubs,
  ] = await Promise.all([
    lotsQuery,
    salesQuery,
    supabase
      .from("lots")
      .select("*")
      .order("purchased_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
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
    fetchSoumissionsATraiter(user, now),
    getEbayTotals(start, end),
    getAdSpend(start, end),
  ]);

  let achats = 0;
  let ventesLots = 0;
  const lotsPeriode = (lotsRaw ?? []) as Pick<Lot, "purchase_price" | "sale_price">[];
  for (const l of lotsPeriode) {
    achats += Number(l.purchase_price);
    if (l.sale_price != null) ventesLots += Number(l.sale_price);
  }
  let ventesManuelles = 0;
  for (const s of (salesRaw ?? []) as Sale[]) ventesManuelles += Number(s.sale_price);
  const ventesEbay = ebay.revenue;
  const ventes = ventesLots + ventesManuelles + ventesEbay;
  const profit = ventes - achats - (ebay.fees ?? 0);

  const today = new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(now);

  const soumissionsCount = soumissions.readable ? soumissions.rows.length : null;

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
        <AFaireTiles
          tiles={[
            {
              label: "Soumissions à traiter",
              count: soumissionsCount,
              hint: soumissions.readable ? "Reçues ces 30 derniers jours" : "Lecture à activer",
              // Traitées dans le bloc « Dernières soumissions » plus bas
              href: soumissions.rows.length > 0 ? "#soumissions" : null,
            },
            {
              label: "Suivis à faire",
              count: suivisCount,
              hint: "Prospects à relancer",
              href: "/admin/crm/suivis",
            },
            {
              label: "Lots en négociation",
              count: negoCount ?? 0,
              hint: "Offre à conclure",
              href: "/admin/lots?status=negotiating",
            },
            {
              label: "Prix de vente à saisir",
              count: prixCount ?? 0,
              hint: "Lots achetés sans prix de vente",
              href: "/admin/lots?status=purchased",
            },
          ]}
        />

        <ChiffresTiles
          period={period}
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
          }}
        />

        {soumissions.rows.length > 0 && <DernieresSoumissions rows={soumissions.rows} />}

        <DerniersLots lots={(derniersRaw ?? []) as Lot[]} />
      </div>
    </div>
  );
}
