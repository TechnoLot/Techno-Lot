import { masquerDonneesSensibles } from "@/lib/securite/masquage";

/*
 * Identité du client d'une soumission (logique pure, serveur et navigateur) :
 * retire de tout texte destiné à Claude son nom, sa compagnie, sa ville, son
 * courriel et son téléphone. Sa signature ne devient plus un « article », et
 * rien de ce qui le désigne ne quitte le site.
 *
 * Le texte peut venir d'un tableur de 40 000 caractères : les motifs restent
 * linéaires (mots bornés par des lookaround, aucun quantificateur imbriqué).
 * Pas de `\b` : il ne reconnaît pas les lettres accentuées.
 */

export type SoumissionIdentite = {
  nom: string | null;
  courriel: string | null;
  telephone: string | null;
  entreprise: string | null;
  ville: string | null;
};

/** Ce qui remplace le client dans un texte (la consigne de lecture l'explique à Claude). */
const MENTION_CLIENT = "[client]";

const LONGUEUR_MIN = 3;

/** Trop courants pour être masqués seuls : particules et civilités d'un nom. */
const MOTS_VIDES = new Set(["des", "les", "del", "der", "van", "von", "mme", "mlle", "monsieur", "madame"]);

/** Boîtes de service : « support@… » ne doit pas effacer « Support VESA ». */
const BOITES_GENERIQUES = new Set([
  "info",
  "contact",
  "admin",
  "ventes",
  "sales",
  "service",
  "support",
  "achats",
  "reception",
  "bureau",
  "office",
  "mail",
]);

const DOMAINES_GRAND_PUBLIC =
  /^(?:gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|videotron|bell|sympatico|cogeco|telus|shaw|rogers|proton|protonmail|pm|gmx|mail|fastmail|zoho)\.[a-z.]+$/i;

const SUFFIXES_LEGAUX =
  "inc|incorporée|incorporee|incorporated|ltée|ltee|ltd|limitée|limitee|limited|enr|enregistrée|enregistree|senc|s\\.e\\.n\\.c|senc\\.?r\\.?l|corp|corporation|cie|llc|llp";

/** Suffixe légal en fin de nom de compagnie (« , Ltée. », « & Cie »). */
const SUFFIXE_FINAL = new RegExp(`[\\s,&-]+(?:${SUFFIXES_LEGAUX})\\.?$`, "iu");
/** Suffixe resté derrière un mot masqué : « Usine Exemple ltée » quand la fiche dit « inc. ». */
const SUFFIXE_APRES_MENTION = new RegExp(
  `\\[client\\][\\s,]*(?:${SUFFIXES_LEGAUX})\\.?(?![\\p{L}\\p{N}])`,
  "giu",
);

function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Mot utilisable : assez long, pas un mot vide, ponctuation de fin retirée. */
function ajouter(mots: Map<string, string>, brut: string | null | undefined): void {
  const mot = (brut ?? "").replace(/\s+/g, " ").replace(/^[\s,;:.]+|[\s,;:.]+$/g, "");
  const cle = sansAccents(mot).toLowerCase();
  if (cle.replace(/[^\p{L}\p{N}]/gu, "").length < LONGUEUR_MIN || MOTS_VIDES.has(cle)) return;
  if (!mots.has(cle)) mots.set(cle, mot);
}

function sansSuffixeLegal(entreprise: string): string {
  let nom = entreprise.trim();
  for (;;) {
    const court = nom.replace(SUFFIXE_FINAL, "").trim();
    if (court === nom) return nom;
    nom = court;
  }
}

/**
 * Tout ce qui désigne le client. La compagnie n'est jamais coupée en mots :
 * une compagnie « Dell Canada » ne doit pas effacer « Dell Latitude ».
 */
export function motsDuClient(s: SoumissionIdentite): string[] {
  const mots = new Map<string, string>();

  ajouter(mots, s.nom);
  for (const mot of (s.nom ?? "").split(/[^\p{L}\p{N}'’]+/u)) ajouter(mots, mot);

  ajouter(mots, s.entreprise);
  ajouter(mots, sansSuffixeLegal(s.entreprise ?? ""));

  ajouter(mots, s.ville);

  const courriel = (s.courriel ?? "").trim();
  const arobase = courriel.lastIndexOf("@");
  ajouter(mots, courriel);
  if (arobase > 0) {
    const locale = courriel.slice(0, arobase);
    const domaine = courriel.slice(arobase + 1);
    if (!BOITES_GENERIQUES.has(locale.toLowerCase())) ajouter(mots, locale);
    if (!DOMAINES_GRAND_PUBLIC.test(domaine)) ajouter(mots, domaine);
  }

  return [...mots.values()];
}

/** Variantes accentuées de chaque lettre (le drapeau `i` s'occupe de la casse). */
const VARIANTES: Record<string, string> = {
  a: "aàâäáãå",
  c: "cç",
  e: "eéèêë",
  i: "iîïíì",
  n: "nñ",
  o: "oôöóòõ",
  u: "uûüúù",
  y: "yÿý",
};

function motifDuMot(mot: string): string {
  const parties = sansAccents(mot).toLowerCase().split(/[\s\-‐‑–—]+/);
  const motifs = parties.map((partie) =>
    [...partie]
      .map((c) => {
        if (VARIANTES[c]) return `[${VARIANTES[c]}]`;
        if (c === "'" || c === "’") return "['’]";
        return c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      })
      .join(""),
  );
  // « Saint-Eustache » se retrouve aussi écrit « Saint Eustache ».
  return motifs.join("[\\s\\-‐‑–—]{1,4}");
}

function regexDesMots(mots: readonly string[]): RegExp | null {
  const motifs = mots
    .filter((m) => m.trim())
    .sort((a, b) => b.length - a.length)
    .map(motifDuMot)
    .filter(Boolean);
  if (motifs.length === 0) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${motifs.join("|")})(?![\\p{L}\\p{N}])`, "giu");
}

/** Le lookbehind ne laisse démarrer le motif qu'au début d'une suite de caractères : linéaire. */
const COURRIEL = /(?<![\p{L}\p{N}._%+'-])[\p{L}\p{N}._%+'-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

/** Téléphone nord-américain : 10 chiffres (+1 facultatif), sans toucher une référence plus longue. */
const TELEPHONE = /(?<![\p{L}\p{N}.-])(?:\+?1[\s.-]?)?(?:\([2-9]\d{2}\)[\s.-]?|[2-9]\d{2}[\s.-]?)[2-9]\d{2}[\s.-]?\d{4}(?![\p{L}\p{N}-])/gu;

/**
 * Retire le client d'un texte : courriels et téléphones d'abord (sinon
 * « marie@… » perdrait sa partie locale et le motif ne reconnaîtrait plus le
 * reste), puis ses mots, sans égard à la casse ni aux accents.
 */
export function masquerClient(texte: string, mots: readonly string[]): string {
  let t = masquerDonneesSensibles(texte.normalize("NFC")).texte;
  t = t.replace(COURRIEL, MENTION_CLIENT).replace(TELEPHONE, MENTION_CLIENT);
  const regex = regexDesMots(mots);
  if (regex) t = t.replace(regex, MENTION_CLIENT);
  return t.replace(SUFFIXE_APRES_MENTION, MENTION_CLIENT);
}

/** Description sans le client ; null s'il ne reste ni lettre ni chiffre (une signature, par exemple). */
export function sansClient(description: string, mots: readonly string[]): string | null {
  const masque = masquerClient(description, mots);
  if (!masque.includes(MENTION_CLIENT)) return /[\p{L}\p{N}]/u.test(masque) ? masque : null;
  const reste = sansBords(
    masque
      .split(MENTION_CLIENT)
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/\( ?\)/g, " ")
      .replace(/ ([,;:.])/g, "$1")
      .replace(/([,;:.])[ ,;:.]*[,;:.]/g, "$1")
      .replace(/ {2,}/g, " "),
  );
  return /[\p{L}\p{N}]/u.test(reste) ? reste : null;
}

/**
 * Articles sans le client, seule liste qui peut partir vers la recherche Web :
 * vaut aussi pour ce que l'admin a saisi à la main. Un article qui ne désignait
 * que le client est retiré.
 */
export function articlesSansClient<T extends { description: string }>(articles: readonly T[], mots: readonly string[]): T[] {
  return articles.flatMap((a) => {
    const description = sansClient(a.description, mots);
    return description ? [{ ...a, description }] : [];
  });
}

const BORDS = " ,;:.-–—/|&";

/** Ponctuation restée en début et en fin de texte (boucles : aucun retour en arrière). */
function sansBords(texte: string): string {
  let debut = 0;
  let fin = texte.length;
  while (debut < fin && BORDS.includes(texte[debut])) debut++;
  while (fin > debut && BORDS.includes(texte[fin - 1])) fin--;
  return texte.slice(debut, fin);
}
