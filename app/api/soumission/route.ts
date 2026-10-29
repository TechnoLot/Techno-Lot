import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { ENTETE_SOUMISSION } from "@/lib/hostinger/config";

export const runtime = "nodejs";

const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15 Mo

/** Messages d'erreur renvoyés au navigateur, selon la langue du formulaire. */
const messages = {
  fr: {
    invalid: "Requête invalide.",
    required: "Veuillez remplir tous les champs obligatoires.",
    email: "L'adresse courriel fournie n'est pas valide.",
    files: "Les pièces jointes dépassent 15 Mo au total.",
    notConfigured:
      "Le service de courriel n'est pas encore configuré (RESEND_API_KEY manquante). Veuillez nous appeler au 514-944-3939.",
    sendFailed:
      "L'envoi du courriel a échoué. Veuillez réessayer ou nous appeler au 514-944-3939.",
  },
  en: {
    invalid: "Invalid request.",
    required: "Please fill in all required fields.",
    email: "The email address provided is not valid.",
    files: "Attachments exceed 15 MB in total.",
    notConfigured:
      "The email service is not configured yet (missing RESEND_API_KEY). Please call us at 514-944-3939.",
    sendFailed:
      "The email could not be sent. Please try again or call us at 514-944-3939.",
  },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return NextResponse.json(
      { error: messages.fr.invalid },
      { status: 400 },
    );
  }

  const t =
    String(data.get("locale") ?? "fr") === "en" ? messages.en : messages.fr;

  // Honeypot : un robot qui remplit ce champ est ignoré silencieusement.
  // « tl_verif » est le nom actuel ; « entreprise_site » reste refusé pour les
  // robots qui ont mémorisé l'ancien formulaire.
  const piege = ["tl_verif", "entreprise_site"].some(
    (champ) => String(data.get(champ) ?? "").trim() !== ""
  );
  if (piege) {
    return NextResponse.json({ ok: true });
  }

  const nom = String(data.get("nom") ?? "").trim();
  const courriel = String(data.get("courriel") ?? "").trim();
  const telephone = String(data.get("telephone") ?? "").trim();
  const message = String(data.get("message") ?? "").trim();

  if (!nom || !courriel || !telephone) {
    return NextResponse.json({ error: t.required }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) {
    return NextResponse.json({ error: t.email }, { status: 400 });
  }

  const files = [...data.getAll("inventaire"), ...data.getAll("photos")].filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return NextResponse.json({ error: t.files }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[soumission] RESEND_API_KEY manquante dans .env.local — le courriel n'a pas été envoyé.",
    );
    return NextResponse.json({ error: t.notConfigured }, { status: 503 });
  }

  const attachments = await Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
    })),
  );

  // Sauvegarde dans Supabase — ne bloque pas l'envoi du courriel en cas d'échec.
  // Note : les pièces jointes ne sont pas stockées ici, seulement leurs noms.
  // L'id est généré ici : anon peut insérer mais pas relire la ligne.
  const soumissionId = crypto.randomUUID();
  let soumissionEnregistree = false;
  try {
    const supabase = createSupabaseClient();
    const { error: dbError } = await supabase.from("soumissions").insert({
      id: soumissionId,
      nom,
      courriel,
      telephone,
      message: message || null,
      locale: String(data.get("locale") ?? "fr") === "en" ? "en" : "fr",
      fichiers: attachments.map((a) => a.filename),
    });
    if (dbError) {
      console.error("[soumission] Erreur Supabase :", dbError);
    } else {
      soumissionEnregistree = true;
    }
  } catch (err) {
    console.error("[soumission] Erreur Supabase (exception) :", err);
  }

  // Attribution publicitaire — ne bloque jamais l'envoi du courriel.
  try {
    let attr: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(String(data.get("tl_attr") ?? "{}"));
      if (parsed && typeof parsed === "object") {
        attr = parsed as Record<string, unknown>;
      }
    } catch {
      /* tl_attr invalide : on traite comme direct */
    }
    const s = (v: unknown, max: number): string | null =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
    const platforms = ["meta", "google", "organic", "referral", "direct", "email", "other"];
    const sid = typeof attr.id === "string" ? attr.id : "";
    const supabase = createSupabaseClient();
    const lead = {
      session_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid)
        ? sid
        : null,
      nom,
      courriel,
      telephone,
      platform: platforms.includes(String(attr.platform)) ? attr.platform : "direct",
      utm_source: s(attr.utm_source, 300),
      utm_medium: s(attr.utm_medium, 300),
      utm_campaign: s(attr.utm_campaign, 300),
      utm_content: s(attr.utm_content, 300),
      utm_term: s(attr.utm_term, 300),
      campaign_id: s(attr.campaign_id, 100),
      adset_id: s(attr.adset_id, 100),
      ad_id: s(attr.ad_id, 100),
      placement: s(attr.placement, 100),
      fbclid: s(attr.fbclid, 500),
      gclid: s(attr.gclid, 500),
      landing_path: s(attr.landing_path, 500),
    };
    let { error: leadError } = await supabase.from("ad_leads").insert(lead);
    // Session jamais enregistrée (tracking bloqué) : on garde le lead sans lien.
    if (leadError?.code === "23503") {
      ({ error: leadError } = await supabase
        .from("ad_leads")
        .insert({ ...lead, session_id: null }));
    }
    if (leadError) console.error("[soumission] Erreur ad_leads :", leadError);
  } catch (err) {
    console.error("[soumission] Erreur ad_leads (exception) :", err);
  }

  const html = `
    <h2>Nouvelle soumission — technolot.ca</h2>
    <p><strong>Nom :</strong> ${escapeHtml(nom)}</p>
    <p><strong>Courriel :</strong> ${escapeHtml(courriel)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(telephone)}</p>
    <p><strong>Message :</strong><br/>${escapeHtml(message || "(aucun message)").replace(/\n/g, "<br/>")}</p>
    <p><strong>Pièces jointes :</strong> ${
      attachments.length > 0
        ? attachments.map((a) => escapeHtml(a.filename)).join(", ")
        : "aucune"
    }</p>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Techno Lot <${process.env.FROM_EMAIL ?? "onboarding@resend.dev"}>`,
      to: [process.env.CONTACT_EMAIL ?? "info@technolot.ca"],
      replyTo: courriel,
      subject: `Nouvelle soumission de ${nom}`,
      html,
      attachments,
      // Permet de retrouver ce courriel dans la boîte Hostinger (seulement si la demande est en base).
      ...(soumissionEnregistree
        ? { headers: { [ENTETE_SOUMISSION]: soumissionId } }
        : {}),
    });
    if (error) {
      console.error("[soumission] Erreur Resend :", error);
      return NextResponse.json({ error: t.sendFailed }, { status: 502 });
    }
  } catch (err) {
    console.error("[soumission] Erreur d'envoi :", err);
    return NextResponse.json({ error: t.sendFailed }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
