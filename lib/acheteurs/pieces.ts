import { z } from "zod";
import { extraireArticles } from "@/lib/acheteurs/articles";
import { extraireJson, texte } from "@/lib/acheteurs/reponse";
import {
  LIMITES,
  LIMITES_LECTURE,
  VERIFICATIONS,
  type Article,
  type ArticleLu,
  type EtatArticle,
  type LectureSoumission,
  type PieceLue,
  type RechercheAcheteurs,
  type RolePiece,
  type Verification,
} from "@/lib/acheteurs/types";
import type { PieceJointe } from "@/lib/admin/courriel-types";
import { EXTENSIONS_PAR_CHAMP, extension } from "@/lib/securite/fichiers";

/*
 * Lecture des pièces jointes d'une soumission (logique pure, serveur et
 * navigateur) : quelles pièces sont lues, ce qu'on demande à Claude, et ce
 * qu'on garde de sa réponse. La réponse vient d'une IA qui a lu un fichier
 * envoyé par n'importe qui : elle est traitée comme NON FIABLE, et elle n'est
 * jamais qu'une liste proposée à l'admin.
 */

const ROLE_PAR_EXTENSION: Record<string, RolePiece> = {
  xlsx: "tableur",
  csv: "tableur",
  pdf: "pdf",
  jpg: "photo",
  jpeg: "photo",
  png: "photo",
  webp: "photo",
  gif: "photo",
  tif: "photo",
  tiff: "photo",
  avif: "photo",
};

const ROLE_PAR_MIME: Record<string, RolePiece> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "tableur",
  "text/csv": "tableur",
  "application/csv": "tableur",
  "application/pdf": "pdf",
  "image/jpeg": "photo",
  "image/png": "photo",
  "image/webp": "photo",
  "image/gif": "photo",
  "image/tiff": "photo",
  "image/avif": "photo",
};

const RAISON_HEIC = "Photo HEIC : à regarder vous-même";
const RAISON_BMP = "Format de photo non lu : à regarder vous-même";
const RAISON_XLS = "Ancien format Excel (.xls) : à ouvrir vous-même";
const RAISON_FORMAT = "Format non lu";
const RAISON_TROP = "Trop de pièces : à ouvrir vous-même";

const RAISON_PAR_EXTENSION: Record<string, string> = {
  heic: RAISON_HEIC,
  heif: RAISON_HEIC,
  bmp: RAISON_BMP,
  xls: RAISON_XLS,
};

const RAISON_PAR_MIME: Record<string, string> = {
  "image/heic": RAISON_HEIC,
  "image/heif": RAISON_HEIC,
  "image/bmp": RAISON_BMP,
  "application/vnd.ms-excel": RAISON_XLS,
};

/**
 * Rôle d'une pièce. L'extension décide d'abord : Windows annonce un CSV comme
 * `application/vnd.ms-excel`. Le type MIME sert de repli pour un nom sans
 * extension connue.
 */
export function rolePiece(nom: string, type: string): { role: RolePiece; raison: string | null } {
  const ext = extension(nom);
  const mime = type.split(";")[0].trim().toLowerCase();
  const role = ROLE_PAR_EXTENSION[ext];
  if (role) return { role, raison: null };
  const raison = RAISON_PAR_EXTENSION[ext];
  if (raison) return { role: "aucun", raison };
  if (ROLE_PAR_MIME[mime]) return { role: ROLE_PAR_MIME[mime], raison: null };
  return { role: "aucun", raison: RAISON_PAR_MIME[mime] ?? RAISON_FORMAT };
}

/** Pièces du courriel, classées et numérotées, au plus 10 photos et 5 documents. */
export function classerPieces(pieces: readonly PieceJointe[]): PieceLue[] {
  let photos = 0;
  let documents = 0;
  return pieces.map((p) => {
    const lue: PieceLue = { nom: p.nom, pieceId: p.id, type: p.type, numero: null, lu: false, ...rolePiece(p.nom, p.type) };
    if (lue.role === "aucun") return lue;
    const place =
      lue.role === "photo" ? photos < LIMITES_LECTURE.photos : documents < LIMITES_LECTURE.documents;
    if (!place) return { ...lue, role: "aucun", raison: RAISON_TROP };
    if (lue.role === "photo") lue.numero = ++photos;
    else documents++;
    return lue;
  });
}

const ENTETES_MESSAGE = /^(?:entreprise|ville|nom|courriel|t[ée]l[ée]phone)\s*:/i;
const LIBELLE_DESCRIPTION = /^\s*description\s*:\s*/i;

/** Ce que le client a écrit : sans ses coordonnées ni le libellé « Description : ». */
export function texteDuClient(message: string | null): string {
  if (!message) return "";
  return message
    .split(/\r?\n/)
    .filter((l) => !ENTETES_MESSAGE.test(l.trim()))
    .map((l) => l.replace(LIBELLE_DESCRIPTION, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const CONSIGNES_LECTURE = `Un client nous offre le lot décrit ci-dessous. Dresse la liste complète du matériel offert : un article par modèle ET par état, avec la quantité totale.

RÈGLES
1. Tableaux : ils peuvent être croisés (quantités par lieu, par modèle, par état). Additionne les quantités sur tous les lieux. Une cellule fusionnée couvre toutes ses colonnes : elle s'applique à chacune.
2. Noms abrégés : si le fichier contient une clé de modèles, écris le modèle complet (marque, gamme et numéro de modèle).
3. Ignore les prix.
4. « description » : le modèle seulement, sans quantité ni état. N'écris jamais un nom de personne, de lieu ou d'entreprise cliente, une adresse, un numéro de série ou d'inventaire. « [client] » remplace ce qui a été masqué.
5. Photos : lis les logos, les étiquettes, les boîtes. Compare ce que tu vois avec ce qui est écrit.
   « verification » de chaque article :
   - "confirme" : une photo montre bien ce modèle ;
   - "non_vu" : l'article est écrit, mais aucune photo ne le montre ;
   - "doute" : une photo contredit ce qui est écrit, le modèle écrit semble faux ou imprécis, ou l'article n'est vu que sur une photo sans être écrit. Explique en une phrase dans « remarque ».
   « photos » : les numéros des photos qui montrent l'article.
6. Quantité inconnue : null. Sur une photo seule, compte ce qui est visible et dis « au moins » dans « remarque ».
7. Un fichier ou une photo manque ou est illisible : fais avec le reste.

FORMAT
{"articles":[{"description":"","quantite":0,"etat":"neuf","verification":"confirme","remarque":"","photos":[1]}]}
« etat » : "neuf", "usage" ou null.`;

/**
 * Demande de lecture envoyée à Claude. `message` et `tableaux` sont déjà
 * masqués (`masquerClient`). Aucun nom de fichier n'entre ici : ils désignent
 * souvent le client, et la fonction ne les reçoit pas.
 */
export function construireDemandeLecture(e: {
  message: string;
  tableaux: { numero: number; texte: string }[];
  pdfs: number[];
  photos: number;
}): string {
  const blocs = [CONSIGNES_LECTURE, `LE MESSAGE DU CLIENT\n${e.message.trim() || "(aucun message)"}`];
  for (const t of e.tableaux) {
    blocs.push(`FICHIER ${t.numero} (cellules non vides, ligne par ligne)\n${t.texte}`);
  }
  const joints = e.pdfs.map((n) => `FICHIER ${n} : le PDF joint plus bas.`);
  if (e.photos > 0) joints.push(`LES PHOTOS (${e.photos}) : jointes plus bas, numérotées.`);
  if (joints.length > 0) blocs.push(joints.join("\n"));
  return blocs.join("\n\n");
}

const ERREUR_FORMAT = "Claude n'a pas rendu la liste dans le format attendu. Relisez les pièces jointes.";
const ERREUR_LONGUEUR = "Réponse trop longue (200 000 caractères au plus). Relisez les pièces jointes.";
const QUANTITE_MAX = 10_000_000;
const PHOTOS_PAR_ARTICLE = 20;

const racineLecture = z.object({ articles: z.array(z.unknown()) });

/** Texte d'une ligne sans lien : Claude a lu un fichier public, rien de cliquable n'en sort. */
function sansUrl(v: unknown, max: number): string | null {
  const brut = texte(v, LIMITES.ligne);
  if (!brut) return null;
  return texte(brut.replace(/(?:https?:\/\/|www\.)\S*/gi, " "), max);
}

/** Entier de 0 à 10 millions (nombre, ou chaîne comme « 1 200 ») ; le reste → null. */
function quantiteLue(v: unknown): number | null {
  const n = typeof v === "string" && /^\d[\d\s]*$/.test(v.trim()) ? Number(v.replace(/\s/g, "")) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= QUANTITE_MAX ? n : null;
}

function etatLu(v: unknown): EtatArticle | null {
  const t = typeof v === "string" ? v.toLowerCase() : "";
  if (/neuf|new/.test(t)) return "neuf";
  return /usag|used/.test(t) ? "usage" : null;
}

function photosLues(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const numeros = v.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1);
  return [...new Set(numeros)].slice(0, PHOTOS_PAR_ARTICLE);
}

function articleLu(brut: unknown): ArticleLu | null {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return null;
  const b = brut as Record<string, unknown>;
  const description = sansUrl(b.description, LIMITES_LECTURE.description);
  if (!description) return null;
  const photos = photosLues(b.photos);
  // Inconnue : on demande à l'admin de trancher ; « confirmé » sans photo ne prouve rien.
  const annoncee = VERIFICATIONS.includes(b.verification as Verification) ? (b.verification as Verification) : "doute";
  return {
    description,
    quantite: quantiteLue(b.quantite),
    etat: etatLu(b.etat),
    verification: annoncee === "confirme" && photos.length === 0 ? "non_vu" : annoncee,
    remarque: sansUrl(b.remarque, LIMITES_LECTURE.remarque),
    photos,
  };
}

/**
 * Lit la réponse de Claude. Zéro article est une réponse valable (rien de
 * lisible dans les pièces) ; les articles écartés sont comptés dans `ignores`.
 */
export function lireReponseLecture(
  reponse: string,
): { ok: true; articles: ArticleLu[]; ignores: number } | { ok: false; erreur: string } {
  if (reponse.length > LIMITES.reponse) return { ok: false, erreur: ERREUR_LONGUEUR };
  const racine = racineLecture.safeParse(extraireJson(reponse));
  if (!racine.success) return { ok: false, erreur: ERREUR_FORMAT };

  const articles: ArticleLu[] = [];
  let ignores = 0;
  for (const brut of racine.data.articles) {
    const lu = articles.length < LIMITES.articles ? articleLu(brut) : null;
    if (lu) articles.push(lu);
    else ignores++;
  }
  return { ok: true, articles, ignores };
}

const articleLuStocke = z.object({
  quantite: z.number().int().min(0).max(QUANTITE_MAX).nullable(),
  description: z.string().min(1).max(LIMITES_LECTURE.description),
  etat: z.enum(["neuf", "usage"]).nullable(),
  verification: z.enum(VERIFICATIONS),
  remarque: z.string().max(LIMITES_LECTURE.remarque).nullable(),
  photos: z.array(z.number().int().min(1)).max(PHOTOS_PAR_ARTICLE),
});

const pieceLueStockee = z.object({
  nom: z.string(),
  pieceId: z.string(),
  type: z.string(),
  role: z.enum(["tableur", "pdf", "photo", "aucun"]),
  numero: z.number().int().min(1).nullable(),
  lu: z.boolean(),
  raison: z.string().nullable(),
});

const PIECES_MAX = 100;

/** Articles gardés avec la lecture (jsonb) ; les lignes illisibles sont ignorées. */
export function lireArticlesLus(valeur: unknown): ArticleLu[] {
  if (!Array.isArray(valeur)) return [];
  const articles: ArticleLu[] = [];
  for (const v of valeur.slice(0, LIMITES.articles)) {
    const a = articleLuStocke.safeParse(v);
    if (a.success) articles.push(a.data);
  }
  return articles;
}

/** Pièces gardées avec la lecture (jsonb) ; les lignes illisibles sont ignorées. */
export function lirePiecesLues(valeur: unknown): PieceLue[] {
  if (!Array.isArray(valeur)) return [];
  const pieces: PieceLue[] = [];
  for (const v of valeur.slice(0, PIECES_MAX)) {
    const p = pieceLueStockee.safeParse(v);
    if (p.success) pieces.push(p.data);
  }
  return pieces;
}

const LIBELLES_ETAT: Record<EtatArticle, string> = { neuf: "neuf", usage: "usagé" };

/** Article d'une recherche : l'état passe dans la description. */
export function versArticle(a: ArticleLu): Article {
  return {
    quantite: a.quantite,
    description: a.etat ? `${a.description} · ${LIBELLES_ETAT[a.etat]}` : a.description,
  };
}

function compter(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/** « Stock.xlsx et 5 photos », « 3 fichiers et 2 photos ». */
export function resumeFichiers(noms: readonly string[]): string {
  const estPhoto = (nom: string) => EXTENSIONS_PAR_CHAMP.photos.includes(extension(nom));
  const documents = noms.filter((n) => !estPhoto(n));
  const photos = noms.length - documents.length;
  const parties = documents.length >= 3 ? [compter(documents.length, "fichier")] : [...documents];
  if (photos > 0) parties.push(compter(photos, "photo"));
  if (parties.length < 2) return parties[0] ?? "";
  return `${parties.slice(0, -1).join(", ")} et ${parties[parties.length - 1]}`;
}

export function lectureEnCours(l: LectureSoumission | null): boolean {
  return l?.statut === "en_attente" || l?.statut === "en_cours";
}

/**
 * Recherche en échec, sans résultats, lancée avant la dernière lecture réussie :
 * ses articles sont dépassés, même pendant une relecture (`lue_le` reste).
 */
export function echecPerime(r: RechercheAcheteurs | null, l: LectureSoumission | null): boolean {
  if (r?.statut !== "echec" || r.resultats || !l?.lue_le) return false;
  return Date.parse(l.lue_le) > Date.parse(r.demande_le);
}

/** Article montré dans le panneau : `photo` si une photo le confirme. */
export type ArticlePanneau = Article & { photo?: boolean; remarque?: string | null };

/**
 * Liste de départ du panneau. Une recherche vivante garde ses articles ;
 * sinon la lecture des pièces, dont les doutes sont à confirmer un par un (la
 * dernière liste reste pendant une relecture) ; sinon la description du client.
 */
export function articlesDeDepart(e: {
  recherche: RechercheAcheteurs | null;
  lecture: LectureSoumission | null;
  description: string;
  mots: readonly string[];
}): { articles: ArticlePanneau[]; doutes: ArticleLu[] } {
  const { recherche: r, lecture: l } = e;
  const vivante =
    r !== null &&
    (r.resultats !== null ||
      r.statut === "en_attente" ||
      r.statut === "en_cours" ||
      (r.statut === "echec" && !echecPerime(r, l)));
  if (r && vivante && r.articles.length > 0) return { articles: r.articles, doutes: [] };

  if (l && l.articles.length > 0) {
    return {
      articles: l.articles
        .filter((a) => a.verification !== "doute")
        .map((a) => ({ ...versArticle(a), photo: a.verification === "confirme", remarque: a.remarque })),
      doutes: l.articles.filter((a) => a.verification === "doute"),
    };
  }
  return { articles: extraireArticles(e.description, e.mots), doutes: [] };
}
