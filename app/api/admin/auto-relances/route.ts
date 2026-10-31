import { randomUUID } from "node:crypto";
import { setTimeout as attendre } from "node:timers/promises";
import { NextResponse } from "next/server";
import { bearerCronValide } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { clientServiceCron, refusCron, reponseServiceManquant } from "@/lib/admin/cron";
import { PRIVE } from "@/lib/admin/requete-admin";
import { PAUSE_ENTRE_ENVOIS_MS, renderTemplate, sendProspectEmail } from "@/lib/crm/email";
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

/** Relances au plus par passage (rythme modéré pour la boîte info@) ; les autres partent au passage suivant. */
const MAX_PAR_PASSAGE = 50;

/**
 * POST seulement (envoie des courriels : jamais en GET) : auto-envoi de la
 * relance 1 aux contacts qui ont reçu un intro (cold outreach ou post-appel)
 * il y a >= 7 jours et qui n'ont pas encore reçu de relance 1. Les contacts
 * désabonnés (LCAP) sont exclus, même quand l'adresse a été désabonnée sur une
 * autre fiche.
 * Les relances partent de la boîte info@ (Mail API de Hostinger, copie dans
 * « Envoyés »), une à la fois avec une pause, 50 au plus par passage. Arrêt
 * du passage si Hostinger limite les envois ou refuse la clé ; réponse
 * « incertaine » (peut-être partie) : notée comme envoyée, jamais renvoyée.
 * Protégé par l'en-tête `Authorization: Bearer $CRON_SECRET` (comparé en temps
 * constant) ; refus journalisé (`cron.refus`).
 *
 * Réponse : { checked, sent, skipped, errors: [{ contactId, ref }], arret }
 * (identifiants seulement : aucun courriel ni message d'erreur brut ; `arret`
 * = motif d'un passage arrêté avant la fin, sinon null).
 */
export async function POST(request: Request) {
  if (!bearerCronValide(request)) return refusCron(request);

  const supabase = clientServiceCron();
  if (!supabase) return reponseServiceManquant();
  const requestId = randomUUID();

  try {
    // 1. Charge le modèle actif « followup_1 »
    const { data: templateRaw, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_type", "followup_1")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (templateError) {
      return reponseErreur(500, "Lecture du modèle impossible.", { request, err: templateError, requestId });
    }
    if (!templateRaw) {
      return NextResponse.json(
        { error: "Aucun modèle « followup_1 » actif — ajoute-le dans /admin/crm/modeles." },
        { status: 500, headers: PRIVE },
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
      return reponseErreur(500, "Lecture des contacts impossible.", { request, err: contactsError, requestId });
    }
    const contacts = (contactsRaw ?? []) as (Contact & {
      companies: Company | null;
    })[];

    if (contacts.length === 0) {
      return NextResponse.json({ checked: 0, sent: 0, skipped: 0, errors: [], arret: null }, { headers: PRIVE });
    }

    // LCAP : adresses désabonnées (lecture impossible : on n'envoie rien)
    const desabonnes = await courrielsDesabonnes(supabase);
    if (!desabonnes.ok) {
      return reponseErreur(500, "Vérification des désabonnements impossible : aucun envoi.", {
        request,
        err: desabonnes.erreur,
        requestId,
      });
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
    let sent = 0;
    let skipped = 0;
    let tentatives = 0;
    /** Passage arrêté avant la fin : limite de débit, clé refusée, réponse incertaine ou plafond atteint. */
    let arret: "debit" | "configuration" | "incertain" | "plafond" | null = null;
    const errors: { contactId: string; ref: string }[] = [];

    for (const contact of contacts) {
      if (!contact.email || desabonnes.emails.has(contact.email.trim().toLowerCase())) {
        skipped++;
        continue;
      }

      const acts = activities.filter((a) => a.contact_id === contact.id);
      const intro = acts.find((a) => a.activity_type === "intro_email_sent");
      const alreadyF1 = acts.some(
        (a) => a.activity_type === "followup_sent" && a.sequence_step === 1,
      );
      if (!intro || alreadyF1 || new Date(intro.occurred_at).getTime() > cutoff) {
        skipped++;
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

      if (sent >= MAX_PAR_PASSAGE) {
        arret = "plafond";
        break;
      }
      if (tentatives++ > 0) await attendre(PAUSE_ENTRE_ENVOIS_MS);
      const envoi = await sendProspectEmail({ to: contact.email, subject, body, requestId });

      if (!envoi.ok) {
        // Détail déjà au journal (sendProspectEmail) ; référence seulement ici.
        errors.push({ contactId: contact.id, ref: requestId });
        if (envoi.motif === "debit" || envoi.motif === "configuration") {
          // Inutile d'insister : les autres relances partiront au passage suivant.
          arret = envoi.motif;
          break;
        }
        if (envoi.motif !== "incertain") continue;
      }

      // Envoyée, ou peut-être partie (« incertain ») : notée pour ne jamais être renvoyée.
      await supabase.from("outreach_activities").insert({
        contact_id: contact.id,
        activity_type: "followup_sent",
        sequence_step: 1,
        subject,
        body_preview: body.slice(0, 300),
        email_template_id: template.id,
        outcome: "auto",
      });
      sent++;
      if (!envoi.ok) {
        arret = "incertain";
        break;
      }
    }

    void journaliser(EVENEMENTS.adminAction, {
      resultat: errors.length ? "echec" : "ok",
      request,
      requestId,
      details: { action: "crm.relances_auto", verifies: contacts.length, envoyes: sent, erreurs: errors.length, arret },
    });
    return NextResponse.json({ checked: contacts.length, sent, skipped, errors, arret }, { headers: PRIVE });
  } catch (err) {
    return reponseErreur(500, "Relances automatiques impossibles.", { request, err, requestId });
  }
}
