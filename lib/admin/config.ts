import { site } from "@/lib/site";

/** Webmail Hostinger de la boîte info@technolot.ca (aucun lien n'ouvre un message précis ni ne pré-remplit un nouveau message). */
export const WEBMAIL_URL = "https://mail.hostinger.com/";

/**
 * Whitelist des courriels autorisés à accéder au tableau de bord admin.
 * Défini via la variable d'environnement ADMIN_EMAILS (liste séparée par
 * virgule). En absence de configuration, l'accès est refusé à tous.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Noms d'utilisateur de connexion → courriel du compte Supabase.
 * Par défaut, « info » (la casse ne compte pas : « Info ») pointe vers le
 * courriel de l'entreprise (site.email), qui doit aussi être dans ADMIN_EMAILS.
 * ADMIN_USERNAMES = "nom:courriel,nom2:courriel2" en ajoute d'autres.
 * Le mot de passe, lui, vit seulement dans Supabase Auth (haché).
 */
export function getAdminUsernames(): Record<string, string> {
  const map: Record<string, string> = { info: site.email.toLowerCase() };
  for (const pair of (process.env.ADMIN_USERNAMES ?? "").split(",")) {
    const [user, email] = pair.split(":").map((s) => s?.trim().toLowerCase());
    if (user && email) map[user] = email;
  }
  return map;
}

export function emailForUsername(username: string): string | null {
  return getAdminUsernames()[username.trim().toLowerCase()] ?? null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/**
 * Prénom affiché par défaut (« Bonjour Anthony », carte du menu) quand le
 * compte n'a pas encore de user_metadata.prenom (modifiable dans Mon compte).
 * Fichier sans "use client" : importable côté serveur et côté client.
 */
export const DEFAULT_PRENOMS: Record<string, string> = {
  [site.email.toLowerCase()]: "Anthony",
};

export const PRENOM_MAX_LENGTH = 40;

/** Événement fenêtre émis après l'enregistrement du prénom (detail = prénom). */
export const ADMIN_PRENOM_EVENT = "tl:admin-prenom";

/**
 * Prénom à afficher : user_metadata.prenom s'il existe, sinon la table par
 * défaut, sinon null (on affiche alors « Bonjour » seul).
 */
export function resolvePrenom(
  email: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): string | null {
  const meta = metadata?.prenom;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  if (!email) return null;
  return DEFAULT_PRENOMS[email.toLowerCase()] ?? null;
}
