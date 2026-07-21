import Link from "next/link";
import { DollarSign, PhoneCall } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CompaniesFilters from "@/components/admin/crm/CompaniesFilters";
import CompaniesTable from "@/components/admin/crm/CompaniesTable";
import {
  daysSince,
  followupOverdueDays,
  type Company,
  type Contact,
} from "@/lib/crm/types";

/**
 * Mélange déterministe (Fisher-Yates + PRNG mulberry32 dérivé du seed) :
 * l'ordre reste le même tant qu'on ne relance pas le mélange, même si la
 * page se rafraîchit après une action.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const dynamic = "force-dynamic";

/**
 * Dashboard prospection : compagnies triées par fit_score décroissant,
 * filtres région / score min / statut de recherche, partenaires exclus
 * par défaut (case à cocher pour les inclure).
 */
export default async function CrmPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    score?: string;
    region?: string;
    status?: string;
    suivi?: string;
    partenaires?: string;
    appel?: string;
    ordre?: string;
    seed?: string;
  };
}) {
  const supabase = createClient();

  const [{ data: companiesRaw, error }, { data: contactsRaw }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .order("fit_score", { ascending: false, nullsFirst: false })
        .order("name"),
      supabase.from("contacts").select("id, company_id, stage"),
    ]);

  const all = (companiesRaw ?? []) as Company[];
  const contacts = (contactsRaw ?? []) as Pick<
    Contact,
    "id" | "company_id" | "stage"
  >[];

  // Filtres (appliqués en mémoire : ~100 lignes, pas la peine de multiplier
  // les requêtes)
  const q = searchParams.q?.toLowerCase().trim();
  const minScore = Number(searchParams.score) || null;
  const region = searchParams.region;
  const status = searchParams.status;
  const suivi = searchParams.suivi;
  const includePartners = searchParams.partenaires === "1";
  const appel = searchParams.appel;

  // Compagnies avec au moins un contact `call_done` (= appel logué)
  const companiesWithCall = new Set(
    contacts.filter((ct) => ct.stage === "call_done" && ct.company_id).map((ct) => ct.company_id!),
  );

  const companies = all.filter((c) => {
    if (!includePartners && c.is_partner_not_client) return false;
    if (q && !`${c.name} ${c.domain ?? ""} ${c.industry ?? ""}`.toLowerCase().includes(q))
      return false;
    if (minScore && (c.fit_score ?? 0) < minScore) return false;
    if (region && c.region !== region) return false;
    if (status && c.research_status !== status) return false;
    if (suivi && c.lead_status !== suivi) return false;
    if (appel === "oui" && !companiesWithCall.has(c.id)) return false;
    if (appel === "non" && companiesWithCall.has(c.id)) return false;
    return true;
  });

  // Ordre aléatoire demandé : on remplace le tri par score par un mélange
  // stable (seed dans l'URL, relancé par le bouton ↻).
  const companiesOrdered =
    searchParams.ordre === "aleatoire"
      ? seededShuffle(companies, searchParams.seed ?? "technolot")
      : companies;

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
    { label: "En séquence", value: inSequence, accent: false },
    { label: "Convertis", value: converted, accent: false },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            Prospection
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            CRM
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Meilleurs prospects du jour, triés par pertinence. Clique une
            compagnie pour voir ses contacts TI et envoyer l&apos;info Techno Lot.
          </p>
        </div>
        <div
          className="shrink-0 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 shadow-glow sm:max-w-xs sm:text-right"
          role="note"
          aria-label="Rappel motivation"
        >
          <p className="flex items-center justify-center gap-2 font-display text-sm font-black uppercase tracking-wider text-accent-bright sm:justify-end sm:text-base">
            <DollarSign className="h-4 w-4" aria-hidden />
            <span>
              Pick up the phone
              <br />
              and start dialing
            </span>
            <PhoneCall className="h-4 w-4" aria-hidden />
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          Impossible de charger les données : {error.message}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const inner = (
            <>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                {k.label}
              </p>
              <p
                className={`mt-2 font-display text-3xl font-bold tabular-nums ${
                  k.accent ? "text-accent-bright" : "text-white"
                }`}
              >
                {k.value}
              </p>
            </>
          );
          return k.href ? (
            <Link
              key={k.label}
              href={k.href}
              className="glass p-5 transition-colors hover:border-accent/40"
            >
              {inner}
            </Link>
          ) : (
            <div key={k.label} className="glass p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <CompaniesFilters regions={regions} />
      </div>

      <p className="mb-3 text-xs text-slate-500">
        {companies.length} compagnie{companies.length > 1 ? "s" : ""}
        {!includePartners && " (partenaires masqués)"}
      </p>

      <CompaniesTable companies={companiesOrdered} contactCounts={contactCounts} />
    </div>
  );
}
