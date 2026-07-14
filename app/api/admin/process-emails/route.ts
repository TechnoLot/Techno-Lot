import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `Tu es un assistant pour Techno Lot, une entreprise québécoise qui achète des lots d'équipement informatique et électronique auprès d'entreprises.

Ton rôle : analyser un courriel et déterminer s'il concerne un achat de lot ou l'envoi d'un devis/facture à un client.

Retourne UNIQUEMENT un objet JSON avec cette structure exacte, sans texte autour :

{
  "is_relevant": boolean,
  "type": "achat" | "devis" | "facture" | null,
  "client_name": string | null,
  "client_email": string | null,
  "client_phone": string | null,
  "purchase_price_before_tax": number | null,
  "sale_price": number | null,
  "description": string | null,
  "status": "negotiating" | "purchased" | "sold" | null,
  "confidence": number
}

Règles :
- is_relevant = true uniquement si le courriel concerne un achat de lot, un devis envoyé, ou une facture
- type "achat" = on achète un lot à un client
- type "devis" = on envoie un devis/soumission au client pour racheter son lot
- type "facture" = on envoie ou reçoit une facture
- purchase_price_before_tax = montant AVANT taxes (TPS/TVQ) que Techno Lot paie au client
- Si le montant inclut les taxes, calcule le montant avant taxes (÷ 1.14975 au Québec)
- sale_price = prix de revente si mentionné
- status : "negotiating" si devis envoyé, "purchased" si achat confirmé/facture payée
- confidence < 0.5 = incertain
- Les courriels qui ne sont PAS liés à des achats de lots (spam, newsletters, support technique, etc.) doivent avoir is_relevant = false`;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY manquante." },
      { status: 503 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Variables Supabase manquantes." },
      { status: 503 },
    );
  }

  const imapConfig = {
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    auth: {
      user: process.env.IMAP_USER ?? "",
      pass: process.env.IMAP_PASS ?? "",
    },
    secure: true,
    tls: { rejectUnauthorized: false },
    logger: false as const,
  };

  if (!imapConfig.host || !imapConfig.auth.user || !imapConfig.auth.pass) {
    return NextResponse.json(
      { error: "Variables IMAP manquantes (IMAP_HOST, IMAP_USER, IMAP_PASS)." },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const results: Array<{
    messageId: string;
    subject: string;
    status: string;
    lotId?: string;
  }> = [];

  // Host is guaranteed non-empty by the guard above
  const client = new ImapFlow(imapConfig as ConstructorParameters<typeof ImapFlow>[0]);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const since = new Date();
      since.setDate(since.getDate() - 1);

      const messages = client.fetch(
        { since },
        {
          uid: true,
          envelope: true,
          source: true,
        },
      );

      for await (const msg of messages) {
        const messageId =
          msg.envelope?.messageId ?? `uid-${msg.uid}-${Date.now()}`;

        const { data: existing } = await supabase
          .from("email_logs")
          .select("id")
          .eq("message_id", messageId)
          .maybeSingle();

        if (existing) {
          results.push({
            messageId,
            subject: msg.envelope?.subject ?? "",
            status: "already_processed",
          });
          continue;
        }

        let parsed: ParsedMail;
        try {
          parsed = (await simpleParser(msg.source!)) as unknown as ParsedMail;
        } catch {
          await supabase.from("email_logs").insert({
            message_id: messageId,
            subject: msg.envelope?.subject ?? null,
            sender: msg.envelope?.from?.[0]?.address ?? null,
            received_at: msg.envelope?.date ?? null,
            status: "error",
            error_message: "Impossible de parser le courriel",
          });
          results.push({
            messageId,
            subject: msg.envelope?.subject ?? "",
            status: "parse_error",
          });
          continue;
        }

        const emailText = (parsed.text ?? (parsed.html || "") ?? "").slice(0, 4000);
        const emailContext = [
          `De: ${parsed.from?.text ?? "inconnu"}`,
          `À: ${parsed.to ? (Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to.text) ?? "inconnu" : "inconnu"}`,
          `Sujet: ${parsed.subject ?? "sans sujet"}`,
          `Date: ${parsed.date?.toISOString() ?? "inconnue"}`,
          "",
          emailText,
        ].join("\n");

        try {
          const aiResponse = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 800,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: emailContext }],
          });

          const text =
            aiResponse.content.find((c) => c.type === "text")?.text ?? "";
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("Réponse IA non structurée");

          const extracted = JSON.parse(match[0]);

          if (!extracted.is_relevant || extracted.confidence < 0.5) {
            await supabase.from("email_logs").insert({
              message_id: messageId,
              subject: parsed.subject ?? null,
              sender: parsed.from?.text ?? null,
              received_at: parsed.date ?? null,
              status: "skipped",
              extracted,
              raw_preview: emailText.slice(0, 500),
            });
            results.push({
              messageId,
              subject: parsed.subject ?? "",
              status: "skipped_not_relevant",
            });
            continue;
          }

          const lotData = {
            client_name: extracted.client_name ?? "Client inconnu",
            client_email: extracted.client_email ?? null,
            client_phone: extracted.client_phone ?? null,
            purchase_price: extracted.purchase_price_before_tax ?? 0,
            sale_price: extracted.sale_price ?? null,
            status: extracted.status ?? "purchased",
            purchased_at: parsed.date
              ? parsed.date.toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            description: extracted.description ?? null,
            notes: `Importé automatiquement du courriel "${parsed.subject}" le ${new Date().toISOString().split("T")[0]}`,
            source: "email" as const,
          };

          const { data: lot, error: lotError } = await supabase
            .from("lots")
            .insert(lotData)
            .select("id")
            .single();

          if (lotError) {
            await supabase.from("email_logs").insert({
              message_id: messageId,
              subject: parsed.subject ?? null,
              sender: parsed.from?.text ?? null,
              received_at: parsed.date ?? null,
              status: "error",
              error_message: lotError.message,
              extracted,
              raw_preview: emailText.slice(0, 500),
            });
            results.push({
              messageId,
              subject: parsed.subject ?? "",
              status: "db_error",
            });
            continue;
          }

          await supabase.from("email_logs").insert({
            message_id: messageId,
            subject: parsed.subject ?? null,
            sender: parsed.from?.text ?? null,
            received_at: parsed.date ?? null,
            status: "processed",
            lot_id: lot.id,
            extracted,
            raw_preview: emailText.slice(0, 500),
          });

          results.push({
            messageId,
            subject: parsed.subject ?? "",
            status: "lot_created",
            lotId: lot.id,
          });
        } catch (aiErr) {
          await supabase.from("email_logs").insert({
            message_id: messageId,
            subject: parsed.subject ?? null,
            sender: parsed.from?.text ?? null,
            received_at: parsed.date ?? null,
            status: "error",
            error_message:
              aiErr instanceof Error ? aiErr.message : "Erreur IA inconnue",
            raw_preview: emailText.slice(0, 500),
          });
          results.push({
            messageId,
            subject: parsed.subject ?? "",
            status: "ai_error",
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      {
        error: "Erreur connexion IMAP",
        details: e.message,
        stack: e.stack?.split("\n").slice(0, 5),
        host: imapConfig.host,
        port: imapConfig.port,
        user: imapConfig.auth.user,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    processed_at: new Date().toISOString(),
    total: results.length,
    created: results.filter((r) => r.status === "lot_created").length,
    skipped: results.filter((r) => r.status.startsWith("skip")).length,
    errors: results.filter((r) => r.status.includes("error")).length,
    results,
  });
}
