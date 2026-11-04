"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Lock,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { analyserLigne, estCourant, extraireArticles, formaterArticle } from "@/lib/acheteurs/articles";
import { annulerRecherche, demanderRecherche, etatLecture, etatRecherche } from "@/lib/acheteurs/actions";
import { departEnvoi, type DepartEnvoi } from "@/lib/acheteurs/envoi";
import { formaterPrix } from "@/lib/acheteurs/format";
import { articlesDeDepart, echecPerime, lectureEnCours, type ArticlePanneau } from "@/lib/acheteurs/pieces";
import { domainesDe } from "@/lib/acheteurs/recherche";
import {
  ATTENTE_LONGUE_MS,
  LIBELLES_CONFIANCE,
  MESSAGES_ECHEC,
  PART_OFFRE_EN_GROS,
  langueAcheteur,
  type AcheteurCarnet,
  type Article,
  type ArticleLu,
  type Langue,
  type LectureSoumission,
  type RechercheAcheteurs,
  type ResultatRecherche,
} from "@/lib/acheteurs/types";
import {
  envoyerLotEnGros,
  envoyerTestEnGros,
  verifierEnvoiEnGros,
  type ResultatVerification,
} from "@/lib/crm/envoi-en-gros-actions";
import { ArticlesAConfirmer, BlocLecture, useMaintenant } from "@/components/admin/soumissions/LecturePieces";
import { BOUTON_DOUX, BOUTON_PLEIN, LIEN } from "@/components/admin/soumissions/styles-acheteurs";

/*
 * Agent « Acheteurs » d'une soumission : un seul bouton sur la carte, puis un
 * panneau guidé en trois étapes.
 *   1. Les articles (retirer, ajouter), puis « Lancer la recherche » : elle
 *      est mise en file ; l'agent de l'ordinateur de l'utilisateur la prend
 *      dans les 5 minutes et fait chercher Claude (scripts/agent-acheteurs).
 *      La liste de départ vient de la lecture automatique des pièces jointes,
 *      sinon de la description du client.
 *   2. L'attente : son état est relu toutes les 15 secondes, même panneau
 *      fermé ; « Relancer » si elle échoue.
 *   3. Les acheteurs, un interrupteur chacun, puis « Écrire à N acheteurs » :
 *      vérification et envoi par les actions de l'Envoi en gros (info@,
 *      désabonnés exclus, limite du jour, traces), après une confirmation.
 * Le texte vient d'une IA qui a lu des pages Web : affiché en texte simple,
 * liens https seulement (déjà vérifiés par lib/acheteurs/reponse.ts).
 */

const SUIVI_MS = 15_000;
const jourCourtFmt = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", timeZone: "America/Toronto" });

function lienSur(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const enRecherche = (r: RechercheAcheteurs | null) => r?.statut === "en_attente" || r?.statut === "en_cours";

type Props = {
  soumissionId: string;
  /** En-tête du panneau : « Usine Exemple ltée · 2 nov. » */
  titre: string;
  /** Description de la soumission (texte après « Description : »). */
  description: string;
  recherche: RechercheAcheteurs | null;
  /** Lecture des pièces jointes par Claude. */
  lecture: LectureSoumission | null;
  /** Noms des pièces jointes de la soumission. */
  fichiers: string[];
  /** Ce qui désigne le client (`motsDuClient`) : jamais un article. */
  motsClient: string[];
  /** Fiches du carnet, par domaine. */
  acheteurs: Record<string, AcheteurCarnet>;
  /** Dernier échange du CRM, par courriel (minuscules) → date ISO. */
  contacts: Record<string, string>;
};

export default function AgentAcheteurs(props: Props) {
  const { soumissionId, recherche, lecture, motsClient, acheteurs, contacts, description } = props;
  const [ouvert, setOuvert] = useState(false);
  const niches = useMemo(
    () => extraireArticles(description, motsClient).filter((a) => !estCourant(a.description)).length,
    [description, motsClient],
  );
  useSuiviRecherche(soumissionId, recherche);
  useSuiviLecture(soumissionId, lecture);

  // Résumé de la carte : compagnies trouvées, fourchette de prix, offres déjà envoyées.
  const resultats = recherche?.resultats ?? null;
  const domaines = domainesDe(resultats);
  const depuis = recherche?.resultats_le;
  const envoyees = depuis
    ? domaines.filter((d) => {
        const c = acheteurs[d]?.courriel;
        const joint = c ? contacts[c.toLowerCase()] : undefined;
        return joint !== undefined && joint >= depuis;
      }).length
    : 0;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-admin-line pt-4">
      {recherche && enRecherche(recherche) ? (
        <>
          <span className="inline-flex items-center gap-2 text-[14px] text-admin-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-admin-tint-green text-admin-green">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            </span>
            <span className="font-semibold">
              {recherche.statut === "en_cours" ? "Claude cherche des acheteurs…" : "Recherche en file d'attente…"}
            </span>
            {resultats && (
              <span className="text-admin-muted">
                · {pluriel(domaines.length, "acheteur")} déjà trouvé{domaines.length > 1 ? "s" : ""}
              </span>
            )}
          </span>
          <button type="button" onClick={() => setOuvert(true)} className={`${BOUTON_DOUX} ml-auto`}>
            Suivre la recherche
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : recherche?.statut === "echec" && !resultats && !echecPerime(recherche, lecture) ? (
        <>
          <span className="inline-flex items-center gap-2 text-[14px] text-admin-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-admin-tint-red text-admin-danger">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="font-semibold">Recherche interrompue</span>
            <span className="text-admin-muted">· à relancer</span>
          </span>
          <button type="button" onClick={() => setOuvert(true)} className={`${BOUTON_DOUX} ml-auto`}>
            Voir
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : resultats ? (
        <>
          <span className="inline-flex items-center gap-2 text-[14px] text-admin-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-admin-tint-green text-admin-green">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="font-semibold">{pluriel(domaines.length, "acheteur")}</span>
            <span className="text-admin-muted">
              {envoyees > 0 ? `· offre envoyée à ${envoyees}` : `· ${fourchetteGlobale(resultats)}`}
            </span>
          </span>
          <button type="button" onClick={() => setOuvert(true)} className={`${BOUTON_DOUX} ml-auto`}>
            Voir les acheteurs
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setOuvert(true)} className={BOUTON_DOUX}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Trouver des acheteurs
          </button>
          <IndiceCarte lecture={lecture} niches={niches} />
        </>
      )}

      <Panneau {...props} ouvert={ouvert} onFermer={() => setOuvert(false)} />
    </div>
  );
}

/** Texte à côté de « Trouver des acheteurs » : où en est la lecture, sinon l'indice des articles nichés. */
function IndiceCarte({ lecture, niches }: { lecture: LectureSoumission | null; niches: number }) {
  if (lectureEnCours(lecture)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-admin-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-admin-green motion-reduce:animate-none" aria-hidden />
        {lecture?.statut === "en_cours" ? "Claude lit les pièces jointes…" : "Lecture des pièces jointes en file d'attente…"}
      </span>
    );
  }
  if (lecture?.statut === "lue" && lecture.articles.length > 0) {
    const lus = lecture.articles.length;
    const doutes = lecture.articles.filter((a) => a.verification === "doute").length;
    return (
      <span className="text-[13px] text-admin-muted">
        {`${pluriel(lus, "article")} lu${lus > 1 ? "s" : ""} dans les pièces jointes`}
        {doutes > 0 && (
          <>
            {" · "}
            <span className="font-medium text-admin-warning">{doutes} à confirmer</span>
          </>
        )}
      </span>
    );
  }
  return (
    <span className="text-[13px] text-admin-muted">
      {lecture?.statut === "echec"
        ? "Pièces jointes non lues : ouvrez le panneau pour les relire."
        : niches > 0
          ? `${pluriel(niches, "article")} niché${niches > 1 ? "s" : ""} : Claude cherche qui les rachète, et à quel prix.`
          : "Articles courants : vous avez peut-être déjà votre acheteur."}
    </span>
  );
}

/**
 * Travail en file ou en cours sur l'ordinateur : son état est relu toutes les
 * 15 secondes (et au retour sur l'onglet), même panneau fermé ; la page se
 * recharge dès qu'il change. `lire` rend la signature de l'état (null : illisible)
 * et doit être stable.
 */
function useSuivi(
  soumissionId: string,
  actif: boolean,
  signature: string,
  lire: (soumissionId: string) => Promise<string | null>,
) {
  const router = useRouter();

  useEffect(() => {
    if (!actif) return;
    let arrete = false;
    async function relire() {
      if (document.hidden) return;
      const lue = await lire(soumissionId).catch(() => null);
      if (arrete || lue === null) return;
      if (lue !== signature) router.refresh();
    }
    const minuterie = window.setInterval(relire, SUIVI_MS);
    document.addEventListener("visibilitychange", relire);
    return () => {
      arrete = true;
      window.clearInterval(minuterie);
      document.removeEventListener("visibilitychange", relire);
    };
  }, [actif, signature, soumissionId, lire, router]);
}

async function signatureRecherche(soumissionId: string): Promise<string | null> {
  const r = await etatRecherche(soumissionId);
  return r.ok ? `${r.statut ?? ""}|${r.prisLe ?? ""}|${r.erreur ?? ""}` : null;
}

async function signatureLecture(soumissionId: string): Promise<string | null> {
  const l = await etatLecture(soumissionId);
  return l.ok ? `${l.statut ?? ""}|${l.prisLe ?? ""}|${l.lueLe ?? ""}|${l.erreur ?? ""}` : null;
}

function useSuiviRecherche(soumissionId: string, recherche: RechercheAcheteurs | null) {
  const signature = recherche ? `${recherche.statut}|${recherche.pris_le ?? ""}|${recherche.erreur ?? ""}` : "";
  useSuivi(soumissionId, enRecherche(recherche), signature, signatureRecherche);
}

function useSuiviLecture(soumissionId: string, lecture: LectureSoumission | null) {
  const signature = lecture
    ? `${lecture.statut}|${lecture.pris_le ?? ""}|${lecture.lue_le ?? ""}|${lecture.erreur ?? ""}`
    : "";
  useSuivi(soumissionId, lectureEnCours(lecture), signature, signatureLecture);
}

/** « 120 à 580 $ US » sur toutes les lignes qui ont un prix (même devise), sinon « prix à confirmer ». */
function fourchetteGlobale(r: ResultatRecherche): string {
  const prix = r.familles.flatMap((f) => f.lignes.map((l) => l.prix)).filter((p) => p.bas != null || p.haut != null);
  if (prix.length === 0) return "prix à confirmer";
  const devise = prix[0].devise;
  const memes = prix.filter((p) => p.devise === devise);
  const bas = Math.min(...memes.map((p) => (p.bas ?? p.haut) as number));
  const haut = Math.max(...memes.map((p) => (p.haut ?? p.bas) as number));
  return formaterPrix({ bas, haut, devise, base: null, sources: [] });
}

type Etape = 1 | 2 | 3;

/** Étape qui correspond à l'état de la recherche (une recherche ratée sur une vieille liste ne compte plus). */
function etapeDe(r: RechercheAcheteurs | null, l: LectureSoumission | null): Etape {
  if (!r || echecPerime(r, l)) return 1;
  if (r.statut === "resultats") return r.resultats ? 3 : 1;
  return 2;
}

function Panneau({
  soumissionId,
  titre,
  description,
  recherche,
  lecture,
  fichiers,
  motsClient,
  acheteurs,
  contacts,
  ouvert,
  onFermer,
}: Props & { ouvert: boolean; onFermer: () => void }) {
  const [racine, setRacine] = useState<HTMLElement | null>(null);
  const [etape, setEtape] = useState<Etape>(() => etapeDe(recherche, lecture));
  // « Chercher d'autres acheteurs » : la prochaine recherche exclut les compagnies déjà trouvées.
  const [autres, setAutres] = useState(false);
  // Lancée à l'instant : l'attente s'affiche avant que la page soit rechargée.
  const [vientDeLancer, setVientDeLancer] = useState(false);
  const depart = useMemo(
    () => articlesDeDepart({ recherche, lecture, description, mots: motsClient }),
    [recherche, lecture, description, motsClient],
  );
  const [articles, setArticles] = useState<ArticlePanneau[]>(depart.articles);
  const [doutes, setDoutes] = useState<ArticleLu[]>(depart.doutes);
  const panneauRef = useRef<HTMLDivElement>(null);
  const resultats = recherche?.resultats ?? null;

  // Le panneau vit dans la racine de l'admin (thème clair ou sombre).
  useEffect(() => {
    setRacine((document.querySelector("[data-admin-theme]") as HTMLElement | null) ?? document.body);
  }, []);

  // La recherche change (lancée, prise, résultats, échec) : on va à l'étape qui lui correspond.
  const signature = recherche ? `${recherche.statut}|${recherche.demande_le}|${recherche.resultats_le ?? ""}` : "";
  const etapeNaturelle = etapeDe(recherche, lecture);
  useEffect(() => {
    setEtape(etapeNaturelle);
    setAutres(false);
    setVientDeLancer(false);
  }, [signature, etapeNaturelle]);

  // Nouvelle lecture ou recherche : la liste repart de ce qu'elles proposent.
  const cleDepart = `${lecture?.lue_le ?? ""}|${recherche?.demande_le ?? ""}|${recherche?.statut ?? ""}`;
  useEffect(() => {
    setArticles(depart.articles);
    setDoutes(depart.doutes);
  }, [cleDepart]);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", surTouche);
    panneauRef.current?.focus();
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouvert, onFermer]);

  if (!racine) return null;
  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <div className="fixed inset-0 z-[70] flex justify-end" key="panneau-acheteurs">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFermer}
          />
          <motion.div
            ref={panneauRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`panneau-acheteurs-${soumissionId}`}
            className="relative flex h-full w-full max-w-[600px] flex-col bg-admin-page text-admin-ink shadow-2xl outline-none sm:rounded-l-3xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
              <div className="min-w-0">
                <h2 id={`panneau-acheteurs-${soumissionId}`} className="flex items-center gap-2 font-display text-xl font-bold">
                  <Sparkles className="h-5 w-5 text-admin-green" aria-hidden />
                  Trouver des acheteurs
                </h2>
                <p className="mt-0.5 truncate text-[13px] text-admin-muted">{titre}</p>
              </div>
              <button
                type="button"
                onClick={onFermer}
                aria-label="Fermer"
                className="admin-focus flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-admin-muted transition hover:bg-admin-subtle hover:text-admin-ink"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <Etapes etape={etape} />

            {/* Pas de marge du bas ici : les barres d'action collantes restent au ras du bas. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-7">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={etape}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.18 }}
                >
                  {etape === 1 && (
                    <EtapeArticles
                      soumissionId={soumissionId}
                      lecture={lecture}
                      fichiers={fichiers}
                      articles={articles}
                      onArticles={setArticles}
                      doutes={doutes}
                      onDoutes={setDoutes}
                      autres={autres}
                      exclus={autres ? domainesDe(resultats).length : 0}
                      occupee={enRecherche(recherche)}
                      onLancee={() => {
                        setVientDeLancer(true);
                        setEtape(2);
                      }}
                      onRetour={resultats ? () => setEtape(3) : undefined}
                    />
                  )}
                  {etape === 2 && (
                    <EtapeRecherche
                      soumissionId={soumissionId}
                      recherche={recherche}
                      articles={articles}
                      vientDeLancer={vientDeLancer}
                      onModifier={() => setEtape(1)}
                      onAcheteurs={resultats ? () => setEtape(3) : undefined}
                    />
                  )}
                  {etape === 3 && recherche && resultats && (
                    <EtapeAcheteurs
                      recherche={recherche}
                      resultats={resultats}
                      acheteurs={acheteurs}
                      contacts={contacts}
                      onAutres={() => {
                        setAutres(true);
                        setEtape(1);
                      }}
                      onSuivre={enRecherche(recherche) ? () => setEtape(2) : undefined}
                      onFermer={onFermer}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    racine,
  );
}

const NOMS_ETAPES = ["Articles", "Recherche", "Acheteurs"] as const;

function Etapes({ etape }: { etape: Etape }) {
  return (
    <ol className="mx-5 mb-4 grid grid-cols-3 gap-2 sm:mx-7" aria-label="Étapes">
      {NOMS_ETAPES.map((nom, i) => {
        const n = (i + 1) as Etape;
        const faite = n < etape;
        const courante = n === etape;
        return (
          <li key={nom} className="flex flex-col gap-1.5" aria-current={courante ? "step" : undefined}>
            <span
              className={`h-1.5 rounded-full transition-colors duration-300 ${faite || courante ? "bg-[#5ECB33]" : "bg-admin-line"}`}
            />
            <span className={`text-[12px] font-semibold ${courante ? "text-admin-ink" : "text-admin-muted"}`}>
              {faite ? "✓ " : `${n}. `}
              {nom}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------- */
/* 1. Articles                                                       */
/* ---------------------------------------------------------------- */

function EtapeArticles({
  soumissionId,
  lecture,
  fichiers,
  articles,
  onArticles: setArticles,
  doutes,
  onDoutes: setDoutes,
  autres,
  exclus,
  occupee,
  onLancee,
  onRetour,
}: {
  soumissionId: string;
  lecture: LectureSoumission | null;
  fichiers: string[];
  articles: ArticlePanneau[];
  onArticles: (maj: (avant: ArticlePanneau[]) => ArticlePanneau[]) => void;
  /** Articles dont Claude doute, à confirmer avant la recherche. */
  doutes: ArticleLu[];
  onDoutes: (maj: (avant: ArticleLu[]) => ArticleLu[]) => void;
  autres: boolean;
  /** Compagnies déjà trouvées, exclues d'une recherche « d'autres acheteurs ». */
  exclus: number;
  /** Une recherche est déjà en file ou en cours. */
  occupee: boolean;
  onLancee: () => void;
  onRetour?: () => void;
}) {
  const router = useRouter();
  const [ajout, setAjout] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();

  function ajouter() {
    const a = ajout ? analyserLigne(ajout) : null;
    if (a) setArticles((avant) => [...avant, a]);
    setAjout(null);
  }

  function lancer() {
    setErreur(null);
    demarrer(async () => {
      const r = await demanderRecherche({
        soumissionId,
        articles: articles.map(formaterArticle).join("\n"),
        autres,
      }).catch(() => ({ ok: false as const, error: "Recherche impossible (connexion ?). Réessayez." }));
      if (!r.ok) {
        setErreur(r.error);
        return;
      }
      onLancee();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <h3 className="text-[17px] font-semibold">Ce que Claude va chercher</h3>
        <p className="mt-1 text-[14px] text-admin-muted">
          Des compagnies qui rachètent ces articles en gros, et à quel prix
          {exclus > 0 ? ` (sans les ${exclus} déjà trouvées)` : ""}.
        </p>
      </div>

      <BlocLecture soumissionId={soumissionId} lecture={lecture} fichiers={fichiers} />

      <ArticlesAConfirmer
        soumissionId={soumissionId}
        lecture={lecture}
        doutes={doutes}
        onConfirmer={(i, article) => {
          setDoutes((avant) => avant.filter((_, j) => j !== i));
          setArticles((avant) => [...avant, article]);
        }}
        onRetirer={(i) => setDoutes((avant) => avant.filter((_, j) => j !== i))}
        onToutConfirmer={(confirmes, restants) => {
          setDoutes(() => restants);
          setArticles((avant) => [...avant, ...confirmes]);
        }}
      />

      <ul className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {articles.map((a, i) => (
            <motion.li
              key={`${a.description}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              title={a.remarque ?? undefined}
              className="group inline-flex max-w-full items-center gap-2 rounded-full border border-admin-line bg-admin-card py-1.5 pl-1.5 pr-2 text-[13px]"
            >
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-admin-tint-green px-1.5 text-[11px] font-bold tabular-nums text-admin-green">
                {a.quantite ?? "?"}
              </span>
              <span className="min-w-0 truncate">{a.description}</span>
              {a.photo && <Camera className="h-3 w-3 shrink-0 text-admin-green" role="img" aria-label="Vu sur une photo" />}
              <button
                type="button"
                onClick={() => setArticles((avant) => avant.filter((_, j) => j !== i))}
                aria-label={`Retirer ${formaterArticle(a)}`}
                className="admin-focus flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-admin-faint transition hover:bg-admin-subtle hover:text-admin-danger"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        <li>
          {ajout === null ? (
            <button
              type="button"
              onClick={() => setAjout("")}
              className="admin-focus inline-flex items-center gap-1.5 rounded-full border border-dashed border-admin-line px-3 py-1.5 text-[13px] font-medium text-admin-muted transition hover:border-[#5ECB33] hover:text-admin-ink"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Ajouter un article
            </button>
          ) : (
            <input
              autoFocus
              value={ajout}
              onChange={(e) => setAjout(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ajouter();
                if (e.key === "Escape") setAjout(null);
              }}
              onBlur={ajouter}
              placeholder="12 × Cisco Meraki MR57"
              aria-label="Nouvel article (quantité × modèle)"
              className="field h-9 w-64 rounded-full py-1 text-[13px]"
            />
          )}
        </li>
      </ul>

      <p className="flex items-start gap-2 rounded-2xl bg-admin-subtle px-4 py-3 text-[13px] text-admin-muted">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {fichiers.length > 0
          ? "Pour lire les pièces jointes, Claude reçoit le texte des fichiers (coordonnées du client masquées) et les photos, sans leurs métadonnées, mais il n'a aucun accès au Web. Pour la recherche, seuls ces articles partent vers Claude."
          : "Seuls ces articles partent vers Claude : jamais le nom ni les coordonnées du client."}
      </p>

      {erreur && (
        <p role="alert" className="rounded-2xl bg-admin-tint-red px-4 py-3 text-[13px] text-admin-danger">
          {erreur}
        </p>
      )}

      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={lancer}
          disabled={envoi || occupee || articles.length === 0 || doutes.length > 0}
          className={BOUTON_PLEIN}
        >
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Lancer la recherche
        </button>
        <p className="text-[13px] text-admin-muted">
          {doutes.length > 0
            ? `Confirmez ou retirez ${pluriel(doutes.length, "article")} pour lancer la recherche.`
            : occupee
              ? "Une recherche est déjà en cours pour cette soumission."
              : lectureEnCours(lecture)
                ? articles.length === 0
                  ? "Attendez la liste de Claude, ou ajoutez des articles à la main."
                  : "Claude lit encore les pièces jointes : sa liste remplacera celle-ci."
                : "Claude cherche depuis votre ordinateur, avec votre forfait : rien à payer. Comptez 5 à 15 minutes."}
        </p>
        {onRetour && (
          <button type="button" onClick={onRetour} className={`${LIEN} inline-flex items-center gap-1`}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Retour aux acheteurs
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 2. Recherche                                                      */
/* ---------------------------------------------------------------- */

type Phase = { nom: string; detail: string | null; etat: "faite" | "courante" | "a_venir" };

function EtapeRecherche({
  soumissionId,
  recherche,
  articles,
  vientDeLancer,
  onModifier,
  onAcheteurs,
}: {
  soumissionId: string;
  recherche: RechercheAcheteurs | null;
  /** Articles du panneau (ceux de la recherche, sinon ceux de la soumission). */
  articles: Article[];
  vientDeLancer: boolean;
  onModifier: () => void;
  onAcheteurs?: () => void;
}) {
  const router = useRouter();
  const maintenant = useMaintenant(20_000);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();

  const statut = vientDeLancer || !recherche || recherche.statut === "resultats" ? "en_attente" : recherche.statut;
  const prise = statut === "en_cours";
  const minutes = (iso: string | null | undefined) =>
    iso ? Math.max(0, Math.floor((maintenant - Date.parse(iso)) / 60_000)) : 0;
  const ilYa = (iso: string | null | undefined) => {
    const m = minutes(iso);
    return m < 1 ? "à l'instant" : `il y a ${m} min`;
  };
  const demandeLe = vientDeLancer ? null : (recherche?.demande_le ?? null);
  const attenteLongue =
    statut === "en_attente" && demandeLe !== null && maintenant - Date.parse(demandeLe) > ATTENTE_LONGUE_MS;
  // En attente avec un message : plafond de 24 h atteint (lib/acheteurs/file.ts).
  const avis = statut === "en_attente" && !vientDeLancer ? (recherche?.erreur ?? null) : null;

  function agir(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setErreur(null);
    demarrer(async () => {
      const r = await action().catch(() => ({ ok: false as const, error: "Action impossible (connexion ?). Réessayez." }));
      if (r.ok) router.refresh();
      else setErreur(r.error);
    });
  }
  const relancer = () =>
    agir(() =>
      demanderRecherche({
        soumissionId,
        articles: articles.map(formaterArticle).join("\n"),
        autres: (recherche?.exclus ?? 0) > 0,
      }),
    );
  const annuler = () => agir(() => annulerRecherche(soumissionId));

  if (statut === "echec") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-tint-red text-admin-danger"
        >
          <AlertTriangle className="h-8 w-8" aria-hidden />
        </motion.span>
        <div>
          <p className="font-display text-xl font-bold">La recherche n&apos;a pas abouti</p>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-admin-muted">{recherche?.erreur ?? MESSAGES_ECHEC.autre}</p>
        </div>
        {erreur && (
          <p role="alert" className="rounded-2xl bg-admin-tint-red px-4 py-3 text-[13px] text-admin-danger">
            {erreur}
          </p>
        )}
        <button type="button" onClick={relancer} disabled={occupe} className={BOUTON_PLEIN}>
          {occupe ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
          Relancer la recherche
        </button>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <button type="button" onClick={onModifier} disabled={occupe} className={LIEN}>
            Modifier les articles
          </button>
          <button type="button" onClick={annuler} disabled={occupe} className={LIEN}>
            {recherche?.resultats ? "Revenir aux acheteurs" : "Ne plus chercher"}
          </button>
        </div>
      </div>
    );
  }

  const phases: Phase[] = [
    { nom: "Demande envoyée", detail: ilYa(demandeLe), etat: "faite" },
    {
      nom: "Votre ordinateur la prend",
      detail: prise ? ilYa(recherche?.pris_le) : "dans les 5 minutes",
      etat: prise ? "faite" : "courante",
    },
    {
      nom: "Claude cherche sur le Web",
      detail: prise ? `depuis ${Math.max(1, minutes(recherche?.pris_le))} min · 5 à 15 min en tout` : null,
      etat: prise ? "courante" : "a_venir",
    },
    { nom: "Acheteurs et prix", detail: null, etat: "a_venir" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 pb-8 pt-6 text-center">
      <Radar actif={prise} />
      <div aria-live="polite">
        <p className="font-display text-xl font-bold">{prise ? "Claude cherche des acheteurs…" : "C'est parti !"}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-admin-muted">
          {prise
            ? "Il visite les sites des revendeurs et vérifie les prix sur eBay."
            : "La recherche attend votre ordinateur, qui passe toutes les 5 minutes."}
        </p>
      </div>

      <ol className="w-full max-w-sm text-left">
        {phases.map((p, i) => (
          <li key={p.nom} className="relative flex gap-3 pb-4 last:pb-0">
            {i < phases.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[11px] top-6 h-[calc(100%-20px)] w-0.5 rounded-full ${p.etat === "faite" ? "bg-[#5ECB33]" : "bg-admin-line"}`}
              />
            )}
            <span
              className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                p.etat === "faite"
                  ? "bg-[#5ECB33] text-[#0a0a0a]"
                  : p.etat === "courante"
                    ? "bg-admin-tint-green text-admin-green ring-2 ring-[#5ECB33]/50"
                    : "bg-admin-subtle text-admin-faint"
              }`}
            >
              {p.etat === "faite" ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : p.etat === "courante" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              )}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className={`block text-[14px] font-semibold ${p.etat === "a_venir" ? "text-admin-muted" : ""}`}>
                {p.nom}
              </span>
              {p.detail && <span className="block text-[12px] text-admin-muted">{p.detail}</span>}
            </span>
          </li>
        ))}
      </ol>

      {(avis || attenteLongue) && (
        <p className="max-w-sm rounded-2xl bg-admin-tint-amber px-4 py-3 text-left text-[13px] text-admin-warning">
          {avis ??
            "Votre ordinateur n'a pas encore pris la recherche : il est peut-être éteint ou en veille. Elle partira toute seule dès qu'il sera allumé."}
        </p>
      )}
      {erreur && (
        <p role="alert" className="rounded-2xl bg-admin-tint-red px-4 py-3 text-[13px] text-admin-danger">
          {erreur}
        </p>
      )}

      <p className="max-w-sm text-[13px] text-admin-muted">
        Vous pouvez fermer ce panneau : les acheteurs apparaîtront sur la soumission dès qu&apos;ils seront trouvés.
      </p>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {onAcheteurs && (
          <button type="button" onClick={onAcheteurs} className={`${LIEN} inline-flex items-center gap-1`}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Voir les acheteurs déjà trouvés
          </button>
        )}
        {!vientDeLancer && (
          <button type="button" onClick={annuler} disabled={occupe} className={LIEN}>
            Annuler la recherche
          </button>
        )}
      </div>
    </div>
  );
}

/** Cercles qui s'élargissent autour de l'étincelle pendant l'attente (immobiles si l'animation est réduite). */
function Radar({ actif }: { actif: boolean }) {
  const reduit = useReducedMotion();
  return (
    <span className="relative flex h-28 w-28 items-center justify-center" aria-hidden>
      {!reduit &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={`${actif}-${i}`}
            className="absolute inset-0 rounded-full border-2 border-[#5ECB33]"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: [0.55, 1.15], opacity: [actif ? 0.55 : 0.3, 0] }}
            transition={{ duration: actif ? 2.4 : 3.6, repeat: Infinity, delay: i * (actif ? 0.8 : 1.2), ease: "easeOut" }}
          />
        ))}
      <motion.span
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#5ECB33] text-[#0a0a0a] shadow-[0_10px_40px_-10px_rgba(94,203,51,0.9)]"
        animate={reduit ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="h-7 w-7" />
      </motion.span>
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* 3. Acheteurs et envoi                                             */
/* ---------------------------------------------------------------- */

type Groupe = DepartEnvoi & { verif: ResultatVerification };
type Vue = "liste" | "confirmer" | "envoi" | "envoye";

function EtapeAcheteurs({
  recherche,
  resultats,
  acheteurs,
  contacts,
  onAutres,
  onSuivre,
  onFermer,
}: {
  recherche: RechercheAcheteurs;
  resultats: ResultatRecherche;
  acheteurs: Record<string, AcheteurCarnet>;
  contacts: Record<string, string>;
  onAutres: () => void;
  /** Une nouvelle recherche est en file ou en cours : la suivre. */
  onSuivre?: () => void;
  onFermer: () => void;
}) {
  const router = useRouter();
  const familles = resultats.familles;
  const courriels = resultats.courriels;

  // Une ligne par compagnie : celles qui rachètent du surplus d'abord.
  const fiches = useMemo(() => {
    const parDomaine = new Map<string, { fiche: AcheteurCarnet; familles: string[]; raison: string | null; preuve: string; surplus: boolean }>();
    for (const f of familles) {
      for (const a of f.acheteurs) {
        const fiche = acheteurs[a.domaine];
        if (!fiche) continue;
        const deja = parDomaine.get(a.domaine);
        if (deja) {
          deja.familles.push(f.nom);
          deja.surplus ||= a.confiance === "achete_surplus";
        } else {
          parDomaine.set(a.domaine, {
            fiche,
            familles: [f.nom],
            raison: a.raison,
            preuve: a.preuve,
            surplus: a.confiance === "achete_surplus",
          });
        }
      }
    }
    return [...parDomaine.values()].sort(
      (x, y) => Number(y.surplus) - Number(x.surplus) || Number(Boolean(y.fiche.courriel)) - Number(Boolean(x.fiche.courriel)),
    );
  }, [familles, acheteurs]);

  const dejaJoint = (f: AcheteurCarnet) => (f.courriel ? (contacts[f.courriel.toLowerCase()] ?? null) : null);
  const [choisis, setChoisis] = useState<Set<string>>(
    () => new Set(fiches.filter((x) => x.fiche.courriel && !dejaJoint(x.fiche)).map((x) => x.fiche.domaine)),
  );
  const [prixOuverts, setPrixOuverts] = useState(false);
  const [vue, setVue] = useState<Vue>("liste");
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [envoyes, setEnvoyes] = useState(0);
  const [occupe, demarrer] = useTransition();

  const selection = fiches.filter((x) => choisis.has(x.fiche.domaine) && x.fiche.courriel).map((x) => x.fiche);
  const surplus = fiches.filter((x) => x.surplus).length;
  const total = groupes.reduce((n, g) => n + g.verif.prets, 0);

  function basculer(domaine: string) {
    setChoisis((avant) => {
      const apres = new Set(avant);
      if (apres.has(domaine)) apres.delete(domaine);
      else apres.add(domaine);
      return apres;
    });
  }

  /** « Écrire à N acheteurs » : un envoi par langue, vérifié (lecture seule) avant la confirmation. */
  function preparer() {
    setErreur(null);
    setMessage(null);
    demarrer(async () => {
      const prets: Groupe[] = [];
      for (const langue of ["fr", "en"] as Langue[]) {
        const depart = departEnvoi(selection, courriels[langue], langue);
        if (!depart) continue;
        const verif = await verifierEnvoiEnGros({
          destinataires: depart.texte,
          objet: depart.objet,
          corps: depart.corps,
        }).catch(() => ({ ok: false as const, error: "Vérification impossible (connexion ?). Réessayez." }));
        if (!verif.ok) {
          setErreur(verif.error);
          return;
        }
        prets.push({ ...depart, verif });
      }
      if (prets.length === 0) {
        setErreur("Aucun courriel proposé par Claude pour ces compagnies : recommencez la recherche.");
        return;
      }
      setGroupes(prets);
      setVue("confirmer");
    });
  }

  function modifierGroupe(i: number, champ: "objet" | "corps", valeur: string) {
    setGroupes((avant) => avant.map((g, j) => (j === i ? { ...g, [champ]: valeur } : g)));
  }

  function test() {
    const g = groupes[0];
    if (!g) return;
    setMessage(null);
    demarrer(async () => {
      const res = await envoyerTestEnGros({ destinataires: g.texte, objet: g.objet, corps: g.corps }).catch(() => ({
        ok: false as const,
        error: "Test impossible (connexion ?).",
      }));
      setMessage(res.ok ? `Test envoyé à ${res.a}.` : res.error);
    });
  }

  /** Envoi réel : lot après lot, avec la confirmation exigée par l'Envoi en gros (nombre vérifié). */
  function envoyer() {
    setErreur(null);
    setVue("envoi");
    demarrer(async () => {
      let envoyesTotal = 0;
      for (const g of groupes) {
        if (g.verif.prets === 0) continue;
        let deja = 0;
        for (let tour = 0; tour < 60; tour++) {
          const r = await envoyerLotEnGros({
            destinataires: g.texte,
            objet: g.objet,
            corps: g.corps,
            confirme: true,
            nombre: g.verif.prets,
            dejaEnvoyes: deja,
          }).catch(() => ({ ok: false as const, error: "Envoi interrompu (connexion ?). Regardez dans Envoyés avant de réessayer." }));
          if (!r.ok) {
            setErreur(r.error);
            setEnvoyes(envoyesTotal);
            setVue("confirmer");
            router.refresh();
            return;
          }
          deja += r.envoyes;
          envoyesTotal += r.envoyes;
          setEnvoyes(envoyesTotal);
          if (r.arret) setMessage(r.arret.message);
          if (r.termine || r.arret) break;
        }
      }
      setEnvoyes(envoyesTotal);
      setVue("envoye");
      router.refresh();
    });
  }

  if (vue === "envoye") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#5ECB33] text-[#0a0a0a] shadow-[0_10px_40px_-10px_rgba(94,203,51,0.9)]"
        >
          <Check className="h-10 w-10" aria-hidden />
        </motion.span>
        <div>
          <p className="font-display text-2xl font-bold">Offre envoyée à {pluriel(envoyes, "acheteur")}</p>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-admin-muted">
            Les réponses arriveront dans info@ ; une copie de chaque courriel est dans Envoyés.
          </p>
          {message && <p className="mt-2 text-[13px] text-admin-warning">{message}</p>}
        </div>
        <button type="button" onClick={onFermer} className={BOUTON_PLEIN}>
          Terminé
        </button>
      </div>
    );
  }

  if (vue === "confirmer" || vue === "envoi") {
    const exclus = groupes.reduce((n, g) => n + g.verif.dejaRecus.nombre + g.verif.desabonnes.nombre, 0);
    const reportes = groupes.reduce((n, g) => n + Math.max(0, g.verif.prets - g.verif.aujourdhui), 0);
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-[17px] font-semibold">Prêt à envoyer</h3>
          <p className="mt-1 text-[14px] text-admin-muted">
            Depuis info@, un courriel par compagnie, avec votre signature.
            {exclus > 0 && ` ${pluriel(exclus, "compagnie")} exclue${exclus > 1 ? "s" : ""} (déjà reçu ou désabonnée).`}
            {reportes > 0 && ` Limite du jour : ${reportes} partira demain.`}
          </p>
        </div>

        {groupes.map((g, i) => (
          <div key={g.langue} className="rounded-3xl border border-admin-line bg-admin-card p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-admin-muted">
              En {g.langue === "fr" ? "français" : "anglais"} · {pluriel(g.verif.prets, "acheteur")}
            </p>
            <input
              value={g.objet}
              onChange={(e) => modifierGroupe(i, "objet", e.target.value)}
              disabled={vue === "envoi"}
              aria-label="Objet du courriel"
              className="mt-2 w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-admin-ink outline-none focus:ring-0"
            />
            <textarea
              value={g.corps}
              onChange={(e) => modifierGroupe(i, "corps", e.target.value)}
              disabled={vue === "envoi"}
              rows={7}
              aria-label="Message du courriel"
              className="mt-2 w-full resize-y rounded-2xl border border-admin-line bg-admin-page px-3 py-2 text-[13px] leading-relaxed text-admin-ink outline-none focus:border-[#5ECB33]"
            />
          </div>
        ))}

        {erreur && (
          <p role="alert" className="rounded-2xl bg-admin-tint-red px-4 py-3 text-[13px] text-admin-danger">
            {erreur}
          </p>
        )}
        {message && <p className="text-[13px] text-admin-muted">{message}</p>}

        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-admin-line bg-admin-page px-5 py-4 sm:-mx-7 sm:px-7">
          <button type="button" onClick={envoyer} disabled={occupe || total === 0} className={BOUTON_PLEIN}>
            {vue === "envoi" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Envoi… {envoyes} sur {total}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden />
                Envoyer maintenant
              </>
            )}
          </button>
          <button type="button" onClick={test} disabled={occupe} className={LIEN}>
            M&apos;envoyer un test
          </button>
          <button type="button" onClick={() => setVue("liste")} disabled={vue === "envoi"} className={`${LIEN} inline-flex items-center gap-1`}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold leading-none"
          >
            {fiches.length}
            <span className="ml-2 text-[17px] font-semibold">acheteur{fiches.length > 1 ? "s" : ""} trouvé{fiches.length > 1 ? "s" : ""}</span>
          </motion.p>
          <p className="mt-2 text-[13px] text-admin-muted">
            {surplus > 0 ? `${surplus} rachète${surplus > 1 ? "nt" : ""} du surplus` : ""}
            {surplus > 0 && recherche.resultats_le ? " · " : ""}
            {recherche.resultats_le ? `le ${jourCourtFmt.format(new Date(recherche.resultats_le))}` : ""}
          </p>
        </div>
      </div>

      {onSuivre && (
        <button
          type="button"
          onClick={onSuivre}
          className="admin-focus flex items-center gap-3 rounded-3xl bg-admin-tint-green px-4 py-3 text-left text-[14px] text-admin-ink transition hover:brightness-[1.03]"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-admin-green motion-reduce:animate-none" aria-hidden />
          <span className="min-w-0 flex-1">
            {recherche.statut === "en_cours"
              ? "Claude cherche d'autres acheteurs…"
              : "Recherche d'autres acheteurs en file d'attente…"}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-admin-green" aria-hidden />
        </button>
      )}

      <div className="rounded-3xl border border-admin-line bg-admin-card">
        <button
          type="button"
          onClick={() => setPrixOuverts((v) => !v)}
          aria-expanded={prixOuverts}
          className="admin-focus flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3 text-left"
        >
          <span className="text-[14px]">
            <span className="font-semibold">Prix du marché</span>
            <span className="text-admin-muted"> · {fourchetteGlobale(resultats)} l&apos;unité</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-admin-muted transition-transform ${prixOuverts ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <AnimatePresence initial={false}>
          {prixOuverts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 border-t border-admin-line-soft px-4 pb-4 pt-3">
                {familles.map((f, i) => (
                  <div key={`${f.nom}-${i}`}>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-admin-muted">
                      {f.nom}
                      {f.rare && <span className="ml-2 normal-case text-admin-warning">rare</span>}
                    </p>
                    <ul className="mt-1 text-[13px]">
                      {f.lignes.map((l, j) => {
                        const source = lienSur(l.prix.sources[0]);
                        return (
                          <li key={j} className="flex items-baseline justify-between gap-3 py-0.5">
                            <span className="min-w-0 truncate" title={l.article}>
                              {l.quantite != null && <span className="tabular-nums text-admin-muted">{l.quantite} × </span>}
                              {l.article}
                              {l.etat && <span className="text-admin-muted"> · {l.etat}</span>}
                            </span>
                            {source ? (
                              <a href={source} target="_blank" rel="noopener noreferrer" title={l.prix.base ?? "Source"} className="shrink-0 tabular-nums hover:underline">
                                {formaterPrix(l.prix)}
                              </a>
                            ) : (
                              <span className="shrink-0 tabular-nums" title={l.prix.base ?? undefined}>
                                {formaterPrix(l.prix)}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                <p className="text-[12px] text-admin-muted">
                  Un acheteur en gros offre souvent {Math.round(PART_OFFRE_EN_GROS.min * 100)} à{" "}
                  {Math.round(PART_OFFRE_EN_GROS.max * 100)} % de ces prix.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ul className="flex flex-col gap-2.5">
        {fiches.map(({ fiche, familles: fams, raison, preuve, surplus: rachete }, i) => {
          const actif = choisis.has(fiche.domaine);
          const joint = dejaJoint(fiche);
          const lieu = [fiche.ville, fiche.pays].filter(Boolean).join(", ");
          return (
            <motion.li
              key={fiche.domaine}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className={`flex gap-3 rounded-3xl border bg-admin-card p-3.5 transition-colors ${actif ? "border-[#5ECB33]/60" : "border-admin-line"}`}
            >
              <span
                aria-hidden
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${rachete ? "bg-admin-tint-green text-admin-green" : "bg-admin-tint-amber text-admin-warning"}`}
              >
                {fiche.nom.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[15px] font-semibold">{fiche.nom}</span>
                  {lieu && <span className="text-[12px] text-admin-muted">{lieu}</span>}
                </p>
                <p className="mt-0.5 text-[12px] font-medium">
                  <span className={rachete ? "text-admin-green" : "text-admin-warning"}>
                    {LIBELLES_CONFIANCE[rachete ? "achete_surplus" : "a_sonder"]}
                  </span>
                  {joint && <span className="text-admin-muted"> · déjà joint le {jourCourtFmt.format(new Date(joint))}</span>}
                  {fams.length > 1 && <span className="text-admin-muted"> · {fams.length} familles</span>}
                </p>
                {raison && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-admin-muted" title={raison}>
                    {raison}
                  </p>
                )}
                <p className="mt-2 flex flex-wrap items-center gap-1.5">
                  {fiche.courriel && (
                    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-admin-subtle px-2 py-0.5 text-[12px]">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{fiche.courriel}</span>
                    </span>
                  )}
                  <Icone href={fiche.telephone ? `tel:${fiche.telephone.replace(/[^\d+]/g, "")}` : null} libelle={fiche.telephone ?? "Téléphone"} icon={Phone} />
                  <Icone href={lienSur(fiche.formulaire)} libelle="Formulaire de contact" icon={FileText} externe />
                  <Icone href={lienSur(preuve)} libelle="Page qui le prouve" icon={Link2} externe />
                  <Icone href={lienSur(fiche.site)} libelle={`Site : ${fiche.domaine}`} icon={ExternalLink} externe />
                </p>
              </div>
              <Interrupteur
                actif={actif && Boolean(fiche.courriel)}
                desactive={!fiche.courriel}
                onBasculer={() => basculer(fiche.domaine)}
                libelle={fiche.courriel ? `Écrire à ${fiche.nom}` : `${fiche.nom} : pas de courriel, formulaire ou téléphone seulement`}
              />
            </motion.li>
          );
        })}
      </ul>

      {erreur && (
        <p role="alert" className="rounded-2xl bg-admin-tint-red px-4 py-3 text-[13px] text-admin-danger">
          {erreur}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-admin-line bg-admin-page px-5 py-4 sm:-mx-7 sm:px-7">
        <button type="button" onClick={onAutres} disabled={Boolean(onSuivre)} className={`${LIEN} disabled:opacity-50`}>
          Chercher d&apos;autres acheteurs
        </button>
        <button type="button" onClick={preparer} disabled={occupe || selection.length === 0} className={BOUTON_PLEIN}>
          {occupe ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {selection.length === 0 ? "Choisissez des acheteurs" : `Écrire à ${pluriel(selection.length, "acheteur")}`}
        </button>
      </div>
    </div>
  );
}

function Icone({
  href,
  libelle,
  icon: Icon,
  externe = false,
}: {
  href: string | null;
  libelle: string;
  icon: typeof Phone;
  externe?: boolean;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      title={libelle}
      aria-label={libelle}
      {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="admin-focus flex h-7 w-7 items-center justify-center rounded-full bg-admin-subtle text-admin-muted transition hover:bg-admin-tint-green hover:text-admin-green"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

function Interrupteur({
  actif,
  desactive,
  onBasculer,
  libelle,
}: {
  actif: boolean;
  desactive: boolean;
  onBasculer: () => void;
  libelle: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      title={libelle}
      disabled={desactive}
      onClick={onBasculer}
      className={`admin-focus relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${actif ? "bg-[#5ECB33]" : "bg-admin-line"} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${actif ? "right-0.5" : "left-0.5"}`}
      />
    </button>
  );
}
