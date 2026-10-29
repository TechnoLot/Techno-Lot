/**
 * Mail API de Hostinger (« Agentic Mail ») : clé créée dans hPanel
 * (Courriels → domaine → Agentic Mail → API access), seulement dans
 * l'environnement du serveur (HOSTINGER_MAIL_API_TOKEN), jamais versionnée.
 */

/** En-tête ajouté au courriel du formulaire : retrouve le courriel exact d'une soumission. */
export const ENTETE_SOUMISSION = "X-Technolot-Soumission";

export function isMailApiConfigured(): boolean {
  return Boolean(process.env.HOSTINGER_MAIL_API_TOKEN);
}
