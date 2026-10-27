import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Phone,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

export default async function CompanyPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4f5a52] transition-colors hover:text-[#0a0a0a]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-8 mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <FitScoreBadge score={company.fit_score} />
            <h1 className="font-display text-2xl font-bold text-[#0a0a0a] sm:text-3xl">
              {company.name}
            </h1>
            {company.is_partner_not_client && (
              <span className="inline-flex items-center rounded-full bg-[#f4f1fe] px-2.5 py-1 text-xs font-medium text-[#5b3fb8]">
                Partenaire potentiel
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-[#eef1ec] px-2.5 py-1 text-xs font-medium text-[#4f5a52]">
              {RESEARCH_STATUS_LABELS[company.research_status]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[#4f5a52]">
            {facts.map(({ icon: Icon, value, href }, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[#4f5a52]" aria-hidden />
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:text-[#257a10] hover:underline"
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
                <div className="inline-flex items-start gap-2 rounded-xl bg-[#fff6ed] px-3.5 py-2.5">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b54708]" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold text-[#b54708]">
                      Signal d&apos;achat
                    </p>
                    <p className="text-sm text-[#93370d]">{company.buying_signal}</p>
                  </div>
                </div>
              )}
              {company.next_action && (
                <div className="inline-flex items-start gap-2 rounded-xl bg-[#eaf6e3] px-3.5 py-2.5">
                  <p className="text-sm text-[#0a0a0a]">
                    <span className="block text-xs font-semibold text-[#257a10]">
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
            <h2 className="font-display text-lg font-semibold text-[#0a0a0a]">
              Contacts TI{" "}
              <span className="text-sm font-normal text-[#4f5a52]">
                ({contacts.length})
              </span>
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {contacts.length === 0 && (
              <div className="glass p-8 text-center">
                <p className="text-sm text-[#4f5a52]">
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

        {/* Historique */}
        <section className="min-w-0">
          <h2 className="mb-4 font-display text-lg font-semibold text-[#0a0a0a]">
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
  );
}
