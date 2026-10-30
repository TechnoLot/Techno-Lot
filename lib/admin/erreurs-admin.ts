import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { z } from "zod";
import { decrireErreur } from "@/lib/securite/erreurs";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";

/**
 * Erreurs et journal des actions serveur et des pages admin (checks 08 et 20).
 *
 * Le navigateur ne reçoit jamais le message brut d'un service (Supabase, eBay,
 * Meta, Google, Hostinger, Resend, Anthropic) : il reçoit un message français
 * générique + une référence (`réf.`), et le détail va au journal de sécurité
 * (lib/securite/journal.ts), où la référence le retrouve (`request_id`).
 */

export type EchecAction = {
  ok: false;
  error: string;
  /** Message par champ (validation). */
  champs?: Record<string, string>;
  /** Référence de l'erreur dans le journal. */
  ref?: string;
};

/** Contexte minimal pour journaliser (celui de la garde admin). */
export type ContexteJournal = { requestId?: string | null; user?: { id: string } | null };

/** Refus de la garde dans une action serveur (session absente, expirée ou non admin). */
export const REFUS_ACTION: EchecAction = {
  ok: false,
  error: "Accès refusé : session expirée ou non autorisée. Reconnectez-vous puis réessayez.",
};

async function entetesCourants() {
  try {
    return await headers();
  } catch {
    return undefined; // hors d'une requête (tests, scripts)
  }
}

/** Ajoute la référence à un message affiché. */
export function avecRef(message: string, ref: string): string {
  return `${message} (réf. ${ref})`;
}

/**
 * Journalise une erreur interne (`erreur.5xx`, détails rédigés) et renvoie sa
 * référence. `operation` : nom stable de l'opération (ex. « lot.creer »).
 * `durable: false` pour les échecs répétitifs d'un service tiers (synchros) :
 * sortie standard seulement, sans compter pour les alertes.
 */
export async function journaliserErreur(
  err: unknown,
  operation: string,
  ctx: ContexteJournal = {},
  options: { request?: Request; durable?: boolean } = {},
): Promise<string> {
  const ref = ctx.requestId || randomUUID();
  void journaliser(EVENEMENTS.erreur5xx, {
    resultat: "echec",
    request: options.request,
    entetes: options.request ? undefined : await entetesCourants(),
    methode: options.request ? undefined : "ACTION",
    requestId: ref,
    userId: ctx.user?.id ?? null,
    statut: 500,
    details: { operation, ...decrireErreur(err) },
    durable: options.durable ?? true,
  });
  return ref;
}

/**
 * Échec d'une action serveur : détail au journal, message générique + réf.
 * au navigateur.
 */
export async function echecAction(
  err: unknown,
  operation: string,
  ctx: ContexteJournal,
  messagePublic = "L'opération a échoué. Réessayez plus tard.",
): Promise<EchecAction> {
  const ref = await journaliserErreur(err, operation, ctx);
  return { ok: false, error: avecRef(messagePublic, ref), ref };
}

/**
 * Message d'erreur d'une page (lecture impossible) : détail au journal,
 * « … Réf. : <id> » à l'écran.
 */
export async function messageErreurPage(
  err: unknown,
  operation: string,
  ctx: ContexteJournal,
  prefixe = "Impossible de charger les données.",
): Promise<string> {
  const ref = await journaliserErreur(err, operation, ctx);
  return `${prefixe} Réf. : ${ref}`;
}

/**
 * Écriture admin réussie (`admin.action`) : identifiant de la cible seulement,
 * jamais de contenu personnel (nom, courriel, note…).
 */
export async function journaliserAction(
  action: string,
  ctx: ContexteJournal,
  details: Record<string, string | number | boolean | null> = {},
  request?: Request,
): Promise<void> {
  void journaliser(EVENEMENTS.adminAction, {
    resultat: "ok",
    request,
    entetes: request ? undefined : await entetesCourants(),
    methode: request ? undefined : "ACTION",
    requestId: ctx.requestId ?? null,
    userId: ctx.user?.id ?? null,
    details: { action, ...details },
  });
}

// --- Validation ---------------------------------------------------------------------

type Issue = z.core.$ZodIssue;

/** Vrai pour un message anglais par défaut de Zod (les nôtres sont en français). */
function messageParDefaut(message: string | undefined): boolean {
  return !message || /^(Invalid|Too (big|small)|Unrecognized|Expected|Number must|String must)/i.test(message);
}

/** Message français d'un problème de validation Zod. */
export function messageIssue(issue: Issue): string {
  if (!messageParDefaut(issue.message)) return issue.message;
  switch (issue.code) {
    case "unrecognized_keys":
      return "Champ non permis.";
    case "invalid_type":
      return /received (undefined|null)/.test(issue.message) ? "Champ requis." : "Type de valeur invalide.";
    case "too_big":
      return issue.origin === "string"
        ? `Trop long (${String(issue.maximum)} caractères au plus).`
        : issue.origin === "array"
          ? `Trop d'éléments (${String(issue.maximum)} au plus).`
          : `Valeur trop élevée (${String(issue.maximum)} au plus).`;
    case "too_small":
      return issue.origin === "string"
        ? Number(issue.minimum) <= 1
          ? "Champ requis."
          : `Trop court (${String(issue.minimum)} caractères au moins).`
        : `Valeur trop basse (${String(issue.minimum)} au moins).`;
    case "invalid_value":
      return "Valeur non permise.";
    case "invalid_format":
      return "Format invalide.";
    default:
      return "Valeur invalide.";
  }
}

/** Champs en erreur → message (premier problème de chaque champ). */
export function champsEnErreur(erreur: z.ZodError): Record<string, string> {
  const champs: Record<string, string> = {};
  for (const issue of erreur.issues) {
    const cles =
      issue.code === "unrecognized_keys" && issue.keys.length > 0
        ? issue.keys.map((k) => [...issue.path, k].join("."))
        : [issue.path.map(String).join(".") || "_"];
    for (const cle of cles) if (!(cle in champs)) champs[cle] = messageIssue(issue);
  }
  return champs;
}

/** Résultat d'une validation refusée, pour une action serveur. */
export function echecValidation(erreur: z.ZodError, libelles: Record<string, string> = {}): EchecAction {
  const champs = champsEnErreur(erreur);
  const [premier] = Object.entries(champs);
  const nom = premier ? (libelles[premier[0]] ?? premier[0]) : "";
  return {
    ok: false,
    error: premier ? `Données invalides — ${nom} : ${premier[1]}` : "Données invalides.",
    champs,
  };
}
