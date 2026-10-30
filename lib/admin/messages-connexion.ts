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
  identifiants: "Identifiants invalides.",
  trop_de_tentatives: "Trop de tentatives. Réessaie dans quelques minutes.",
  lien_expire: "Ce lien de connexion a expiré. Demandes-en un nouveau.",
  lien_invalide:
    "Ce lien de connexion n'est pas valide ou a déjà servi. Ouvre-le dans le navigateur où tu l'as demandé, ou demandes-en un nouveau.",
  courriel_non_autorise: MESSAGE_NON_AUTORISE,
  // Texte posé tel quel par la garde et le layout admin pour un courriel refusé.
  [MESSAGE_NON_AUTORISE]: MESSAGE_NON_AUTORISE,
};

/** Message à afficher pour `?error=`, ou undefined s'il n'y en a pas. */
export function messageErreurConnexion(code: unknown): string | undefined {
  if (typeof code !== "string" || code === "") return undefined;
  return Object.prototype.hasOwnProperty.call(MESSAGES_ERREUR, code)
    ? MESSAGES_ERREUR[code]
    : MESSAGE_ERREUR_INCONNUE;
}
