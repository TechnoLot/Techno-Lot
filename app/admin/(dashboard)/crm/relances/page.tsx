import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import FollowupActions from "@/components/admin/crm/FollowupActions";
import VerifiedBadge from "@/components/admin/crm/VerifiedBadge";
import {
  contactName,
  type Company,
  type Contact,
  type OutreachActivity,
} from "@/lib/crm/types";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Suivi des relances : tous les contacts en séquence active, avec la date
 * du dernier envoi et les relances déjà faites. Triés du plus ancien envoi
 * au plus récent (les plus « dus » en premier).
 */
export default async function RelancesPage() {
  const supabase = await createClient();

  const { data: contactsRaw } = await supabase
    .from("contacts")
    .select("*, companies(id, name)")
    .eq("stage", "sequence_active")
    .is("unsubscribed_at", null);
  const contacts = (contactsRaw ?? []) as (Contact & {
    companies: Pick<Company, "id" | "name"> | null;
  })[];

  let activities: OutreachActivity[] = [];
  if (contacts.length > 0) {
    const { data: actsRaw } = await supabase
      .from("outreach_activities")
      .select("*")
      .in(
        "contact_id",
        contacts.map((c) => c.id),
      )
      .in("activity_type", ["intro_email_sent", "followup_sent"])
      .order("occurred_at", { ascending: false });
    activities = (actsRaw ?? []) as OutreachActivity[];
  }

  const rows = contacts
    .map((contact) => {
      const acts = activities.filter((a) => a.contact_id === contact.id);
      const lastSent = acts[0]?.occurred_at ?? null;
      const sentSteps = acts
        .filter((a) => a.activity_type === "followup_sent" && a.sequence_step)
        .map((a) => a.sequence_step as number);
      return { contact, lastSent, sentSteps: Array.from(new Set(sentSteps)) };
    })
    .sort((a, b) => {
      const ta = a.lastSent ? new Date(a.lastSent).getTime() : 0;
      const tb = b.lastSent ? new Date(b.lastSent).getTime() : 0;
      return ta - tb;
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
          Relances
        </h1>
        <p className="mt-2 max-w-lg text-sm text-admin-muted">
          Contacts en séquence active, les plus anciens envois en premier.
          Déclenche les relances 1, 2, 3 manuellement.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="font-display text-lg font-semibold text-admin-ink">
            Aucune séquence active
          </p>
          <p className="mt-2 text-sm text-admin-muted">
            Les contacts apparaissent ici après l&apos;envoi de l&apos;email
            d&apos;intro post-appel.
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-line-soft">
                  <Th>Contact</Th>
                  <Th>Compagnie</Th>
                  <Th>Dernier envoi</Th>
                  <Th align="right">Relances</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ contact, lastSent, sentSteps }) => {
                  const days = lastSent ? daysSince(lastSent) : null;
                  return (
                    <tr
                      key={contact.id}
                      className="border-b border-admin-line-soft last:border-b-0 hover:bg-admin-subtle"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-admin-ink">
                          {contactName(contact)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-admin-muted">
                          {contact.email ?? "Pas de courriel"}
                          {contact.email && (
                            <VerifiedBadge verified={contact.email_verified} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {contact.companies ? (
                          <Link
                            href={`/admin/crm/${contact.companies.id}`}
                            className="text-sm text-admin-ink hover:text-admin-green"
                          >
                            {contact.companies.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-admin-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lastSent ? (
                          <>
                            <p className="text-sm text-admin-ink whitespace-nowrap">
                              {formatDate(lastSent)}
                            </p>
                            <p
                              className={`text-xs ${
                                days != null && days >= 7
                                  ? "font-semibold text-admin-warning"
                                  : "text-admin-muted"
                              }`}
                            >
                              il y a {days} jour{days !== 1 ? "s" : ""}
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-admin-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FollowupActions
                          contactId={contact.id}
                          sentSteps={sentSteps}
                          disabled={!contact.email}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-[13px] font-medium text-admin-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
