import { entetesDe, type SourceEntetes } from "./ip";

/**
 * Empreinte de navigateur, pour les limites de débit qui doivent survivre à un
 * changement d'adresse IP (VPN, proxys tournants).
 *
 * Compatible Edge : ni `server-only` ni `node:*`.
 *
 * Volontairement sans hachage : ce texte ne sert que de clé à `limiter()`, qui
 * applique déjà un HMAC avant d'écrire en base. Rien de lisible n'est conservé
 * (Loi 25). Ne pas journaliser cette valeur.
 *
 * Ce n'est PAS un identifiant fiable : deux personnes peuvent avoir la même
 * empreinte, et un robot peut changer ses en-têtes. D'où le compteur global en
 * renfort du côté de la connexion.
 */

const ENTETES = [
  "user-agent",
  "accept-language",
  "sec-ch-ua",
  "sec-ch-ua-platform",
  "sec-ch-ua-mobile",
] as const;

const LONGUEUR_MAX = 256;

export function empreinteNavigateur(source: SourceEntetes): string {
  const entetes = entetesDe(source);
  return ENTETES.map((nom) => (entetes.get(nom) ?? "").toLowerCase().slice(0, LONGUEUR_MAX)).join("|");
}
