"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { CalendarClock, CalendarPlus, ChevronRight, MapPin, Plus } from "lucide-react";
import {
  MOIS_A_VENIR,
  compterParMois,
  dansGrille,
  dispositionJour,
  grilleMois,
  heureCourte,
  heureDeMinutes,
  jourComplet,
  jourSemaineCourt,
  joursSemaine,
  libelleMois,
  lienVue,
  momentToronto,
  minutesDe,
  nomJour,
  nomRamassage,
  plageHeures,
  plageHoraire,
  ramassagesDuJour,
  villeDeAdresse,
  type Ramassage,
} from "@/lib/ramassages/ramassages";
import { addDays } from "@/lib/ebay/totaux";

type PropsVue = {
  ramassages: Ramassage[];
  ancre: string;
  aujourdhui: string;
  onOuvrir: (r: Ramassage) => void;
  /** Nouveau ramassage ce jour-là, à cette heure (« HH:MM ») si elle est connue */
  onNouveau: (jour: string, heure?: string) => void;
};

/** Ramassages montrés par case dans la vue Mois (le reste mène à la semaine). */
const MAX_PAR_CASE = 3;

/** Hauteur d'une heure dans la grille de la semaine, en pixels. */
const HEURE_PX = 52;

/** Lignes du nom du client selon la hauteur du bloc (classes écrites en entier pour Tailwind). */
const LIGNES_NOM = ["line-clamp-1", "line-clamp-2", "line-clamp-3", "line-clamp-4"];

/** Samedi ou dimanche. */
const finDeSemaine = (jour: string) => {
  const j = new Date(`${jour}T12:00:00Z`).getUTCDay();
  return j === 0 || j === 6;
};

/** Instant courant, mis à jour chaque minute ; null avant l'affichage dans le navigateur. */
function useMaintenant(): Date | null {
  const [maintenant, setMaintenant] = useState<Date | null>(null);
  useEffect(() => {
    setMaintenant(new Date());
    const minuterie = window.setInterval(() => setMaintenant(new Date()), 60_000);
    return () => window.clearInterval(minuterie);
  }, []);
  return maintenant;
}

/** Numéro du jour, en pastille lime pour aujourd'hui. */
function NumeroJour({ jour, aujourdhui, attenue = false }: { jour: string; aujourdhui: string; attenue?: boolean }) {
  const actif = jour === aujourdhui;
  return (
    <span
      className={`flex h-7 min-w-[28px] items-center justify-center rounded-full px-1 font-display text-[15px] font-semibold tabular-nums ${
        actif ? "bg-[#6bd63b] text-[#0a0a0a]" : attenue ? "text-admin-faint" : "text-admin-ink"
      }`}
    >
      {Number(jour.slice(8, 10))}
    </span>
  );
}

/** Un ramassage en carte (semaine sur téléphone, mois sur téléphone) : heure, client, ville. */
function CarteRamassage({ r, onOuvrir }: { r: Ramassage; onOuvrir: (r: Ramassage) => void }) {
  const ville = r.adresse ? villeDeAdresse(r.adresse) : "";
  return (
    <button
      type="button"
      onClick={() => onOuvrir(r)}
      className="admin-focus block w-full rounded-xl border border-admin-line border-l-[3px] border-l-[#6bd63b] bg-admin-card px-3 py-2 text-left transition-colors hover:border-admin-line-strong hover:border-l-[#6bd63b] hover:bg-admin-subtle"
    >
      <span className="block text-[12px] font-semibold tabular-nums text-admin-green">{plageHoraire(r)}</span>
      <span className="mt-0.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-admin-ink [overflow-wrap:anywhere]">
        {nomRamassage(r)}
      </span>
      {ville && <span className="mt-0.5 block truncate text-[12px] text-admin-muted">{ville}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Semaine                                                             */
/* ------------------------------------------------------------------ */

/** Semaine du lundi au dimanche : grille horaire sur grand écran, un jour par ligne ailleurs. */
export function VueSemaine(props: PropsVue) {
  return (
    <>
      <div className="hidden lg:block">
        <GrilleSemaine {...props} />
      </div>
      <div className="lg:hidden">
        <JoursEnLignes {...props} />
      </div>
    </>
  );
}

/**
 * Grille horaire : une colonne par jour, les ramassages à leur heure (ceux qui
 * se chevauchent côte à côte), la rangée « Journée » pour ceux sans heure ou de
 * plusieurs jours, une ligne verte à l'heure qu'il est. Un clic dans une case
 * vide ouvre un nouveau ramassage à cette demi-heure.
 */
function GrilleSemaine({ ramassages, ancre, aujourdhui, onOuvrir, onNouveau }: PropsVue) {
  const maintenant = useMaintenant();
  const jours = joursSemaine(ancre);
  const parJour = jours.map((jour) => ramassagesDuJour(ramassages, jour));
  const plage = plageHeures(parJour.flat());
  const heures = Array.from({ length: plage.fin - plage.debut }, (_, i) => plage.debut + i);
  const journees = parJour.map((liste) => liste.filter((r) => !dansGrille(r)));
  const ici = maintenant ? momentToronto(maintenant.toISOString()) : null;
  const minutesMaintenant = ici ? minutesDe(ici.heure) : null;
  const colonnes = "grid grid-cols-[56px_repeat(7,minmax(0,1fr))]";

  function creerA(e: MouseEvent<HTMLDivElement>, jour: string) {
    if ((e.target as HTMLElement).closest("button, a")) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    onNouveau(jour, heureDeMinutes(plage.debut * 60 + Math.floor((y / HEURE_PX) * 2) * 30));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-admin-line bg-admin-card">
      <div className={`${colonnes} border-b border-admin-line`}>
        <div />
        {jours.map((jour) => (
          <div
            key={jour}
            className={`group relative border-l border-admin-line-soft px-2 pb-2.5 pt-3 text-center ${finDeSemaine(jour) ? "bg-admin-subtle/60" : ""}`}
          >
            <p className={`text-[11.5px] font-medium uppercase tracking-wide ${jour < aujourdhui ? "text-admin-faint" : "text-admin-muted"}`}>
              {jourSemaineCourt(jour)}
            </p>
            <div className="mt-1 flex justify-center">
              <NumeroJour jour={jour} aujourdhui={aujourdhui} attenue={jour < aujourdhui} />
            </div>
            <button
              type="button"
              onClick={() => onNouveau(jour)}
              aria-label={`Ajouter un ramassage le ${jourComplet(jour)}`}
              className="admin-focus absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-admin-faint transition hover:bg-admin-hover hover:text-admin-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      {journees.some((liste) => liste.length > 0) && (
        <div className={`${colonnes} border-b border-admin-line`}>
          <div className="px-2 py-2 text-right text-[11px] font-medium text-admin-faint">Journée</div>
          {jours.map((jour, i) => (
            <div
              key={jour}
              className={`min-w-0 space-y-1 border-l border-admin-line-soft p-1 ${finDeSemaine(jour) ? "bg-admin-subtle/60" : ""}`}
            >
              {journees[i].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onOuvrir(r)}
                  title={`${plageHoraire(r)} · ${nomRamassage(r)}`}
                  className="admin-focus block w-full truncate rounded-md bg-[#6bd63b] px-2 py-1 text-left text-[12px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#5fc72f]"
                >
                  {nomRamassage(r)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className={colonnes}>
        <div className="relative" style={{ height: heures.length * HEURE_PX }}>
          {heures.map((h, i) => (
            <span
              key={h}
              aria-hidden
              className={`absolute right-2 text-[11px] tabular-nums text-admin-faint ${i === 0 ? "" : "-translate-y-1/2"}`}
              style={{ top: i === 0 ? 3 : (h - plage.debut) * HEURE_PX }}
            >
              {h} h
            </span>
          ))}
        </div>
        {jours.map((jour, i) => {
          const blocs = dispositionJour(parJour[i]);
          const maintenantIci =
            ici?.jour === jour && minutesMaintenant !== null && minutesMaintenant >= plage.debut * 60 && minutesMaintenant <= plage.fin * 60;
          return (
            <div
              key={jour}
              onClick={(e) => creerA(e, jour)}
              title="Cliquer pour ajouter un ramassage à cette heure"
              className={`relative cursor-pointer border-l border-admin-line-soft transition-colors hover:bg-[#6bd63b]/[0.05] ${
                finDeSemaine(jour) ? "bg-admin-subtle/60" : ""
              }`}
              style={{
                height: heures.length * HEURE_PX,
                backgroundImage: "linear-gradient(to bottom, rgb(var(--a-line-soft)) 1px, transparent 1px)",
                backgroundSize: `100% ${HEURE_PX}px`,
              }}
            >
              {blocs.map((b) => {
                const r = b.ramassage;
                const haut = ((b.debut - plage.debut * 60) / 60) * HEURE_PX;
                const hauteur = Math.max(((b.fin - b.debut) / 60) * HEURE_PX - 2, 22);
                const ville = r.adresse ? villeDeAdresse(r.adresse) : "";
                // Côte à côte : l'heure de début seulement, et le nom sur plusieurs lignes plutôt que coupé.
                // Lignes du nom : hauteur moins les marges (8 px), la ligne de l'heure (15 px) et la ville (15 px).
                const etroit = b.colonnes > 1;
                const avecVille = !etroit && hauteur >= 64 && ville !== "";
                const place = hauteur - 23 - (avecVille ? 15 : 0);
                const lignes = LIGNES_NOM[Math.min(LIGNES_NOM.length, Math.max(1, Math.floor(place / 16))) - 1];
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOuvrir(r)}
                    title={`${plageHoraire(r)} · ${nomRamassage(r)}${ville ? ` · ${ville}` : ""}`}
                    className={`admin-focus absolute z-[1] overflow-hidden rounded-lg border border-[#6bd63b]/40 border-l-[3px] border-l-[#6bd63b] bg-admin-tint-green py-1 text-left shadow-[0_1px_2px_rgba(10,10,10,0.06)] transition-[filter,box-shadow] hover:z-[3] hover:shadow-[0_4px_12px_-4px_rgba(37,122,16,0.35)] hover:brightness-[0.97] ${
                      etroit ? "px-1" : "px-1.5"
                    }`}
                    style={{
                      top: haut + 1,
                      height: hauteur,
                      left: `calc(${(b.colonne / b.colonnes) * 100}% + 3px)`,
                      width: `calc(${100 / b.colonnes}% - 6px)`,
                    }}
                  >
                    {hauteur < 34 ? (
                      <span className="block truncate text-[11.5px] font-semibold leading-tight text-admin-ink">
                        <span className="tabular-nums text-admin-green">{heureCourte(r.heureDebut as string)}</span> {nomRamassage(r)}
                      </span>
                    ) : (
                      <>
                        <span className="block truncate text-[11px] font-semibold tabular-nums text-admin-green">
                          {etroit ? heureCourte(r.heureDebut as string) : plageHoraire(r)}
                        </span>
                        <span className={`text-[12.5px] font-semibold leading-tight text-admin-ink [overflow-wrap:anywhere] ${lignes}`}>
                          {nomRamassage(r)}
                        </span>
                        {avecVille && <span className="mt-0.5 block truncate text-[11px] text-admin-muted">{ville}</span>}
                      </>
                    )}
                  </button>
                );
              })}
              {maintenantIci && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-[2]"
                  style={{ top: ((minutesMaintenant - plage.debut * 60) / 60) * HEURE_PX }}
                >
                  <div className="h-0.5 bg-[#2f9e12]" />
                  <span className="absolute -left-[5px] -top-1 h-2.5 w-2.5 rounded-full bg-[#2f9e12] ring-2 ring-admin-card" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Semaine sur téléphone et tablette : un jour par ligne. */
function JoursEnLignes({ ramassages, ancre, aujourdhui, onOuvrir, onNouveau }: PropsVue) {
  const jours = joursSemaine(ancre);
  return (
    <ul className="divide-y divide-admin-line-soft overflow-hidden rounded-2xl border border-admin-line bg-admin-card">
      {jours.map((jour) => {
        const liste = ramassagesDuJour(ramassages, jour);
        return (
          <li
            key={jour}
            aria-label={jourComplet(jour)}
            className={`flex gap-3 px-4 py-3 ${jour === aujourdhui ? "bg-[#6bd63b]/[0.07]" : ""}`}
          >
            <div className="w-11 shrink-0 text-center">
              <p className="text-[11px] font-medium uppercase text-admin-muted">{jourSemaineCourt(jour)}</p>
              <div className="mt-0.5 flex justify-center">
                <NumeroJour jour={jour} aujourdhui={aujourdhui} />
              </div>
            </div>
            <div className="min-w-0 flex-1 self-center">
              {liste.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {liste.map((r) => (
                    <li key={r.id}>
                      <CarteRamassage r={r} onOuvrir={onOuvrir} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-admin-faint">Aucun ramassage</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNouveau(jour)}
              aria-label={`Ajouter un ramassage le ${jourComplet(jour)}`}
              className="admin-focus flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-admin-muted transition-colors hover:bg-admin-hover hover:text-admin-ink"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Mois                                                                */
/* ------------------------------------------------------------------ */

/**
 * Mois en grille (lundi → dimanche). Plus large qu'un téléphone : les
 * ramassages dans les cases, et le numéro du jour mène à sa semaine. Téléphone :
 * des points ; toucher un jour montre ses ramassages sous la grille.
 */
export function VueMois({ ramassages, ancre, aujourdhui, onOuvrir, onNouveau }: PropsVue) {
  const semaines = grilleMois(ancre);
  const mois = ancre.slice(0, 7);
  const [choisi, setChoisi] = useState(() => (aujourdhui.slice(0, 7) === mois ? aujourdhui : `${mois}-01`));
  const jourChoisi = choisi.slice(0, 7) === mois ? choisi : `${mois}-01`;
  const duJourChoisi = ramassagesDuJour(ramassages, jourChoisi);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-admin-line bg-admin-card">
        <div className="grid grid-cols-7 border-b border-admin-line bg-admin-subtle">
          {semaines[0].map((jour) => (
            <div key={jour} className="px-1 py-2 text-center text-[11.5px] font-medium uppercase tracking-wide text-admin-muted">
              {jourSemaineCourt(jour)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {semaines.flat().map((jour, i) => {
            const liste = ramassagesDuJour(ramassages, jour);
            const horsMois = jour.slice(0, 7) !== mois;
            const reste = liste.length - MAX_PAR_CASE;
            const etiquette = `${jourComplet(jour)} : ${liste.length} ramassage${liste.length > 1 ? "s" : ""}`;
            return (
              <div
                key={jour}
                className={`group min-h-[64px] min-w-0 border-admin-line-soft p-1 sm:min-h-[118px] sm:p-1.5 ${i % 7 !== 0 ? "border-l" : ""} ${
                  i >= 7 ? "border-t" : ""
                } ${horsMois ? "bg-admin-subtle/70" : finDeSemaine(jour) ? "bg-admin-subtle/40" : ""}`}
              >
                {/* Téléphone : le jour se choisit et ses ramassages s'affichent sous la grille */}
                <button
                  type="button"
                  onClick={() => setChoisi(jour)}
                  aria-label={etiquette}
                  aria-pressed={jour === jourChoisi}
                  className={`admin-focus flex w-full flex-col items-center gap-1 rounded-xl py-1 sm:hidden ${
                    jour === jourChoisi && jour !== aujourdhui ? "bg-admin-hover" : ""
                  }`}
                >
                  <NumeroJour jour={jour} aujourdhui={aujourdhui} attenue={horsMois} />
                  <span className="flex h-1.5 gap-0.5" aria-hidden>
                    {liste.slice(0, MAX_PAR_CASE).map((r) => (
                      <span key={r.id} className="h-1.5 w-1.5 rounded-full bg-admin-green" />
                    ))}
                  </span>
                </button>

                <div className="hidden items-center justify-between gap-1 sm:flex">
                  <Link href={lienVue("semaine", jour)} scroll={false} aria-label={`${etiquette}, voir la semaine`} className="admin-focus rounded-full hover:underline">
                    <NumeroJour jour={jour} aujourdhui={aujourdhui} attenue={horsMois} />
                  </Link>
                  {/* Avec une souris : « + » au survol de la case ; écran tactile : toujours visible */}
                  <button
                    type="button"
                    onClick={() => onNouveau(jour)}
                    aria-label={`Ajouter un ramassage le ${jourComplet(jour)}`}
                    className="admin-focus flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-admin-faint transition hover:bg-admin-hover hover:text-admin-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <ul className="mt-1 hidden flex-col gap-1 sm:flex">
                  {liste.slice(0, MAX_PAR_CASE).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onOuvrir(r)}
                        title={`${plageHoraire(r)} · ${nomRamassage(r)}`}
                        className={`admin-focus block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[12px] transition-colors ${
                          r.journee || !dansGrille(r)
                            ? "bg-[#6bd63b] font-semibold text-[#0a0a0a] hover:bg-[#5fc72f]"
                            : "bg-admin-tint-green text-admin-ink hover:brightness-[0.97]"
                        }`}
                      >
                        {r.heureDebut && !r.journee && r.jour === jour && (
                          <span className="font-semibold tabular-nums text-admin-green">{heureCourte(r.heureDebut)} </span>
                        )}
                        {nomRamassage(r)}
                      </button>
                    </li>
                  ))}
                  {reste > 0 && (
                    <li>
                      <Link
                        href={lienVue("semaine", jour)}
                        scroll={false}
                        className="admin-focus block rounded px-1.5 text-[12px] font-semibold text-admin-green hover:underline"
                      >
                        +{reste} autre{reste > 1 ? "s" : ""}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="jour-choisi-titre" className="mt-4 sm:hidden">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="jour-choisi-titre" className="text-[14px] font-semibold text-admin-ink">
            {nomJour(jourChoisi, aujourdhui)}
          </h3>
          <button
            type="button"
            onClick={() => onNouveau(jourChoisi)}
            className="admin-focus inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-admin-green"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </button>
        </div>
        {duJourChoisi.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {duJourChoisi.map((r) => (
              <li key={r.id}>
                <CarteRamassage r={r} onOuvrir={onOuvrir} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-admin-line-strong px-4 py-5 text-center text-[13px] text-admin-muted">
            Aucun ramassage ce jour-là.
          </p>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Liste                                                               */
/* ------------------------------------------------------------------ */

/** Les 12 mois à venir, par mois puis par jour (un ramassage déjà commencé va sous aujourd'hui). */
export function VueListe({
  aVenir,
  aujourdhui,
  onOuvrir,
  onNouveau,
}: {
  aVenir: Ramassage[];
  aujourdhui: string;
  onOuvrir: (r: Ramassage) => void;
  onNouveau: () => void;
}) {
  const parJour = new Map<string, Ramassage[]>();
  for (const r of aVenir) {
    const jour = r.jour < aujourdhui ? aujourdhui : r.jour;
    parJour.set(jour, [...(parJour.get(jour) ?? []), r]);
  }
  const parMois = new Map<string, [string, Ramassage[]][]>();
  for (const [jour, liste] of parJour) {
    const cle = jour.slice(0, 7);
    parMois.set(cle, [...(parMois.get(cle) ?? []), [jour, liste]]);
  }
  const comptes = compterParMois(aVenir.map((r) => ({ jour: r.jour < aujourdhui ? aujourdhui : r.jour })));
  const demain = addDays(aujourdhui, 1);

  if (parJour.size === 0) {
    return (
      <div className="glass flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-admin-tint-green text-admin-tint-green-ink">
          <CalendarClock className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <p className="font-display text-[17px] font-semibold text-admin-ink">Aucun ramassage prévu</p>
          <p className="mt-1 text-[13px] text-admin-muted">Rien dans les {MOIS_A_VENIR} prochains mois.</p>
        </div>
        <button type="button" onClick={onNouveau} className="btn-primary">
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Nouveau ramassage
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {[...parMois.entries()].map(([cle, jours]) => {
        const n = comptes.get(cle) ?? 0;
        return (
          <section key={cle} aria-labelledby={`liste-mois-${cle}`}>
            <h3 id={`liste-mois-${cle}`} className="mb-2 flex items-baseline gap-2 px-1">
              <span className="font-display text-[17px] font-semibold tracking-tight text-admin-ink">{libelleMois(cle)}</span>
              <span className="text-[13px] text-admin-muted">
                {n} ramassage{n > 1 ? "s" : ""}
              </span>
            </h3>
            <div className="overflow-hidden rounded-2xl border border-admin-line bg-admin-card">
              {jours.map(([jour, liste]) => (
                <div key={jour} className="border-t border-admin-line-soft first:border-t-0">
                  <p className="bg-admin-subtle px-4 py-2 text-[12.5px] font-semibold text-admin-ink sm:px-5">
                    {nomJour(jour, aujourdhui)}
                    {(jour === aujourdhui || jour === demain) && <span className="font-normal text-admin-muted"> · {jourComplet(jour)}</span>}
                  </p>
                  <ul className="divide-y divide-admin-line-soft">
                    {liste.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => onOuvrir(r)}
                          className="admin-focus group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-admin-subtle sm:gap-4 sm:px-5"
                        >
                          <span className="w-[92px] shrink-0 pt-0.5 text-[13px] font-semibold tabular-nums text-admin-green sm:w-[124px]">
                            {plageHoraire(r)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-admin-ink [overflow-wrap:anywhere]">{nomRamassage(r)}</span>
                            {r.adresse && (
                              <span className="mt-0.5 flex items-center gap-1 text-[13px] text-admin-muted">
                                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                <span className="truncate">{r.adresse}</span>
                              </span>
                            )}
                            {r.notes && <span className="mt-0.5 block truncate text-[13px] text-admin-muted">{r.notes.split("\n")[0]}</span>}
                          </span>
                          <ChevronRight
                            className="mt-1 h-4 w-4 shrink-0 text-admin-faint transition-transform group-hover:translate-x-0.5 group-hover:text-admin-ink motion-reduce:transition-none"
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
