"use client";

import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, FileText, Loader2, Paperclip, RotateCcw } from "lucide-react";
import { relireSoumission } from "@/lib/acheteurs/actions";
import { analyserLigne, formaterArticle } from "@/lib/acheteurs/articles";
import { resumeFichiers, versArticle, type ArticlePanneau } from "@/lib/acheteurs/pieces";
import {
  ATTENTE_LONGUE_MS,
  LIMITES,
  MESSAGES_ECHEC_LECTURE,
  type ArticleLu,
  type LectureSoumission,
} from "@/lib/acheteurs/types";
import { BOUTON_DOUX, BOUTON_DOUX_COMPACT, LIEN } from "@/components/admin/soumissions/styles-acheteurs";

/*
 * Étape 1 du panneau « Trouver des acheteurs » : où en est la lecture des
 * pièces jointes par Claude, et les articles dont il doute, à confirmer un par
 * un. Tout vient d'une IA qui a lu un fichier public : affiché en texte simple,
 * et l'admin garde la décision.
 */

const SPINNER = "h-4 w-4 shrink-0 animate-spin text-admin-green motion-reduce:animate-none";

/** Heure courante, rafraîchie à l'intervalle donné (minutes écoulées). */
export function useMaintenant(intervalle: number): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const minuterie = window.setInterval(() => setMaintenant(Date.now()), intervalle);
    return () => window.clearInterval(minuterie);
  }, [intervalle]);
  return maintenant;
}

function BoiteAttente({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-admin-subtle px-4 py-3 text-[13px]" aria-live="polite">
      <Loader2 className={`mt-0.5 ${SPINNER}`} aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-admin-ink">{titre}</p>
        {children}
      </div>
    </div>
  );
}

/** État de la lecture des pièces jointes, sous le sous-titre de l'étape 1. */
export function BlocLecture({
  soumissionId,
  lecture,
  fichiers,
}: {
  soumissionId: string;
  lecture: LectureSoumission | null;
  fichiers: string[];
}) {
  const router = useRouter();
  const maintenant = useMaintenant(20_000);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();

  if (!lecture && fichiers.length === 0) return null;
  const resume = resumeFichiers(fichiers) || "les pièces jointes";

  function relire() {
    setErreur(null);
    demarrer(async () => {
      const r = await relireSoumission(soumissionId).catch(() => ({
        ok: false as const,
        error: "Relecture impossible (connexion ?). Réessayez.",
      }));
      if (r.ok) router.refresh();
      else setErreur(r.error);
    });
  }

  const lienRelire = (texte: string) => (
    <button type="button" onClick={relire} disabled={occupe} className={`${LIEN} inline-flex items-center gap-1 disabled:opacity-50`}>
      {occupe && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
      {texte}
    </button>
  );

  return (
    <div className="flex flex-col gap-2.5">
      {!lecture && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-admin-muted">
          <span className="flex min-w-0 items-start gap-2">
            <Paperclip className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {resume} : pas encore lu par Claude.
          </span>
          {lienRelire("Lire les pièces jointes")}
        </p>
      )}

      {lecture?.statut === "en_attente" && (
        <BoiteAttente titre={`Claude lira ${resume} dès que votre ordinateur passera.`}>
          {lecture.erreur ? (
            <p className="mt-0.5 text-admin-muted">{lecture.erreur}</p>
          ) : maintenant - Date.parse(lecture.demande_le) > ATTENTE_LONGUE_MS ? (
            <p className="mt-0.5 text-admin-warning">
              Votre ordinateur n&apos;a pas encore pris la lecture : il est peut-être éteint ou en veille. Elle partira
              toute seule dès qu&apos;il sera allumé.
            </p>
          ) : (
            <p className="mt-0.5 text-admin-muted">5 minutes au plus : la liste apparaîtra ici toute seule.</p>
          )}
        </BoiteAttente>
      )}

      {lecture?.statut === "en_cours" && (
        <BoiteAttente titre={`Claude lit ${resume}…`}>
          <p className="mt-0.5 text-admin-muted">Environ une minute : la liste apparaîtra ici toute seule.</p>
        </BoiteAttente>
      )}

      {lecture?.statut === "lue" && <ResultatLecture lecture={lecture} lienRelire={lienRelire} />}

      {lecture?.statut === "echec" && (
        <div className="flex flex-col items-start gap-2.5 rounded-2xl bg-admin-tint-red px-4 py-3 text-[13px] text-admin-danger">
          <p>{lecture.erreur ?? MESSAGES_ECHEC_LECTURE.autre}</p>
          <button type="button" onClick={relire} disabled={occupe} className={`${BOUTON_DOUX} disabled:opacity-50`}>
            {occupe ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden />
            )}
            Relire les pièces jointes
          </button>
        </div>
      )}

      {erreur && (
        <p role="alert" className="rounded-2xl bg-admin-tint-red px-4 py-3 text-[13px] text-admin-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Lecture finie : ce qui a été lu, ce qui ne l'a pas été, et pourquoi. */
function ResultatLecture({
  lecture,
  lienRelire,
}: {
  lecture: LectureSoumission;
  lienRelire: (texte: string) => React.ReactNode;
}) {
  const lues = lecture.pieces.filter((p) => p.lu).map((p) => p.nom);
  const avecRaison = lecture.pieces.filter((p) => p.raison);
  const ignores = lecture.articles_ignores;
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-admin-muted">
        <span className="flex min-w-0 items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {lues.length > 0 ? `Lu dans ${resumeFichiers(lues)}.` : "Aucune pièce lisible."}
        </span>
        {lienRelire("Relire")}
      </p>
      {ignores > 0 && (
        <p className="text-[13px] text-admin-muted">
          {ignores} ligne{ignores > 1 ? "s" : ""} non gardée{ignores > 1 ? "s" : ""} : {LIMITES.articles} articles au plus.
        </p>
      )}
      {lecture.articles.length === 0 && lues.length > 0 && (
        <p className="text-[13px] text-admin-muted">Claude n&apos;a trouvé aucun article dans ces pièces.</p>
      )}
      {avecRaison.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-2xl bg-admin-tint-amber px-4 py-3 text-[13px] text-admin-tint-amber-ink">
          {avecRaison.map((p, i) => (
            <li key={`${p.pieceId}-${i}`} className="break-words">
              <strong>{p.nom}</strong> : {p.raison}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Identifiant stable d'un doute : sa saisie et son animation le suivent quand un autre part de la liste. */
const identifiants = new WeakMap<ArticleLu, number>();
let prochainId = 0;

function idDe(article: ArticleLu): number {
  let id = identifiants.get(article);
  if (id === undefined) {
    id = prochainId++;
    identifiants.set(article, id);
  }
  return id;
}

/** Article gardé à partir de ce qui est affiché ; null si le champ ne contient plus rien d'utilisable. */
function articleConfirme(article: ArticleLu, valeur: string): ArticlePanneau | null {
  const analyse = analyserLigne(valeur);
  return analyse ? { ...analyse, photo: article.photos.length > 0, remarque: article.remarque } : null;
}

/** Articles dont Claude doute : l'admin les corrige, les confirme ou les retire. */
export function ArticlesAConfirmer({
  soumissionId,
  lecture,
  doutes,
  onConfirmer,
  onRetirer,
  onToutConfirmer,
}: {
  soumissionId: string;
  lecture: LectureSoumission | null;
  doutes: ArticleLu[];
  onConfirmer: (index: number, article: ArticlePanneau) => void;
  onRetirer: (index: number) => void;
  /** `confirmes` rejoignent la liste ; `restants` (champ vidé) restent à confirmer. */
  onToutConfirmer: (confirmes: ArticlePanneau[], restants: ArticleLu[]) => void;
}) {
  // Ici plutôt que dans chaque ligne : « Tout confirmer » prend les valeurs affichées.
  const [saisies, setSaisies] = useState<Record<number, string>>({});
  const champs = useRef(new Map<number, HTMLInputElement>());

  if (doutes.length === 0) return null;
  const valeurDe = (a: ArticleLu) => saisies[idDe(a)] ?? formaterArticle(versArticle(a));

  function confirmer(i: number) {
    const article = doutes[i];
    const garde = articleConfirme(article, valeurDe(article));
    if (garde) onConfirmer(i, garde);
    else champs.current.get(idDe(article))?.focus();
  }

  function toutConfirmer() {
    const confirmes: ArticlePanneau[] = [];
    const restants: ArticleLu[] = [];
    for (const article of doutes) {
      const garde = articleConfirme(article, valeurDe(article));
      if (garde) confirmes.push(garde);
      else restants.push(article);
    }
    onToutConfirmer(confirmes, restants);
    if (restants.length > 0) champs.current.get(idDe(restants[0]))?.focus();
  }

  return (
    <section className="rounded-3xl border border-admin-tint-amber-line bg-admin-tint-amber p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[14px] font-semibold text-admin-tint-amber-ink">À confirmer · {doutes.length}</h4>
        {doutes.length > 1 && (
          <button type="button" onClick={toutConfirmer} className={LIEN}>
            Tout confirmer
          </button>
        )}
      </div>
      <p className="text-[13px] text-admin-tint-amber-ink">
        Claude a un doute sur ces articles. Corrigez-les au besoin, puis confirmez.
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {doutes.map((article, i) => {
            const id = idDe(article);
            return (
              <ArticleDouteux
                key={id}
                soumissionId={soumissionId}
                lecture={lecture}
                article={article}
                valeur={valeurDe(article)}
                onValeur={(v) => setSaisies((avant) => ({ ...avant, [id]: v }))}
                onConfirmer={() => confirmer(i)}
                onRetirer={() => onRetirer(i)}
                refChamp={(champ) => {
                  if (champ) champs.current.set(id, champ);
                  else champs.current.delete(id);
                }}
              />
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function ArticleDouteux({
  soumissionId,
  lecture,
  article,
  valeur,
  onValeur,
  onConfirmer,
  onRetirer,
  refChamp,
}: {
  soumissionId: string;
  lecture: LectureSoumission | null;
  article: ArticleLu;
  valeur: string;
  onValeur: (valeur: string) => void;
  onConfirmer: () => void;
  onRetirer: () => void;
  refChamp: (champ: HTMLInputElement | null) => void;
}) {
  // Pendant qu'il s'efface, l'article garde ses anciens index : un double-clic toucherait son voisin.
  const present = useIsPresent();
  const confirmer = () => {
    if (present) onConfirmer();
  };
  const retirer = () => {
    if (present) onRetirer();
  };
  const photos = article.photos.slice(0, 2).flatMap((numero) => {
    const pieceId = lecture?.pieces.find((p) => p.numero === numero)?.pieceId;
    return pieceId ? [{ numero, pieceId }] : [];
  });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-wrap gap-3 rounded-2xl bg-admin-card p-3"
    >
      {photos.length > 0 && (
        <div className="flex shrink-0 gap-2">
          {photos.map(({ numero, pieceId }) => (
            <a
              key={numero}
              href={`/api/admin/soumissions/${encodeURIComponent(soumissionId)}/courriel/pieces/${encodeURIComponent(pieceId)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Voir la photo ${numero}`}
              className="admin-focus rounded-xl"
            >
              <img
                src={`/api/admin/soumissions/${encodeURIComponent(soumissionId)}/courriel/pieces/${encodeURIComponent(pieceId)}`}
                loading="lazy"
                alt={`Photo ${numero}`}
                className="h-16 w-16 rounded-xl object-cover ring-1 ring-admin-line"
              />
            </a>
          ))}
        </div>
      )}
      <div className="min-w-[min(100%,13rem)] flex-1">
        <input
          ref={refChamp}
          value={valeur}
          onChange={(e) => onValeur(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmer();
          }}
          aria-label="Article à confirmer"
          className="field h-9 w-full rounded-xl py-1 text-[13px]"
        />
        {article.remarque && <p className="mt-1.5 text-[13px] text-admin-muted">{article.remarque}</p>}
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={confirmer} className={BOUTON_DOUX_COMPACT}>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Confirmer
          </button>
          <button type="button" onClick={retirer} className={LIEN}>
            Retirer
          </button>
        </div>
      </div>
    </motion.li>
  );
}
