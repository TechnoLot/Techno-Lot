import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { lireJson } from "@/lib/securite/requete";
import { champsEnErreur, journaliserAction } from "@/lib/admin/erreurs-admin";
import { PRIVE } from "@/lib/admin/requete-admin";
import { analyseCourrielSchema } from "@/lib/admin/schemas";
import { masquerDonneesSensibles } from "@/lib/securite/masquage";

/** Corps JSON au plus (courriel de 50 000 caractères, échappements compris). */
const MAX_OCTETS = 300_000;

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
  // Garde admin : origine, session, rôle (avant toute lecture du corps)
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;

  const lu = await lireJson<unknown>(request, MAX_OCTETS);
  if (!lu.ok) return lu.reponse;
  const parse = analyseCourrielSchema.safeParse(lu.donnees);
  if (!parse.success) {
    const champs = champsEnErreur(parse.error);
    const tropLong = parse.error.issues.some((i) => i.code === "too_big");
    return NextResponse.json(
      {
        error: tropLong
          ? "Courriel trop long pour l'analyse (50 000 caractères au plus)."
          : "Colle un courriel un peu plus long pour l'analyse.",
        champs,
      },
      { status: 400, headers: PRIVE },
    );
  }
  // Loi 25 : numéros de carte et NAS masqués avant l'envoi à l'IA.
  const { texte: email, masques } = masquerDonneesSensibles(parse.data.email);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "L'analyse par IA n'est pas configurée. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement.",
      },
      { status: 503, headers: PRIVE },
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

    void journaliserAction("lot.courriel_analyse", garde, { caracteres: email.length, masques }, request);
    return NextResponse.json({ ok: true, extracted: parsed }, { headers: PRIVE });
  } catch (err) {
    // Détail de l'erreur (SDK Anthropic) au journal seulement.
    return reponseErreur(502, "L'analyse a échoué. Réessaie ou saisis les informations à la main.", {
      request,
      err,
      requestId: garde.requestId,
      userId: garde.user.id,
    });
  }
}
