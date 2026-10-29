"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, FileText, MailOpen, RotateCw, X } from "lucide-react";
import type { CourrielSoumission, PieceJointe, ReponseCourriel } from "@/lib/admin/courriel-types";

const TZ = "America/Toronto";

/** État de la lecture, gardé tant que le composant vit (réouvrir ne relit pas). */
type Lecture =
  | { statut: "inactif" }
  | { statut: "chargement" }
  | { statut: "reponse"; reponse: ReponseCourriel }
  | { statut: "session" }
  | { statut: "reseau" };

const FOCUSABLES = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/** « 28 oct. 2026, 10 h 39 » */
function formatDateHeure(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
}

/** « 340 Ko », « 1,2 Mo » */
function formatTaille(octets: number): string {
  const nombre = (n: number, decimales: number) =>
    new Intl.NumberFormat("fr-CA", { maximumFractionDigits: decimales }).format(n);
  if (octets < 1024) return `${nombre(octets, 0)} o`;
  if (octets < 1024 * 1024) return `${nombre(Math.max(1, Math.round(octets / 1024)), 0)} Ko`;
  return `${nombre(octets / (1024 * 1024), 1)} Mo`;
}

function estImage(p: PieceJointe): boolean {
  return p.type.toLowerCase().startsWith("image/");
}

/** Images et PDF s’affichent dans le navigateur ; le reste se télécharge. */
function sAffiche(p: PieceJointe): boolean {
  return estImage(p) || p.type.toLowerCase() === "application/pdf";
}

/** Lit la route admin et ramène toute réponse à un état affichable. */
async function lireCourriel(soumissionId: string, signal: AbortSignal): Promise<Lecture> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/soumissions/${encodeURIComponent(soumissionId)}/courriel`, {
      cache: "no-store",
      signal,
    });
  } catch {
    return { statut: "reseau" };
  }
  if (res.status === 401) return { statut: "session" };
  const corps: unknown = await res.json().catch(() => null);
  if (corps && typeof corps === "object") {
    if ("etat" in corps) return { statut: "reponse", reponse: corps as ReponseCourriel };
    // 404 et autres refus : { error }
    const erreur = (corps as { error?: unknown }).error;
    if (typeof erreur === "string" && erreur) {
      return { statut: "reponse", reponse: { etat: "erreur", message: erreur } };
    }
  }
  return { statut: "reseau" };
}

/**
 * « Voir le courriel » d’une soumission : ouvre, dans un panneau latéral, le
 * courriel que le formulaire du site a envoyé à info@technolot.ca (lu par la
 * route admin, jamais directement chez Hostinger).
 */
export default function VoirCourriel({ soumissionId, nom }: { soumissionId: string; nom: string | null }) {
  const reduce = useReducedMotion() ?? false;
  const [ouvert, setOuvert] = useState(false);
  const [lecture, setLecture] = useState<Lecture>({ statut: "inactif" });
  const declencheurRef = useRef<HTMLButtonElement>(null);
  const fermerRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  const requete = useRef<AbortController | null>(null);
  const dejaOuvert = useRef(false);
  const titreId = useId();

  const qui = nom?.trim() || "sans nom";

  const charger = useCallback(() => {
    requete.current?.abort();
    const controleur = new AbortController();
    requete.current = controleur;
    setLecture({ statut: "chargement" });
    void lireCourriel(soumissionId, controleur.signal).then((resultat) => {
      if (!controleur.signal.aborted) setLecture(resultat);
    });
  }, [soumissionId]);

  useEffect(() => () => requete.current?.abort(), []);

  function ouvrir() {
    setOuvert(true);
    if (lecture.statut === "inactif") charger();
  }

  const fermer = useCallback(() => setOuvert(false), []);

  // Focus : bouton Fermer à l’ouverture, retour au déclencheur à la fermeture.
  useEffect(() => {
    if (ouvert) {
      dejaOuvert.current = true;
      fermerRef.current?.focus();
    } else if (dejaOuvert.current) {
      declencheurRef.current?.focus();
    }
  }, [ouvert]);

  // Échap ferme + défilement de la page bloqué derrière.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = avant;
      window.removeEventListener("keydown", onKey);
    };
  }, [ouvert, fermer]);

  /** Tab reste dans le panneau tant qu’il est ouvert. */
  function garderFocus(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !panneauRef.current) return;
    const elements = Array.from(panneauRef.current.querySelectorAll<HTMLElement>(FOCUSABLES));
    if (elements.length === 0) return;
    const premier = elements[0];
    const dernier = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  }

  const courriel =
    lecture.statut === "reponse" && lecture.reponse.etat === "trouve" ? lecture.reponse.courriel : null;
  const chargement = lecture.statut === "chargement" || lecture.statut === "inactif";

  return (
    <>
      <button
        ref={declencheurRef}
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        aria-label={`Voir le courriel de la demande de ${qui}`}
        className="admin-btn"
      >
        <MailOpen className="h-3.5 w-3.5" aria-hidden />
        Voir le courriel
      </button>

      <AnimatePresence>
        {ouvert && (
          <>
            <motion.div
              key="fond"
              aria-hidden
              onClick={fermer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[80] bg-[#0a0a0a]/40"
            />
            <motion.div
              key="panneau"
              ref={panneauRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titreId}
              onKeyDown={garderFocus}
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: reduce ? 0.15 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[80] flex flex-col bg-admin-card text-admin-ink shadow-[0_16px_40px_-16px_rgba(10,10,10,0.35)] sm:left-auto sm:w-[640px] sm:max-w-full sm:border-l sm:border-admin-line"
            >
              <header className="flex items-start gap-3 border-b border-admin-line px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-admin-muted">Courriel reçu</p>
                  <h2 id={titreId} className="break-words text-[16px] font-semibold text-admin-ink">
                    {courriel ? courriel.sujet || "(Sans sujet)" : `Demande de ${qui}`}
                  </h2>
                  {courriel && (
                    <p className="mt-0.5 break-words text-[13px] text-admin-muted">
                      De {courriel.de} ·{" "}
                      <time dateTime={courriel.date}>{formatDateHeure(courriel.date)}</time>
                    </p>
                  )}
                </div>
                <button
                  ref={fermerRef}
                  type="button"
                  onClick={fermer}
                  aria-label="Fermer"
                  className="admin-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-admin-muted transition-colors hover:bg-admin-page hover:text-admin-ink"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </header>

              <div aria-busy={chargement} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {chargement ? (
                  <Squelette reduce={reduce} />
                ) : courriel ? (
                  <Contenu soumissionId={soumissionId} courriel={courriel} />
                ) : (
                  <Etat lecture={lecture} onReessayer={charger} />
                )}
              </div>

              <footer className="border-t border-admin-line px-5 py-3">
                <a
                  href={
                    courriel?.lienHostinger ??
                    `/api/admin/soumissions/${encodeURIComponent(soumissionId)}/courriel/hostinger`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Ouvrir dans Hostinger
                </a>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Squelette({ reduce }: { reduce: boolean }) {
  const pulse = reduce ? "" : "animate-pulse";
  return (
    <div className="flex flex-col gap-3">
      <span className="sr-only">Chargement du courriel…</span>
      {["w-11/12", "w-4/5", "w-2/3"].map((largeur) => (
        <div key={largeur} aria-hidden className={`h-3.5 rounded-full bg-admin-subtle ${largeur} ${pulse}`} />
      ))}
    </div>
  );
}

function Etat({ lecture, onReessayer }: { lecture: Lecture; onReessayer: () => void }) {
  let message: string;
  let reessayer = false;
  if (lecture.statut === "session") {
    message = "Ta session a expiré : reconnecte-toi.";
  } else if (lecture.statut === "reseau") {
    message = "Connexion impossible. Réessaie.";
    reessayer = true;
  } else if (lecture.statut === "reponse" && lecture.reponse.etat === "introuvable") {
    message = "Ce courriel est introuvable dans ta boîte (déplacé ou supprimé ?).";
  } else if (lecture.statut === "reponse" && lecture.reponse.etat === "non-configure") {
    message = "La Mail API Hostinger n’est pas encore branchée (clé HOSTINGER_MAIL_API_TOKEN).";
  } else if (lecture.statut === "reponse" && lecture.reponse.etat === "erreur") {
    message = lecture.reponse.message;
    reessayer = true;
  } else {
    return null;
  }

  return (
    <div role="status" className="rounded-xl border border-admin-line bg-admin-subtle px-4 py-4">
      <p className="text-[14px] text-admin-ink">{message}</p>
      {reessayer && (
        <button type="button" onClick={onReessayer} className="admin-btn mt-3">
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Réessayer
        </button>
      )}
    </div>
  );
}

function Contenu({ soumissionId, courriel }: { soumissionId: string; courriel: CourrielSoumission }) {
  const piecesId = useId();
  const urlPiece = (p: PieceJointe) =>
    `/api/admin/soumissions/${encodeURIComponent(soumissionId)}/courriel/pieces/${encodeURIComponent(p.id)}`;
  const images = courriel.piecesJointes.filter(estImage);
  const fichiers = courriel.piecesJointes.filter((p) => !estImage(p));

  return (
    <div className="flex flex-col gap-6">
      {courriel.html ? (
        // Fond blanc même en thème sombre : les courriels sont faits pour un fond blanc.
        <iframe
          sandbox=""
          srcDoc={courriel.html}
          title="Contenu du courriel"
          className="block h-[55vh] w-full rounded-xl border border-admin-line bg-white [color-scheme:light]"
        />
      ) : courriel.texte ? (
        <div className="whitespace-pre-wrap break-words rounded-xl border border-admin-line bg-admin-subtle px-4 py-3 text-[14px] text-admin-ink">
          {courriel.texte}
        </div>
      ) : (
        <p className="text-[14px] text-admin-muted">Ce courriel n’a aucun contenu à afficher.</p>
      )}

      {courriel.piecesJointes.length > 0 && (
        <section aria-labelledby={piecesId}>
          <h3 id={piecesId} className="text-[13px] font-semibold text-admin-ink">
            Pièces jointes ({courriel.piecesJointes.length})
          </h3>

          {images.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {images.map((p) => (
                <li key={p.id}>
                  <a
                    href={urlPiece(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={p.nom}
                    className="admin-focus block rounded-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- pièce servie par la route admin */}
                    <img
                      src={urlPiece(p)}
                      alt={p.nom}
                      loading="lazy"
                      className="h-24 w-24 rounded-lg border border-admin-line bg-admin-subtle object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}

          {fichiers.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {fichiers.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-admin-line px-3 py-2 text-[13px]"
                >
                  <FileText className="h-4 w-4 shrink-0 text-admin-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-admin-ink" title={p.nom}>
                    {p.nom}
                  </span>
                  <span className="shrink-0 tabular-nums text-admin-muted">{formatTaille(p.taille)}</span>
                  <a
                    href={urlPiece(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${sAffiche(p) ? "Ouvrir" : "Télécharger"} ${p.nom}`}
                    className="admin-focus shrink-0 rounded font-semibold text-admin-green hover:underline"
                  >
                    {sAffiche(p) ? "Ouvrir" : "Télécharger"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
