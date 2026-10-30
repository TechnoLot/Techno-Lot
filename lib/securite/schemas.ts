import { z } from "zod";

/**
 * Petits schémas Zod réutilisables (validation serveur, check 06).
 *
 * Sans `server-only` ni `"use client"` : partageable avec un formulaire client
 * pour afficher les mêmes erreurs, mais la validation qui compte est TOUJOURS
 * celle du serveur, avant toute écriture en base.
 *
 * Exemple :
 *   const lotSchema = z.object({
 *     client_name: texte(1, 160),
 *     client_email: courriel.nullish(),
 *     purchase_price: montant,
 *     soumission_id: uuid.nullish(),
 *   }).strict();
 *   const r = lotSchema.safeParse(entree);
 *   if (!r.success) return { ok: false, error: "Données invalides." };
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Identifiant UUID (forme 8-4-4-4-12, comme `gen_random_uuid()`), en minuscules. */
export const uuid = z
  .string()
  .trim()
  .regex(UUID_RE, "Identifiant invalide.")
  .transform((v) => v.toLowerCase());

/** Texte nettoyé des espaces de bord, entre `min` et `max` caractères. */
export function texte(min: number, max: number) {
  return z.string().trim().min(min).max(max);
}

/** Adresse courriel en minuscules, 254 caractères au plus. */
export const courriel = z.string().trim().toLowerCase().max(254).pipe(z.email("Courriel invalide."));

/** Numéro de téléphone libre (espaces, tirets, poste…), 40 caractères au plus. */
export const telephone = z.string().trim().max(40);

const SCHEMA_AUTRE = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

/**
 * Lien web : http ou https SEULEMENT (refuse `javascript:`, `data:`, `mailto:`…),
 * `https://` ajouté si aucun schéma n'est donné, 300 caractères au plus.
 * Renvoie l'URL normalisée.
 */
export const urlHttps = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .transform((valeur, ctx) => {
    let brute = valeur;
    if (!/^https?:\/\//i.test(brute)) {
      if (SCHEMA_AUTRE.test(brute) || brute.startsWith("//")) {
        ctx.addIssue({ code: "custom", message: "Seuls les liens http(s) sont acceptés." });
        return z.NEVER;
      }
      brute = `https://${brute}`;
    }
    let url: URL;
    try {
      url = new URL(brute);
    } catch {
      ctx.addIssue({ code: "custom", message: "Lien invalide." });
      return z.NEVER;
    }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname) {
      ctx.addIssue({ code: "custom", message: "Seuls les liens http(s) sont acceptés." });
      return z.NEVER;
    }
    if (url.href.length > 300) {
      ctx.addIssue({ code: "custom", message: "Lien trop long." });
      return z.NEVER;
    }
    return url.href;
  });

/** Date du calendrier « AAAA-MM-JJ » (vérifie qu'elle existe : pas de 2026-02-30). */
export const dateIso = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ).")
  .refine((v) => {
    const [a, m, j] = v.split("-").map(Number);
    const d = new Date(Date.UTC(a, m - 1, j));
    return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
  }, "Date invalide.");

/** Montant en dollars : nombre fini de 0 à 10 000 000, arrondi à 2 décimales. */
export const montant = z
  .number()
  .refine(Number.isFinite, "Montant invalide.")
  .min(0, "Le montant ne peut pas être négatif.")
  .max(10_000_000, "Montant trop élevé.")
  .transform((n) => Math.round((n + Number.EPSILON) * 100) / 100);
