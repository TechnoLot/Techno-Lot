import Link from "next/link";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import FollowupDoneButton from "@/components/admin/crm/FollowupDoneButton";
import {
  LEAD_STATUS_LABELS,
  daysSince,
  followupOverdueDays,
  type Company,
} from "@/lib/crm/types";

export const dynamic = "force-dynamic";

function formatFollowupDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso + "T00:00:00"));
}

/**
 * Onglet dédié aux suivis à faire : rappels dus (date planifiée dans la
 * note, ou délai de statut : intéressé ≥ 3 j, contacté ≥ 7 j) + section
 * « À venir » pour les rappels futurs.
 */
export default async function SuivisPage() {
  const supabase = createClient();

  const { data: companiesRaw, error } = await supabase
    .from("companies")
    .select("*")
    .eq("is_partner_not_client", false);
  const all = (companiesRaw ?? []) as Company[];

  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
  }).format(new Date());

  type Followup = { company: Company; overdue: number; plannedOn: string | null };
  const dueFollowups: Followup[] = [];
  const upcomingFollowups: { company: Company; plannedOn: string }[] = [];

  for (const c of all) {
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

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="mb-8">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Prospection
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
          Suivis à faire
        </h1>
        <p className="mt-2 max-w-lg text-sm text-slate-400">
          Leads à rappeler aujourd&apos;hui — date planifiée dans une note,
          ou délai après contact (intéressé ≥ 3 j, contacté ≥ 7 j).
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

      {dueFollowups.length === 0 && upcomingFollowups.length === 0 ? (
        <div className="glass p-12 text-center">
          <BellRing className="mx-auto h-8 w-8 text-slate-600" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-white">
            Aucun suivi à faire
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Marque un lead comme « Contacté » ou « Intéressé » — ou écris une
            note comme « à rappeler lundi » — pour planifier un rappel.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-300" aria-hidden />
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-amber-200">
              {dueFollowups.length > 0
                ? `${dueFollowups.length} suivi${dueFollowups.length > 1 ? "s" : ""} à faire`
                : "Suivis planifiés"}
            </p>
          </div>

          {dueFollowups.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {dueFollowups.map(({ company: c, overdue, plannedOn }) => (
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
          )}

          {upcomingFollowups.length > 0 && (
            <div
              className={`${dueFollowups.length > 0 ? "mt-4 border-t border-amber-400/15 pt-3" : "mt-3"}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/60">
                À venir
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {upcomingFollowups.map(({ company: c, plannedOn }) => (
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
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
