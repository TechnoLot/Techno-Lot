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

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
