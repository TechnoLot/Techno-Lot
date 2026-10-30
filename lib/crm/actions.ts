"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
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

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Non autorisé");
  }
  return { supabase, user };
}

function revalidateCrm(companyId?: string | null) {
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/relances");
  if (companyId) revalidatePath(`/admin/crm/${companyId}`);
}

/** Statut rapide du lead : non contacté / contacté / intéressé / pas intéressé. */
export async function updateLeadStatus(
  companyId: string,
  status: LeadStatus,
): Promise<Result> {
  const { supabase } = await requireAdmin();

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("companies")
    .update({
      lead_status: status,
      lead_status_changed_at: now,
      updated_at: now,
    })
    .eq("id", companyId);
  if (error) return { ok: false, error: error.message };

  revalidateCrm(companyId);
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
): Promise<{ ok: true; followupOn: string | null } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin();

  const trimmed = notes.trim();
  const resolved =
    followupOn?.trim() || (trimmed ? parseFollowupDate(trimmed) : null);

  const { error } = await supabase
    .from("companies")
    .update({
      notes: trimmed || null,
      next_followup_on: resolved,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) return { ok: false, error: error.message };

  revalidateCrm(companyId);
  return { ok: true, followupOn: resolved };
}

/**
 * « Suivi fait » : remet le compteur de statut à zéro et efface la date
 * de rappel planifiée — le lead disparaît du panneau jusqu'au prochain
 * délai ou à la prochaine note datée.
 */
export async function markFollowupDone(companyId: string): Promise<Result> {
  const { supabase } = await requireAdmin();

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("companies")
    .update({
      lead_status_changed_at: now,
      next_followup_on: null,
      updated_at: now,
    })
    .eq("id", companyId);
  if (error) return { ok: false, error: error.message };

  revalidateCrm(companyId);
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
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Le nom de la compagnie est requis." };

  const fitScore =
    input.fit_score != null && Number.isFinite(input.fit_score)
      ? Math.min(10, Math.max(1, Math.round(input.fit_score)))
      : null;

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      domain: input.domain?.trim() || null,
      industry: input.industry?.trim() || null,
      region: input.region?.trim() || null,
      employee_count:
        input.employee_count != null && Number.isFinite(input.employee_count)
          ? input.employee_count
          : null,
      main_phone: input.main_phone?.trim() || null,
      fit_score: fitScore,
      street_address: input.street_address?.trim() || null,
      notes: input.notes?.trim() || null,
      research_status: "found",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidateCrm();
  return { ok: true, id: data.id };
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
  const { supabase } = await requireAdmin();

  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Courriel invalide." };
  }

  const { error } = await supabase.from("contacts").insert({
    company_id: input.company_id,
    first_name: input.first_name?.trim() || null,
    last_name: input.last_name?.trim() || null,
    title: input.title?.trim() || null,
    email,
    phone: input.phone?.trim() || null,
    linkedin_url: input.linkedin_url?.trim() || null,
    notes: input.notes?.trim() || null,
    stage: "new",
  });
  if (error) return { ok: false, error: error.message };

  revalidateCrm(input.company_id);
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
  const { supabase } = await requireAdmin();

  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Courriel invalide." };
  }

  const patch: Record<string, unknown> = {
    first_name: input.first_name?.trim() || null,
    last_name: input.last_name?.trim() || null,
    title: input.title?.trim() || null,
    email,
    phone: input.phone?.trim() || null,
    linkedin_url: input.linkedin_url?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", contactId)
    .select("company_id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidateCrm(data?.company_id);
  return { ok: true };
}

/**
 * Supprime une compagnie et tout ce qui lui est rattaché (contacts +
 * activités, via CASCADE FK). Les lots liés éventuels restent — leur
 * `contacts.lot_id` est simplement décroché avant la suppression.
 */
export async function deleteCompany(companyId: string): Promise<Result> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId);
  if (error) return { ok: false, error: error.message };

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
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .select("company_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  revalidateCrm(data?.company_id);
  return { ok: true };
}

/** Change le stage d'un contact (menu déroulant sur la fiche). */
export async function updateContactStage(
  contactId: string,
  stage: ContactStage,
): Promise<Result> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("contacts")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select("company_id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidateCrm(data?.company_id);
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
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();

  const { data: current, error: readError } = await supabase
    .from("contacts")
    .select("stage")
    .eq("id", contactId)
    .single();
  if (readError || !current) {
    return { ok: false, error: readError?.message ?? "Contact introuvable." };
  }

  const patch: { unsubscribed_at: string | null; updated_at: string; stage?: ContactStage } = {
    unsubscribed_at: unsubscribed ? now : null,
    updated_at: now,
  };
  if (unsubscribed && current.stage === "sequence_active") patch.stage = "contacted";

  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", contactId)
    .select("company_id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Trace datée dans l'historique du contact (preuve que la demande a été traitée).
  await supabase.from("outreach_activities").insert({
    contact_id: contactId,
    activity_type: "manual_note",
    outcome: unsubscribed
      ? "Désabonné des courriels à sa demande (LCAP) : plus aucun envoi."
      : "Désabonnement annulé : la personne a redemandé à recevoir nos courriels.",
  });

  revalidateCrm(data?.company_id);
  return { ok: true };
}

/** Marque un courriel ou téléphone comme vérifié manuellement. */
export async function markVerified(
  contactId: string,
  field: "email" | "phone",
): Promise<Result> {
  const { supabase } = await requireAdmin();

  const patch =
    field === "email"
      ? { email_verified: true, email_verification_status: "manual" }
      : { phone_verified: true, phone_verification_status: "manual" };

  const { data, error } = await supabase
    .from("contacts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select("company_id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidateCrm(data?.company_id);
  return { ok: true };
}

/** Journalise un appel ou une note manuelle. */
export async function logActivity(input: {
  contact_id: string;
  activity_type: "call_logged" | "manual_note";
  outcome?: string | null;
}): Promise<Result> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("outreach_activities").insert({
    contact_id: input.contact_id,
    activity_type: input.activity_type,
    outcome: input.outcome?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = await supabase
    .from("contacts")
    .select("company_id")
    .eq("id", input.contact_id)
    .single();
  revalidateCrm(data?.company_id);
  return { ok: true };
}

async function loadContactWithCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string,
): Promise<
  | { ok: true; contact: Contact; company: Company | null }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(*)")
    .eq("id", contactId)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Contact introuvable." };
  }
  const { companies, ...contact } = data as Contact & {
    companies: Company | null;
  };
  return { ok: true, contact: contact as Contact, company: companies };
}

async function loadActiveTemplate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: TemplateType,
): Promise<EmailTemplate | null> {
  const { data } = await supabase
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
  const { supabase, user } = await requireAdmin();

  const loaded = await loadContactWithCompany(supabase, contactId);
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
    return { ok: false, error: "Vérification des désabonnements impossible : " + desabonnes.error };
  }
  if (desabonnes.emails.has(contact.email.trim().toLowerCase())) {
    return {
      ok: false,
      error: "Cette adresse s'est désabonnée (sur une autre fiche) : aucun envoi possible.",
    };
  }

  const template = await loadActiveTemplate(supabase, templateType);
  if (!template) {
    return {
      ok: false,
      error: `Aucun modèle actif de type « ${templateType} ». Ajoute-le dans Modèles.`,
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

  const sent = await sendProspectEmail({
    to: contact.email,
    subject,
    body,
    replyTo: user.email,
  });
  if (!sent.ok) return { ok: false, error: "L'envoi a échoué : " + sent.error };

  const isIntro =
    templateType === "post_call_intro" || templateType === "cold_outreach";
  const step = isIntro ? null : Number(templateType.slice(-1));

  const { error: logError } = await supabase.from("outreach_activities").insert({
    contact_id: contact.id,
    activity_type: isIntro ? "intro_email_sent" : "followup_sent",
    sequence_step: step,
    subject,
    body_preview: body.slice(0, 300),
    email_template_id: template.id,
  });
  if (logError) console.error("[crm] Envoi réussi mais log échoué :", logError);

  // Le contact entre (ou reste) en séquence après tout envoi.
  if (contact.stage !== "converted" && contact.stage !== "lost") {
    await supabase
      .from("contacts")
      .update({ stage: "sequence_active", updated_at: new Date().toISOString() })
      .eq("id", contact.id);
  }

  revalidateCrm(contact.company_id);
  return { ok: true };
}

/**
 * Conversion : crée un lot (source manual, statut negotiating, prix 0 à
 * ajuster), lie le contact, passe le contact et la compagnie à converti.
 * Renvoie l'id du lot pour rediriger vers sa fiche.
 */
export async function convertToClient(
  contactId: string,
): Promise<{ ok: true; lotId: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireAdmin();

  const loaded = await loadContactWithCompany(supabase, contactId);
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
  if (error) return { ok: false, error: error.message };

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

  revalidateCrm(contact.company_id);
  revalidatePath("/admin");
  revalidatePath("/admin/lots");
  return { ok: true, lotId: lot.id };
}

/** Met à jour un modèle de courriel (sujet, corps, actif). */
export async function updateTemplate(
  id: string,
  input: { subject: string; body: string; is_active: boolean },
): Promise<Result> {
  const { supabase } = await requireAdmin();

  if (!input.subject.trim() || !input.body.trim()) {
    return { ok: false, error: "Le sujet et le corps sont requis." };
  }

  const { error } = await supabase
    .from("email_templates")
    .update({
      subject: input.subject.trim(),
      body: input.body.trim(),
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/crm/modeles");
  return { ok: true };
}
