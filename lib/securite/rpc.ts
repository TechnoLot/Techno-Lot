import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Accès du serveur aux fonctions SQL protégées par secret (`limite_debit`,
 * `journal_securite_ajouter`, `soumission_enregistrer`, `lead_pub_enregistrer`,
 * `suivi_pub_enregistrer` ; migration 20261030020000_securite_rpc.sql).
 *
 * Ces fonctions sont appelables avec la clé publishable (publique par nature),
 * mais refusent tout appel sans le secret serveur SECURITE_RPC_SECRET (dont
 * seule l'empreinte SHA-256 est en base, table securite.secret_rpc). Le
 * secret ne doit JAMAIS avoir le préfixe NEXT_PUBLIC_ ni quitter le serveur.
 */

export const LONGUEUR_MIN_SECRET = 32;

/** Secret serveur, ou null s'il est absent ou trop court (fonction désactivée). */
export function secretRpc(): string | null {
  const secret = process.env.SECURITE_RPC_SECRET;
  if (!secret || secret.length < LONGUEUR_MIN_SECRET) return null;
  return secret;
}

let client: SupabaseClient | null = null;

/**
 * Client Supabase sans session (rôle anon) pour les fonctions à secret.
 * Aucun témoin lu ni écrit : utilisable partout côté serveur. null si la
 * configuration Supabase manque.
 */
export function clientRpc(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) return null;
  client = createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
