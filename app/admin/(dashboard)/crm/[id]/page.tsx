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
import ContactCard from "@/components/admin/crm/ContactCard";
import AddContactForm from "@/components/admin/crm/AddContactForm";
import ActivityTimeline from "@/components/admin/crm/ActivityTimeline";
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

  const facts = [
    { icon: MapPin, value: [company.street_address, company.region].filter(Boolean).join(" · ") },
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-accent-bright"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-8 mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <FitScoreBadge score={company.fit_score} />
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {company.name}
            </h1>
            {company.is_partner_not_client && (
              <span className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                Partenaire potentiel
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {RESEARCH_STATUS_LABELS[company.research_status]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-400">
            {facts.map(({ icon: Icon, value, href }, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent-bright"
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
                <div className="inline-flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
                      Signal d&apos;achat
                    </p>
                    <p className="text-sm text-amber-100/90">{company.buying_signal}</p>
                  </div>
                </div>
              )}
              {company.next_action && (
                <div className="inline-flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3.5 py-2.5">
                  <p className="text-sm text-slate-200">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent">
                      Prochaine action
                    </span>
                    {company.next_action}
                  </p>
                </div>
              )}
            </div>
          )}

          {company.notes && (
            <p className="mt-4 max-w-2xl rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
              {company.notes}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contacts */}
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">
              Contacts TI{" "}
              <span className="text-sm font-normal text-slate-500">
                ({contacts.length})
              </span>
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {contacts.length === 0 && (
              <div className="glass p-8 text-center">
                <p className="text-sm text-slate-400">
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
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
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
