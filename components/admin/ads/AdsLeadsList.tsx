"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Clock, Mail, Phone } from "lucide-react";
import type { LeadItem } from "@/lib/ads/types";
import PlatformBadge from "./PlatformBadge";
import { formatDateTime, formatMoney, formatRelative } from "./format";

function initials(nom: string): string {
  return (
    nom
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function netOf(placement: string | null): string[] {
  const p = (placement ?? "").toLowerCase();
  if (p.includes("instagram")) return ["instagram"];
  if (p.includes("facebook")) return ["facebook"];
  return [];
}

/**
 * Liste de leads issus des pubs. `showAd` affiche la pub d'origine
 * (masquée sur la page détail d'une pub).
 */
export default function AdsLeadsList({
  leads,
  title,
  subtitle,
  showAd = true,
  emptyText = "Aucun lead sur cette période.",
}: {
  leads: LeadItem[];
  title: string;
  subtitle?: string;
  showAd?: boolean;
  emptyText?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="ads-leads-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ads-leads-title" className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          {title}
        </h2>
        {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
      </div>

      {leads.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {leads.map((l, i) => (
            <motion.li
              key={l.id}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.035 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:flex-nowrap"
            >
              <span
                aria-hidden
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                  l.converted ? "bg-accent text-night-950" : "bg-white/[0.06] text-slate-300"
                }`}
              >
                {initials(l.nom)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-white">{l.nom}</span>
                  {l.converted ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-px text-[10px] font-semibold text-accent-bright">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      Client{l.profit != null ? ` · ${formatMoney(l.profit)}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-px text-[10px] font-medium text-slate-400">
                      <Clock className="h-3 w-3" aria-hidden />
                      En attente
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  {l.courriel && <span className="truncate">{l.courriel}</span>}
                  {showAd && (
                    <>
                      <span aria-hidden>·</span>
                      <PlatformBadge platform={l.platform} publishers={netOf(l.placement)} compact />
                      {l.adHref ? (
                        <Link href={l.adHref} className="truncate text-slate-400 underline-offset-2 hover:text-accent-bright hover:underline">
                          {l.adName}
                        </Link>
                      ) : (
                        <span className="truncate">{l.adName ?? "Pub inconnue"}</span>
                      )}
                    </>
                  )}
                  {!showAd && l.placement && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{l.placement}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <time dateTime={l.createdAt} title={formatDateTime(l.createdAt)} className="whitespace-nowrap text-[11px] text-slate-500">
                  {formatRelative(l.createdAt)}
                </time>
                {l.telephone && (
                  <a
                    href={`tel:${l.telephone}`}
                    className="rounded-full border border-white/10 p-2 text-slate-400 transition-colors hover:border-accent/40 hover:text-accent-bright"
                    aria-label={`Appeler ${l.nom}`}
                    title={l.telephone}
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
                {l.courriel && (
                  <a
                    href={`mailto:${l.courriel}`}
                    className="rounded-full border border-white/10 p-2 text-slate-400 transition-colors hover:border-accent/40 hover:text-accent-bright"
                    aria-label={`Écrire à ${l.nom}`}
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
