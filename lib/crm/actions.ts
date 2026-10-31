"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminPourAction, type ContexteAdmin } from "@/lib/securite/garde";
import {
  echecAction,
  echecValidation,
  journaliserAction,
  REFUS_ACTION,
  type EchecAction,
} from "@/lib/admin/erreurs-admin";
import {
  activiteSchema,
  champVerifieSchema,
  compagnieSchema,
  contactSchema,
  dateRappelSchema,
  etapeContactSchema,
  LIBELLES_CRM,
  modeleSchema,
  noteCompagnieSchema,
  nouveauContactSchema,
  statutLeadSchema,
  typeModeleSchema,
  uuid,
} from "@/lib/admin/schemas";
import { renderTemplate, sendProspectEmail } from "@/lib/crm/email";
import { courrielsDesabonnes } from "@/lib/crm/desabonnement";
import { parseFollowupDate } from "@/lib/crm/parse-followup-date";
import type {
  Company,
  Contact,
  ContactStage,
  EmailTemplate,
  LeadStatus,
  TemplateType,
} from "@/lib/crm/types";

/*
 * Chaque action : garde admin (adminPourAction) en PREMIÈRE instruction, puis
 * validation stricte (lib/admin/schemas.ts) avant toute lecture ou écriture,
 * erreurs de la base au journal (message générique + réf. à l'écran), et
 * `admin.action` journalisée après chaque écriture réussie (identifiants
 * seulement).
 */

type Result = { ok: true } | EchecAction;

const ID_INVALIDE: EchecAction = { ok: false, error: "Fiche introuvable (identifiant invalide)." };

function revalidateCrm(companyId?: string | null) {
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/relances");
  if (companyId) revalidatePath(`/admin/crm/${companyId}`);
}

/** Valide un identifiant ; null si invalide. */
function idValide(id: unknown): string | null {
  const r = uuid.safeParse(id);
  return r.success ? r.data : null;
}

/** Statut rapide du lead : non contacté / contacté / intéressé / pas intéressé. */
export async function updateLeadStatus(
  companyId: string,
  status: LeadStatus,
): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(companyId);
  if (!id) return ID_INVALIDE;
  const statut = statutLeadSchema.safeParse(status);
  if (!statut.success) return echecValidation(statut.error, { _: "Statut" });

  try {
    const now = new Date().toISOString();
    const { error } = await ctx.supabase
      .from("companies")
      .update({ lead_status: statut.data, lead_status_changed_at: now, updated_at: now })
      .eq("id", id);
    if (error) return await echecAction(error, "crm.statut_lead", ctx);
  } catch (err) {
    return echecAction(err, "crm.statut_lead", ctx);
  }

  void journaliserAction("crm.statut_lead", ctx, { cible: id, statut: statut.data });
  revalidateCrm(id);
  return { ok: true };
}

/**
 * Note libre sur la compagnie + date de rappel. Si `followupOn` est vide,
 * on tente de détecter une date dans la note (« à rappeler lundi »,
 * « le 21 juillet », « dans 2 semaines »…) ; la date détectée alimente
 * le panneau « Suivis à faire ».
 */
export async function updateCompanyNotes(
  companyId: string,
  notes: string,
  followupOn?: string | null,
): Promise<{ ok: true; followupOn: string | null } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(companyId);
  if (!id) return ID_INVALIDE;
  const parse = z
    .strictObject({ notes: noteCompagnieSchema, followupOn: dateRappelSchema })
    .safeParse({ notes, followupOn });
  if (!parse.success) return echecValidation(parse.error, { notes: "Note", followupOn: "Date de rappel" });

  const trimmed = parse.data.notes.trim();
  const resolved = parse.data.followupOn || (trimmed ? parseFollowupDate(trimmed) : null);

  try {
    const { error } = await ctx.supabase
      .from("companies")
      .update({ notes: trimmed || null, next_followup_on: resolved, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return await echecAction(error, "crm.note_compagnie", ctx);
  } catch (err) {
    return echecAction(err, "crm.note_compagnie", ctx);
  }

  void journaliserAction("crm.note_compagnie", ctx, { cible: id });
  revalidateCrm(id);
  return { ok: true, followupOn: resolved };
}

/**
 * « Suivi fait » : remet le compteur de statut à zéro et efface la date
 * de rappel planifiée — le lead disparaît du panneau jusqu'au prochain
 * délai ou à la prochaine note datée.
 */
export async function markFollowupDone(companyId: string): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(companyId);
  if (!id) return ID_INVALIDE;

  try {
    const now = new Date().toISOString();
    const { error } = await ctx.supabase
      .from("companies")
      .update({ lead_status_changed_at: now, next_followup_on: null, updated_at: now })
      .eq("id", id);
    if (error) return await echecAction(error, "crm.suivi_fait", ctx);
  } catch (err) {
    return echecAction(err, "crm.suivi_fait", ctx);
  }

  void journaliserAction("crm.suivi_fait", ctx, { cible: id });
  revalidateCrm(id);
  return { ok: true };
}

/**
 * Ajoute une compagnie (prospect) manuellement. Seul `name` est requis ;
 * les autres champs héritent des defaults SQL. Renvoie l'id pour rediriger
 * vers la fiche.
 */
export async function createCompany(input: {
  name: string;
  domain?: string | null;
  industry?: string | null;
  region?: string | null;
  employee_count?: number | null;
  main_phone?: string | null;
  fit_score?: number | null;
  street_address?: string | null;
  notes?: string | null;
}): Promise<{ ok: true; id: string } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = compagnieSchema.safeParse(input);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_CRM);
  const v = parse.data;
  // Site web validé (http(s) seulement) ; la saisie est gardée telle quelle
  // (affichée dans la liste, préfixée de https:// sur la fiche).
  const domain = v.domain && typeof input.domain === "string" ? input.domain.trim() : null;

  try {
    const { data, error } = await ctx.supabase
      .from("companies")
      .insert({
        name: v.name,
        domain,
        industry: v.industry,
        region: v.region,
        employee_count: v.employee_count,
        main_phone: v.main_phone,
        fit_score: v.fit_score,
        street_address: v.street_address,
        notes: v.notes,
        research_status: "found",
      })
      .select("id")
      .single();
    if (error) return await echecAction(error, "crm.compagnie_creer", ctx, "Création de la compagnie impossible.");

    void journaliserAction("crm.compagnie_creee", ctx, { cible: data.id as string });
    revalidateCrm();
    return { ok: true, id: data.id as string };
  } catch (err) {
    return echecAction(err, "crm.compagnie_creer", ctx, "Création de la compagnie impossible.");
  }
}

/** Ajoute un contact manuellement sur une compagnie. */
export async function createContact(input: {
  company_id: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  notes?: string | null;
}): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = nouveauContactSchema.safeParse(input);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_CRM);
  const v = parse.data;

  try {
    const { data, error } = await ctx.supabase
      .from("contacts")
      .insert({
        company_id: v.company_id,
        first_name: v.first_name,
        last_name: v.last_name,
        title: v.title,
        email: v.email,
        phone: v.phone,
        linkedin_url: v.linkedin_url,
        notes: v.notes,
        stage: "new",
      })
      .select("id")
      .single();
    if (error) return await echecAction(error, "crm.contact_creer", ctx, "Ajout du contact impossible.");

    void journaliserAction("crm.contact_cree", ctx, { cible: data.id as string, compagnie: v.company_id });
  } catch (err) {
    return echecAction(err, "crm.contact_creer", ctx, "Ajout du contact impossible.");
  }

  revalidateCrm(v.company_id);
  return { ok: true };
}

/** Met à jour les infos éditables d'un contact (nom, titre, coordonnées, notes). */
export async function updateContact(
  contactId: string,
  input: {
    first_name?: string | null;
    last_name?: string | null;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    notes?: string | null;
  },
): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(contactId);
  if (!id) return ID_INVALIDE;
  const parse = contactSchema.safeParse(input);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_CRM);
  const v = parse.data;

  let companyId: string | null = null;
  try {
    const { data, error } = await ctx.supabase
      .from("contacts")
      .update({
        first_name: v.first_name,
        last_name: v.last_name,
        title: v.title,
        email: v.email,
        phone: v.phone,
        linkedin_url: v.linkedin_url,
        notes: v.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("company_id")
      .single();
    if (error) return await echecAction(error, "crm.contact_modifier", ctx, "Mise à jour du contact impossible.");
    companyId = (data?.company_id as string | null) ?? null;
  } catch (err) {
    return echecAction(err, "crm.contact_modifier", ctx, "Mise à jour du contact impossible.");
  }

  void journaliserAction("crm.contact_modifie", ctx, { cible: id });
  revalidateCrm(companyId);
  return { ok: true };
}

/**
 * Supprime une compagnie et tout ce qui lui est rattaché (contacts +
 * activités, via CASCADE FK). Les lots liés éventuels restent — leur
 * `contacts.lot_id` est simplement décroché avant la suppression.
 */
export async function deleteCompany(companyId: string): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(companyId);
  if (!id) return ID_INVALIDE;

  try {
    const { error } = await ctx.supabase.from("companies").delete().eq("id", id);
    if (error) return await echecAction(error, "crm.compagnie_supprimer", ctx, "Suppression impossible.");
  } catch (err) {
    return echecAction(err, "crm.compagnie_supprimer", ctx, "Suppression impossible.");
  }

  void journaliserAction("crm.compagnie_supprimee", ctx, { cible: id });
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/relances");
  revalidatePath("/admin/crm/suivis");
  return { ok: true };
}

/**
 * Supprime un contact et son historique d'activités (FK en cascade).
 * Le lot lié éventuel n'est pas touché.
 */
export async function deleteContact(contactId: string): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(contactId);
  if (!id) return ID_INVALIDE;

  let companyId: string | null = null;
  try {
    const { data, error } = await ctx.supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .select("company_id")
      .maybeSingle();
    if (error) return await echecAction(error, "crm.contact_supprimer", ctx, "Suppression impossible.");
    companyId = (data?.company_id as string | null) ?? null;
  } catch (err) {
    return echecAction(err, "crm.contact_supprimer", ctx, "Suppression impossible.");
  }

  void journaliserAction("crm.contact_supprime", ctx, { cible: id });
  revalidateCrm(companyId);
  return { ok: true };
}

/** Change le stage d'un contact (menu déroulant sur la fiche). */
export async function updateContactStage(
  contactId: string,
  stage: ContactStage,
): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(contactId);
  if (!id) return ID_INVALIDE;
  const etape = etapeContactSchema.safeParse(stage);
  if (!etape.success) return echecValidation(etape.error, { _: "Étape" });

  let companyId: string | null = null;
  try {
    const { data, error } = await ctx.supabase
      .from("contacts")
      .update({ stage: etape.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("company_id")
      .single();
    if (error) return await echecAction(error, "crm.contact_etape", ctx);
    companyId = (data?.company_id as string | null) ?? null;
  } catch (err) {
    return echecAction(err, "crm.contact_etape", ctx);
  }

  void journaliserAction("crm.contact_etape", ctx, { cible: id, etape: etape.data });
  revalidateCrm(companyId);
  return { ok: true };
}

/**
 * Désabonnement des courriels (LCAP), à noter dès qu'un contact le demande :
 * plus aucun envoi vers son adresse (manuel ou relance automatique), et un
 * contact en séquence en sort (stage « contacté »). `false` l'annule, à faire
 * seulement si la personne a redemandé à recevoir nos courriels.
 */
export async function setContactUnsubscribed(
  contactId: string,
  unsubscribed: boolean,
): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(contactId);
  if (!id) return ID_INVALIDE;
  if (typeof unsubscribed !== "boolean") return { ok: false, error: "Valeur invalide." };
  const { supabase } = ctx;

  let companyId: string | null = null;
  try {
    const now = new Date().toISOString();
    const { data: current, error: readError } = await supabase
      .from("contacts")
      .select("stage")
      .eq("id", id)
      .maybeSingle();
    if (readError) return await echecAction(readError, "crm.desabonnement", ctx);
    if (!current) return { ok: false, error: "Contact introuvable." };

    const patch: { unsubscribed_at: string | null; updated_at: string; stage?: ContactStage } = {
      unsubscribed_at: unsubscribed ? now : null,
      updated_at: now,
    };
    if (unsubscribed && current.stage === "sequence_active") patch.stage = "contacted";

    const { data, error } = await supabase
      .from("contacts")
      .update(patch)
      .eq("id", id)
      .select("company_id")
      .single();
    if (error) return await echecAction(error, "crm.desabonnement", ctx);
    companyId = (data?.company_id as string | null) ?? null;

    // Trace datée dans l'historique du contact (preuve que la demande a été traitée).
    await supabase.from("outreach_activities").insert({
      contact_id: id,
      activity_type: "manual_note",
      outcome: unsubscribed
        ? "Désabonné des courriels à sa demande (LCAP) : plus aucun envoi."
        : "Désabonnement annulé : la personne a redemandé à recevoir nos courriels.",
    });
  } catch (err) {
    return echecAction(err, "crm.desabonnement", ctx);
  }

  void journaliserAction(unsubscribed ? "crm.contact_desabonne" : "crm.desabonnement_annule", ctx, { cible: id });
  revalidateCrm(companyId);
  return { ok: true };
}

/** Marque un courriel ou téléphone comme vérifié manuellement. */
export async function markVerified(
  contactId: string,
  field: "email" | "phone",
): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(contactId);
  if (!id) return ID_INVALIDE;
  const champ = champVerifieSchema.safeParse(field);
  if (!champ.success) return echecValidation(champ.error, { _: "Champ" });

  const patch =
    champ.data === "email"
      ? { email_verified: true, email_verification_status: "manual" }
      : { phone_verified: true, phone_verification_status: "manual" };

  let companyId: string | null = null;
  try {
    const { data, error } = await ctx.supabase
      .from("contacts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("company_id")
      .single();
    if (error) return await echecAction(error, "crm.verifie", ctx);
    companyId = (data?.company_id as string | null) ?? null;
  } catch (err) {
    return echecAction(err, "crm.verifie", ctx);
  }

  void journaliserAction("crm.contact_verifie", ctx, { cible: id, champ: champ.data });
  revalidateCrm(companyId);
  return { ok: true };
}

/** Journalise un appel ou une note manuelle. */
export async function logActivity(input: {
  contact_id: string;
  activity_type: "call_logged" | "manual_note";
  outcome?: string | null;
}): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const parse = activiteSchema.safeParse(input);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_CRM);
  const v = parse.data;

  let companyId: string | null = null;
  try {
    const { data: activite, error } = await ctx.supabase
      .from("outreach_activities")
      .insert({ contact_id: v.contact_id, activity_type: v.activity_type, outcome: v.outcome })
      .select("id")
      .single();
    if (error) return await echecAction(error, "crm.activite", ctx);

    void journaliserAction("crm.activite_ajoutee", ctx, {
      cible: activite.id as string,
      contact: v.contact_id,
      type: v.activity_type,
    });
    const { data } = await ctx.supabase.from("contacts").select("company_id").eq("id", v.contact_id).single();
    companyId = (data?.company_id as string | null) ?? null;
  } catch (err) {
    return echecAction(err, "crm.activite", ctx);
  }

  revalidateCrm(companyId);
  return { ok: true };
}

async function loadContactWithCompany(
  ctx: ContexteAdmin,
  contactId: string,
): Promise<{ ok: true; contact: Contact; company: Company | null } | EchecAction> {
  const { data, error } = await ctx.supabase
    .from("contacts")
    .select("*, companies(*)")
    .eq("id", contactId)
    .maybeSingle();
  if (error) return echecAction(error, "crm.contact_lire", ctx);
  if (!data) return { ok: false, error: "Contact introuvable." };
  const { companies, ...contact } = data as Contact & {
    companies: Company | null;
  };
  return { ok: true, contact: contact as Contact, company: companies };
}

async function loadActiveTemplate(ctx: ContexteAdmin, type: TemplateType): Promise<EmailTemplate | null> {
  const { data } = await ctx.supabase
    .from("email_templates")
    .select("*")
    .eq("template_type", type)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as EmailTemplate) ?? null;
}

/**
 * Cœur du CRM : envoie le modèle demandé au contact, journalise
 * l'activité et met le stage à `sequence_active`.
 * - `post_call_intro` → activity_type `intro_email_sent`
 * - `followup_N` → activity_type `followup_sent`, sequence_step N
 */
export async function sendTemplateEmail(
  contactId: string,
  templateType: TemplateType,
): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(contactId);
  if (!id) return ID_INVALIDE;
  const type = typeModeleSchema.safeParse(templateType);
  if (!type.success) return echecValidation(type.error, { _: "Modèle" });
  const { supabase } = ctx;

  try {
    const loaded = await loadContactWithCompany(ctx, id);
    if (!loaded.ok) return loaded;
    const { contact, company } = loaded;

    if (!contact.email) {
      return { ok: false, error: "Ce contact n'a pas de courriel." };
    }

    // LCAP : jamais d'envoi vers une adresse désabonnée, même notée sur une autre fiche.
    if (contact.unsubscribed_at) {
      return { ok: false, error: "Ce contact s'est désabonné des courriels : aucun envoi possible." };
    }
    const desabonnes = await courrielsDesabonnes(supabase);
    if (!desabonnes.ok) {
      return await echecAction(
        desabonnes.erreur,
        "crm.desabonnes_lire",
        ctx,
        "Vérification des désabonnements impossible : aucun envoi.",
      );
    }
    if (desabonnes.emails.has(contact.email.trim().toLowerCase())) {
      return {
        ok: false,
        error: "Cette adresse s'est désabonnée (sur une autre fiche) : aucun envoi possible.",
      };
    }

    const template = await loadActiveTemplate(ctx, type.data);
    if (!template) {
      return {
        ok: false,
        error: `Aucun modèle actif de type « ${type.data} ». Ajoute-le dans Modèles.`,
      };
    }

    const vars = {
      prenom: contact.first_name?.trim() || "bonjour",
      nom: contact.last_name?.trim() || "",
      compagnie: company?.name ?? "votre entreprise",
      titre: contact.title ?? "",
    };
    const subject = renderTemplate(template.subject, vars);
    const body = renderTemplate(template.body, vars);

    // Part de la boîte info@ (copie dans « Envoyés ») ; les réponses y reviennent.
    // « Incertain » : rien n'est noté, le message dit de regarder dans Envoyés avant de réessayer.
    const sent = await sendProspectEmail({
      to: contact.email,
      subject,
      body,
      requestId: ctx.requestId,
    });
    if (!sent.ok) return { ok: false, error: sent.error };

    const isIntro = type.data === "post_call_intro" || type.data === "cold_outreach";
    const step = isIntro ? null : Number(type.data.slice(-1));

    const { error: logError } = await supabase.from("outreach_activities").insert({
      contact_id: contact.id,
      activity_type: isIntro ? "intro_email_sent" : "followup_sent",
      sequence_step: step,
      subject,
      body_preview: body.slice(0, 300),
      email_template_id: template.id,
    });
    // Envoi réussi mais trace métier manquante : au journal seulement.
    if (logError) await echecAction(logError, "crm.envoi_trace", ctx);

    // Le contact entre (ou reste) en séquence après tout envoi.
    if (contact.stage !== "converted" && contact.stage !== "lost") {
      await supabase
        .from("contacts")
        .update({ stage: "sequence_active", updated_at: new Date().toISOString() })
        .eq("id", contact.id);
    }

    void journaliserAction("crm.courriel_envoye", ctx, {
      cible: contact.id,
      modele: type.data,
    });
    revalidateCrm(contact.company_id);
    return { ok: true };
  } catch (err) {
    return echecAction(err, "crm.courriel_envoyer", ctx, "L'envoi a échoué.");
  }
}

/**
 * Conversion : crée un lot (source manual, statut negotiating, prix 0 à
 * ajuster), lie le contact, passe le contact et la compagnie à converti.
 * Renvoie l'id du lot pour rediriger vers sa fiche.
 */
export async function convertToClient(
  contactId: string,
): Promise<{ ok: true; lotId: string } | EchecAction> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const id = idValide(contactId);
  if (!id) return ID_INVALIDE;
  const { supabase, user } = ctx;

  try {
    const loaded = await loadContactWithCompany(ctx, id);
    if (!loaded.ok) return loaded;
    const { contact, company } = loaded;

    if (contact.lot_id) {
      return { ok: true, lotId: contact.lot_id };
    }

    const clientName =
      company?.name ||
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
      "Client CRM";

    const { data: lot, error } = await supabase
      .from("lots")
      .insert({
        client_name: clientName,
        client_email: contact.email,
        client_phone: contact.phone ?? company?.main_phone ?? null,
        purchase_price: 0,
        status: "negotiating",
        purchased_at: new Date().toISOString().slice(0, 10),
        description: `Prospection CRM — ${clientName}`,
        notes: contact.title
          ? `Contact : ${[contact.first_name, contact.last_name].filter(Boolean).join(" ")} (${contact.title})`
          : null,
        source: "manual",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) return await echecAction(error, "crm.conversion", ctx, "Conversion impossible.");

    await supabase
      .from("contacts")
      .update({
        lot_id: lot.id,
        stage: "converted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.id);

    if (contact.company_id) {
      await supabase
        .from("companies")
        .update({
          research_status: "converted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.company_id);
    }

    void journaliserAction("crm.contact_converti", ctx, { cible: contact.id, lot: lot.id as string });
    revalidateCrm(contact.company_id);
    revalidatePath("/admin");
    revalidatePath("/admin/lots");
    return { ok: true, lotId: lot.id as string };
  } catch (err) {
    return echecAction(err, "crm.conversion", ctx, "Conversion impossible.");
  }
}

/** Met à jour un modèle de courriel (sujet, corps, actif). */
export async function updateTemplate(
  id: string,
  input: { subject: string; body: string; is_active: boolean },
): Promise<Result> {
  const ctx = await adminPourAction();
  if (!ctx) return REFUS_ACTION;
  const idModele = idValide(id);
  if (!idModele) return ID_INVALIDE;
  const parse = modeleSchema.safeParse(input);
  if (!parse.success) return echecValidation(parse.error, LIBELLES_CRM);

  try {
    const { data, error } = await ctx.supabase
      .from("email_templates")
      .update({
        subject: parse.data.subject,
        body: parse.data.body,
        is_active: parse.data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idModele)
      .select("id");
    if (error) return await echecAction(error, "crm.modele", ctx, "Enregistrement du modèle impossible.");
    if (!data?.length) return { ok: false, error: "Ce modèle n'existe plus." };
  } catch (err) {
    return echecAction(err, "crm.modele", ctx, "Enregistrement du modèle impossible.");
  }

  void journaliserAction("crm.modele_modifie", ctx, { cible: idModele });
  revalidatePath("/admin/crm/modeles");
  return { ok: true };
}
