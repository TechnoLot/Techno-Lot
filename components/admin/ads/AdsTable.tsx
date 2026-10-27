"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { NO_ID, type AdSummary, type Totals } from "@/lib/ads/types";
import type { Judgement } from "@/lib/ads/verdict";
import VerdictPill from "./VerdictPill";
import { PlatformIcon } from "./PlatformBadge";
import { formatCost, formatCount, formatMoney } from "./format";
import { focusRing, th } from "./ui";

export type RankedAd = AdSummary & Judgement;

type SortKey = "rank" | "spend" | "leads" | "cpl" | "clients" | "profit";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "spend", label: "Dépensé", numeric: true },
  { key: "leads", label: "Leads", numeric: true },
  { key: "cpl", label: "Coût par lead", numeric: true },
  { key: "clients", label: "Clients", numeric: true },
  { key: "profit", label: "Profit", numeric: true },
  { key: "rank", label: "Verdict", numeric: false },
];

function adTitle(a: RankedAd): { name: string; sub: string | null } {
  if (a.adId === NO_ID) {
    return { name: "Pub non identifiée", sub: "Leads sans identifiant de pub (paramètres d'URL manquants)" };
  }
  return { name: a.name, sub: a.campaign };
}

function profitClass(v: number): string {
  return v > 0 ? "text-admin-green" : v < 0 ? "text-admin-danger" : "text-admin-muted";
}

/**
 * Tableau « Vos pubs », trié du meilleur au pire par défaut (ordre reçu du
 * serveur). En-têtes cliquables pour trier autrement. Sous 1024 px : cartes.
 */
export default function AdsTable({
  ads,
  totals,
  query = "",
  showPlatform = false,
  spendKnown = true,
}: {
  ads: RankedAd[];
  totals: Pick<Totals, "spend" | "leads" | "cpl" | "clients" | "profit">;
  /** Paramètres de période à garder sur les liens (« period=7d »…) */
  query?: string;
  showPlatform?: boolean;
  /** false : dépenses inconnues (plateforme non connectée) → « — » */
  spendKnown?: boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });

  const rows = useMemo(() => {
    const indexed = ads.map((a, i) => ({ a, i }));
    if (sort.key === "rank") {
      return (sort.dir === 1 ? indexed : [...indexed].reverse()).map((x) => x.a);
    }
    const k = sort.key;
    return [...indexed]
      .sort((x, y) => {
        const vx = x.a[k];
        const vy = y.a[k];
        if (vx == null && vy == null) return x.i - y.i;
        if (vx == null) return 1;
        if (vy == null) return -1;
        return (vx - vy) * sort.dir || x.i - y.i;
      })
      .map((x) => x.a);
  }, [ads, sort]);

  const hrefOf = (a: RankedAd) => (query ? `${a.href}?${query}` : a.href);

  function toggle(key: SortKey) {
    setSort((s) => {
      if (s.key === key) return { key, dir: s.dir === 1 ? -1 : 1 };
      // Par défaut : coût par lead croissant, le reste décroissant
      return { key, dir: key === "cpl" || key === "rank" ? 1 : -1 };
    });
  }

  return (
    <>
      {/* Ordinateur : tableau */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-admin-line-soft">
              <th scope="col" className={`${th} w-[34%] pl-5`}>
                Pub
              </th>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                    className={`${th} ${c.numeric ? "text-right" : "pr-5"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={`inline-flex items-center gap-1 rounded-md hover:text-admin-ink ${focusRing} ${
                        active ? "text-admin-ink" : ""
                      }`}
                    >
                      {c.label}
                      {active &&
                        (sort.dir === 1 ? (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                        ))}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const t = adTitle(a);
              return (
                <tr
                  key={a.key}
                  onClick={() => router.push(hrefOf(a))}
                  className="cursor-pointer border-b border-admin-line-soft transition-colors last:border-b-0 hover:bg-admin-subtle"
                >
                  <td className="py-3.5 pl-5 pr-4 align-middle">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {showPlatform && (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-admin-page text-admin-muted">
                          <PlatformIcon platform={a.platform} className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={hrefOf(a)}
                          onClick={(e) => e.stopPropagation()}
                          className={`line-clamp-2 break-words font-semibold text-admin-ink hover:text-admin-green ${focusRing}`}
                        >
                          {t.name}
                        </Link>
                        {t.sub && <p className="mt-0.5 truncate text-[12px] text-admin-muted">{t.sub}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-admin-ink">{spendKnown ? formatMoney(a.spend) : "—"}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-admin-ink">{formatCount(a.leads)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-admin-ink">{formatCost(a.cpl)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-admin-ink">
                    {formatCount(a.clients)}
                  </td>
                  <td className={`px-4 py-3.5 text-right tabular-nums font-semibold ${profitClass(a.profit)}`}>
                    {a.clients > 0 ? formatMoney(a.profit) : "—"}
                  </td>
                  <td className="py-3.5 pl-4 pr-5" title={a.reason}>
                    <VerdictPill verdict={a.verdict} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-admin-line bg-admin-subtle text-[13px]">
              <th scope="row" className="py-3 pl-5 pr-4 text-left font-semibold text-admin-ink">
                Total · {formatCount(ads.length)} pub{ads.length > 1 ? "s" : ""}
              </th>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-admin-ink">{spendKnown ? formatMoney(totals.spend) : "—"}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-admin-ink">{formatCount(totals.leads)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-admin-ink">{formatCost(totals.cpl)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-admin-ink">{formatCount(totals.clients)}</td>
              <td className={`px-4 py-3 text-right font-semibold tabular-nums ${profitClass(totals.profit)}`}>
                {formatMoney(totals.profit)}
              </td>
              <td className="py-3 pl-4 pr-5" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile / tablette : cartes */}
      <ul className="divide-y divide-admin-line-soft lg:hidden">
        {rows.map((a) => {
          const t = adTitle(a);
          const figures: { label: string; value: string; cls?: string }[] = [
            { label: "Dépensé", value: spendKnown ? formatMoney(a.spend) : "—" },
            { label: "Leads", value: formatCount(a.leads) },
            { label: "Coût / lead", value: formatCost(a.cpl) },
            { label: "Clients", value: formatCount(a.clients), cls: "font-semibold" },
            { label: "Profit", value: a.clients > 0 ? formatMoney(a.profit) : "—", cls: `font-semibold ${profitClass(a.profit)}` },
          ];
          return (
            <li key={a.key}>
              <Link
                href={hrefOf(a)}
                className={`block px-4 py-4 transition-colors hover:bg-admin-subtle sm:px-5 ${focusRing} focus-visible:-outline-offset-2`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 break-words font-semibold leading-snug text-admin-ink">
                      {showPlatform && <PlatformIcon platform={a.platform} className="h-3.5 w-3.5 shrink-0 text-admin-muted" />}
                      {t.name}
                    </p>
                    {t.sub && <p className="mt-0.5 truncate text-[12px] text-admin-muted">{t.sub}</p>}
                  </div>
                  <VerdictPill verdict={a.verdict} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2.5">
                  {figures.map((f) => (
                    <div key={f.label} className="min-w-0">
                      <dt className="text-[12px] text-admin-muted">{f.label}</dt>
                      <dd className={`truncate text-[15px] tabular-nums text-admin-ink ${f.cls ?? ""}`}>{f.value}</dd>
                    </div>
                  ))}
                  <div className="flex items-end justify-end">
                    <ChevronRight className="h-4 w-4 text-admin-faint/60" aria-hidden />
                  </div>
                </dl>
                <p className="mt-2.5 text-[12px] leading-relaxed text-admin-muted [text-wrap:pretty]">{a.reason}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
