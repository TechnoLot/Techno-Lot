import Link from "next/link";
import { ChevronRight, Globe, Handshake, Phone, Users } from "lucide-react";
import FitScoreBadge from "@/components/admin/crm/FitScoreBadge";
import LeadQuickActions from "@/components/admin/crm/LeadQuickActions";
import { RESEARCH_STATUS_LABELS, type Company } from "@/lib/crm/types";

export default function CompaniesTable({
  companies,
  contactCounts,
}: {
  companies: Company[];
  contactCounts: Record<string, number>;
}) {
  if (companies.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <p className="font-display text-lg font-semibold text-white">
          Aucune compagnie
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Aucun résultat pour ces critères. Ajuste les filtres.
        </p>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <Th>Score</Th>
              <Th>Compagnie</Th>
              <Th>Suivi</Th>
              <Th>Région</Th>
              <Th>Secteur</Th>
              <Th>Taille</Th>
              <Th>Signal d&apos;achat</Th>
              <Th>Prochaine action</Th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr
                key={c.id}
                className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              >
                <Td>
                  <RowLink id={c.id}>
                    <FitScoreBadge score={c.fit_score} />
                  </RowLink>
                </Td>
                <Td>
                  <RowLink id={c.id}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      {c.is_partner_not_client && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200"
                          title="MSP / intégrateur — partenaire potentiel, pas un client"
                        >
                          <Handshake className="h-3 w-3" aria-hidden />
                          Partenaire
                        </span>
                      )}
                    </div>
                    {c.street_address && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.street_address}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                      {c.main_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-500" aria-hidden />
                          {c.main_phone}
                        </span>
                      )}
                      {c.domain && (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3 text-slate-500" aria-hidden />
                          {c.domain}
                        </span>
                      )}
                      {(contactCounts[c.id] ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-accent-bright">
                          <Users className="h-3 w-3" aria-hidden />
                          {contactCounts[c.id]}
                        </span>
                      )}
                    </div>
                  </RowLink>
                </Td>
                <Td>
                  <LeadQuickActions
                    companyId={c.id}
                    status={c.lead_status}
                    notes={c.notes}
                    compact
                  />
                </Td>
                <Td>
                  <span className="text-sm text-slate-300 whitespace-nowrap">
                    {c.region ?? "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-sm text-slate-400">
                    {c.industry ?? "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-sm text-slate-400 whitespace-nowrap">
                    {c.size_estimate_label ??
                      (c.employee_count != null ? `${c.employee_count} empl.` : "—")}
                  </span>
                </Td>
                <Td>
                  {c.buying_signal ? (
                    <span className="inline-flex max-w-[220px] rounded-lg border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-xs leading-snug text-amber-100/90">
                      {c.buying_signal}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-600">—</span>
                  )}
                </Td>
                <Td>
                  {c.next_action ? (
                    <span className="block max-w-[220px] text-xs leading-snug text-slate-300">
                      {c.next_action}
                    </span>
                  ) : (
                    <span
                      className="text-xs text-slate-500"
                      title={RESEARCH_STATUS_LABELS[c.research_status]}
                    >
                      {RESEARCH_STATUS_LABELS[c.research_status]}
                    </span>
                  )}
                </Td>
                <Td>
                  <Link
                    href={`/admin/crm/${c.id}`}
                    aria-label={`Ouvrir ${c.name}`}
                    className="block"
                  >
                    <ChevronRight
                      className="h-4 w-4 text-slate-500 transition-colors group-hover:text-accent"
                      aria-hidden
                    />
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link href={`/admin/crm/${id}`} className="block">
      {children}
    </Link>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
