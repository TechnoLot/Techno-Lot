"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import {
  VUES,
  ancreVoisine,
  bornesVue,
  compterParMois,
  lienVue,
  titreVue,
  type Ramassage,
  type VueRamassages,
} from "@/lib/ramassages/ramassages";
import { VueListe, VueMois, VueSemaine } from "./VuesRamassages";
import { MiniCalendrier, MoisAVenirListe, ProchainCompact, ProchainRamassage, type Prochain } from "./BarreLaterale";
import ChoixMois from "./ChoixMois";
import PanneauRamassage, { type Panneau } from "./PanneauRamassage";

/** Relecture de Google Agenda au retour sur l'onglet : au plus une fois par 30 s. */
const RELIRE_APRES_MS = 30_000;

/**
 * Calendrier des ramassages : barre latérale (prochain ramassage, mini-calendrier,
 * mois à venir) sur grand écran, barre de la période (flèches, choix du mois,
 * vues), vue Semaine, Mois ou Liste, et panneau du formulaire. Les
 * données viennent de Google Agenda à chaque affichage (page serveur) ; revenir
 * sur l'onglet les relit, pour voir ce qui a changé dans Google entre-temps.
 * Raccourcis : ← → période voisine, T aujourd'hui, N nouveau ramassage.
 */
export default function Ramassages({
  ramassages,
  aVenir,
  prochain,
  vue,
  ancre,
  aujourdhui,
  erreur,
}: {
  ramassages: Ramassage[];
  aVenir: Ramassage[];
  prochain: Prochain;
  vue: VueRamassages;
  ancre: string;
  aujourdhui: string;
  erreur: string | null;
}) {
  const router = useRouter();
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actualisation, startActualisation] = useTransition();
  const derniereLecture = useRef(Date.now());
  const panneauOuvert = useRef(false);
  const indicateurId = `vue-${useId()}`;
  const comptes = useMemo(() => compterParMois(aVenir), [aVenir]);

  useEffect(() => {
    panneauOuvert.current = panneau !== null;
  }, [panneau]);

  // Chaque nouvelle page serveur vient d'être lue dans Google.
  useEffect(() => {
    derniereLecture.current = Date.now();
  }, [ramassages]);

  const actualiser = useCallback(() => {
    derniereLecture.current = Date.now();
    startActualisation(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState !== "visible" || panneauOuvert.current) return;
      if (Date.now() - derniereLecture.current > RELIRE_APRES_MS) actualiser();
    };
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener("focus", auRetour);
    return () => {
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener("focus", auRetour);
    };
  }, [actualiser]);

  useEffect(() => {
    if (!message) return;
    const minuterie = window.setTimeout(() => setMessage(null), 5_000);
    return () => window.clearTimeout(minuterie);
  }, [message]);

  // Nouveau ramassage : aujourd'hui s'il est affiché, sinon le premier jour affiché.
  const { debut, fin } = bornesVue(vue, ancre, aujourdhui);
  const jourParDefaut = aujourdhui >= debut && aujourdhui <= fin ? aujourdhui : debut;
  const nouveau = useCallback((jour: string, heure?: string) => setPanneau({ mode: "nouveau", jour, heure }), []);
  const ouvrir = (r: Ramassage) => setPanneau({ mode: "modifier", ramassage: r });

  // Raccourcis clavier, hors des champs, du panneau et du choix du mois.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (panneauOuvert.current || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      const touche = e.key.toLowerCase();
      if (vue !== "liste" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        router.push(lienVue(vue, ancreVoisine(vue, ancre, e.key === "ArrowLeft" ? -1 : 1)), { scroll: false });
      } else if (touche === "t") {
        router.push(lienVue(vue, null), { scroll: false });
      } else if (touche === "n") {
        nouveau(jourParDefaut);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [router, vue, ancre, jourParDefaut, nouveau]);

  const precedent = vue === "mois" ? "Mois précédent" : "Semaine précédente";
  const suivant = vue === "mois" ? "Mois suivant" : "Semaine suivante";

  return (
    <>
      <PageHeader
        title="Calendrier"
        actions={
          <button type="button" onClick={() => nouveau(jourParDefaut)} title="Nouveau ramassage (N)" className="btn-primary">
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Nouveau ramassage
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[288px_minmax(0,1fr)]">
        <aside aria-label="Résumé des ramassages" className="hidden flex-col gap-4 xl:flex">
          <ProchainRamassage prochain={prochain} aujourdhui={aujourdhui} onOuvrir={ouvrir} onNouveau={() => nouveau(aujourdhui)} />
          <MiniCalendrier ramassages={ramassages} vue={vue} ancre={ancre} aujourdhui={aujourdhui} />
          <MoisAVenirListe aVenir={aVenir} vue={vue} ancre={ancre} aujourdhui={aujourdhui} />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 xl:hidden">
            <ProchainCompact prochain={prochain} aujourdhui={aujourdhui} onOuvrir={ouvrir} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-3">
            {vue !== "liste" && (
              <div className="flex items-center gap-1.5">
                <Link
                  href={lienVue(vue, ancreVoisine(vue, ancre, -1))}
                  scroll={false}
                  aria-label={precedent}
                  title={`${precedent} (←)`}
                  className="admin-btn !px-2"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Link>
                <Link href={lienVue(vue, null)} scroll={false} title="Aujourd’hui (T)" className="admin-btn">
                  Aujourd’hui
                </Link>
                <Link
                  href={lienVue(vue, ancreVoisine(vue, ancre, 1))}
                  scroll={false}
                  aria-label={suivant}
                  title={`${suivant} (→)`}
                  className="admin-btn !px-2"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}
            <ChoixMois titre={titreVue(vue, ancre)} vue={vue} ancre={ancre} aujourdhui={aujourdhui} comptes={comptes} />

            <nav aria-label="Vue du calendrier" className="admin-segment sm:ml-auto">
              {VUES.map((v) => {
                const active = v.cle === vue;
                return (
                  <Link
                    key={v.cle}
                    href={lienVue(v.cle, v.cle === "liste" || ancre === aujourdhui ? null : ancre)}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={`admin-focus relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                      active ? "text-admin-ink" : "text-admin-muted hover:text-admin-ink"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={indicateurId}
                        aria-hidden
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        className="absolute inset-0 rounded-full bg-[#6bd63b]"
                      />
                    )}
                    <span className="relative">{v.libelle}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <p role="status" className="sr-only">
            {actualisation ? "Lecture du calendrier…" : ""}
          </p>
          {message && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-admin-tint-green-line bg-admin-tint-green px-4 py-2.5 text-sm font-medium text-admin-tint-green-ink"
            >
              {message}
            </p>
          )}
          {erreur && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
            >
              {erreur}
            </div>
          )}

          <div className={`transition-opacity ${actualisation ? "opacity-70" : ""}`}>
            {vue === "semaine" && (
              <VueSemaine ramassages={ramassages} ancre={ancre} aujourdhui={aujourdhui} onOuvrir={ouvrir} onNouveau={nouveau} />
            )}
            {vue === "mois" && (
              <VueMois
                key={ancre.slice(0, 7)}
                ramassages={ramassages}
                ancre={ancre}
                aujourdhui={aujourdhui}
                onOuvrir={ouvrir}
                onNouveau={nouveau}
              />
            )}
            {vue === "liste" && (
              <VueListe aVenir={aVenir} aujourdhui={aujourdhui} onOuvrir={ouvrir} onNouveau={() => nouveau(aujourdhui)} />
            )}
          </div>
        </div>
      </div>

      <PanneauRamassage
        panneau={panneau}
        onFermer={() => setPanneau(null)}
        onTermine={(texte) => {
          setPanneau(null);
          setMessage(texte);
        }}
      />
    </>
  );
}
