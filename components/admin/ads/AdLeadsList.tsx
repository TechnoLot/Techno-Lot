import type { LeadItem } from "@/lib/ads/types";
import { card, cardSub, cardTitle, th } from "./ui";
import { formatDateTime, formatMoney } from "./format";

function ClientBadge({ converted }: { converted: boolean }) {
  return converted ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-admin-tint-green px-2.5 py-1 text-[12px] font-semibold text-admin-tint-green-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-admin-green" aria-hidden />
      Client
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-admin-tint-gray px-2.5 py-1 text-[12px] font-medium text-admin-muted">
      Pas encore
    </span>
  );
}

function profitText(l: LeadItem): { text: string; cls: string } {
  if (l.profit == null) {
    return { text: l.converted ? "Lot pas encore vendu" : "—", cls: "text-admin-muted" };
  }
  return {
    text: formatMoney(l.profit),
    cls: l.profit > 0 ? "font-semibold text-admin-green" : l.profit < 0 ? "font-semibold text-admin-danger" : "text-admin-ink",
  };
}

/** Leads d'une pub : nom, date, devenu client ou non, profit. */
export default function AdLeadsList({ leads, clients }: { leads: LeadItem[]; clients: number }) {
  return (
    <section className={card} aria-labelledby="ad-leads-title">
      <div className="px-5 pb-3 pt-5 sm:px-6">
        <h2 id="ad-leads-title" className={cardTitle}>
          Ses leads
        </h2>
        <p className={cardSub}>
          {leads.length} lead{leads.length > 1 ? "s" : ""} sur la période · {clients} devenu{clients > 1 ? "s" : ""}{" "}
          client{clients > 1 ? "s" : ""}
        </p>
      </div>

      {leads.length === 0 ? (
        <p className="border-t border-admin-line-soft px-5 py-8 text-center text-sm text-admin-muted sm:px-6">
          Personne n&apos;a encore rempli le formulaire via cette pub sur la période.
        </p>
      ) : (
        <>
          <table className="hidden w-full border-collapse text-sm md:table">
            <thead>
              <tr className="border-y border-admin-line-soft">
                <th scope="col" className={`${th} pl-6`}>
                  Nom
                </th>
                <th scope="col" className={th}>
                  Date
                </th>
                <th scope="col" className={th}>
                  Devenu client
                </th>
                <th scope="col" className={`${th} pr-6 text-right`}>
                  Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const p = profitText(l);
                return (
                  <tr key={l.id} className="border-b border-admin-line-soft last:border-b-0">
                    <td className="py-3 pl-6 pr-4">
                      <p className="font-semibold text-admin-ink">{l.nom}</p>
                      {(l.courriel || l.telephone) && (
                        <p className="mt-0.5 truncate text-[12px] text-admin-muted">{l.courriel ?? l.telephone}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-admin-ink">{formatDateTime(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <ClientBadge converted={l.converted} />
                    </td>
                    <td className={`whitespace-nowrap py-3 pl-4 pr-6 text-right tabular-nums ${p.cls}`}>{p.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="divide-y divide-admin-line-soft border-t border-admin-line-soft md:hidden">
            {leads.map((l) => {
              const p = profitText(l);
              return (
                <li key={l.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-admin-ink">{l.nom}</p>
                    <p className="mt-0.5 text-[12px] text-admin-muted">{formatDateTime(l.createdAt)}</p>
                    {(l.courriel || l.telephone) && (
                      <p className="mt-0.5 truncate text-[12px] text-admin-muted">{l.courriel ?? l.telephone}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <ClientBadge converted={l.converted} />
                    <span className={`text-[13px] tabular-nums ${p.cls}`}>{p.text}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
