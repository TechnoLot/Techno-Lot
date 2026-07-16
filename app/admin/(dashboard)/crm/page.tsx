import Link from "next/link";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CompaniesFilters from "@/components/admin/crm/CompaniesFilters";
import CompaniesTable from "@/components/admin/crm/CompaniesTable";
import FollowupDoneButton from "@/components/admin/crm/FollowupDoneButton";
import {
  LEAD_STATUS_LABELS,
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

function formatFollowupDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso + "T00:00:00"));
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

  const companies = all.filter((c) => {
    if (!includePartners && c.is_partner_not_client) return false;
    if (q && !`${c.name} ${c.domain ?? ""} ${c.industry ?? ""}`.toLowerCase().includes(q))
      return false;
    if (minScore && (c.fit_score ?? 0) < minScore) return false;
    if (region && c.region !== region) return false;
    if (status && c.research_status !== status) return false;
    if (suivi && c.lead_status !== suivi) return false;
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

  // Rappels de suivi, deux sources :
  // 1. date planifiée (next_followup_on — saisie ou détectée dans la note) ;
  // 2. délai après changement de statut (contacté ≥ 7 j, intéressé ≥ 3 j).
  // Triés du plus en retard au moins en retard.
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
  }).format(new Date());

  type Followup = { company: Company; overdue: number; plannedOn: string | null };
  const dueFollowups: Followup[] = [];
  const upcomingFollowups: { company: Company; plannedOn: string }[] = [];

  for (const c of all) {
    if (c.is_partner_not_client) continue;
    const planned = c.next_followup_on;
    if (planned && planned > todayIso) {
      upcomingFollowups.push({ company: c, plannedOn: planned });
      continue;
    }
    const noteOverdue = planned ? daysSince(planned + "T00:00:00") : null;
    const statusOverdue = followupOverdueDays(c);
    if (noteOverdue === null && statusOverdue === null) continue;
    dueFollowups.push({
      company: c,
      overdue: Math.max(noteOverdue ?? 0, statusOverdue ?? 0),
      plannedOn: planned,
    });
  }
  dueFollowups.sort(
    (a, b) =>
      b.overdue - a.overdue ||
      (b.company.lead_status === "interested" ? 1 : 0) -
        (a.company.lead_status === "interested" ? 1 : 0),
  );
  upcomingFollowups.sort((a, b) => a.plannedOn.localeCompare(b.plannedOn));

  // Mini-KPIs du matin
  const callDone = contacts.filter((c) => c.stage === "call_done").length;
  const inSequence = contacts.filter((c) => c.stage === "sequence_active").length;
  const converted = contacts.filter((c) => c.stage === "converted").length;

  const kpis = [
    { label: "Suivis à faire", value: dueFollowups.length, accent: dueFollowups.length > 0 },
    { label: "Appels faits — à envoyer", value: callDone, accent: callDone > 0 },
    { label: "En séquence", value: inSequence, accent: false },
    { label: "Convertis", value: converted, accent: false },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="mb-8">
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
        {kpis.map((k) => (
          <div key={k.label} className="glass p-5">
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
          </div>
        ))}
      </div>

      {/* Notifications de suivi : date planifiée (note) ou délai de statut */}
      {(dueFollowups.length > 0 || upcomingFollowups.length > 0) && (
        <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-300" aria-hidden />
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-amber-200">
              {dueFollowups.length > 0
                ? `${dueFollowups.length} suivi${dueFollowups.length > 1 ? "s" : ""} à faire`
                : "Suivis planifiés"}
            </p>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {dueFollowups.slice(0, 8).map(({ company: c, overdue, plannedOn }) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:border-amber-400/40 hover:bg-white/[0.04]"
              >
                <Link
                  href={`/admin/crm/${c.id}`}
                  className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1"
                >
                  <span className="text-sm font-medium text-white group-hover:text-amber-100">
                    {c.name}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      c.lead_status === "interested"
                        ? "border-accent/40 bg-accent/15 text-accent-bright"
                        : "border-sky-400/30 bg-sky-400/10 text-sky-200"
                    }`}
                  >
                    {LEAD_STATUS_LABELS[c.lead_status]}
                  </span>
                  <span className="text-xs text-amber-200/80">
                    {plannedOn
                      ? overdue === 0
                        ? "à rappeler aujourd'hui"
                        : `à rappeler depuis ${formatFollowupDate(plannedOn)} (${overdue} j de retard)`
                      : overdue === 0
                        ? "suivi dû aujourd'hui"
                        : `en retard de ${overdue} jour${overdue > 1 ? "s" : ""}`}
                  </span>
                  {c.main_phone && (
                    <span className="text-xs text-slate-400">{c.main_phone}</span>
                  )}
                </Link>
                <FollowupDoneButton companyId={c.id} />
              </li>
            ))}
          </ul>
          {dueFollowups.length > 8 && (
            <p className="mt-2 text-xs text-amber-200/70">
              + {dueFollowups.length - 8} autre
              {dueFollowups.length - 8 > 1 ? "s" : ""} — mets à jour les statuts
              pour faire redescendre la liste.
            </p>
          )}

          {/* Rappels planifiés à venir (note datée ou date manuelle) */}
          {upcomingFollowups.length > 0 && (
            <div className="mt-4 border-t border-amber-400/15 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/60">
                À venir
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {upcomingFollowups.slice(0, 5).map(({ company: c, plannedOn }) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/crm/${c.id}`}
                      className="group inline-flex flex-wrap items-center gap-x-2 text-xs text-slate-400 hover:text-amber-100"
                    >
                      <span className="font-medium text-slate-300 group-hover:text-amber-100">
                        {c.name}
                      </span>
                      <span>— {formatFollowupDate(plannedOn)}</span>
                    </Link>
                  </li>
                ))}
                {upcomingFollowups.length > 5 && (
                  <li className="text-xs text-amber-200/60">
                    + {upcomingFollowups.length - 5} autre
                    {upcomingFollowups.length - 5 > 1 ? "s" : ""}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

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
