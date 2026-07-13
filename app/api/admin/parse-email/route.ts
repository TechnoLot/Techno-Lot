import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Tu es un assistant pour Techno Lot, une entreprise québécoise qui achète des lots d'équipement informatique et électronique.

Ton rôle : analyser un courriel (envoyé ou reçu) et extraire les informations sur un rachat potentiel ou confirmé.

Retourne UNIQUEMENT un objet JSON avec cette structure exacte, sans texte autour :

{
  "client_name": string,       // Nom de la personne ou entreprise
  "client_email": string|null, // Courriel du client si mentionné
  "client_phone": string|null, // Téléphone si mentionné (format libre)
  "purchase_price": number|null, // Montant en $ CAD, uniquement le nombre (pas de symbole)
  "description": string|null,  // Brève description du lot (1-2 phrases)
  "status": "negotiating"|"purchased"|"sold"|null,
  "confidence": number         // 0.0 à 1.0
}

Règles :
- Utilise null quand tu ne peux pas déterminer un champ avec certitude
- "status" : "negotiating" = en discussion, "purchased" = achat confirmé, "sold" = revente confirmée
- Confidence < 0.5 = incertain, l'utilisateur devra vérifier`;

export async function POST(request: Request) {
  // Authentification et whitelist
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "L'analyse par IA n'est pas configurée. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement.",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim();
  if (email.length < 20) {
    return NextResponse.json(
      { error: "Colle un courriel un peu plus long pour l'analyse." },
      { status: 400 },
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: email }],
    });

    const text =
      message.content.find((c) => c.type === "text")?.text ?? "";
    // Le modèle peut envelopper la réponse dans ```json — on récupère le JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Réponse non structurée");
    }
    const parsed = JSON.parse(match[0]);

    return NextResponse.json({ ok: true, extracted: parsed });
  } catch (err) {
    console.error("[parse-email]", err);
    return NextResponse.json(
      {
        error:
          "L'analyse a échoué. Réessaie ou saisis les informations à la main.",
      },
      { status: 502 },
    );
  }
}
