import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Globe,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dateLongue, echapperLike, type CertificatDestruction } from "@/lib/admin/destruction";
import FitScoreBadge from "@/components/admin/crm/FitScoreBadge";
import LeadQuickActions from "@/components/admin/crm/LeadQuickActions";
import ContactCard from "@/components/admin/crm/ContactCard";
import AddContactForm from "@/components/admin/crm/AddContactForm";
import ActivityTimeline from "@/components/admin/crm/ActivityTimeline";
import DeleteCompanyButton from "@/components/admin/crm/DeleteCompanyButton";
import {
  RESEARCH_STATUS_LABELS,
  type Company,
  type Contact,
  type OutreachActivity,
} from "@/lib/crm/types";

export const dynamic = "force-dynamic";

export default async function CompanyPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: companyRaw } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!companyRaw) notFound();
  const company = companyRaw as Company;

  const { data: contactsRaw } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", company.id)
    .order("contact_priority")
    .order("created_at");
  const contacts = (contactsRaw ?? []) as Contact[];

  let activities: OutreachActivity[] = [];
  if (contacts.length > 0) {
    const { data: actsRaw } = await supabase
      .from("outreach_activities")
      .select("*")
      .in(
        "contact_id",
        contacts.map((c) => c.id),
      )
      .order("occurred_at", { ascending: false })
      .limit(50);
    activities = (actsRaw ?? []) as OutreachActivity[];
  }

  const contactsById = Object.fromEntries(contacts.map((c) => [c.id, c]));

  // Certificats de destruction remis à ce client : liés à la fiche, ou émis à
  // son nom exact avant que la fiche existe (sans autre lien).
  const colonnes = "id, numero, nb_appareils, date_destruction";
  const [parLien, parNom] = await Promise.all([
    supabase.from("certificats_destruction").select(colonnes).eq("company_id", company.id),
    supabase
      .from("certificats_destruction")
      .select(colonnes)
      .is("company_id", null)
      .ilike("compagnie", echapperLike(company.name)),
  ]);
  type CertificatFiche = Pick<CertificatDestruction, "id" | "numero" | "nb_appareils" | "date_destruction">;
  const certificats = [...((parLien.data ?? []) as CertificatFiche[]), ...((parNom.data ?? []) as CertificatFiche[])].sort(
    (a, b) => b.date_destruction.localeCompare(a.date_destruction) || b.numero.localeCompare(a.numero),
  );

  const addressValue = [company.street_address, company.region].filter(Boolean).join(" · ");
  const mapsQuery = [company.name, company.street_address, company.region].filter(Boolean).join(", ");
  const facts = [
    {
      icon: MapPin,
      value: addressValue,
      href: mapsQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
        : null,
    },
    { icon: Phone, value: company.main_phone },
    {
      icon: Globe,
      value: company.domain,
      href: company.domain ? `https://${company.domain.replace(/^https?:\/\//, "")}` : null,
    },
    { icon: Building2, value: company.industry },
    {
      icon: Users,
      value:
        company.size_estimate_label ??
        (company.employee_count != null ? `${company.employee_count} employés` : null),
    },
  ].filter((f) => f.value);

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <Link
        href="/admin/crm"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-8 mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <FitScoreBadge score={company.fit_score} />
            <h1 className="font-display text-2xl font-bold text-admin-ink sm:text-3xl">
              {company.name}
            </h1>
            {company.is_partner_not_client && (
              <span className="inline-flex items-center rounded-full bg-admin-tint-violet px-2.5 py-1 text-xs font-medium text-admin-tint-violet-ink">
                Partenaire potentiel
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-admin-tint-gray px-2.5 py-1 text-xs font-medium text-admin-muted">
              {RESEARCH_STATUS_LABELS[company.research_status]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-admin-muted">
            {facts.map(({ icon: Icon, value, href }, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-admin-muted" aria-hidden />
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:text-admin-green hover:underline"
                  >
                    {value}
                  </a>
                ) : (
                  value
                )}
              </span>
            ))}
          </div>

          {(company.buying_signal || company.next_action) && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {company.buying_signal && (
                <div className="inline-flex items-start gap-2 rounded-xl bg-admin-tint-amber px-3.5 py-2.5">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-admin-warning" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold text-admin-warning">
                      Signal d&apos;achat
                    </p>
                    <p className="text-sm text-admin-tint-amber-ink">{company.buying_signal}</p>
                  </div>
                </div>
              )}
              {company.next_action && (
                <div className="inline-flex items-start gap-2 rounded-xl bg-admin-tint-green px-3.5 py-2.5">
                  <p className="text-sm text-admin-ink">
                    <span className="block text-xs font-semibold text-admin-green">
                      Prochaine action
                    </span>
                    {company.next_action}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Suivi rapide du lead : statut + note libre */}
          <div className="mt-4">
            <LeadQuickActions
              companyId={company.id}
              status={company.lead_status}
              notes={company.notes}
              followupOn={company.next_followup_on}
            />
          </div>
        </div>

        <DeleteCompanyButton
          companyId={company.id}
          companyName={company.name}
          hasConvertedContacts={contacts.some((c) => c.lot_id !== null)}
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contacts */}
        <section className="min-w-0 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-admin-ink">
              Contacts TI{" "}
              <span className="text-sm font-normal text-admin-muted">
                ({contacts.length})
              </span>
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {contacts.length === 0 && (
              <div className="glass p-8 text-center">
                <p className="text-sm text-admin-muted">
                  Aucun contact pour cette compagnie. Ajoute le responsable TI
                  trouvé (LinkedIn, site web, appel à la réception).
                </p>
              </div>
            )}
            {contacts.map((c) => (
              <ContactCard key={c.id} contact={c} />
            ))}
            <AddContactForm companyId={company.id} />
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Certificats de destruction des données remis au client */}
          <section className="flex flex-col gap-3">
            <h2 className="mb-1 font-display text-lg font-semibold text-admin-ink">
              Certificats de destruction{" "}
              <span className="text-sm font-normal text-admin-muted">
                ({certificats.length})
              </span>
            </h2>
            <div className="glass overflow-hidden">
              {certificats.length === 0 ? (
                <p className="p-5 text-sm text-admin-muted">
                  Aucun certificat remis à ce client pour l&apos;instant.
                </p>
              ) : (
                <ul className="divide-y divide-admin-line">
                  {certificats.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/admin/destruction-donnees?certificat=${c.id}`}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-admin-subtle"
                      >
                        <ShieldCheck className="h-4 w-4 shrink-0 text-admin-green" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-sm font-semibold text-admin-ink">
                            {c.numero}
                          </span>
                          <span className="block text-xs text-admin-muted">
                            {c.nb_appareils} appareil{c.nb_appareils > 1 ? "s" : ""} ·{" "}
                            {dateLongue(c.date_destruction)}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-admin-faint transition-colors group-hover:text-admin-ink"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              href={`/admin/destruction-donnees?client=${company.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-admin-line-strong bg-admin-card px-5 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Nouveau certificat
            </Link>
          </section>

          {/* Historique */}
          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-admin-ink">
              Historique
            </h2>
            <div className="glass p-5">
              <ActivityTimeline
                activities={activities}
                contactsById={contactsById}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
