import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { feuillesEnTexte, lireCsv, lireXlsx } from "@/lib/acheteurs/classeur";
import { masquerClient, motsDuClient, sansClient } from "@/lib/acheteurs/identite";
import { preparerPhoto } from "@/lib/acheteurs/photo";
import {
  classerPieces,
  construireDemandeLecture,
  lirePiecesLues,
  lireReponseLecture,
  texteDuClient,
} from "@/lib/acheteurs/pieces";
import { choisirRecherche, type LigneFile } from "@/lib/acheteurs/recherche";
import {
  LECTURE_DELAI_COURRIEL_MS,
  LECTURE_DEPUIS,
  LECTURE_FENETRE_JOURS,
  LECTURES_PAR_JOUR,
  LIMITES_LECTURE,
  MESSAGE_PLAFOND_LECTURE,
  MESSAGES_ECHEC_LECTURE,
  type ArticleLu,
  type EchecAgent,
  type PieceLue,
} from "@/lib/acheteurs/types";
import { journaliserErreur } from "@/lib/admin/erreurs-admin";
import { fetchSoumissionService, type Soumission } from "@/lib/admin/soumissions";
import { isMailApiConfigured } from "@/lib/hostinger/config";
import { ErreurHostinger, octetsPiece, piecesDuCourriel, trouverCourrielSoumission } from "@/lib/hostinger/mail";
import { detecterType, TYPES_PAR_CHAMP, type TypeFichier } from "@/lib/securite/fichiers";
import { limiter } from "@/lib/securite/limite";

/*
 * File des lectures de pièces jointes, côté serveur : client service_role des
 * routes /api/cron/acheteurs/lecture/*, appelées par l'agent de l'ordinateur de
 * l'utilisateur (scripts/agent-acheteurs). Une soumission reçue avec des
 * fichiers entre seule dans la file ; le site retrouve son courriel, change les
 * tableurs en texte masqué et liste photos et PDF ; l'agent fait lire Claude,
 * sans aucun outil, puis renvoie sa réponse. Aucun nom de fichier ni aucune
 * donnée du client ne sort d'ici. Le site n'appelle jamais d'IA.
 */

const TABLE = "lectures_soumissions";

/** Soumissions regardées à chaque passage (les plus récentes). */
const SOUMISSIONS_REGARDEES = 100;
/** Plafond d'une pièce téléchargée (le formulaire accepte 10 Mo par fichier). */
const POIDS_MAX_PIECE = 16 * 1024 * 1024;
/** Sous ce reste, un tableur de plus ne donnerait qu'un en-tête. */
const BUDGET_TEXTE_MIN = 200;
const JOUR_MS = 86_400_000;

const ERREUR_API = "La Mail API de Hostinger n'est pas configurée.";
const ERREUR_COURRIEL = "Courriel introuvable dans la boîte info@ : les pièces jointes ne peuvent pas être lues.";
const ERREUR_BOITE = "La boîte info@ n'a pas répondu : relisez les pièces jointes plus tard.";

const RAISON_ILLISIBLE = "Fichier illisible : à ouvrir vous-même";
const RAISON_VIDE = "Fichier vide";
const RAISON_LONG = "Fichier très long : seul le début a été lu";
const RAISON_TROP_DE_TEXTE = "Trop de texte dans les autres fichiers : à ouvrir vous-même";
const RAISON_PHOTO = "Photo illisible : à regarder vous-même";
const RAISON_PDF = "PDF illisible : à ouvrir vous-même";

export type PieceAgent = { index: number; etiquette: string; type: "image" | "pdf" };
export type PriseLecture = { id: string; jeton: string; demande: string; pieces: PieceAgent[] };
export type ResultatPriseLecture = { etat: "prise"; prise: PriseLecture } | { etat: "rien" } | { etat: "plafond" };
export type ResultatPiece = { etat: "piece"; octets: Uint8Array; type: string } | { etat: "perimee" } | { etat: "illisible" };
export type EnvoiLecture = { id: string; jeton: string } & ({ reponse: string; lues: number[] } | { echec: EchecAgent });
export type ReceptionLecture =
  | { etat: "lue"; articles: number }
  | { etat: "echec"; erreur: string }
  /** Lecture relancée ou reprise depuis la prise : réponse ignorée. */
  | { etat: "perimee" };

/**
 * Met en file les soumissions reçues avec des fichiers qui n'ont pas encore de
 * ligne : une soumission déjà lue, en échec ou relue n'est jamais recréée. Ne
 * lit que `id` et `fichiers`, jamais un renseignement personnel. Une soumission
 * trop récente attend : son courriel doit avoir eu le temps d'arriver.
 */
async function ajouterNouvelles(supabase: SupabaseClient, maintenant: number): Promise<void> {
  const depuis = Math.max(Date.parse(LECTURE_DEPUIS), maintenant - LECTURE_FENETRE_JOURS * JOUR_MS);
  const { data, error } = await supabase
    .from("soumissions")
    .select("id, fichiers")
    .gte("DATE", new Date(depuis).toISOString())
    .lte("DATE", new Date(maintenant - LECTURE_DELAI_COURRIEL_MS).toISOString())
    .order("DATE", { ascending: false })
    .limit(SOUMISSIONS_REGARDEES);
  if (error) throw error;

  const ids = ((data ?? []) as { id: string; fichiers: string[] | null }[])
    .filter((s) => (s.fichiers?.length ?? 0) > 0)
    .map((s) => s.id);
  if (ids.length === 0) return;

  const { data: connues, error: erreurConnues } = await supabase.from(TABLE).select("soumission_id").in("soumission_id", ids);
  if (erreurConnues) throw erreurConnues;
  const deja = new Set(((connues ?? []) as { soumission_id: string }[]).map((l) => l.soumission_id));
  const nouvelles = ids.filter((id) => !deja.has(id)).map((id) => ({ soumission_id: id }));
  if (nouvelles.length === 0) return;

  const { error: erreurAjout } = await supabase
    .from(TABLE)
    .upsert(nouvelles, { onConflict: "soumission_id", ignoreDuplicates: true });
  if (erreurAjout) throw erreurAjout;
}

/** Fin d'une prise : écrit seulement si la lecture porte encore ce jeton (sinon : relancée ou reprise). */
async function terminer(
  supabase: SupabaseClient,
  id: string,
  jeton: string,
  champs: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...champs, courriel: null, jeton: null })
    .eq("id", id)
    .eq("statut", "en_cours")
    .eq("jeton", jeton)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

type Assemblage = {
  /** Copie des pièces, avec ce que la préparation en a tiré. */
  pieces: PieceLue[];
  tableaux: { numero: number; texte: string }[];
  pdfs: number[];
  agent: PieceAgent[];
};

/** Texte masqué d'un tableur, ou la raison pour laquelle il n'est pas lu. */
function texteDuTableur(
  octets: Uint8Array | null,
  nom: string,
  budget: number,
  mots: readonly string[],
): { texte: string | null; raison: string | null; brut: number } {
  const type = octets ? detecterType(octets, nom) : null;
  if (!octets || (type !== "xlsx" && type !== "csv" && type !== "txt")) {
    return { texte: null, raison: RAISON_ILLISIBLE, brut: 0 };
  }
  const feuilles = type === "xlsx" ? lireXlsx(octets) : lireCsv(octets);
  if (!feuilles) return { texte: null, raison: RAISON_ILLISIBLE, brut: 0 };
  if (budget < BUDGET_TEXTE_MIN) return { texte: null, raison: RAISON_TROP_DE_TEXTE, brut: 0 };
  const { texte, tronque } = feuillesEnTexte(feuilles, budget);
  if (!texte) return { texte: null, raison: RAISON_VIDE, brut: 0 };
  return { texte: masquerClient(texte, mots), raison: tronque ? RAISON_LONG : null, brut: texte.length };
}

/**
 * Numérote les fichiers (tableurs et PDF ensemble, dans l'ordre des pièces),
 * change les tableurs en texte et liste ce que l'agent doit télécharger. Un
 * tableur non lu ne prend pas de numéro.
 */
async function assembler(
  classees: readonly PieceLue[],
  dossier: string,
  uid: number,
  mots: readonly string[],
): Promise<Assemblage> {
  const a: Assemblage = { pieces: classees.map((p) => ({ ...p })), tableaux: [], pdfs: [], agent: [] };
  let budget: number = LIMITES_LECTURE.texteTableur;
  let fichier = 0;

  for (const [index, piece] of a.pieces.entries()) {
    if (piece.role === "tableur") {
      const octets = await octetsPiece(dossier, uid, piece.pieceId, POIDS_MAX_PIECE);
      const lu = texteDuTableur(octets, piece.nom, budget, mots);
      piece.raison = lu.raison;
      piece.lu = lu.texte !== null;
      if (lu.texte === null) continue;
      budget -= lu.brut;
      a.tableaux.push({ numero: ++fichier, texte: lu.texte });
    } else if (piece.role === "pdf") {
      a.pdfs.push(++fichier);
      a.agent.push({ index, etiquette: `Fichier ${fichier} (PDF)`, type: "pdf" });
    } else if (piece.role === "photo") {
      a.agent.push({ index, etiquette: `Photo ${piece.numero}`, type: "image" });
    }
  }
  return a;
}

/** Ligne prise : retrouve le courriel, prépare la demande. Rien à faire lire à Claude → `rien`. */
async function preparer(
  supabase: SupabaseClient,
  id: string,
  jeton: string,
  soumission: Soumission,
): Promise<ResultatPriseLecture> {
  const echouer = async (erreur: string): Promise<ResultatPriseLecture> => {
    await terminer(supabase, id, jeton, { statut: "echec", erreur });
    return { etat: "rien" };
  };

  if (!isMailApiConfigured()) return echouer(ERREUR_API);
  try {
    const courriel = await trouverCourrielSoumission(soumission);
    if (!courriel) return echouer(ERREUR_COURRIEL);

    const mots = motsDuClient(soumission);
    const classees = classerPieces(await piecesDuCourriel(courriel.dossier, courriel.uid));
    const { pieces, tableaux, pdfs, agent } = await assembler(classees, courriel.dossier, courriel.uid, mots);

    if (tableaux.length === 0 && agent.length === 0) {
      await terminer(supabase, id, jeton, {
        statut: "lue",
        articles: [],
        articles_ignores: 0,
        pieces,
        erreur: null,
        lue_le: new Date().toISOString(),
      });
      return { etat: "rien" };
    }

    const { data: ecrite, error } = await supabase
      .from(TABLE)
      .update({ pieces, courriel })
      .eq("id", id)
      .eq("statut", "en_cours")
      .eq("jeton", jeton)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!ecrite) return { etat: "rien" }; // relancée entre-temps

    const demande = construireDemandeLecture({
      message: masquerClient(texteDuClient(soumission.message), mots),
      tableaux,
      pdfs,
      photos: agent.filter((p) => p.type === "image").length,
    });
    return { etat: "prise", prise: { id, jeton, demande, pieces: agent } };
  } catch (err) {
    if (err instanceof ErreurHostinger) return echouer(ERREUR_BOITE); // jamais err.message : il peut citer des adresses
    throw err;
  }
}

/**
 * Prend la prochaine lecture (en attente, ou abandonnée en cours) : elle passe
 * « en cours » avec un nouveau jeton, par une mise à jour conditionnelle (même
 * statut et même jeton qu'à la lecture) : deux prises ne visent jamais la même
 * ligne. Au plus LECTURES_PAR_JOUR prises par 24 h, ce qui protège le forfait
 * contre un robot du formulaire.
 */
export async function prendreLecture(supabase: SupabaseClient, maintenant = Date.now()): Promise<ResultatPriseLecture> {
  try {
    await ajouterNouvelles(supabase, maintenant);
  } catch (err) {
    // La file déjà en place reste à traiter ; les nouvelles entreront au prochain passage.
    void journaliserErreur(err, "cron.acheteurs.lecture.nouvelles", {}, { durable: false });
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, statut, demande_le, pris_le, jeton")
    .in("statut", ["en_attente", "en_cours"])
    .order("demande_le", { ascending: true })
    .limit(50);
  if (error) throw error;
  const choisie = choisirRecherche((data ?? []) as LigneFile[], maintenant);
  if (!choisie) return { etat: "rien" };

  const verdict = await limiter("acheteurs:lectures", "agent", 86_400, LECTURES_PAR_JOUR);
  if (!verdict.permis) {
    // Message pour l'écran, effacé à la prise.
    await supabase.from(TABLE).update({ erreur: MESSAGE_PLAFOND_LECTURE }).eq("id", choisie.id).eq("statut", "en_attente");
    return { etat: "plafond" };
  }

  const jeton = randomUUID();
  let maj = supabase
    .from(TABLE)
    .update({ statut: "en_cours", pris_le: new Date(maintenant).toISOString(), jeton, erreur: null })
    .eq("id", choisie.id)
    .eq("statut", choisie.statut);
  maj = choisie.jeton ? maj.eq("jeton", choisie.jeton) : maj.is("jeton", null);
  const { data: prise, error: erreurPrise } = await maj.select("id, soumission_id").maybeSingle();
  if (erreurPrise) throw erreurPrise;
  if (!prise) return { etat: "rien" }; // prise ou relancée entre-temps

  const soumission = await fetchSoumissionService(supabase, prise.soumission_id);
  if (!soumission) {
    const { error: erreurRetrait } = await supabase.from(TABLE).delete().eq("id", prise.id).eq("jeton", jeton);
    if (erreurRetrait) throw erreurRetrait;
    return { etat: "rien" };
  }
  return preparer(supabase, prise.id, jeton, soumission);
}

function estEmplacement(v: unknown): v is { dossier: string; uid: number } {
  const c = v as { dossier?: unknown; uid?: unknown } | null;
  return typeof c?.dossier === "string" && typeof c.uid === "number";
}

const TYPES_PHOTO: readonly (TypeFichier | null)[] = TYPES_PAR_CHAMP.photos;

/**
 * Une pièce à remettre à Claude. Le contenu décide, jamais le nom : un fichier
 * qui contredit son rôle est illisible. Une photo sort réduite et réencodée,
 * jamais telle quelle.
 */
export async function pieceDeLecture(
  supabase: SupabaseClient,
  e: { id: string; jeton: string; index: number },
): Promise<ResultatPiece> {
  const { data: ligne, error } = await supabase
    .from(TABLE)
    .select("id, statut, jeton, pieces, courriel")
    .eq("id", e.id)
    .maybeSingle();
  if (error) throw error;
  if (!ligne || ligne.statut !== "en_cours" || ligne.jeton !== e.jeton) return { etat: "perimee" };

  const piece = lirePiecesLues(ligne.pieces)[e.index];
  if (!piece || (piece.role !== "photo" && piece.role !== "pdf") || !estEmplacement(ligne.courriel)) {
    return { etat: "illisible" };
  }
  try {
    const { dossier, uid } = ligne.courriel;
    const octets = await octetsPiece(dossier, uid, piece.pieceId, POIDS_MAX_PIECE);
    if (!octets) return { etat: "illisible" };
    const type = detecterType(octets, piece.nom);
    if (piece.role === "pdf") {
      return type === "pdf" ? { etat: "piece", octets, type: "application/pdf" } : { etat: "illisible" };
    }
    if (!TYPES_PHOTO.includes(type)) return { etat: "illisible" };
    return { etat: "piece", octets: await preparerPhoto(octets), type: "image/jpeg" };
  } catch {
    // Boîte injoignable, image corrompue, HEIC : l'agent passe à la pièce suivante.
    return { etat: "illisible" };
  }
}

/** Numéros des photos réellement remises à Claude. */
function photosRemises(pieces: readonly PieceLue[], lues: ReadonlySet<number>): Set<number> {
  const numeros = new Set<number>();
  pieces.forEach((p, i) => {
    if (p.role === "photo" && p.numero !== null && lues.has(i)) numeros.add(p.numero);
  });
  return numeros;
}

/**
 * Article prêt à garder : sans le client, ni photo que Claude n'a pas reçue.
 * null : il ne désignait que le client.
 */
function articleGarde(a: ArticleLu, mots: readonly string[], remises: ReadonlySet<number>): ArticleLu | null {
  const description = sansClient(a.description, mots)?.slice(0, LIMITES_LECTURE.description);
  if (!description) return null;
  const photos = a.photos.filter((n) => remises.has(n));
  return {
    ...a,
    description,
    remarque: a.remarque === null ? null : masquerClient(a.remarque, mots).slice(0, LIMITES_LECTURE.remarque),
    photos,
    verification: a.verification === "confirme" && photos.length === 0 ? "non_vu" : a.verification,
  };
}

/** État final des pièces : photos et PDF lus d'après `lues` ; le reste ne change pas. */
function piecesFinales(pieces: readonly PieceLue[], lues: ReadonlySet<number>): PieceLue[] {
  return pieces.map((p, i) => {
    if (p.role !== "photo" && p.role !== "pdf") return p;
    if (lues.has(i)) return { ...p, lu: true, raison: null };
    return { ...p, lu: false, raison: p.role === "photo" ? RAISON_PHOTO : RAISON_PDF };
  });
}

/**
 * Réponse de l'agent : le texte de Claude (lu par lib/acheteurs/pieces.ts, le
 * client masqué encore une fois, la liste gardée avec la soumission), ou la
 * raison de son échec (message fixe de MESSAGES_ECHEC_LECTURE).
 */
export async function recevoirLecture(supabase: SupabaseClient, envoi: EnvoiLecture): Promise<ReceptionLecture> {
  const { data: ligne, error } = await supabase
    .from(TABLE)
    .select("id, soumission_id, statut, jeton, pieces")
    .eq("id", envoi.id)
    .maybeSingle();
  if (error) throw error;
  if (!ligne || ligne.statut !== "en_cours" || ligne.jeton !== envoi.jeton) return { etat: "perimee" };

  const echouer = async (erreur: string): Promise<ReceptionLecture> =>
    (await terminer(supabase, envoi.id, envoi.jeton, { statut: "echec", erreur }))
      ? { etat: "echec", erreur }
      : { etat: "perimee" };

  if ("echec" in envoi) return echouer(MESSAGES_ECHEC_LECTURE[envoi.echec]);

  const lu = lireReponseLecture(envoi.reponse);
  if (!lu.ok) return echouer(lu.erreur.slice(0, 300));

  const soumission = await fetchSoumissionService(supabase, ligne.soumission_id);
  const mots = soumission ? motsDuClient(soumission) : [];
  const pieces = lirePiecesLues(ligne.pieces);
  const lues = new Set(envoi.lues);
  const remises = photosRemises(pieces, lues);

  const articles = lu.articles.flatMap((a) => articleGarde(a, mots, remises) ?? []);
  const ecrit = await terminer(supabase, envoi.id, envoi.jeton, {
    statut: "lue",
    articles,
    articles_ignores: lu.ignores + lu.articles.length - articles.length,
    pieces: piecesFinales(pieces, lues),
    erreur: null,
    lue_le: new Date().toISOString(),
  });
  return ecrit ? { etat: "lue", articles: articles.length } : { etat: "perimee" };
}
