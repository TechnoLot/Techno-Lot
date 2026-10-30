/**
 * Options des témoins (cookies) de session Supabase.
 *
 * Compatible Edge, sans `server-only` : utilisé par `lib/supabase/server.ts` ET
 * `middleware.ts`, via l'option `cookieOptions` de `createServerClient`
 * (`@supabase/ssr`), pour que les deux posent les témoins de la même façon.
 *
 * - httpOnly : le JavaScript du navigateur ne peut plus lire la session (un XSS
 *   ne peut pas voler le jeton). Possible car plus aucun client Supabase
 *   navigateur ne lit la session (le dernier usage est retiré par une autre
 *   tâche de la passe sécurité).
 * - sameSite « lax » : le témoin part avec une navigation de premier niveau
 *   (lien magique ouvert depuis le courriel) mais pas avec les requêtes
 *   intersites en arrière-plan.
 * - secure en production seulement : `http://localhost` doit continuer de
 *   fonctionner en développement.
 */
export const OPTIONS_COOKIES = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
} as const;
