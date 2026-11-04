import Link from "next/link";
import { DollarSign, PhoneCall } from "lucide-react";
import { exigerAdminPage } from "@/lib/securite/garde";
import { journaliserErreur } from "@/lib/admin/erreurs-admin";
import AddCompanyButton from "@/components/admin/crm/AddCompanyButton";
import CompaniesFilters from "@/components/admin/crm/CompaniesFilters";
import CompaniesTable from "@/components/admin/crm/CompaniesTable";
import Pagination from "@/components/admin/Pagination";
import { pageDepuisParam, paginer, resumePage } from "@/lib/admin/pagination";
import {
  COLONNES_LISTE,
  compagniesAvecAppel,
  dansOrdreDesIds,
  filtrerCompagnies,
  PAR_PAGE,
  seededShuffle,
  type CompagnieListe,
  type ContactListe,
} from "@/lib/crm/compagnies-liste";
import { daysSince, followupOverdueDays, type Company } from "@/lib/crm/types";
import { toutesLesLignes } from "@/lib/supabase/toutes-les-lignes";

export const dynamic = "force-dynamic";

/**
 * Dashboard prospection : compagnies triées par fit_score décroissant,
 * filtres région / score min / statut de recherche, partenaires exclus
 * par défaut (case à cocher pour les inclure), 10 compagnies par page.
 */
export default async function CrmPage(
  props: {
    searchParams: Promise<{
      q?: string;
      score?: string;
      region?: string;
      status?: string;
      suivi?: string;
      partenaires?: string;
      appel?: string;
      ordre?: string;
      seed?: string;
      page?: string;
    }>;
  }
) {
  const ctx = await exigerAdminPage("/admin/crm");
  const { supabase } = ctx;
  const searchParams = await props.searchParams;

  // Lecture complète par tranches : le plafond de 1 000 lignes de PostgREST
  // tronquerait la liste et les indicateurs.
  const [compagniesLues, contactsLus] = await Promise.all([
    toutesLesLignes<CompagnieListe>((de, a) =>
      supabase
        .from("companies")
        .select(COLONNES_LISTE)
        .order("fit_score", { ascending: false, nullsFirst: false })
        .order("name")
        .order("id")
        .range(de, a),
    ),
    toutesLesLignes<ContactListe>((de, a) =>
      supabase.from("contacts").select("id, company_id, stage").order("id").range(de, a),
    ),
  ]);

  const all = compagniesLues.ok ? compagniesLues.lignes : [];
  const contacts = contactsLus.ok ? contactsLus.lignes : [];

  // Filtres et mélange en mémoire, sur toutes les compagnies (plus de 2 500 :
  // lecture légère ci-dessus, colonnes complètes pour la page seulement).
  const includePartners = searchParams.partenaires === "1";
  const companies = filtrerCompagnies(all, searchParams, compagniesAvecAppel(contacts));

  // Ordre aléatoire demandé : on remplace le tri par score par un mélange
  // stable (seed dans l'URL, relancé par le bouton ↻).
  const companiesOrdered =
    searchParams.ordre === "aleatoire"
      ? seededShuffle(companies, searchParams.seed ?? "technolot")
      : companies;

  const pagination = paginer(companiesOrdered, pageDepuisParam(searchParams.page), PAR_PAGE);

  const ids = pagination.items.map((c) => c.id);
  const { data: detailRaw, error: erreurDetail } =
    ids.length > 0
      ? await supabase.from("companies").select("*").in("id", ids)
      : { data: [], error: null };
  const companiesPage = dansOrdreDesIds(ids, (detailRaw ?? []) as Company[]);

  const error = !compagniesLues.ok
    ? compagniesLues.erreur
    : !contactsLus.ok
      ? contactsLus.erreur
      : erreurDetail;
  const ref = error ? await journaliserErreur(error, "crm.liste_lire", ctx) : null;

  const regions = Array.from(
    new Set(all.map((c) => c.region).filter((r): r is string => !!r)),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const contactCounts: Record<string, number> = {};
  for (const c of contacts) {
    if (c.company_id) {
      contactCounts[c.company_id] = (contactCounts[c.company_id] ?? 0) + 1;
    }
  }

  // Compte des suivis dus (détail complet dans l'onglet « Suivis »).
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
  }).format(new Date());
  const dueFollowupsCount = all.reduce((n, c) => {
    if (c.is_partner_not_client) return n;
    const planned = c.next_followup_on;
    if (planned && planned > todayIso) return n;
    const noteOverdue = planned ? daysSince(planned + "T00:00:00") : null;
    const statusOverdue = followupOverdueDays(c);
    return n + (noteOverdue !== null || statusOverdue !== null ? 1 : 0);
  }, 0);

  // Mini-KPIs du matin
  const callDone = contacts.filter((c) => c.stage === "call_done").length;
  const inSequence = contacts.filter((c) => c.stage === "sequence_active").length;
  const converted = contacts.filter((c) => c.stage === "converted").length;

  const kpis = [
    {
      label: "Suivis à faire",
      value: dueFollowupsCount,
      accent: dueFollowupsCount > 0,
      href: "/admin/crm/suivis",
    },
    { label: "Appels faits — à envoyer", value: callDone, accent: callDone > 0 },
    {
      label: "En séquence",
      value: inSequence,
      accent: false,
      href: "/admin/crm/sequence",
    },
    {
      label: "Relances",
      value: inSequence,
      accent: false,
      href: "/admin/crm/relances",
    },
    { label: "Convertis", value: converted, accent: false },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">
            CRM
          </h1>
          <p className="mt-2 max-w-lg text-sm text-admin-muted">
            Meilleurs prospects du jour, triés par pertinence. Clique une
            compagnie pour voir ses contacts TI et envoyer l&apos;info Techno Lot.
          </p>
        </div>
        <div
          className="shrink-0 rounded-2xl border border-admin-line bg-admin-card px-4 py-3 sm:max-w-xs sm:text-right"
          role="note"
          aria-label="Rappel motivation"
        >
          <p className="flex items-center justify-center gap-2 font-display text-sm font-bold text-admin-ink sm:justify-end sm:text-base">
            <DollarSign className="h-4 w-4 text-admin-green" aria-hidden />
            <span>
              Pick up the phone
              <br />
              and start dialing
            </span>
            <PhoneCall className="h-4 w-4 text-admin-green" aria-hidden />
          </p>
        </div>
      </header>

      {ref && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Impossible de charger les données. Réf. : {ref}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {kpis.map((k) => {
          const inner = (
            <>
              <p
                className={`text-[13px] font-medium leading-snug ${
                  k.accent ? "text-admin-ink" : "text-admin-muted"
                }`}
              >
                {k.label}
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums text-admin-ink sm:text-4xl">
                {k.value}
              </p>
            </>
          );
          return k.href ? (
            <Link
              key={k.label}
              href={k.href}
              className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                k.accent
                  ? "border-[#6bd63b] bg-[#6bd63b] hover:bg-[#62c936]"
                  : "border-admin-line bg-admin-card hover:border-admin-tint-green-line"
              }`}
            >
              {inner}
            </Link>
          ) : (
            <div
              key={k.label}
              className={`rounded-2xl border p-4 sm:p-5 ${
                k.accent ? "border-[#6bd63b] bg-[#6bd63b]" : "border-admin-line bg-admin-card"
              }`}
            >
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <CompaniesFilters regions={regions} />
        </div>
        <AddCompanyButton />
      </div>

      <p className="mb-3 text-[13px] text-admin-muted">
        {companies.length} compagnie{companies.length > 1 ? "s" : ""}
        {!includePartners && " (partenaires masqués)"}
      </p>

      <CompaniesTable companies={companiesPage} contactCounts={contactCounts} />

      {pagination.total > 0 && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <Pagination page={pagination.page} pageCount={pagination.pageCount} scroll={false} />
          <p className="text-[13px] tabular-nums text-admin-muted">
            {resumePage(pagination.page, PAR_PAGE, pagination.total)} compagnies
          </p>
        </div>
      )}
    </div>
  );
}
