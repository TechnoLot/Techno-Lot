/**
 * « Changer d'appareil » (Mon compte → Double authentification) : confirmation
 * en deux temps. Logique pure, sans "use client", testée par vitest
 * (tests/securite/f5-compte-mfa.test.ts) ; le composant
 * components/admin/ChangerAppareilMfa.tsx ne fait que l'afficher.
 *
 *   repos ──demander──▶ confirmation ──confirmer──▶ envoi ──echec──▶ erreur
 *                         │  ▲                                       │
 *                annuler  ▼  └──────────────── demander ─────────────┘
 *                       repos
 *
 * Seule la transition confirmation → envoi déclenche l'action serveur (qui
 * retire le facteur) : un premier clic ne retire jamais rien.
 */

export type EtapeChangerAppareil = "repos" | "confirmation" | "envoi" | "erreur";
export type EvenementChangerAppareil = "demander" | "annuler" | "confirmer" | "echec";

export function etapeSuivante(
  etape: EtapeChangerAppareil,
  evenement: EvenementChangerAppareil,
): EtapeChangerAppareil {
  switch (evenement) {
    case "demander":
      return etape === "repos" || etape === "erreur" ? "confirmation" : etape;
    case "annuler":
      return etape === "confirmation" ? "repos" : etape;
    case "confirmer":
      return etape === "confirmation" ? "envoi" : etape;
    case "echec":
      return etape === "envoi" ? "erreur" : etape;
  }
}

/** Vrai seulement pour la transition qui doit appeler l'action serveur. */
export function declencheAction(etape: EtapeChangerAppareil, evenement: EvenementChangerAppareil): boolean {
  return etape === "confirmation" && evenement === "confirmer";
}

/** Phrase de confirmation affichée après le premier clic. */
export const PHRASE_CONFIRMATION = "Ton application actuelle ne donnera plus de code valide. Continuer ?";
