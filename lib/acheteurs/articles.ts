import { masquerClient, sansClient } from "@/lib/acheteurs/identite";
import { LIMITES, type Article } from "@/lib/acheteurs/types";

/*
 * Articles d'une soumission (logique pure, serveur et navigateur) : la
 * description du formulaire est découpée en lignes « quantité × article »
 * pour pré-remplir la liste que l'admin confirme avant la demande à Claude.
 * Les règles de quantité suivent `parserLigneSimple` de la calculatrice
 * (« 28x … », « … x 28 ») ; les cas en plus viennent des vraies demandes
 * (« Quantity: 87 », « 500 ipad… », « Écrans : 10 »).
 */

const MARQUEUR_DESCRIPTION = "\n\nDescription :";
const ENTETES = /^(entreprise|ville|nom|courriel|t[ée]l[ée]phone)\s*:/i;

/**
 * Description de la soumission : le texte après « Description : » (formulaire
 * actuel), sinon le message sans ses lignes d'en-tête (anciennes demandes).
 */
export function descriptionDuMessage(message: string | null): string {
  if (!message) return "";
  const i = message.indexOf(MARQUEUR_DESCRIPTION);
  if (i >= 0) return message.slice(i + MARQUEUR_DESCRIPTION.length).trim();
  return message
    .split(/\r?\n/)
    .filter((l) => !ENTETES.test(l.trim()))
    .join("\n")
    .trim();
}

/** Puce en début de ligne : « - », « • », « 1) », « 1. ». */
const PUCE = /^\s*(?:[-–—•*·]\s*|\d{1,2}\)\s*|\d{1,2}\.\s+)/;
/** « 28x … », « 1 × … », « 2X … » */
const QTE_AVANT = /^(\d{1,6})\s*[xX×*]\s*(.+)$/;
/** « Dell 5500 x 28 » (espace avant le x : « GTX 1080 » reste un modèle). */
const QTE_APRES = /^(.+?)\s+[xX×]\s*(\d{1,6})$/;
/** « HP E233 … Quantity: 87 », « … qté : 4 » */
const QTE_NOMMEE = /^(.+?)[\s,;:-]*\b(?:quantit[ée]s?|qty|quantity|qt[ée])\s*[:=]?\s*(\d{1,6})\b(.*)$/i;
/** « Écrans : 10 » */
const QTE_DEUX_POINTS = /^(.+?)\s*:\s*(\d{1,6})$/;
/** « 500 ipad 6th gen » (le mot suivant n'est pas une unité : « 8 GB DDR3 » reste entier). */
const QTE_DEVANT = /^(\d{1,6})\s+(\D.*)$/;
const UNITE = /^(go|gb|tb|to|mo|mb|mhz|ghz|w|kw|v|a|po|pouces?|inch(es)?|ports?|%|")(\b|\s|$)/i;

const SALUTATION = /^(bonjour|bonsoir|salut|hello|hi|merci|thanks|thank you|cordialement|regards|svp|s'il vous pla[iî]t|please)\b/i;

function nettoyer(texte: string): string {
  return texte.replace(/\s+/g, " ").trim().slice(0, LIMITES.ligne).trim();
}

/** Quantité et description d'une ligne (sans puce) ; quantité inconnue = null. */
export function analyserLigne(ligneBrute: string): Article | null {
  const ligne = nettoyer(ligneBrute.replace(PUCE, ""));
  if (!ligne) return null;

  let m = QTE_AVANT.exec(ligne);
  if (m) return { quantite: Number(m[1]), description: nettoyer(m[2]) };
  m = QTE_NOMMEE.exec(ligne);
  if (m) return { quantite: Number(m[2]), description: nettoyer(`${m[1]} ${m[3]}`) };
  m = QTE_APRES.exec(ligne);
  if (m) return { quantite: Number(m[2]), description: nettoyer(m[1]) };
  m = QTE_DEUX_POINTS.exec(ligne);
  if (m) return { quantite: Number(m[2]), description: nettoyer(m[1]) };
  m = QTE_DEVANT.exec(ligne);
  if (m && !UNITE.test(m[2])) return { quantite: Number(m[1]), description: nettoyer(m[2]) };
  return { quantite: null, description: ligne };
}

/**
 * Vrai pour une ligne qui n'est pas un article : titre de section en
 * majuscules (« CARTES GRAPHIQUES »), étiquette (« Matériel : »), salutation,
 * ou phrase sans chiffre surtout en minuscules (« Tout en bonne condition »).
 */
function horsArticle(ligne: string): boolean {
  const texte = ligne.replace(PUCE, "").trim();
  if (!texte) return true;
  if (/\d/.test(texte)) return false;
  if (SALUTATION.test(texte) || texte.endsWith(":")) return true;
  const lettres = texte.replace(/[^\p{L}]/gu, "");
  if (lettres && lettres === lettres.toUpperCase() && texte.length <= 40) return true;
  const mots = texte.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const majuscules = mots.filter((w) => /^\p{Lu}/u.test(w)).length;
  return mots.length > 3 && majuscules / mots.length < 0.3;
}

/** « Quantity: 53 » seule sur sa ligne : la quantité de l'article précédent. */
const QTE_SEULE = /^\s*(?:quantit[ée]s?|qty|quantity|qt[ée])\s*[:=]?\s*(\d{1,6})\s*$/i;

/**
 * Articles proposés à partir de la description d'une soumission (60 au plus).
 * `mots` : ce qui désigne le client (`motsDuClient`) ; une ligne qui ne contient
 * rien d'autre, comme sa signature, n'est pas un article. Une ligne amputée qui
 * n'a plus aucun chiffre non plus : c'est le reste d'une signature (« Directrice
 * TI », « Tél »), alors que « Laval : 12 portables » garde sa quantité.
 */
export function extraireArticles(description: string, mots: readonly string[] = []): Article[] {
  const articles: Article[] = [];
  for (const ligne of description.split(/\r?\n/)) {
    if (articles.length >= LIMITES.articles) break;
    const seule = QTE_SEULE.exec(ligne);
    const precedent = articles[articles.length - 1];
    if (seule && precedent && precedent.quantite == null) {
      precedent.quantite = Number(seule[1]);
      continue;
    }
    if (horsArticle(ligne)) continue;
    const propre = sansClient(ligne, mots);
    if (propre === null) continue;
    const ampute = masquerClient(ligne, mots) !== ligne.normalize("NFC");
    if (ampute && !/\d/.test(propre)) continue;
    const a = analyserLigne(propre);
    if (a) articles.push(a);
  }
  return articles;
}

/** Articles saisis par l'admin (une ligne par article, rien n'est écarté sauf les lignes vides). */
export function lireArticlesSaisis(texte: string): Article[] {
  const articles: Article[] = [];
  for (const ligne of texte.split(/\r?\n/)) {
    if (articles.length >= LIMITES.articles) break;
    const a = analyserLigne(ligne);
    if (a) articles.push(a);
  }
  return articles;
}

/** « 28 × Dell Latitude 5500 » ; sans quantité, la description seule. */
export function formaterArticle(a: Article): string {
  return a.quantite != null ? `${a.quantite} × ${a.description}` : a.description;
}

/**
 * Articles que Techno Lot revend déjà sans chercher (l'utilisateur a ses
 * acheteurs pour les portables) : simple indice affiché, la décision reste
 * à l'admin.
 */
const COURANT =
  /\b(portables?|laptops?|notebooks?|chromebooks?|ordinateurs?|desktops?|pcs?|écrans?|ecrans?|moniteurs?|monitors?|tout-en-un|all[- ]in[- ]one|aio|ipads?|tablettes?|tablets?)\b/i;

export function estCourant(description: string): boolean {
  return COURANT.test(description);
}

/** Articles qui semblent nichés dans le message d'une soumission (indice de l'accueil et de la soumission). */
export function nombreNiches(message: string | null, mots: readonly string[] = []): number {
  return extraireArticles(descriptionDuMessage(message), mots).filter((a) => !estCourant(a.description)).length;
}
