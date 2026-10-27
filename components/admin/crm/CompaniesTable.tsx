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
        <p className="font-display text-lg font-semibold text-[#0a0a0a]">
          Aucune compagnie
        </p>
        <p className="mt-2 text-sm text-[#4f5a52]">
          Aucun résultat pour ces critères. Ajuste les filtres.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile : liste de cartes */}
      <ul className="glass divide-y divide-[#edf2ea] overflow-hidden md:hidden">
        {companies.map((c) => (
          <li key={c.id} className="px-4 py-3.5">
            <Link
              href={`/admin/crm/${c.id}`}
              className="flex items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b]"
            >
              <FitScoreBadge score={c.fit_score} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-semibold text-[#0a0a0a]">
                    {c.name}
                  </p>
                  {c.is_partner_not_client && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f4f1fe] px-2 py-0.5 text-xs font-medium text-[#5b3fb8]">
                      <Handshake className="h-3 w-3" aria-hidden />
                      Partenaire
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[13px] text-[#4f5a52]">
                  {[c.region, c.industry].filter(Boolean).join(" · ") || "—"}
                </p>
                {c.buying_signal && (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#93370d]">
                    {c.buying_signal}
                  </p>
                )}
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#5f6b62]" aria-hidden />
            </Link>
            <div className="mt-2.5 pl-10">
              <LeadQuickActions
                companyId={c.id}
                status={c.lead_status}
                notes={c.notes}
                followupOn={c.next_followup_on}
                compact
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop : tableau */}
    <div className="glass hidden overflow-hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#edf2ea]">
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
                className="group border-b border-[#edf2ea] transition-colors last:border-b-0 hover:bg-[#f8faf6]"
              >
                <Td>
                  <RowLink id={c.id}>
                    <FitScoreBadge score={c.fit_score} />
                  </RowLink>
                </Td>
                <Td>
                  <RowLink id={c.id}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#0a0a0a]">{c.name}</p>
                      {c.is_partner_not_client && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-[#f4f1fe] px-2 py-0.5 text-xs font-medium text-[#5b3fb8]"
                          title="MSP / intégrateur — partenaire potentiel, pas un client"
                        >
                          <Handshake className="h-3 w-3" aria-hidden />
                          Partenaire
                        </span>
                      )}
                    </div>
                    {c.street_address && (
                      <p className="mt-0.5 text-xs text-[#4f5a52]">
                        {c.street_address}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#4f5a52]">
                      {c.main_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[#4f5a52]" aria-hidden />
                          {c.main_phone}
                        </span>
                      )}
                      {c.domain && (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3 text-[#4f5a52]" aria-hidden />
                          {c.domain}
                        </span>
                      )}
                      {(contactCounts[c.id] ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[#257a10]">
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
                    followupOn={c.next_followup_on}
                    compact
                  />
                </Td>
                <Td>
                  <span className="text-sm text-[#0a0a0a] whitespace-nowrap">
                    {c.region ?? "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-sm text-[#4f5a52]">
                    {c.industry ?? "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-sm text-[#4f5a52] whitespace-nowrap">
                    {c.size_estimate_label ??
                      (c.employee_count != null ? `${c.employee_count} empl.` : "—")}
                  </span>
                </Td>
                <Td>
                  {c.buying_signal ? (
                    <span className="inline-flex max-w-[220px] rounded-lg border border-[#f9dbaf] bg-[#fffaf3] px-2 py-1 text-xs leading-snug text-[#93370d]">
                      {c.buying_signal}
                    </span>
                  ) : (
                    <span className="text-sm text-[#5f6b62]">—</span>
                  )}
                </Td>
                <Td>
                  {c.next_action ? (
                    <span className="block max-w-[220px] text-xs leading-snug text-[#0a0a0a]">
                      {c.next_action}
                    </span>
                  ) : (
                    <span
                      className="text-xs text-[#4f5a52]"
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
                      className="h-4 w-4 text-[#4f5a52] transition-colors group-hover:text-[#257a10]"
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
    </>
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
    <th className="whitespace-nowrap px-4 py-3 text-left text-[13px] font-medium text-[#4f5a52]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-top">{children}</td>;
}
