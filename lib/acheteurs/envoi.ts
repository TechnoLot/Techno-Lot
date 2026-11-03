import { courrielValide, normaliserCourriel } from "@/lib/crm/envoi-en-gros";
import { langueAcheteur, type AcheteurCarnet, type Courriel, type Langue } from "@/lib/acheteurs/types";

/*
 * Préparation de l'Envoi en gros à partir d'une recherche d'acheteurs (logique
 * pure). L'envoi lui-même reste celui de l'Envoi en gros : vérification,
 * « M'envoyer un test », case et nombre exact, 100 courriels par jour,
 * désabonnés exclus, copie dans Envoyés.
 */

/** Pré-remplissage du formulaire de l'Envoi en gros. */
export type DepartEnvoi = { texte: string; objet: string; corps: string; nombre: number; langue: Langue };

/** Valeur sans séparateur ni saut de ligne pour la liste « courriel;compagnie ». */
function cellule(v: string): string {
  return v.replace(/[;\r\n\t"]/g, " ").replace(/\s+/g, " ").trim();
}

/** Acheteurs qu'on peut joindre par courriel dans cette langue, sans doublon. */
export function destinatairesDe(acheteurs: AcheteurCarnet[], langue: Langue): AcheteurCarnet[] {
  const vus = new Set<string>();
  return acheteurs.filter((a) => {
    if (!a.courriel || langueAcheteur(a) !== langue) return false;
    const c = normaliserCourriel(a.courriel);
    if (!courrielValide(c) || vus.has(c)) return false;
    vus.add(c);
    return true;
  });
}

/**
 * Liste et message de l'Envoi en gros : en-tête « courriel;compagnie »
 * (reconnu par lib/crm/envoi-en-gros.ts), une compagnie par ligne. null si
 * personne n'est joignable par courriel dans cette langue ou s'il n'y a pas
 * de brouillon.
 */
export function departEnvoi(
  acheteurs: AcheteurCarnet[],
  courriel: Courriel | null,
  langue: Langue,
): DepartEnvoi | null {
  const destinataires = destinatairesDe(acheteurs, langue);
  if (destinataires.length === 0 || !courriel) return null;
  const lignes = destinataires.map((a) => `${normaliserCourriel(a.courriel ?? "")};${cellule(a.nom)}`);
  return {
    texte: ["courriel;compagnie", ...lignes].join("\n"),
    objet: courriel.objet,
    corps: courriel.message,
    nombre: destinataires.length,
    langue,
  };
}
