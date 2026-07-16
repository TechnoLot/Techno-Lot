import Link from "next/link";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CompaniesFilters from "@/components/admin/crm/CompaniesFilters";
import CompaniesTable from "@/components/admin/crm/CompaniesTable";
import FollowupDoneButton from "@/components/admin/crm/FollowupDoneButton";
import {
  LEAD_STATUS_LABELS,
  followupOverdueDays,
  type Company,
  type Contact,
} from "@/lib/crm/types";

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
    partenaires?: string;
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
  const includePartners = searchParams.partenaires === "1";

  const companies = all.filter((c) => {
    if (!includePartners && c.is_partner_not_client) return false;
    if (q && !`${c.name} ${c.domain ?? ""} ${c.industry ?? ""}`.toLowerCase().includes(q))
      return false;
    if (minScore && (c.fit_score ?? 0) < minScore) return false;
    if (region && c.region !== region) return false;
    if (status && c.research_status !== status) return false;
    return true;
  });

  const regions = Array.from(
    new Set(all.map((c) => c.region).filter((r): r is string => !!r)),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const contactCounts: Record<string, number> = {};
  for (const c of contacts) {
    if (c.company_id) {
      contactCounts[c.company_id] = (contactCounts[c.company_id] ?? 0) + 1;
    }
  }

  // Rappels de suivi : leads contactés (≥ 7 j) ou intéressés (≥ 3 j) sans
  // changement de statut depuis — triés du plus en retard au moins en retard.
  const dueFollowups = all
    .filter((c) => !c.is_partner_not_client)
    .map((c) => ({ company: c, overdue: followupOverdueDays(c) }))
    .filter((x): x is { company: Company; overdue: number } => x.overdue !== null)
    .sort(
      (a, b) =>
        b.overdue - a.overdue ||
        (b.company.lead_status === "interested" ? 1 : 0) -
          (a.company.lead_status === "interested" ? 1 : 0),
    );

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

      {/* Notifications de suivi : contacté ≥ 7 j / intéressé ≥ 3 j */}
      {dueFollowups.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-300" aria-hidden />
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-amber-200">
              {dueFollowups.length} suivi{dueFollowups.length > 1 ? "s" : ""} à
              faire
            </p>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {dueFollowups.slice(0, 8).map(({ company: c, overdue }) => (
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
                    {overdue === 0
                      ? "suivi dû aujourd'hui"
                      : `en retard de ${overdue} jour${overdue > 1 ? "s" : ""}`}
                  </span>
                  {c.main_phone && (
                    <span className="text-xs text-slate-400">{c.main_phone}</span>
                  )}
                </Link>
                <FollowupDoneButton companyId={c.id} status={c.lead_status} />
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
        </div>
      )}

      <div className="mb-4">
        <CompaniesFilters regions={regions} />
      </div>

      <p className="mb-3 text-xs text-slate-500">
        {companies.length} compagnie{companies.length > 1 ? "s" : ""}
        {!includePartners && " (partenaires masqués)"}
      </p>

      <CompaniesTable companies={companies} contactCounts={contactCounts} />
    </div>
  );
}
