"use client";

import Link from "next/link";
import { CalendarClock, CalendarPlus, ChevronLeft, ChevronRight, MapPin, Navigation } from "lucide-react";
import { addDays } from "@/lib/ebay/totaux";
import {
  ancreVoisine,
  compterParMois,
  grilleMois,
  heureCourte,
  jourComplet,
  jourSemaineCourt,
  libelleMois,
  lienItineraire,
  lienVue,
  lundiDe,
  moisAVenir,
  nomJour,
  nomRamassage,
  ramassagesDuJour,
  villeDeAdresse,
  type Ramassage,
  type VueRamassages,
} from "@/lib/ramassages/ramassages";

/** Prochain ramassage (prochainRamassage), ou null s'il n'y en a aucun dans les 12 mois. */
export type Prochain = { ramassage: Ramassage; enCours: boolean } | null;

const FOCUS_LIME =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#6bd63b]";

/** « En cours », « Demain · mardi 3 nov. », « Aujourd’hui · lundi 2 nov. », « Jeudi 5 nov. » */
function quand(r: Ramassage, enCours: boolean, aujourdhui: string): string {
  if (enCours && !r.journee) return "En cours";
  const nom = nomJour(r.jour, aujourdhui);
  if (r.jour === aujourdhui || r.jour === addDays(aujourdhui, 1)) {
    const complet = jourComplet(r.jour);
    return `${nom} · ${complet.charAt(0).toLowerCase()}${complet.slice(1)}`;
  }
  return nom;
}

/**
 * Le prochain ramassage, comme un bon de ramassage : le jour, l'heure en grand,
 * le client et l'adresse, puis « Ouvrir » et « Itinéraire » sous la perforation.
 */
export function ProchainRamassage({
  prochain,
  aujourdhui,
  onOuvrir,
  onNouveau,
}: {
  prochain: Prochain;
  aujourdhui: string;
  onOuvrir: (r: Ramassage) => void;
  onNouveau: () => void;
}) {
  if (!prochain) {
    return (
      <section aria-labelledby="prochain-titre" className="rounded-2xl border border-dashed border-admin-line-strong bg-admin-card p-5">
        <h2 id="prochain-titre" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-admin-muted">
          Prochain ramassage
        </h2>
        <p className="mt-2 font-display text-lg font-semibold tracking-tight text-admin-ink">Rien de prévu</p>
        <p className="mt-1 text-[13px] text-admin-muted">Aucun ramassage dans les 12 prochains mois.</p>
        <button type="button" onClick={onNouveau} className="btn-primary mt-4 w-full !py-2">
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Nouveau ramassage
        </button>
      </section>
    );
  }

  const { ramassage: r, enCours } = prochain;
  return (
    <section aria-labelledby="prochain-titre" className="relative overflow-hidden rounded-2xl bg-[#6bd63b] p-5 text-admin-ink">
      <h2 id="prochain-titre" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-admin-muted">
        {enCours && !r.journee ? "Ramassage en cours" : "Prochain ramassage"}
      </h2>
      <p className="mt-2 text-[14px] font-medium">{quand(r, enCours, aujourdhui)}</p>
      {r.journee || !r.heureDebut ? (
        <p className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-tight">Toute la journée</p>
      ) : (
        <p className="mt-1 flex items-baseline gap-2 font-display font-semibold tracking-tight">
          <span className="text-[40px] leading-none tabular-nums">{heureCourte(r.heureDebut)}</span>
          {r.heureFin && r.heureFin !== r.heureDebut && (
            <span className="text-[15px] font-medium tabular-nums text-admin-muted">à {heureCourte(r.heureFin)}</span>
          )}
        </p>
      )}
      <p className="mt-3 text-[16px] font-semibold leading-snug [overflow-wrap:anywhere]">{nomRamassage(r)}</p>
      {r.adresse && (
        <p className="mt-1 flex gap-1.5 text-[13px] text-admin-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-2">{r.adresse}</span>
        </p>
      )}

      {/* Perforation du bon : encoches de la couleur de la page */}
      <div aria-hidden className="relative -mx-5 my-4 border-t-2 border-dashed border-[#0a0a0a]/15">
        <span className="absolute -left-2.5 -top-[11px] h-5 w-5 rounded-full bg-admin-page" />
        <span className="absolute -right-2.5 -top-[11px] h-5 w-5 rounded-full bg-admin-page" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOuvrir(r)}
          className={`inline-flex items-center rounded-full bg-[#0a0a0a] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#262626] ${FOCUS_LIME}`}
        >
          Ouvrir
        </button>
        {r.adresse && (
          <a
            href={lienItineraire(r.adresse)}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-white ${FOCUS_LIME}`}
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden />
            Itinéraire
            <span className="sr-only"> (s’ouvre dans Google Maps)</span>
          </a>
        )}
      </div>
    </section>
  );
}

/** Version en bandeau (écrans sans barre latérale) : rien quand aucun ramassage n'est prévu. */
export function ProchainCompact({
  prochain,
  aujourdhui,
  onOuvrir,
}: {
  prochain: Prochain;
  aujourdhui: string;
  onOuvrir: (r: Ramassage) => void;
}) {
  if (!prochain) return null;
  const { ramassage: r, enCours } = prochain;
  const ville = r.adresse ? villeDeAdresse(r.adresse) : "";
  const heure = r.journee || !r.heureDebut ? "Journée" : heureCourte(r.heureDebut);
  return (
    <section
      aria-label={enCours && !r.journee ? "Ramassage en cours" : "Prochain ramassage"}
      className="flex items-center gap-3 rounded-2xl bg-[#6bd63b] px-4 py-3 text-admin-ink"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[#6bd63b]">
        <CalendarClock className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
          {enCours && !r.journee ? "En cours" : `Prochain · ${nomJour(r.jour, aujourdhui)}`}
        </p>
        <p className="truncate text-[15px] font-semibold">
          <span className="font-display tabular-nums">{heure}</span> · {nomRamassage(r)}
          {ville && <span className="font-normal text-admin-muted"> · {ville}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOuvrir(r)}
        className={`shrink-0 rounded-full bg-[#0a0a0a] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#262626] ${FOCUS_LIME}`}
      >
        Ouvrir
      </button>
    </section>
  );
}

/**
 * Mini-calendrier du mois affiché : un point sous les jours qui ont un ramassage,
 * la semaine affichée surlignée ; un jour mène à sa semaine, les flèches au mois voisin.
 */
export function MiniCalendrier({
  ramassages,
  vue,
  ancre,
  aujourdhui,
}: {
  ramassages: Ramassage[];
  vue: VueRamassages;
  ancre: string;
  aujourdhui: string;
}) {
  const semaines = grilleMois(ancre);
  const mois = ancre.slice(0, 7);
  const lundiAffiche = vue === "semaine" ? lundiDe(ancre) : null;
  const fleche =
    "admin-focus flex h-8 w-8 items-center justify-center rounded-full text-admin-muted transition-colors hover:bg-admin-hover hover:text-admin-ink";

  return (
    <section aria-labelledby="mini-calendrier-titre" className="rounded-2xl border border-admin-line bg-admin-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="mini-calendrier-titre" className="font-display text-[15px] font-semibold tracking-tight text-admin-ink">
          {libelleMois(ancre)}
        </h2>
        <div className="flex items-center">
          <Link href={lienVue(vue, ancreVoisine("mois", ancre, -1))} scroll={false} aria-label="Mois précédent" className={fleche}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
          <Link href={lienVue(vue, ancreVoisine("mois", ancre, 1))} scroll={false} aria-label="Mois suivant" className={fleche}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
      <div aria-hidden className="grid grid-cols-7 text-center">
        {semaines[0].map((jour) => (
          <span key={jour} className="py-1 text-[11px] font-semibold uppercase text-admin-faint">
            {jourSemaineCourt(jour).charAt(0)}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {semaines.map((semaine) => (
          <div
            key={semaine[0]}
            className={`grid grid-cols-7 rounded-full ${lundiAffiche === semaine[0] ? "bg-[#6bd63b]/20" : ""}`}
          >
            {semaine.map((jour) => {
              const n = ramassagesDuJour(ramassages, jour).length;
              const actif = jour === aujourdhui;
              const horsMois = jour.slice(0, 7) !== mois;
              return (
                <Link
                  key={jour}
                  href={lienVue("semaine", jour === aujourdhui ? null : jour)}
                  scroll={false}
                  aria-label={`${jourComplet(jour)}${n > 0 ? ` : ${n} ramassage${n > 1 ? "s" : ""}` : ""}`}
                  className="admin-focus group relative flex h-9 items-center justify-center rounded-full"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] tabular-nums transition-colors ${
                      actif
                        ? "bg-[#6bd63b] font-semibold text-[#0a0a0a]"
                        : horsMois
                          ? "text-admin-faint group-hover:bg-admin-hover"
                          : "text-admin-ink group-hover:bg-admin-hover"
                    }`}
                  >
                    {Number(jour.slice(8, 10))}
                  </span>
                  {n > 0 && (
                    <span
                      aria-hidden
                      className={`absolute bottom-0.5 h-1 w-1 rounded-full ${actif ? "bg-[#0a0a0a]" : "bg-admin-green"}`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Les 12 mois à venir avec leur nombre de ramassages (petite barre) ; un mois ouvre sa vue Mois. */
export function MoisAVenirListe({
  aVenir,
  vue,
  ancre,
  aujourdhui,
}: {
  aVenir: Ramassage[];
  vue: VueRamassages;
  ancre: string;
  aujourdhui: string;
}) {
  const mois = moisAVenir(aujourdhui);
  const comptes = compterParMois(aVenir);
  const max = Math.max(1, ...mois.map((m) => comptes.get(m.cle) ?? 0));

  return (
    <section aria-labelledby="mois-a-venir-titre" className="rounded-2xl border border-admin-line bg-admin-card p-2">
      <h2 id="mois-a-venir-titre" className="px-3 pb-1.5 pt-2.5 text-[13px] font-semibold text-admin-ink">
        Mois à venir
      </h2>
      <ul>
        {mois.map((m) => {
          const n = comptes.get(m.cle) ?? 0;
          const actif = vue === "mois" && ancre.slice(0, 7) === m.cle;
          return (
            <li key={m.cle}>
              <Link
                href={lienVue("mois", m.cle === aujourdhui.slice(0, 7) ? null : m.premier)}
                scroll={false}
                aria-current={actif ? "page" : undefined}
                className={`admin-focus flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                  actif ? "bg-[#6bd63b]/20" : "hover:bg-admin-subtle"
                }`}
              >
                <span className={`min-w-0 flex-1 truncate text-[14px] text-admin-ink ${actif ? "font-semibold" : ""}`}>
                  {m.libelle}
                </span>
                <span aria-hidden className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-admin-subtle">
                  <span className="block h-full rounded-full bg-[#6bd63b]" style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span
                  aria-hidden
                  className={`w-5 shrink-0 text-right text-[13px] font-semibold tabular-nums ${n > 0 ? "text-admin-ink" : "text-admin-faint"}`}
                >
                  {n > 0 ? n : "–"}
                </span>
                <span className="sr-only">
                  {n} ramassage{n > 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
