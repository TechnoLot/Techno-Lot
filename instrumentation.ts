/**
 * Démarrage du serveur Next.js : vérifie les variables d'environnement
 * (lib/securite/env.ts). En production, une variable indispensable absente
 * empêche le démarrage avec un message clair (nom seulement, jamais la valeur).
 * Runtime Node seulement : le runtime Edge (middleware) n'est pas concerné.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { verifierEnvironnement } = await import("./lib/securite/env");
    verifierEnvironnement();
  }
}
