/**
 * Messages de la page de connexion pour chaque code `?error=` posé par la
 * garde (lib/securite/garde.ts), le middleware et les routes d'auth.
 *
 * Jamais le texte brut de l'URL : un lien piégé ne peut pas faire afficher
 * son propre message (« appelez le … ») sur la vraie page de connexion.
 * Sans `"use client"` : lu par la page (serveur).
 */

const MESSAGE_NON_AUTORISE = "Ce courriel n'est pas autorisé à accéder au tableau de bord.";

export const MESSAGE_ERREUR_INCONNUE = "Une erreur est survenue. Réessaie.";

const MESSAGES_ERREUR: Readonly<Record<string, string>> = {
  session_expiree: "Ta session a expiré : reconnecte-toi (une fois par jour).",
  inactivite: "Déconnecté après 1 h sans activité. Reconnecte-toi.",
  identifiants: "Identifiants invalides.",
  // Sans JavaScript, la durée exacte n'est pas transmise (voir messageBlocageConnexion).
  trop_de_tentatives: "Trop d'essais. Connexion bloquée pour le moment : réessaie plus tard.",
  lien_expire: "Ce lien de connexion a expiré.",
  lien_invalide: "Ce lien de connexion n'est pas valide ou a déjà servi.",
  courriel_non_autorise: MESSAGE_NON_AUTORISE,
  // Texte posé tel quel par la garde et le layout admin pour un courriel refusé.
  [MESSAGE_NON_AUTORISE]: MESSAGE_NON_AUTORISE,
};

/** Message d'un refus de connexion, avec le temps restant (`attente` en secondes). */
export function messageBlocageConnexion(attente: number): string {
  const minutes = Math.max(1, Math.ceil(attente / 60));
  const duree = minutes > 120 ? `${Math.ceil(minutes / 60)} h` : `${minutes} min`;
  return `Trop d'essais. Connexion bloquée pendant ${duree}.`;
}

/** Message à afficher pour `?error=`, ou undefined s'il n'y en a pas. */
export function messageErreurConnexion(code: unknown): string | undefined {
  if (typeof code !== "string" || code === "") return undefined;
  return Object.prototype.hasOwnProperty.call(MESSAGES_ERREUR, code)
    ? MESSAGES_ERREUR[code]
    : MESSAGE_ERREUR_INCONNUE;
}
