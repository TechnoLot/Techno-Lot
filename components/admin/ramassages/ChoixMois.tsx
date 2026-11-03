"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { lienVue, moisCourt, type VueRamassages } from "@/lib/ramassages/ramassages";

/**
 * Titre de la période qui ouvre le choix du mois : les 12 mois d'une année
 * (flèches pour changer d'année), avec le nombre de ramassages des mois à venir ;
 * un mois ouvre sa vue Mois.
 */
export default function ChoixMois({
  titre,
  vue,
  ancre,
  aujourdhui,
  comptes,
}: {
  titre: string;
  vue: VueRamassages;
  ancre: string;
  aujourdhui: string;
  /** Nombre de ramassages par mois (« YYYY-MM ») des 12 mois à venir */
  comptes: Map<string, number>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [annee, setAnnee] = useState(Number(ancre.slice(0, 4)));
  const boite = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const moisCourant = aujourdhui.slice(0, 7);
  const moisAffiche = ancre.slice(0, 7);

  // Échap ou clic à côté : ferme ; le focus revient au titre.
  useEffect(() => {
    if (!ouvert) return;
    const surClic = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOuvert(false);
      bouton.current?.focus();
    };
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouvert]);

  // À l'ouverture : focus sur le mois affiché (ou le mois courant).
  useEffect(() => {
    if (ouvert) boite.current?.querySelector<HTMLElement>("[data-cible]")?.focus();
  }, [ouvert]);

  function basculer() {
    setAnnee(Number(ancre.slice(0, 4)));
    setOuvert((o) => !o);
  }

  const fleche =
    "admin-focus flex h-8 w-8 items-center justify-center rounded-full text-admin-muted transition-colors hover:bg-admin-hover hover:text-admin-ink";
  const cible = Number(moisAffiche.slice(0, 4)) === annee ? moisAffiche : `${annee}-01`;

  return (
    <div ref={boite} className="relative">
      <button
        ref={bouton}
        type="button"
        onClick={basculer}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-controls={`${id}-mois`}
        title="Choisir un mois"
        className="admin-focus -ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-display text-lg font-semibold tracking-tight text-admin-ink transition-colors hover:bg-admin-hover"
      >
        <span aria-live="polite">{titre}</span>
        <ChevronDown
          className={`h-4 w-4 text-admin-muted transition-transform motion-reduce:transition-none ${ouvert ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {ouvert && (
        <div
          id={`${id}-mois`}
          role="dialog"
          aria-label="Choisir un mois"
          className="absolute left-0 top-full z-40 mt-2 w-[min(312px,calc(100vw-2rem))] rounded-2xl border border-admin-line bg-admin-card p-3 shadow-admin-pop"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setAnnee((a) => a - 1)} aria-label="Année précédente" className={fleche}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="font-display text-[15px] font-semibold tabular-nums text-admin-ink">{annee}</span>
            <button type="button" onClick={() => setAnnee((a) => a + 1)} aria-label="Année suivante" className={fleche}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <ul className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const premier = `${annee}-${String(i + 1).padStart(2, "0")}-01`;
              const cle = premier.slice(0, 7);
              const n = comptes.get(cle) ?? 0;
              const affiche = vue === "mois" && cle === moisAffiche;
              const courant = cle === moisCourant;
              const passe = cle < moisCourant;
              return (
                <li key={cle}>
                  <Link
                    href={lienVue("mois", courant ? null : premier)}
                    scroll={false}
                    onClick={() => setOuvert(false)}
                    data-cible={cle === cible ? "" : undefined}
                    aria-current={affiche ? "date" : undefined}
                    aria-label={`${moisCourt(premier)} ${annee}${n > 0 ? ` : ${n} ramassage${n > 1 ? "s" : ""}` : ""}`}
                    className={`admin-focus relative flex h-14 flex-col items-center justify-center rounded-xl text-[13px] font-semibold transition-colors ${
                      affiche
                        ? "bg-[#6bd63b] text-[#0a0a0a]"
                        : courant
                          ? "text-admin-ink ring-1 ring-inset ring-[#6bd63b] hover:bg-admin-subtle"
                          : passe
                            ? "text-admin-faint hover:bg-admin-subtle"
                            : "text-admin-ink hover:bg-admin-subtle"
                    }`}
                  >
                    <span>{moisCourt(premier)}</span>
                    {n > 0 && (
                      <span
                        aria-hidden
                        className={`mt-0.5 rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums ${
                          affiche ? "bg-[#0a0a0a]/10" : "bg-admin-tint-green text-admin-green"
                        }`}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href={lienVue("mois", null)}
            scroll={false}
            onClick={() => setOuvert(false)}
            className="admin-focus mt-2 flex justify-center rounded-lg py-1.5 text-[13px] font-semibold text-admin-green hover:underline"
          >
            Revenir au mois courant
          </Link>
        </div>
      )}
    </div>
  );
}
