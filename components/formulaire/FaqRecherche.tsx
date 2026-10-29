"use client";

import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";
import { Search, SearchX, X } from "lucide-react";
import { Accordion } from "@/components/site/Accordion";
import { Reveal } from "@/components/site/Reveal";
import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import type { FaqGroupe } from "./faq-contenu";
import "../formulaire.css";

const textes = {
  fr: {
    label: "Rechercher dans la FAQ",
    placeholder: "Paiement, ramassage…",
    clear: "Effacer la recherche",
    themes: "Thèmes",
    total: (n: number) => `${n} question${n > 1 ? "s" : ""}`,
    results: (n: number, q: string) =>
      n === 0 ? `Aucun résultat pour « ${q} »` : `${n} résultat${n > 1 ? "s" : ""} pour « ${q} »`,
    emptyTitle: (q: string) => `Aucune question ne correspond à « ${q} ».`,
    emptyText: "Posez-nous la vôtre directement :",
    or: "ou",
  },
  en: {
    label: "Search the FAQ",
    placeholder: "Payment, pickup…",
    clear: "Clear search",
    themes: "Topics",
    total: (n: number) => `${n} question${n > 1 ? "s" : ""}`,
    results: (n: number, q: string) =>
      n === 0 ? `No results for “${q}”` : `${n} result${n > 1 ? "s" : ""} for “${q}”`,
    emptyTitle: (q: string) => `No question matches “${q}”.`,
    emptyText: "Ask us yours directly:",
    or: "or",
  },
};

/** Minuscules sans accents : « pàiement » trouve « Paiement ». */
const normaliser = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Rend cliquables le téléphone et le courriel cités dans les réponses. */
function Reponse({ text }: { text: string }) {
  const parts = text.split(new RegExp(`(${site.phone}|${site.email.replace(".", "\\.")})`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        part === site.phone ? (
          <a key={i} href={site.phoneHref} className="font-semibold text-emerald underline-offset-4 hover:underline">
            {part}
          </a>
        ) : part === site.email ? (
          <a key={i} href={`mailto:${site.email}`} className="font-semibold text-emerald underline-offset-4 hover:underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * FAQ regroupée par thèmes avec recherche instantanée (questions et réponses,
 * insensible aux accents). Sans JavaScript, tout reste affiché.
 */
export function FaqRecherche({ groups, locale }: { groups: FaqGroupe[]; locale: Locale }) {
  const t = textes[locale];
  const uid = useId();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const q = deferred.trim();

  // Mots normalisés de chaque question (question, réponse et thème), calculés une
  // seule fois : une lettre tapée ne retraite plus tout le contenu.
  const index = useMemo(
    () => groups.map((g) => g.items.map((it) => normaliser(`${it.question} ${it.answer} ${g.title}`).split(/[^a-z0-9]+/))),
    [groups],
  );

  const filtres = useMemo(() => {
    const mots = normaliser(q).split(/[^a-z0-9]+/).filter(Boolean);
    return groups
      .map((g, gi) => ({
        ...g,
        items: mots.length
          ? g.items.filter((_, ii) => {
              // Début de mot : « donnees » ne trouve pas « coordonnées ».
              const tokens = index[gi][ii];
              return mots.every((m) => tokens.some((tok) => tok.startsWith(m)));
            })
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, index, q]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const trouves = filtres.reduce((n, g) => n + g.items.length, 0);

  let message: ReactNode = t.total(total);
  if (q) message = t.results(trouves, q);

  return (
    <div className="tlf grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-4">
        <div className="tlf-sticky space-y-6">
          <div role="search">
            <label htmlFor={`${uid}-q`} className="tlf-label">
              {t.label}
            </label>
            <div className="tlf-search">
              <Search className="h-5 w-5" aria-hidden="true" />
              <input
                id={`${uid}-q`}
                type="search"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                placeholder={t.placeholder}
                className="tlf-field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQuery("");
                }}
                aria-describedby={`${uid}-count`}
              />
              {query && (
                <button type="button" className="tlf-icon-btn" aria-label={t.clear} onClick={() => setQuery("")}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p id={`${uid}-count`} className="mt-2 text-sm text-moss" aria-live="polite">
              {message}
            </p>
          </div>

          {filtres.length > 0 && (
            <nav aria-label={t.themes}>
              <p className="tlf-label">{t.themes}</p>
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {filtres.map((g) => (
                  <li key={g.id}>
                    <a
                      href={`#faq-${g.id}`}
                      className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-mist transition-colors hover:border-emerald hover:text-emerald lg:w-full lg:justify-between lg:rounded-xl lg:border-transparent lg:px-3 lg:hover:border-line"
                    >
                      {g.title}
                      <span className="text-xs font-medium tabular-nums text-moss">{g.items.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>

      <div className="space-y-12 lg:col-span-8">
        {filtres.map((g, gi) => (
          <Reveal key={g.id} delay={gi === 0 ? 0 : 0.05}>
            <section
              id={`faq-${g.id}`}
              aria-labelledby={`${uid}-${g.id}`}
              className="scroll-mt-[calc(var(--site-header-h,96px)+1.5rem)]"
            >
              <h2 id={`${uid}-${g.id}`} className="mb-4 font-display text-2xl font-bold text-mist sm:text-3xl">
                {g.title}
              </h2>
              <Accordion
                key={q}
                defaultOpen={gi === 0 ? 0 : null}
                items={g.items.map((it) => ({ q: it.question, a: <Reponse text={it.answer} /> }))}
              />
            </section>
          </Reveal>
        ))}

        {filtres.length === 0 && (
          <div className="rounded-3xl border border-line p-8 text-center sm:p-10">
            <SearchX className="mx-auto h-8 w-8 text-emerald" aria-hidden="true" />
            <p className="mt-4 font-display text-xl font-bold text-mist">{t.emptyTitle(q)}</p>
            <p className="mt-2 text-moss">
              {t.emptyText}{" "}
              <a href={site.phoneHref} className="font-semibold text-emerald underline-offset-4 hover:underline">
                {site.phone}
              </a>{" "}
              {t.or}{" "}
              <a href={`mailto:${site.email}`} className="font-semibold text-emerald underline-offset-4 hover:underline">
                {site.email}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
