import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15 Mo

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
      { error: "Requête invalide." },
      { status: 400 },
    );
  }

  // Honeypot : un robot qui remplit ce champ est ignoré silencieusement.
  if (String(data.get("entreprise_site") ?? "").trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const nom = String(data.get("nom") ?? "").trim();
  const courriel = String(data.get("courriel") ?? "").trim();
  const telephone = String(data.get("telephone") ?? "").trim();
  const message = String(data.get("message") ?? "").trim();

  if (!nom || !courriel || !telephone) {
    return NextResponse.json(
      { error: "Veuillez remplir tous les champs obligatoires." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) {
    return NextResponse.json(
      { error: "L'adresse courriel fournie n'est pas valide." },
      { status: 400 },
    );
  }

  const files = [...data.getAll("inventaire"), ...data.getAll("photos")].filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return NextResponse.json(
      { error: "Les pièces jointes dépassent 15 Mo au total." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[soumission] RESEND_API_KEY manquante dans .env.local — le courriel n'a pas été envoyé.",
    );
    return NextResponse.json(
      {
        error:
          "Le service de courriel n'est pas encore configuré (RESEND_API_KEY manquante). Veuillez nous appeler au 514-944-3939.",
      },
      { status: 503 },
    );
  }

  const attachments = await Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
    })),
  );

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
    });
    if (error) {
      console.error("[soumission] Erreur Resend :", error);
      return NextResponse.json(
        {
          error:
            "L'envoi du courriel a échoué. Veuillez réessayer ou nous appeler au 514-944-3939.",
        },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[soumission] Erreur d'envoi :", err);
    return NextResponse.json(
      {
        error:
          "L'envoi du courriel a échoué. Veuillez réessayer ou nous appeler au 514-944-3939.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
