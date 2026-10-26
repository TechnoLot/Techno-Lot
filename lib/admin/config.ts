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
 * ADMIN_USERNAMES = "nom:courriel,nom2:courriel2". Par défaut,
 * « lockedinantho » pointe vers le premier courriel admin.
 * Le mot de passe, lui, vit seulement dans Supabase Auth (haché).
 */
export function getAdminUsernames(): Record<string, string> {
  const map: Record<string, string> = {};
  const fallback = getAdminEmails()[0];
  if (fallback) map.lockedinantho = fallback;
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
