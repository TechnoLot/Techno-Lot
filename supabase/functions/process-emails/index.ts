import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.32";
import { ImapFlow } from "npm:imapflow@1";
import { simpleParser } from "npm:mailparser@3";

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

Deno.serve(async (req) => {
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Non autorisé." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const imapHost = Deno.env.get("IMAP_HOST");
  const imapUser = Deno.env.get("IMAP_USER");
  const imapPass = Deno.env.get("IMAP_PASS");
  const imapPort = Number(Deno.env.get("IMAP_PORT") || 993);

  if (!anthropicKey || !supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Variables Supabase/Anthropic manquantes." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!imapHost || !imapUser || !imapPass) {
    return new Response(
      JSON.stringify({ error: "Variables IMAP manquantes." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
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

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    auth: { user: imapUser, pass: imapPass },
    secure: true,
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  const foldersToScan = [
    "INBOX.Facture achat lot",
  ];

  try {
    await client.connect();

    for (const folder of foldersToScan) {
      let lock;
      try {
        lock = await client.getMailboxLock(folder);
      } catch (folderErr) {
        results.push({
          messageId: `folder-${folder}`,
          subject: folder,
          status: `folder_error: ${folderErr instanceof Error ? folderErr.message : "unknown"}`,
        });
        continue;
      }

    try {
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const messages = client.fetch(
        { since },
        { uid: true, envelope: true, source: true },
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

        let parsed;
        try {
          parsed = await simpleParser(msg.source);
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

        const emailText = (parsed.text ?? parsed.html ?? "").slice(0, 4000);
        const toField = parsed.to
          ? Array.isArray(parsed.to)
            ? parsed.to[0]?.text ?? "inconnu"
            : parsed.to.text ?? "inconnu"
          : "inconnu";
        const emailContext = [
          `De: ${parsed.from?.text ?? "inconnu"}`,
          `À: ${toField}`,
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
            aiResponse.content.find((c: { type: string }) => c.type === "text")
              ?.text ?? "";
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

          const purchasedAt = parsed.date
            ? parsed.date.toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];

          const { data: lot, error: lotError } = await supabase
            .from("lots")
            .insert({
              client_name: extracted.client_name ?? "Client inconnu",
              client_email: extracted.client_email ?? null,
              client_phone: extracted.client_phone ?? null,
              purchase_price: extracted.purchase_price_before_tax ?? 0,
              sale_price: extracted.sale_price ?? null,
              status: extracted.status ?? "purchased",
              purchased_at: purchasedAt,
              description: extracted.description ?? null,
              notes: `Importé automatiquement du courriel "${parsed.subject}" le ${new Date().toISOString().split("T")[0]}`,
              source: "email",
            })
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
              aiErr instanceof Error ? aiErr.message : "Erreur IA",
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
    }

    await client.logout();
  } catch (err) {
    const e = err as Error & {
      response?: string;
      responseStatus?: string;
      serverResponseCode?: string;
      authenticationFailed?: boolean;
    };
    return new Response(
      JSON.stringify({
        error: "Erreur connexion IMAP",
        details: e.message,
        response: e.response,
        serverResponseCode: e.serverResponseCode,
        authenticationFailed: e.authenticationFailed,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed_at: new Date().toISOString(),
      total: results.length,
      created: results.filter((r) => r.status === "lot_created").length,
      skipped: results.filter((r) => r.status.startsWith("skip")).length,
      errors: results.filter((r) => r.status.includes("error")).length,
      results,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
