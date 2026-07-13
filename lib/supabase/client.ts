import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour composants React exécutés dans le navigateur.
 * À utiliser depuis un composant "use client" quand une donnée doit être
 * lue ou écrite directement côté client (temps réel, etc.).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
