/**
 * Masquage des renseignements sensibles avant tout envoi à l'IA (Loi 25 :
 * ne pas traiter inutilement de données sensibles). Les numéros de carte de
 * paiement et d'assurance sociale (NAS) sont remplacés par une mention neutre ;
 * le reste du texte (noms, coordonnées, montants) est laissé intact pour
 * l'extraction.
 *
 * Fonctions pures, sans dépendance : utilisables côté serveur et en test.
 */

export const MENTION_CARTE = "[carte masquée]";
export const MENTION_NAS = "[NAS masqué]";

/** Vrai si la suite de chiffres passe la clé de Luhn (cartes de paiement et NAS canadiens). */
export function luhnValide(chiffres: string): boolean {
  if (!/^\d+$/.test(chiffres)) return false;
  let somme = 0;
  let double = false;
  for (let i = chiffres.length - 1; i >= 0; i--) {
    let n = chiffres.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
    double = !double;
  }
  return somme % 10 === 0;
}

/** Carte : 13 à 19 chiffres, groupes séparés au plus par un espace ou un tiret. */
const MOTIF_CARTE = /(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])/g;
/** NAS écrit en 3-3-3 avec espaces ou tirets. */
const MOTIF_NAS_FORMATE = /(?<![\d-])\d{3}[ -]\d{3}[ -]\d{3}(?![\d-])/g;
/** NAS en 9 chiffres collés, annoncé par « NAS », « SIN » ou « assurance sociale ». */
const MOTIF_NAS_ANNONCE =
  /\b(NAS|N\.A\.S\.|SIN|assurance[- ]sociale|social insurance(?: number)?)(\s*(?:no|n°|nº|#|numéro|number)?\s*[:.]?\s*)(\d{9})(?!\d)/gi;

/**
 * Remplace les numéros de carte (clé de Luhn valide) et les NAS par une
 * mention neutre. Renvoie le texte masqué et le nombre de remplacements.
 */
export function masquerDonneesSensibles(texte: string): { texte: string; masques: number } {
  let masques = 0;

  let resultat = texte.replace(MOTIF_CARTE, (trouve) => {
    const chiffres = trouve.replace(/\D/g, "");
    if (!luhnValide(chiffres)) return trouve;
    masques++;
    return MENTION_CARTE;
  });

  resultat = resultat.replace(MOTIF_NAS_FORMATE, (trouve) => {
    if (!luhnValide(trouve.replace(/\D/g, ""))) return trouve;
    masques++;
    return MENTION_NAS;
  });

  // Annoncé comme NAS : masqué même si la clé de Luhn ne passe pas (faute de frappe).
  resultat = resultat.replace(MOTIF_NAS_ANNONCE, (_trouve, mot: string, separateur: string) => {
    masques++;
    return `${mot}${separateur}${MENTION_NAS}`;
  });

  return { texte: resultat, masques };
}
