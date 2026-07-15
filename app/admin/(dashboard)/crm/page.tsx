import { createClient } from "@/lib/supabase/server";
import CompaniesFilters from "@/components/admin/crm/CompaniesFilters";
import CompaniesTable from "@/components/admin/crm/CompaniesTable";
import type { Company, Contact } from "@/lib/crm/types";

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

  // Mini-KPIs du matin
  const excellent = all.filter(
    (c) => !c.is_partner_not_client && (c.fit_score ?? 0) >= 9,
  ).length;
  const callDone = contacts.filter((c) => c.stage === "call_done").length;
  const inSequence = contacts.filter((c) => c.stage === "sequence_active").length;
  const converted = contacts.filter((c) => c.stage === "converted").length;

  const kpis = [
    { label: "Cibles 9-10", value: excellent, accent: true },
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
