import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderTemplate, sendProspectEmail } from "@/lib/crm/email";
import { courrielsDesabonnes } from "@/lib/crm/desabonnement";
import type {
  Company,
  Contact,
  EmailTemplate,
  OutreachActivity,
} from "@/lib/crm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Délai (jours) entre l'envoi d'intro/cold outreach et l'envoi automatique
 * de la relance 1. Modifie ici si tu veux 5 ou 10 jours au lieu de 7.
 */
const DELAY_DAYS = 7;

/**
 * GET/POST : auto-envoi de la relance 1 aux contacts qui ont reçu un intro
 * (cold outreach ou post-appel) il y a >= 7 jours et qui n'ont pas encore
 * reçu de relance 1. Les contacts désabonnés (LCAP) sont exclus, même quand
 * l'adresse a été désabonnée sur une autre fiche.
 * Protégé par le header `Authorization: Bearer $CRON_SECRET`.
 *
 * Réponse : { checked, sent, skipped, errors }
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Variables Supabase manquantes." },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 1. Charge le modèle actif « followup_1 »
  const { data: templateRaw, error: templateError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("template_type", "followup_1")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (templateError || !templateRaw) {
    return NextResponse.json(
      {
        error:
          "Aucun modèle « followup_1 » actif — ajoute-le dans /admin/crm/modeles.",
      },
      { status: 500 },
    );
  }
  const template = templateRaw as EmailTemplate;

  // 2. Contacts en séquence active avec courriel
  const { data: contactsRaw, error: contactsError } = await supabase
    .from("contacts")
    .select("*, companies(*)")
    .eq("stage", "sequence_active")
    .is("unsubscribed_at", null)
    .not("email", "is", null);
  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }
  const contacts = (contactsRaw ?? []) as (Contact & {
    companies: Company | null;
  })[];

  if (contacts.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0, skipped: 0, errors: [] });
  }

  // LCAP : adresses désabonnées (lecture impossible : on n'envoie rien)
  const desabonnes = await courrielsDesabonnes(supabase);
  if (!desabonnes.ok) {
    return NextResponse.json({ error: desabonnes.error }, { status: 500 });
  }

  // 3. Toutes les activités d'envoi pour ces contacts
  const { data: actsRaw } = await supabase
    .from("outreach_activities")
    .select("id, contact_id, activity_type, sequence_step, occurred_at")
    .in(
      "contact_id",
      contacts.map((c) => c.id),
    )
    .in("activity_type", ["intro_email_sent", "followup_sent"])
    .order("occurred_at", { ascending: false });
  const activities = (actsRaw ?? []) as Pick<
    OutreachActivity,
    "id" | "contact_id" | "activity_type" | "sequence_step" | "occurred_at"
  >[];

  const cutoff = Date.now() - DELAY_DAYS * 86_400_000;
  const results: Array<{
    contactId: string;
    email: string;
    status: "sent" | "skipped" | "error";
    reason?: string;
  }> = [];

  for (const contact of contacts) {
    if (!contact.email) {
      results.push({
        contactId: contact.id,
        email: "",
        status: "skipped",
        reason: "no-email",
      });
      continue;
    }

    if (desabonnes.emails.has(contact.email.trim().toLowerCase())) {
      results.push({
        contactId: contact.id,
        email: contact.email,
        status: "skipped",
        reason: "unsubscribed",
      });
      continue;
    }

    const acts = activities.filter((a) => a.contact_id === contact.id);
    const intro = acts.find((a) => a.activity_type === "intro_email_sent");
    const alreadyF1 = acts.some(
      (a) => a.activity_type === "followup_sent" && a.sequence_step === 1,
    );

    if (!intro) {
      results.push({
        contactId: contact.id,
        email: contact.email,
        status: "skipped",
        reason: "no-intro-sent",
      });
      continue;
    }
    if (alreadyF1) {
      results.push({
        contactId: contact.id,
        email: contact.email,
        status: "skipped",
        reason: "followup1-already-sent",
      });
      continue;
    }
    const introTime = new Date(intro.occurred_at).getTime();
    if (introTime > cutoff) {
      results.push({
        contactId: contact.id,
        email: contact.email,
        status: "skipped",
        reason: "too-recent",
      });
      continue;
    }

    // Éligible — envoie followup_1
    const vars = {
      prenom: contact.first_name?.trim() || "bonjour",
      nom: contact.last_name?.trim() || "",
      compagnie: contact.companies?.name ?? "votre entreprise",
      titre: contact.title ?? "",
    };
    const subject = renderTemplate(template.subject, vars);
    const body = renderTemplate(template.body, vars);

    const sent = await sendProspectEmail({
      to: contact.email,
      subject,
      body,
      // Le cron n'est associé à aucun admin — replyTo tombe sur la boîte
      // générale info@technolot.ca (comportement par défaut de Resend).
      replyTo: null,
    });

    if (!sent.ok) {
      results.push({
        contactId: contact.id,
        email: contact.email,
        status: "error",
        reason: sent.error,
      });
      continue;
    }

    await supabase.from("outreach_activities").insert({
      contact_id: contact.id,
      activity_type: "followup_sent",
      sequence_step: 1,
      subject,
      body_preview: body.slice(0, 300),
      email_template_id: template.id,
      outcome: "auto",
    });

    results.push({
      contactId: contact.id,
      email: contact.email,
      status: "sent",
    });
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error");

  return NextResponse.json({
    checked: contacts.length,
    sent,
    skipped,
    errors,
    // Utile pour debug ; peut être retiré plus tard
    details: results,
  });
}

/** GET = même comportement pour un cron qui préfère GET plutôt que POST. */
export async function GET(request: Request) {
  return POST(request);
}
