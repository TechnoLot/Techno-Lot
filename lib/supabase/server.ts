import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { OPTIONS_COOKIES } from "./options-cookies";

/**
 * Client Supabase pour Server Components, Route Handlers et Server Actions.
 * Recrée un client à chaque requête pour rester compatible avec le cache
 * de Next.js et les cookies signés.
 * Asynchrone depuis Next 15 : `cookies()` renvoie une promesse.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { flowType: "implicit" },
      // HttpOnly, Secure en production, SameSite=Lax (lib/supabase/options-cookies.ts).
      cookieOptions: OPTIONS_COOKIES,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component en dehors d'une Server Action.
            // Sans authentification, on peut l'ignorer sans risque.
          }
        },
      },
    },
  );
}
