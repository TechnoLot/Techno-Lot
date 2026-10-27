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
        <h1 className="font-display text-3xl font-bold text-[#0a0a0a] sm:text-4xl">
          Suivis à faire
        </h1>
        <p className="mt-2 max-w-lg text-sm text-[#4f5a52]">
          Leads à rappeler aujourd&apos;hui — date planifiée dans une note,
          ou délai après contact (intéressé ≥ 3 j, contacté ≥ 7 j).
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-[#f4c7c3] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]"
        >
          Impossible de charger les données : {error.message}
        </div>
      )}

      {dueFollowups.length === 0 && upcomingFollowups.length === 0 ? (
        <div className="glass p-12 text-center">
          <BellRing className="mx-auto h-8 w-8 text-[#5f6b62]" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-[#0a0a0a]">
            Aucun suivi à faire
          </p>
          <p className="mt-2 text-sm text-[#4f5a52]">
            Marque un lead comme « Contacté » ou « Intéressé » — ou écris une
            note comme « à rappeler lundi » — pour planifier un rappel.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#e3eadf] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[#b54708]" aria-hidden />
            <p className="font-display text-lg font-semibold text-[#0a0a0a]">
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
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e3eadf] bg-white px-3.5 py-3 transition-colors hover:border-[#c9d6c3] hover:bg-[#f8faf6]"
                >
                  <Link
                    href={`/admin/crm/${c.id}`}
                    className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1"
                  >
                    <span className="text-[15px] font-semibold text-[#0a0a0a] group-hover:text-[#257a10]">
                      {c.name}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        c.lead_status === "interested"
                          ? "border-transparent bg-[#e2f3d8] text-[#257a10]"
                          : "border-transparent bg-[#eff6ff] text-[#175cd3]"
                      }`}
                    >
                      {LEAD_STATUS_LABELS[c.lead_status]}
                    </span>
                    <span className="text-[13px] font-medium text-[#b54708]">
                      {plannedOn
                        ? overdue === 0
                          ? "à rappeler aujourd'hui"
                          : `à rappeler depuis ${formatFollowupDate(plannedOn)} (${overdue} j de retard)`
                        : overdue === 0
                          ? "suivi dû aujourd'hui"
                          : `en retard de ${overdue} jour${overdue > 1 ? "s" : ""}`}
                    </span>
                    {c.main_phone && (
                      <span className="text-[13px] text-[#4f5a52]">{c.main_phone}</span>
                    )}
                  </Link>
                  <FollowupDoneButton companyId={c.id} />
                </li>
              ))}
            </ul>
          )}

          {upcomingFollowups.length > 0 && (
            <div
              className={`${dueFollowups.length > 0 ? "mt-5 border-t border-[#edf2ea] pt-4" : "mt-3"}`}
            >
              <p className="text-sm font-semibold text-[#0a0a0a]">
                À venir
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {upcomingFollowups.map(({ company: c, plannedOn }) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/crm/${c.id}`}
                      className="group inline-flex flex-wrap items-center gap-x-2 text-[13px] text-[#4f5a52] hover:text-[#257a10]"
                    >
                      <span className="font-medium text-[#0a0a0a] group-hover:text-[#257a10]">
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
