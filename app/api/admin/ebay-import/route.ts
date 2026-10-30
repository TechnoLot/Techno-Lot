import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { lireJson } from "@/lib/securite/requete";
import { journaliserAction } from "@/lib/admin/erreurs-admin";
import { PRIVE, reponseInvalide } from "@/lib/admin/requete-admin";
import { importEbaySchema } from "@/lib/admin/schemas";

/** Corps JSON au plus (texte de 200 000 caractères, échappements compris). */
const MAX_OCTETS = 1_000_000;

export const runtime = "nodejs";

// Doit rester aligné avec TYPES / CONDS dans assets/outils/ebay-description.html
const SYSTEM_PROMPT = `You help Techno Lot, a Quebec seller of used computer equipment, write eBay listings.
The user pastes the text of another seller's eBay listing (title, item specifics, description — possibly messy, possibly in French).
Extract the product information so Techno Lot can write its own listing for the same kind of item.

Return ONLY a JSON object, no text around it:
{
  "type": "desktop" | "laptop" | "server" | "monitor" | "network" | "parts" | "other",
  "cond": "New – Open box" | "Used – Excellent" | "Used – Good" | "Used – Fair" | "For parts / not working" | "",
  "title": string,   // brand + product line only, e.g. "Dell OptiPlex", "Lenovo ThinkPad", "HPE ProLiant"
  "model": string,   // model number + form factor, e.g. "7090 Micro", "T14 Gen 2", "DL380 Gen10"
  "desc": string,    // 1-2 sentence English description, written fresh (never copy the other seller's sentences), no prices, no seller names, no shipping/payment info
  "specs": [[label, value], ...]
}

Spec labels to use, by type (only include specs actually stated or clearly implied by the listing; never invent values):
- desktop: Brand, Model, Processor, RAM, Storage, Graphics, Operating System, Ports
- laptop: Brand, Model, Processor, RAM, Storage, Screen Size, Operating System, Battery, Charger
- server: Brand, Model, Form Factor, Processor(s), RAM, Drive Bays / Storage, RAID Controller, Power Supplies, Network
- monitor: Brand, Model, Screen Size, Resolution, Panel Type, Inputs, Stand
- network: Brand, Model, Type, Ports, Speed, Managed, PoE
- parts: Brand, Model, Type, Capacity, Interface, Part Number
- other: Brand, Model, Type, Part Number, Key Specs
Values in English, short and clean (e.g. "Intel Core i5-11500T", "16GB DDR4", "256GB NVMe SSD", "Windows 11 Pro").
Do not include Condition, Warranty or Serial Number in specs.
"cond": map the listing's condition; "" if unknown.`;

const TYPES = ["desktop", "laptop", "server", "monitor", "network", "parts", "other"];
const CONDS = [
  "New – Open box",
  "Used – Excellent",
  "Used – Good",
  "Used – Fair",
  "For parts / not working",
];

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;

  // Taille bornée AVANT la lecture complète du corps (411/413), JSON exigé (415).
  const lu = await lireJson<unknown>(request, MAX_OCTETS);
  if (!lu.ok) return lu.reponse;
  const parse = importEbaySchema.safeParse(lu.donnees);
  if (!parse.success) return reponseInvalide(parse.error, garde.requestId);
  const text = parse.data.text;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY manquante." },
      { status: 503, headers: PRIVE },
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    // SDK 0.32 ne type pas encore output_config / fallbacks : ils passent tels quels dans le corps
    const params = {
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    } as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
    const message = await anthropic.beta.messages.create(params);

    if ((message.stop_reason as string) === "refusal") {
      throw new Error("Refus du modèle");
    }
    const out =
      message.content.find(
        (c): c is Anthropic.Beta.Messages.BetaTextBlock => c.type === "text",
      )?.text ?? "";
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Réponse non structurée");
    const raw = JSON.parse(match[0]);

    const specs = Array.isArray(raw.specs)
      ? raw.specs
          .filter((r: unknown) => Array.isArray(r) && r.length >= 2)
          .map((r: unknown[]) => [str(r[0], 60), str(r[1], 200)])
          .filter((r: string[]) => r[0] && r[1])
          .slice(0, 20)
      : [];

    void journaliserAction("ebay.import_analyse", garde, { caracteres: text.length }, request);
    return NextResponse.json(
      {
        ok: true,
        listing: {
          type: TYPES.includes(raw.type) ? raw.type : "",
          cond: CONDS.includes(raw.cond) ? raw.cond : "",
          title: str(raw.title, 80),
          model: str(raw.model, 80),
          desc: str(raw.desc, 600),
          specs,
        },
      },
      { headers: PRIVE },
    );
  } catch (err) {
    // Détail de l'erreur (SDK Anthropic) au journal seulement.
    return reponseErreur(502, "L'analyse a échoué.", {
      request,
      err,
      requestId: garde.requestId,
      userId: garde.user.id,
    });
  }
}
