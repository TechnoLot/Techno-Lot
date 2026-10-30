import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { avecRef, journaliserErreur, type ContexteJournal } from "@/lib/admin/erreurs-admin";
import { courrielsDesabonnes } from "@/lib/crm/desabonnement";
import { sendProspectBatch, type MotifArret } from "@/lib/crm/email";
import {
  cleCompagnie,
  debutJourUtc,
  normaliserCourriel,
  normaliserObjet,
  OUTCOME_ENVOI_EN_GROS,
  planifierEnvoi,
  quotaDuJour,
  type AnalyseListe,
  type ContactConnu,
  type CourrielPrevu,
  type PlanEnvoi,
  type QuotaJour,
} from "@/lib/crm/envoi-en-gros";
import type { ContactStage } from "@/lib/crm/types";

/*
 * Envoi en gros, côté serveur : lectures du CRM (fiches, désabonnements,
 * envois déjà faits), plan d'envoi et exécution d'un lot. Appelé seulement par
 * les actions de lib/crm/envoi-en-gros-actions.ts, après la garde admin, la
 * validation et la limite de débit.
 *
 * Comparaison des courriels en minuscules, côté serveur : le filtre `in` de
 * PostgREST est sensible à la casse, donc tout est chargé puis comparé ici
 * (comme courrielsDesabonnes).
 */

type Client = SupabaseClient;
type Echec = { ok: false; erreur: unknown };

/** Plafond de lignes par requête de PostgREST. */
const PAGE = 1_000;

/** Toutes les lignes d'une requête, page par page. */
async function toutesLesLignes<T>(
  page: (de: number, a: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ ok: true; lignes: T[] } | Echec> {
  const lignes: T[] = [];
  for (let de = 0; de < 1_000_000; de += PAGE) {
    const { data, error } = await page(de, de + PAGE - 1);
    if (error) return { ok: false, erreur: error };
    const lot = (Array.isArray(data) ? data : []) as T[];
    lignes.push(...lot);
    if (lot.length < PAGE) break;
  }
  return { ok: true, lignes };
}

type LigneContact = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  stage: ContactStage;
  company_id: string | null;
  unsubscribed_at: string | null;
  companies: { name: string | null } | null;
};

export type FichesParCourriel = {
  /** Une fiche par courriel normalisé (la plus ancienne si l'adresse est en double). */
  parCourriel: Map<string, ContactConnu>;
  /** Toutes les fiches d'un courriel (les envois déjà faits peuvent être sur n'importe laquelle). */
  idsParCourriel: Map<string, string[]>;
};

/** Fiches du CRM qui ont un courriel. */
export async function chargerFiches(supabase: Client): Promise<({ ok: true } & FichesParCourriel) | Echec> {
  const r = await toutesLesLignes<LigneContact>((de, a) =>
    supabase
      .from("contacts")
      .select("id, email, first_name, last_name, title, stage, company_id, unsubscribed_at, companies(name)")
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(de, a),
  );
  if (!r.ok) return r;

  const parCourriel = new Map<string, ContactConnu>();
  const idsParCourriel = new Map<string, string[]>();
  for (const l of r.lignes) {
    const email = l.email ? normaliserCourriel(l.email) : "";
    if (!email) continue;
    const ids = idsParCourriel.get(email) ?? [];
    ids.push(l.id);
    idsParCourriel.set(email, ids);
    if (!parCourriel.has(email)) {
      parCourriel.set(email, {
        id: l.id,
        email,
        first_name: l.first_name,
        last_name: l.last_name,
        title: l.title,
        stage: l.stage,
        company_id: l.company_id,
        unsubscribed_at: l.unsubscribed_at,
        compagnie: l.companies?.name ?? null,
      });
    }
  }
  return { ok: true, parCourriel, idsParCourriel };
}

/**
 * Objets (normalisés) déjà reçus par l'envoi en gros, par courriel : traces
 * `manual_note` / `envoi_en_gros` des fiches qui portent les adresses de la
 * liste. Identifiants par tranches de 100 (longueur de l'URL de PostgREST).
 */
export async function chargerObjetsRecus(
  supabase: Client,
  idsParCourriel: ReadonlyMap<string, readonly string[]>,
  courriels: Iterable<string>,
): Promise<{ ok: true; recus: Map<string, Set<string>> } | Echec> {
  const courrielParId = new Map<string, string>();
  for (const email of courriels) {
    for (const id of idsParCourriel.get(email) ?? []) courrielParId.set(id, email);
  }
  const ids = [...courrielParId.keys()];
  const recus = new Map<string, Set<string>>();

  for (let i = 0; i < ids.length; i += 100) {
    const tranche = ids.slice(i, i + 100);
    const r = await toutesLesLignes<{ contact_id: string; subject: string | null }>((de, a) =>
      supabase
        .from("outreach_activities")
        .select("contact_id, subject")
        .eq("activity_type", "manual_note")
        .eq("outcome", OUTCOME_ENVOI_EN_GROS)
        .in("contact_id", tranche)
        .order("id", { ascending: true })
        .range(de, a),
    );
    if (!r.ok) return r;
    for (const l of r.lignes) {
      const email = courrielParId.get(l.contact_id);
      if (!email || !l.subject) continue;
      const objets = recus.get(email) ?? new Set<string>();
      objets.add(normaliserObjet(l.subject));
      recus.set(email, objets);
    }
  }
  return { ok: true, recus };
}

/**
 * Quota de Resend du jour (depuis minuit UTC) d'après les envois notés en
 * base : traces de l'envoi en gros, courriels du CRM (intro et relances,
 * manuels ou automatiques) et avis du formulaire de soumission (fonction
 * admin_soumissions). Compte seulement (`head`), aucune ligne lue.
 */
export async function chargerQuotaDuJour(supabase: Client): Promise<{ ok: true; quota: QuotaJour } | Echec> {
  const depuis = debutJourUtc();
  const [enGros, crm, soumissions] = await Promise.all([
    supabase
      .from("outreach_activities")
      .select("id", { count: "exact", head: true })
      .eq("activity_type", "manual_note")
      .eq("outcome", OUTCOME_ENVOI_EN_GROS)
      .gte("created_at", depuis),
    supabase
      .from("outreach_activities")
      .select("id", { count: "exact", head: true })
      .in("activity_type", ["intro_email_sent", "followup_sent"])
      .gte("created_at", depuis),
    supabase.rpc("admin_soumissions", { p_since: depuis, p_limit: 500 }),
  ]);
  const erreur = enGros.error ?? crm.error ?? soumissions.error;
  if (erreur) return { ok: false, erreur };
  return {
    ok: true,
    quota: quotaDuJour({
      enGros: enGros.count ?? 0,
      crm: crm.count ?? 0,
      soumissions: Array.isArray(soumissions.data) ? soumissions.data.length : 0,
    }),
  };
}

export type Preparation =
  | { ok: true; plan: PlanEnvoi; quota: QuotaJour }
  | { ok: false; erreur: unknown; operation: string };

/**
 * Plan d'envoi de la liste (lectures seulement) : désabonnements relus
 * (courrielsDesabonnes + unsubscribed_at des fiches), envois déjà faits et
 * quota de Resend du jour. Lecture impossible → aucun envoi.
 */
export async function preparerEnvoi(
  supabase: Client,
  analyse: AnalyseListe,
  objet: string,
  corps: string,
): Promise<Preparation> {
  const fiches = await chargerFiches(supabase);
  if (!fiches.ok) return { ok: false, erreur: fiches.erreur, operation: "crm.envoi_gros.fiches" };

  const desabonnes = await courrielsDesabonnes(supabase);
  if (!desabonnes.ok) return { ok: false, erreur: desabonnes.erreur, operation: "crm.envoi_gros.desabonnes" };

  const recus = await chargerObjetsRecus(
    supabase,
    fiches.idsParCourriel,
    analyse.destinataires.map((d) => d.email),
  );
  if (!recus.ok) return { ok: false, erreur: recus.erreur, operation: "crm.envoi_gros.deja_recus" };

  const quota = await chargerQuotaDuJour(supabase);
  if (!quota.ok) return { ok: false, erreur: quota.erreur, operation: "crm.envoi_gros.quota" };

  const plan = planifierEnvoi({
    destinataires: analyse.destinataires,
    contacts: fiches.parCourriel,
    desabonnes: new Set([...desabonnes.emails].map(normaliserCourriel)),
    objetsRecus: recus.recus,
    objet,
    corps,
  });
  return { ok: true, plan, quota: quota.quota };
}

// --- Exécution d'un lot ------------------------------------------------------------------

export type ContexteLot = ContexteJournal & {
  supabase: Client;
  user: { id: string; email?: string | null };
  requestId: string;
};

type Fiche = { id: string; stage: ContactStage };

/**
 * Compagnies des nouvelles fiches : nom comparé sans tenir compte de la casse,
 * compagnie existante réutilisée, sinon créée (même forme que createCompany,
 * lib/crm/actions.ts). Échec : les fiches sont créées sans compagnie (le
 * courriel garde la compagnie de la liste).
 */
async function assurerCompagnies(ctx: ContexteLot, noms: ReadonlyMap<string, string>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const r = await toutesLesLignes<{ id: string; name: string | null }>((de, a) =>
    ctx.supabase
      .from("companies")
      .select("id, name")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(de, a),
  );
  if (!r.ok) {
    await journaliserErreur(r.erreur, "crm.envoi_gros.compagnies_lire", ctx);
    return ids;
  }
  for (const c of r.lignes) {
    if (!c.name) continue;
    const cle = cleCompagnie(c.name);
    if (noms.has(cle) && !ids.has(cle)) ids.set(cle, c.id);
  }

  const manquantes = [...noms].filter(([cle]) => !ids.has(cle));
  if (manquantes.length === 0) return ids;
  const { data, error } = await ctx.supabase
    .from("companies")
    .insert(
      manquantes.map(([, name]) => ({
        name,
        domain: null,
        industry: null,
        region: null,
        employee_count: null,
        main_phone: null,
        fit_score: null,
        street_address: null,
        notes: null,
        research_status: "found",
      })),
    )
    .select("id, name");
  if (error || !Array.isArray(data)) {
    await journaliserErreur(error, "crm.envoi_gros.compagnies_creer", ctx);
    return ids;
  }
  for (const c of data as { id: string; name: string }[]) ids.set(cleCompagnie(c.name), c.id);
  return ids;
}

/**
 * Fiche de chaque courriel du lot : la fiche existante, sinon une nouvelle
 * (étape `new`). Une fiche qui ne peut pas être créée retire son courriel du
 * lot (rien n'est envoyé sans fiche : la trace de l'envoi en a besoin).
 */
async function assurerFiches(ctx: ContexteLot, lot: readonly CourrielPrevu[]): Promise<Map<string, Fiche>> {
  const fiches = new Map<string, Fiche>();
  const aCreer: CourrielPrevu[] = [];
  for (const c of lot) {
    if (c.contact) fiches.set(c.destinataire.email, { id: c.contact.id, stage: c.contact.stage });
    else aCreer.push(c);
  }
  if (aCreer.length === 0) return fiches;

  const noms = new Map<string, string>();
  for (const c of aCreer) {
    const nom = c.destinataire.compagnie;
    if (nom && !noms.has(cleCompagnie(nom))) noms.set(cleCompagnie(nom), nom);
  }
  const compagnies = noms.size > 0 ? await assurerCompagnies(ctx, noms) : new Map<string, string>();

  const lignes = aCreer.map(({ destinataire: d }) => ({
    company_id: d.compagnie ? (compagnies.get(cleCompagnie(d.compagnie)) ?? null) : null,
    first_name: d.prenom,
    last_name: d.nom,
    title: d.titre,
    email: d.email,
    stage: "new" as const,
  }));

  const { data, error } = await ctx.supabase.from("contacts").insert(lignes).select("id, email");
  if (!error && Array.isArray(data)) {
    for (const l of data as { id: string; email: string }[]) {
      fiches.set(normaliserCourriel(l.email), { id: l.id, stage: "new" });
    }
    return fiches;
  }
  await journaliserErreur(error, "crm.envoi_gros.fiches_creer", ctx);

  // Repli ligne par ligne (ex. adresse ajoutée entre-temps ailleurs : index unique sur le courriel).
  for (const ligne of lignes) {
    const { data: creee, error: erreurLigne } = await ctx.supabase
      .from("contacts")
      .insert(ligne)
      .select("id")
      .maybeSingle();
    if (!erreurLigne && creee) {
      fiches.set(ligne.email, { id: (creee as { id: string }).id, stage: "new" });
      continue;
    }
    const { data: existante } = await ctx.supabase
      .from("contacts")
      .select("id, stage, unsubscribed_at")
      .eq("email", ligne.email)
      .limit(1)
      .maybeSingle();
    const fiche = existante as { id: string; stage: ContactStage; unsubscribed_at: string | null } | null;
    if (fiche && !fiche.unsubscribed_at) fiches.set(ligne.email, { id: fiche.id, stage: fiche.stage });
  }
  return fiches;
}

export type ArretLot = { motif: MotifArret | "fiches" | "trace" | "reserve"; message: string };

export type ResultatLot = {
  envoyes: number;
  /** Courriels du lot non envoyés (fiche impossible, lot refusé par Resend). */
  echecs: number;
  /** Arrêt demandé : le navigateur n'enchaîne pas de lot suivant. */
  arret: ArretLot | null;
};

/**
 * Envoie UN lot (100 courriels au plus) :
 *  1. fiches assurées (adresse inconnue → nouveau contact, compagnie réutilisée
 *     ou créée) ;
 *  2. envoi groupé (sendProspectBatch : mêmes éléments que l'envoi manuel) ;
 *  3. trace de chaque courriel envoyé dans outreach_activities
 *     (`manual_note`, outcome `envoi_en_gros`, objet, 300 premiers caractères)
 *     — jamais `intro_email_sent`, que les relances automatiques suivent ;
 *  4. étape `new` → `contacted` seulement (jamais de recul d'une autre étape).
 * Tout échec arrête l'enchaînement : une trace manquante empêcherait la
 * déduplication au lot suivant.
 */
export async function executerLot(ctx: ContexteLot, lot: readonly CourrielPrevu[]): Promise<ResultatLot> {
  // Envoi impossible (clé absente) : aucune fiche créée pour rien.
  if (!process.env.RESEND_API_KEY) {
    return {
      envoyes: 0,
      echecs: lot.length,
      arret: { motif: "configuration", message: "Service de courriel non configuré (RESEND_API_KEY manquante)." },
    };
  }

  const fiches = await assurerFiches(ctx, lot);
  const avecFiche = lot.filter((c) => fiches.has(c.destinataire.email));
  const sansFiche = lot.length - avecFiche.length;

  if (avecFiche.length === 0) {
    return {
      envoyes: 0,
      echecs: lot.length,
      arret: {
        motif: "fiches",
        message: "Création des fiches du CRM impossible : aucun courriel envoyé. Réessaie plus tard avec la même liste.",
      },
    };
  }

  const bilan = await sendProspectBatch({
    courriels: avecFiche.map((c) => ({ to: c.destinataire.email, subject: c.objet, body: c.corps })),
    replyTo: ctx.user.email ?? null,
    requestId: ctx.requestId,
  });
  const envoyes = bilan.envoyes.map((e) => avecFiche[e.index]);
  let arret: ArretLot | null = bilan.arret ? { motif: bilan.arret.motif, message: bilan.arret.message } : null;

  if (envoyes.length > 0) {
    const { error: erreurTrace } = await ctx.supabase.from("outreach_activities").insert(
      envoyes.map((c) => ({
        contact_id: (fiches.get(c.destinataire.email) as Fiche).id,
        activity_type: "manual_note",
        outcome: OUTCOME_ENVOI_EN_GROS,
        subject: c.objet,
        body_preview: c.corps.slice(0, 300),
      })),
    );
    if (erreurTrace) {
      const ref = await journaliserErreur(erreurTrace, "crm.envoi_gros.trace", ctx);
      arret = {
        motif: "trace",
        message: avecRef(
          "Courriels envoyés, mais leur trace n'a pas pu être enregistrée dans le CRM : envoi arrêté pour éviter les doublons. Ne relance pas cette liste avant d'avoir vérifié.",
          ref,
        ),
      };
    }

    const nouveaux = envoyes
      .map((c) => fiches.get(c.destinataire.email) as Fiche)
      .filter((f) => f.stage === "new")
      .map((f) => f.id);
    if (nouveaux.length > 0) {
      const { error: erreurEtape } = await ctx.supabase
        .from("contacts")
        .update({ stage: "contacted", updated_at: new Date().toISOString() })
        .in("id", nouveaux)
        .eq("stage", "new");
      if (erreurEtape) await journaliserErreur(erreurEtape, "crm.envoi_gros.etape", ctx);
    }
  }

  if (!arret && sansFiche > 0) {
    arret = {
      motif: "fiches",
      message: `${sansFiche} fiche${sansFiche > 1 ? "s" : ""} du CRM n'${sansFiche > 1 ? "ont" : "a"} pas pu être créée${sansFiche > 1 ? "s" : ""} : envoi arrêté après ce lot. Réessaie plus tard avec la même liste.`,
    };
  }

  return { envoyes: envoyes.length, echecs: lot.length - envoyes.length, arret };
}

// --- Verrou -------------------------------------------------------------------------------

/**
 * Verrou simple contre le double envoi : un seul lot à la fois dans ce
 * processus Node, tous admins confondus (rendu en fin de lot ; périmé après
 * 5 minutes). Ne couvre pas plusieurs processus : la déduplication par la
 * trace et la clé d'idempotence de Resend restent la protection principale.
 */
let lotEnCoursDepuis: number | null = null;
const VERROU_MAX_MS = 5 * 60_000;

export function prendreVerrouEnvoi(maintenant: number = Date.now()): boolean {
  if (lotEnCoursDepuis !== null && maintenant - lotEnCoursDepuis < VERROU_MAX_MS) return false;
  lotEnCoursDepuis = maintenant;
  return true;
}

export function rendreVerrouEnvoi(): void {
  lotEnCoursDepuis = null;
}
