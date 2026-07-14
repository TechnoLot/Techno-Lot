import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.32";
import { ImapFlow } from "npm:imapflow@1";
import { simpleParser } from "npm:mailparser@3";
import { encodeBase64 } from "jsr:@std/encoding/base64";

const SYSTEM_PROMPT = `Tu es un assistant pour Techno Lot, une entreprise québécoise qui revend des lots d'équipement informatique et électronique à des acheteurs.

Ton rôle : analyser une facture de VENTE (envoyée par Techno Lot à un acheteur) et extraire les informations.

Retourne UNIQUEMENT un objet JSON avec cette structure exacte, sans texte autour :

{
  "is_relevant": boolean,
  "buyer_name": string | null,
  "buyer_email": string | null,
  "sale_price_before_tax": number | null,
  "description": string | null,
  "confidence": number
}

Règles :
- Ce courriel provient du dossier "Vente a INFO" donc considère-le pertinent par défaut (is_relevant = true)
- Si un PDF de facture est joint, EXTRAIS les infos du PDF en priorité
- buyer_name = le nom de l'ACHETEUR (celui à qui Techno Lot vend), PAS Techno Lot elle-même
- sale_price_before_tax = montant AVANT taxes (TPS/TVQ) que l'acheteur paie à Techno Lot
- IMPORTANT : prends TOUJOURS le montant sans taxes qui est indiqué sur la facture (sous-total, avant TPS/TVQ)
- description : bref résumé du lot vendu (ex: "Lot de disques durs", "25 ordinateurs portables")
- confidence : 0.9+ si toutes les infos sont claires`;

const MAX_EMAILS_PER_FOLDER = 20;
const DAYS_BACK = 2;
const MAX_PDF_SIZE_MB = 4;
const FOLDER = "INBOX.Vente a INFO";

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

  if (!anthropicKey || !supabaseUrl || !supabaseServiceKey || !imapHost || !imapUser || !imapPass) {
    return new Response(
      JSON.stringify({ error: "Variables manquantes." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const results: Array<{
    messageId: string;
    subject: string;
    status: string;
    saleId?: string;
    hasPdf?: boolean;
  }> = [];

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    auth: { user: imapUser, pass: imapPass },
    secure: true,
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  try {
    await client.connect();

    let lock;
    try {
      lock = await client.getMailboxLock(FOLDER);
    } catch (folderErr) {
      await client.logout();
      return new Response(
        JSON.stringify({
          error: "Dossier introuvable",
          folder: FOLDER,
          details: folderErr instanceof Error ? folderErr.message : "unknown",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    try {
      const since = new Date();
      since.setDate(since.getDate() - DAYS_BACK);

      const uids = await client.search({ since }, { uid: true });
      const recentUids = (uids || []).slice(-MAX_EMAILS_PER_FOLDER);

      if (recentUids.length > 0) {
        const messages = client.fetch(
          recentUids,
          { uid: true, envelope: true, source: true },
          { uid: true },
        );

        for await (const msg of messages) {
          const messageId =
            msg.envelope?.messageId ?? `uid-${msg.uid}-${FOLDER}-${Date.now()}`;

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

          const emailText = (parsed.text ?? parsed.html ?? "").slice(0, 3000);
          const toField = parsed.to
            ? Array.isArray(parsed.to)
              ? parsed.to[0]?.text ?? "inconnu"
              : parsed.to.text ?? "inconnu"
            : "inconnu";

          const pdfAttachments = (parsed.attachments || []).filter(
            (a: { contentType?: string; content?: Uint8Array; size?: number }) =>
              a.contentType === "application/pdf" &&
              a.content &&
              (a.size ?? 0) < MAX_PDF_SIZE_MB * 1024 * 1024,
          );

          const emailContext = [
            `De: ${parsed.from?.text ?? "inconnu"}`,
            `À: ${toField}`,
            `Sujet: ${parsed.subject ?? "sans sujet"}`,
            `Date: ${parsed.date?.toISOString() ?? "inconnue"}`,
            `Pièces jointes PDF: ${pdfAttachments.length}`,
            "",
            emailText,
          ].join("\n");

          const content: Array<Record<string, unknown>> = [];

          for (const pdf of pdfAttachments.slice(0, 2)) {
            const base64 = encodeBase64(pdf.content as Uint8Array);
            content.push({
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            });
          }

          content.push({ type: "text", text: emailContext });

          try {
            const aiResponse = await anthropic.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 600,
              system: SYSTEM_PROMPT,
              messages: [{ role: "user", content }],
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
                hasPdf: pdfAttachments.length > 0,
              });
              continue;
            }

            const soldAt = parsed.date
              ? parsed.date.toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0];

            const { data: sale, error: saleError } = await supabase
              .from("sales")
              .insert({
                buyer_name: extracted.buyer_name ?? "Acheteur inconnu",
                buyer_email: extracted.buyer_email ?? null,
                sale_price: extracted.sale_price_before_tax ?? 0,
                sold_at: soldAt,
                description: extracted.description ?? null,
                notes: `Importé automatiquement du courriel "${parsed.subject}" (${pdfAttachments.length} PDF joint) le ${new Date().toISOString().split("T")[0]}`,
                source: "email",
              })
              .select("id")
              .single();

            if (saleError) {
              await supabase.from("email_logs").insert({
                message_id: messageId,
                subject: parsed.subject ?? null,
                sender: parsed.from?.text ?? null,
                received_at: parsed.date ?? null,
                status: "error",
                error_message: saleError.message,
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
              extracted,
              raw_preview: emailText.slice(0, 500),
            });

            results.push({
              messageId,
              subject: parsed.subject ?? "",
              status: "sale_created",
              saleId: sale.id,
              hasPdf: pdfAttachments.length > 0,
            });
          } catch (aiErr) {
            await supabase.from("email_logs").insert({
              message_id: messageId,
              subject: parsed.subject ?? null,
              sender: parsed.from?.text ?? null,
              received_at: parsed.date ?? null,
              status: "error",
              error_message: aiErr instanceof Error ? aiErr.message : "Erreur IA",
              raw_preview: emailText.slice(0, 500),
            });
            results.push({
              messageId,
              subject: parsed.subject ?? "",
              status: "ai_error",
              hasPdf: pdfAttachments.length > 0,
            });
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    const e = err as Error & {
      response?: string;
      serverResponseCode?: string;
      authenticationFailed?: boolean;
    };
    return new Response(
      JSON.stringify({
        error: "Erreur connexion IMAP",
        details: e.message,
        response: e.response,
        serverResponseCode: e.serverResponseCode,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed_at: new Date().toISOString(),
      folder: FOLDER,
      total: results.length,
      created: results.filter((r) => r.status === "sale_created").length,
      skipped: results.filter((r) => r.status.startsWith("skip")).length,
      errors: results.filter((r) => r.status.includes("error")).length,
      results,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
