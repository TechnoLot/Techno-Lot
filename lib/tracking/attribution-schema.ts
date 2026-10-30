import { z } from "zod";

/**
 * Validation SERVEUR de l'attribution publicitaire (type `Attribution` de
 * `lib/tracking/attribution.ts`), partagée par `/api/track` (session) et
 * `/api/soumission` (champ caché `tl_attr`).
 *
 * Fichier séparé (sans `"use client"`) : `attribution.ts` est chargé dans le
 * navigateur, on n'y ajoute pas zod.
 *
 * Schéma STRICT : clés connues seulement, chaînes bornées aux mêmes longueurs
 * que celles du navigateur (`clean()` y tronque déjà), listes fermées.
 */

export const PLATEFORMES = ["meta", "google", "organic", "referral", "direct", "email", "other"] as const;
export const APPAREILS = ["mobile", "tablet", "desktop"] as const;
export const TYPES_EVENEMENTS = ["page_view", "cta_click", "form_view", "form_start", "form_submit"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const chaine = (max: number) => z.string().max(max).nullish();

export const SchemaAttribution = z
  .object({
    id: z.string().regex(UUID_RE),
    platform: z.enum(PLATEFORMES),
    utm_source: chaine(300),
    utm_medium: chaine(300),
    utm_campaign: chaine(300),
    utm_content: chaine(300),
    utm_term: chaine(300),
    campaign_id: chaine(100),
    adset_id: chaine(100),
    ad_id: chaine(100),
    placement: chaine(100),
    fbclid: chaine(500),
    gclid: chaine(500),
    landing_path: chaine(500),
    referrer: chaine(500),
    device: z.enum(APPAREILS).nullish(),
    locale: z.enum(["fr", "en"]).nullish(),
  })
  .strict();

export type AttributionValidee = z.infer<typeof SchemaAttribution>;

/** Corps de POST /api/track. */
export const SchemaSuivi = z
  .object({
    session: SchemaAttribution,
    event: z
      .object({
        type: z.enum(TYPES_EVENEMENTS),
        path: z.string().max(500).nullish(),
      })
      .strict(),
  })
  .strict();

/** Taille maximale du JSON `tl_attr` (environ 3 Ko au pire côté navigateur). */
export const TAILLE_MAX_TL_ATTR = 4_096;

/**
 * Attribution du champ caché `tl_attr`, ou null si absente, trop longue, mal
 * formée ou avec des clés inconnues (le lead est alors gardé comme « direct » :
 * une attribution invalide ne bloque jamais une demande).
 */
export function lireTlAttr(brut: string | undefined | null): AttributionValidee | null {
  if (!brut) return null;
  if (brut.length > TAILLE_MAX_TL_ATTR) return null;
  let valeur: unknown;
  try {
    valeur = JSON.parse(brut);
  } catch {
    return null;
  }
  const r = SchemaAttribution.safeParse(valeur);
  return r.success ? r.data : null;
}

/** Chaîne nettoyée et bornée, ou null. */
export function nettoyerChaine(v: string | null | undefined, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}
