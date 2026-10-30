/**
 * Lien externe saisi par l'admin ou importé (ex. profil LinkedIn d'un contact
 * du CRM) : seul un lien http(s) devient cliquable (check 07 : jamais
 * `javascript:`, `data:`…). Sans schéma (« linkedin.com/in/… »), `https://`
 * est ajouté. Partageable serveur / client (aucun "use client", aucune
 * dépendance).
 */

/** Autre schéma que http(s) : « javascript: », « data: », « mailto: »… (mais pas « hôte:port »). */
const AUTRE_SCHEMA = /^[a-z][a-z0-9+.-]*:/i;
const HOTE_PORT = /^[a-z0-9.-]+:\d+(?:[/?#]|$)/i;

/** URL http(s) normalisée, ou null si la valeur n'est pas un lien web sûr. */
export function urlHttpExterne(valeur: string | null | undefined): string | null {
  const v = (valeur ?? "").trim();
  if (!v) return null;

  let candidat: string;
  if (/^https?:\/\//i.test(v)) candidat = v;
  else if (AUTRE_SCHEMA.test(v) && !HOTE_PORT.test(v)) return null;
  else candidat = `https://${v.replace(/^\/+/, "")}`;

  let url: URL;
  try {
    url = new URL(candidat);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;
  return url.href;
}
