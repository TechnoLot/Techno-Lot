import { PART_OFFRE_EN_GROS, type FamilleResultat, type LigneResultat } from "@/lib/acheteurs/types";

/*
 * Valeur minimale d'un lot (logique pure, serveur et navigateur) : le chiffre
 * sur lequel l'admin se base pour décider combien payer, sans passer le lot
 * article par article. Il peut être trop bas, jamais trop haut (demande de
 * l'utilisateur, 2026-11-05) : le prix le plus bas de chaque ligne × sa
 * quantité, en dollars canadiens, arrondi à la baisse. Les prix viennent d'une
 * IA qui a lu des pages Web : une ligne sans quantité, sans prix, sans devise
 * connue ou sans page source n'est pas comptée. La somme des lignes affichées
 * donne exactement le total.
 */

/**
 * Dollars canadiens pour une unité de devise, gardés sous les taux réels pour
 * que le minimum ne dépende pas du change (Banque du Canada, 2026-11-04 :
 * 1,40 et 1,57). Une ligne dans une autre devise n'est pas comptée.
 */
export const TAUX_PRUDENTS: Record<string, number> = { CAD: 1, USD: 1.3, EUR: 1.45 };

/**
 * Baisse d'un prix demandé : une annonce ne prouve pas une vente, et Claude
 * voit rarement les ventes conclues d'eBay (aucune dans le lot du 2026-11-05).
 */
export const BAISSE_PRIX_DEMANDE = 0.3;

/** Au cent près d'abord : un 700 $ tout rond ne doit pas tomber à 699 $ par un écart de calcul. */
function aLaBaisse(montant: number): number {
  return Math.floor(Math.round(montant * 100) / 100);
}

/** Minimum d'une ligne en dollars canadiens, arrondi à la baisse ; null : ligne pas comptée. */
export function minimumLigne({ quantite, prix }: LigneResultat): number | null {
  const taux = prix.devise ? TAUX_PRUDENTS[prix.devise] : undefined;
  if (quantite == null || prix.bas == null || !taux || prix.sources.length === 0) return null;
  return aLaBaisse(quantite * prix.bas * taux * (prix.vendu ? 1 : 1 - BAISSE_PRIX_DEMANDE));
}

export type ValeurLot = {
  /** Somme des minimums, en dollars canadiens. */
  total: number;
  comptees: number;
  /** Lignes sans minimum : la vraie valeur du lot est plus haute, jamais plus basse. */
  nonComptees: number;
};

export function valeurLot(familles: FamilleResultat[]): ValeurLot {
  const minimums = familles.flatMap((f) => f.lignes.map(minimumLigne));
  const comptes = minimums.filter((m): m is number => m !== null);
  return {
    total: comptes.reduce((somme, m) => somme + m, 0),
    comptees: comptes.length,
    nonComptees: minimums.length - comptes.length,
  };
}

/** Prix de revente du lot à un acheteur en gros, tiré de sa valeur minimale, arrondi à la baisse. */
export function reventeEnGros(total: number): { bas: number; haut: number } {
  return { bas: aLaBaisse(total * PART_OFFRE_EN_GROS.min), haut: aLaBaisse(total * PART_OFFRE_EN_GROS.max) };
}
