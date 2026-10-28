import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVITY_LABELS,
  contactName,
  daysSince,
  type ActivityType,
  type Company,
  type Contact,
  type OutreachActivity,
} from "@/lib/crm/types";

export const dynamic = "force-dynamic";

/** Activités d'envoi de courriel (le reste n'est pas pertinent ici). */
const SEND_TYPES: ActivityType[] = [
  "intro_email_sent",
  "followup_sent",
  "sequence_step",
];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  }).format(new Date(iso));
}

/**
 * Vue « En séquence » : tous les contacts au stage `sequence_active` avec
 * l'historique de leurs envois (intro + relances) et la date exacte.
 * Trié par date du dernier envoi décroissante — les plus vieux remontent
 * en haut pour repérer qui a besoin d'une relance.
 */
export default async function SequencePage() {
  const supabase = createClient();

  const { data: contactsRaw, error: contactsError } = await supabase
    .from("contacts")
    .select("*, companies(*)")
    .eq("stage", "sequence_active")
    .is("unsubscribed_at", null);

  const contacts = (contactsRaw ?? []) as (Contact & { companies: Company | null })[];

  let activities: OutreachActivity[] = [];
  if (contacts.length > 0) {
    const { data: actsRaw } = await supabase
      .from("outreach_activities")
      .select("*")
      .in(
        "contact_id",
        contacts.map((c) => c.id),
      )
      .in("activity_type", SEND_TYPES)
      .order("occurred_at", { ascending: false });
    activities = (actsRaw ?? []) as OutreachActivity[];
  }

  // Regroupe les envois par contact et calcule la date du dernier envoi
  // pour trier la liste.
  const byContact = new Map<string, OutreachActivity[]>();
  for (const a of activities) {
    const arr = byContact.get(a.contact_id) ?? [];
    arr.push(a);
    byContact.set(a.contact_id, arr);
  }

  const rows = contacts
    .map((c) => {
      const sends = byContact.get(c.id) ?? [];
      const lastAt = sends[0]?.occurred_at ?? null;
      return { contact: c, sends, lastAt };
    })
    .sort((a, b) => {
      // Contacts avec envois d'abord, plus anciens en haut
      if (a.lastAt && b.lastAt) return a.lastAt.localeCompare(b.lastAt);
      if (a.lastAt) return -1;
      if (b.lastAt) return 1;
      return 0;
    });

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <Link
        href="/admin/crm"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">
          En séquence
        </h1>
        <p className="mt-2 max-w-lg text-sm text-admin-muted">
          Contacts qui ont reçu au moins un courriel de prospection. Trié du
          plus vieux envoi au plus récent — remonte en haut pour repérer
          qui attend une relance.
        </p>
      </header>

      {contactsError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Impossible de charger les données : {contactsError.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="glass p-12 text-center">
          <Mail className="mx-auto h-8 w-8 text-admin-faint" aria-hidden />
          <p className="mt-3 text-sm text-admin-muted">
            Aucun contact en séquence pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-admin-muted">
            Envoie un courriel « info Techno Lot » ou « cold outreach » à un
            contact pour le voir apparaître ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ contact, sends, lastAt }) => {
            const days = lastAt ? daysSince(lastAt) : null;
            const isStale = days !== null && days >= 5;
            return (
              <div key={contact.id} className="glass p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link
                        href={
                          contact.company_id
                            ? `/admin/crm/${contact.company_id}`
                            : "/admin/crm"
                        }
                        className="font-display text-base font-semibold text-admin-ink hover:text-admin-green"
                      >
                        {contactName(contact)}
                      </Link>
                      {contact.companies?.name && (
                        <span className="text-sm text-admin-muted">
                          — {contact.companies.name}
                        </span>
                      )}
                    </div>
                    {contact.title && (
                      <p className="mt-0.5 text-xs text-admin-muted">
                        {contact.title}
                      </p>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="mt-0.5 inline-block text-xs text-admin-muted hover:text-admin-green"
                      >
                        {contact.email}
                      </a>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-[13px] text-admin-muted">
                      Dernier envoi
                    </p>
                    <p
                      className={`mt-0.5 font-display text-base font-semibold ${
                        isStale ? "text-admin-warning" : "text-admin-ink"
                      }`}
                    >
                      {days !== null
                        ? days === 0
                          ? "aujourd'hui"
                          : `il y a ${days} j`
                        : "—"}
                    </p>
                  </div>
                </div>

                {sends.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-admin-line-soft bg-admin-subtle px-3 py-2 text-xs text-admin-muted">
                    Aucun envoi journalisé. Le contact est marqué « en
                    séquence » mais aucune activité n&apos;a été enregistrée.
                  </p>
                ) : (
                  <ol className="mt-4 flex flex-col gap-2 border-t border-admin-line-soft pt-3">
                    {sends.map((s) => {
                      const label =
                        s.activity_type === "followup_sent" && s.sequence_step
                          ? `Relance ${s.sequence_step}`
                          : s.activity_type === "intro_email_sent"
                            ? "Intro / Cold outreach"
                            : ACTIVITY_LABELS[s.activity_type];
                      return (
                        <li
                          key={s.id}
                          className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                        >
                          <div className="flex min-w-0 items-baseline gap-2">
                            <Send
                              className="h-3 w-3 shrink-0 text-admin-green"
                              aria-hidden
                            />
                            <span className="font-medium text-admin-ink">
                              {label}
                            </span>
                            {s.subject && (
                              <span className="truncate text-xs text-admin-muted">
                                — {s.subject}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-admin-muted">
                            {formatDateTime(s.occurred_at)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
