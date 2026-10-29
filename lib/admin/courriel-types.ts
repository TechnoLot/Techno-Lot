/**
 * « Voir le courriel » d'une soumission : réponse de
 * GET /api/admin/soumissions/[id]/courriel (partagée serveur / client).
 */

export type PieceJointe = {
  /** Identifiant opaque : GET /api/admin/soumissions/[id]/courriel/pieces/[id] */
  id: string;
  nom: string;
  /** Type MIME */
  type: string;
  /** Octets */
  taille: number;
};

export type CourrielSoumission = {
  sujet: string;
  /** « Nom <adresse> » ou l'adresse seule */
  de: string;
  a: string;
  /** ISO */
  date: string;
  html: string | null;
  texte: string | null;
  piecesJointes: PieceJointe[];
  /** Webmail Hostinger, ouvert directement sur ce message */
  lienHostinger: string;
};

export type ReponseCourriel =
  | { etat: "trouve"; courriel: CourrielSoumission }
  | { etat: "introuvable" }
  | { etat: "non-configure" }
  | { etat: "erreur"; message: string };
