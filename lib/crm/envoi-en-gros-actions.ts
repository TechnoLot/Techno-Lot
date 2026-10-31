"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { adminPourAction, type ContexteAdmin } from "@/lib/securite/garde";
import { limiterSelon, type RegleLimite } from "@/lib/securite/limite";
import {
  avecRef,
  echecAction,
  echecValidation,
  journaliserAction,
  REFUS_ACTION,
  type EchecAction,
} from "@/lib/admin/erreurs-admin";
import { LIBELLES_ENVOI_EN_GROS, lotEnGrosSchema, verificationEnGrosSchema } from "@/lib/admin/schemas";
import { apercuTexteProspect, sendProspectBatch } from "@/lib/crm/email";
import {
  aEnvoyerAujourdhui,
  analyserListe,
  messageLimiteJour,
  nombreDeLots,
  problemeBloquant,
  TAILLE_LOT,
  type Destinataire,
  type QuotaJour,
} from "@/lib/crm/envoi-en-gros";
import {
  executerLot,
  preparerEnvoi,
  prendreVerrouEnvoi,
  rendreVerrouEnvoi,
  type ArretLot,
} from "@/lib/crm/envoi-en-gros-serveur";

/*
 * Envoi en gros du CRM (/admin/crm/envoi-en-gros). Chaque action : garde admin
 * (adminPourAction) en PREMIÈRE instruction, validation stricte
 * (lib/admin/schemas.ts), réanalyse complète de la liste reçue du navigateur
 * (lib/crm/envoi-en-gros.ts), limite de débit par admin, puis lectures du CRM
 * relancées à chaque appel (désabonnements, envois déjà faits). Erreurs : message
 * générique + réf. ; journal : compteurs seulement (jamais d'adresse, d'objet ni
 * de corps).
 */

/** « Vérifier la liste » : 30 vérifications / 10 min par admin. */
const LIMITE_VERIFICATION: RegleLimite = { route: "envoi-gros:verif:admin:10min", fenetreSecondes: 600, max: 30 };
/** Lots envoyés : 30 / h par admin (la limite du jour, 100 courriels, tient en 10 lots). */
const LIMITE_LOTS: RegleLimite = { route: "envoi-gros:lot:admin:heure", fenetreSecondes: 3_600, max: 30 };
/** « M'envoyer un test » : 10 / h par admin (chaque test part de la boîte info@). */
const LIMITE_TESTS: RegleLimite = { route: "envoi-gros:test:admin:heure", fenetreSecondes: 3_600, max: 10 };

/** Exemples d'adresses exclues renvoyés à l'écran (le reste en nombre seulement). */
const EXEMPLES_MAX = 10;

export type ResultatVerification = {
  ok: true;
  valides: number;
  invalides: number;
  doublons: number;
  /** Destinataires à servir (aujourd'hui ou les jours suivants). */
  prets: number;
  desabonnes: { nombre: number; exemples: string[] };
  dejaRecus: { nombre: number; exemples: string[] };
  /** Adresses inconnues du CRM : une fiche sera créée à l'envoi. */
  nouvellesFiches: number;
  /** Lots de 10 pour la part du jour. */
  lots: number;
  /** Limite du jour de l'envoi en gros : déjà envoyés aujourd'hui, encore permis. */
  quota: QuotaJour;
  /** Destinataires servis aujourd'hui (prêts, dans la limite du jour) ; le reste attend demain. */
  aujourdhui: number;
  /** Courriel rendu pour le premier destinataire prêt (version texte envoyée). */
  apercu: { a: string; objet: string; texte: string } | null;
};

export type ResultatLotEnGros = {
  ok: true;
  envoyes: number;
  echecs: number;
  /** Destinataires encore à servir aujourd'hui après ce lot (lots suivants). */
  restants: number;
  /** Plus rien à envoyer aujourd'hui (liste finie, ou part du jour épuisée : arrêt « limite du jour »). */
  termine: boolean;
  arret: ArretLot | null;
};

/** Test envoyé : `a` = adresse de l'admin connecté (seul destinataire). */
export type ResultatTest = { ok: true; a: string };

async function entetes() {
  try {
    return await headers();
  } catch {
    return undefined;
  }
}

/** Limite de débit par admin ; message prêt à afficher si elle est atteinte. */
async function limiteAtteinte(ctx: ContexteAdmin, regle: RegleLimite): Promise<string | null> {
  const verdict = await limiterSelon(regle, ctx.user.id, {
    entetes: await entetes(),
    requestId: ctx.requestId,
    userId: ctx.user.id,
    methode: "ACTION",
    chemin: "/admin/crm/envoi-en-gros",
  });
  if (verdict.permis) return null;
  const minutes = Math.max(1, Math.ceil(verdict.attente / 60));
  return `Trop de demandes pour l'envoi en gros. Réessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

const exemples = (liste: readonly Destinataire[]) => liste.slice(0, EXEMPLES_MAX).map((d) => d.email);

/**
 * « Vérifier la liste » (LECTURE SEULE) : destinataires prêts, exclus
 * (désabonnés, déjà reçu cet objet par l'envoi en gros), fiches à créer,
 * nombre de lots et aperçu du courriel rendu pour le premier destinataire.
 */
export async function verifierEnvoiEnGros(entree: {
  destinataires: string;
  objet: string;
  corps: string;
}): Promise<ResultatVerification | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = verificationEnGrosSchema.safeParse(entree);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_ENVOI_EN_GROS);
  const v = parse.data;

  const analyse = analyserListe(v.destinataires);
  const probleme = problemeBloquant(analyse);
  if (probleme) return { ok: false, error: probleme };

  const limite = await limiteAtteinte(ctx, LIMITE_VERIFICATION);
  if (limite) return { ok: false, error: limite };

  try {
    const prep = await preparerEnvoi(ctx.supabase, analyse, v.objet, v.corps);
    if (!prep.ok) return await echecAction(prep.erreur, prep.operation, ctx, "Lecture du CRM impossible : vérification interrompue.");
    const { plan, quota } = prep;
    const premier = plan.prets[0];
    const aujourdhui = aEnvoyerAujourdhui(plan.prets.length, quota);
    return {
      ok: true,
      valides: analyse.destinataires.length,
      invalides: analyse.invalides.length,
      doublons: analyse.doublons.length,
      prets: plan.prets.length,
      desabonnes: { nombre: plan.desabonnes.length, exemples: exemples(plan.desabonnes) },
      dejaRecus: { nombre: plan.dejaRecus.length, exemples: exemples(plan.dejaRecus) },
      nouvellesFiches: plan.prets.filter((c) => !c.contact).length,
      lots: nombreDeLots(aujourdhui),
      quota,
      aujourdhui,
      apercu: premier
        ? { a: premier.destinataire.email, objet: premier.objet, texte: apercuTexteProspect(premier.corps) }
        : null,
    };
  } catch (err) {
    return echecAction(err, "crm.envoi_gros.verifier", ctx, "Vérification impossible. Réessaie plus tard.");
  }
}

/**
 * « M'envoyer un test » : le courriel du premier destinataire prêt (variables
 * remplies, comme l'aperçu), envoyé à l'admin connecté SEULEMENT, objet
 * précédé de « [Test] ». Même chemin que l'envoi réel (boîte info@, Mail API
 * de Hostinger, copie dans « Envoyés ») ; aucune écriture dans le CRM (ni
 * fiche, ni trace) et hors de la limite du jour.
 */
export async function envoyerTestEnGros(entree: {
  destinataires: string;
  objet: string;
  corps: string;
}): Promise<ResultatTest | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = verificationEnGrosSchema.safeParse(entree);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_ENVOI_EN_GROS);
  const v = parse.data;

  const a = ctx.user.email?.trim();
  if (!a) return { ok: false, error: "Ton compte n'a pas d'adresse courriel : test impossible." };

  const analyse = analyserListe(v.destinataires);
  const probleme = problemeBloquant(analyse);
  if (probleme) return { ok: false, error: probleme };

  const limite = await limiteAtteinte(ctx, LIMITE_TESTS);
  if (limite) return { ok: false, error: limite };

  try {
    const prep = await preparerEnvoi(ctx.supabase, analyse, v.objet, v.corps);
    if (!prep.ok) return await echecAction(prep.erreur, prep.operation, ctx, "Lecture du CRM impossible : test interrompu.");
    const premier = prep.plan.prets[0];
    if (!premier) {
      return { ok: false, error: "Aucun destinataire à servir (tous sont exclus) : rien à tester." };
    }

    const envoi = await sendProspectBatch({
      courriels: [{ to: a, subject: `[Test] ${premier.objet}`, body: premier.corps }],
      requestId: ctx.requestId,
    });
    if (envoi.arret) {
      // Test sans trace : « peut-être parti » se vérifie dans la boîte, sans rien compter.
      const error =
        envoi.arret.motif === "incertain"
          ? avecRef(
              "Hostinger n'a pas confirmé l'envoi du test (délai dépassé ou panne de son côté). Regarde dans ta boîte dans une minute avant de réessayer.",
              envoi.arret.ref ?? ctx.requestId,
            )
          : envoi.arret.message;
      return { ok: false, error };
    }

    void journaliserAction("crm.envoi_en_gros_test", ctx);
    return { ok: true, a };
  } catch (err) {
    return echecAction(err, "crm.envoi_gros.test", ctx, "Envoi du test impossible. Réessaie plus tard.");
  }
}

/**
 * Envoie le PROCHAIN lot (100 courriels au plus) de la liste confirmée. Le
 * navigateur appelle cette action lot après lot ; chaque appel revalide toute
 * la liste, relit désabonnements et envois déjà faits (un courriel déjà envoyé
 * n'est jamais renvoyé) et exige :
 *  - la case de confirmation cochée (`confirme: true`) ;
 *  - prêts restants + déjà envoyés par cet envoi = nombre confirmé à la saisie ;
 *  - aucun autre lot en cours (verrou du processus).
 */
export async function envoyerLotEnGros(entree: {
  destinataires: string;
  objet: string;
  corps: string;
  confirme: boolean;
  nombre: number;
  dejaEnvoyes: number;
}): Promise<ResultatLotEnGros | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = lotEnGrosSchema.safeParse(entree);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_ENVOI_EN_GROS);
  const v = parse.data;

  const analyse = analyserListe(v.destinataires);
  const probleme = problemeBloquant(analyse);
  if (probleme) return { ok: false, error: probleme };

  const limite = await limiteAtteinte(ctx, LIMITE_LOTS);
  if (limite) return { ok: false, error: limite };

  if (!prendreVerrouEnvoi()) {
    return {
      ok: false,
      error: "Un envoi en gros est déjà en cours. Attends la fin de celui-ci avant d'en lancer un autre.",
    };
  }
  try {
    const prep = await preparerEnvoi(ctx.supabase, analyse, v.objet, v.corps);
    if (!prep.ok) return await echecAction(prep.erreur, prep.operation, ctx, "Lecture du CRM impossible : aucun envoi.");
    const { plan, quota } = prep;

    // Part du jour : les prêts, dans la limite du jour de l'envoi en gros.
    // Chaque courriel envoyé quitte les prêts et entre dans la limite : prêts + déjà envoyés reste constant.
    const aujourdhui = aEnvoyerAujourdhui(plan.prets.length, quota);
    const attendu = aujourdhui + v.dejaEnvoyes;
    if (attendu !== v.nombre) {
      return {
        ok: false,
        error: `Le nombre confirmé (${v.nombre}) ne correspond plus à la liste (${attendu} destinataires) : la liste ou la limite du jour a changé. Vérifie la liste de nouveau avant d'envoyer.`,
      };
    }
    if (aujourdhui === 0) {
      // Rien à servir aujourd'hui : liste finie, ou part du jour épuisée (le reste attend demain).
      const arret: ArretLot | null =
        plan.prets.length > 0 ? { motif: "limite_jour", message: messageLimiteJour(quota) } : null;
      return { ok: true, envoyes: 0, echecs: 0, restants: 0, termine: true, arret };
    }

    const lot = plan.prets.slice(0, Math.min(TAILLE_LOT, aujourdhui));
    const resultat = await executerLot(ctx, lot);
    const restants = aujourdhui - resultat.envoyes;
    // Part du jour servie, liste pas finie : arrêt « limite du jour », le reste repart demain.
    const arret: ArretLot | null =
      resultat.arret ??
      (restants === 0 && plan.prets.length > aujourdhui
        ? { motif: "limite_jour", message: messageLimiteJour(quota) }
        : null);

    void journaliserAction("crm.envoi_en_gros_lot", ctx, {
      envoyes: resultat.envoyes,
      echecs: resultat.echecs,
      restants,
      arret: arret?.motif ?? null,
    });
    if (resultat.envoyes > 0) {
      revalidatePath("/admin/crm");
      revalidatePath("/admin/crm/[id]", "page");
    }
    return {
      ok: true,
      envoyes: resultat.envoyes,
      echecs: resultat.echecs,
      restants,
      termine: restants === 0,
      arret,
    };
  } catch (err) {
    return echecAction(err, "crm.envoi_gros.lot", ctx, "L'envoi du lot a échoué. Vérifie la liste de nouveau avant de relancer.");
  } finally {
    rendreVerrouEnvoi();
  }
}
