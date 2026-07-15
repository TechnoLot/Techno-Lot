import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Bloc signature HTML d'Eric Després — logo hébergé sur technolot.ca
 * pour rester lisible dans les clients mail qui bloquent les data URIs.
 */
function signatureHtml(): string {
  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;font-size:13px;line-height:1.5;border-collapse:collapse;background-color:#2b2b2b;border-radius:10px;margin-top:24px;">
  <tr>
    <td bgcolor="#2b2b2b" width="180" style="background-color:#2b2b2b;padding:28px 24px;vertical-align:middle;text-align:center;border-radius:10px 0 0 10px;">
      <a href="https://technolot.ca" target="_blank" style="text-decoration:none;display:inline-block;">
        <img src="https://www.technolot.ca/logo.png" alt="Techno Lot" width="130" style="display:block;border:0;max-width:130px;height:auto;">
      </a>
    </td>
    <td width="3" bgcolor="#3ec96b" style="background-color:#3ec96b;width:3px;">&nbsp;</td>
    <td bgcolor="#2b2b2b" style="background-color:#2b2b2b;padding:26px 30px;vertical-align:middle;border-radius:0 10px 10px 0;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.4px;margin-bottom:2px;line-height:1.15;">Eric Després</div>
      <div style="font-size:11px;font-weight:700;color:#3ec96b;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;">Président &nbsp;&middot;&nbsp; Techno&nbsp;Lot</div>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:2px 10px 2px 0;font-size:10px;font-weight:700;color:#3ec96b;letter-spacing:1.5px;">TEL</td>
          <td style="padding:2px 0;"><a href="tel:+15149443939" style="color:#ffffff;text-decoration:none;font-size:13px;font-weight:500;">(514)&nbsp;944&#8209;3939</a></td>
        </tr>
        <tr>
          <td style="padding:2px 10px 2px 0;font-size:10px;font-weight:700;color:#3ec96b;letter-spacing:1.5px;">MAIL</td>
          <td style="padding:2px 0;"><a href="mailto:info@technolot.ca" style="color:#ffffff;text-decoration:none;font-size:13px;font-weight:500;">info@technolot.ca</a></td>
        </tr>
        <tr>
          <td style="padding:2px 10px 2px 0;font-size:10px;font-weight:700;color:#3ec96b;letter-spacing:1.5px;">WEB</td>
          <td style="padding:2px 0;"><a href="https://technolot.ca" target="_blank" style="color:#ffffff;text-decoration:none;font-size:13px;font-weight:500;">technolot.ca</a></td>
        </tr>
        <tr>
          <td style="padding:2px 10px 2px 0;vertical-align:top;font-size:10px;font-weight:700;color:#3ec96b;letter-spacing:1.5px;padding-top:4px;">ADR</td>
          <td style="padding:2px 0;vertical-align:top;">
            <a href="https://maps.app.goo.gl/stDBgbHi1GQzjWdV6" target="_blank" style="color:#cccccc;font-size:12px;line-height:1.4;text-decoration:none;">
              3235&nbsp;Av.&nbsp;de&nbsp;la&nbsp;Gare<br>
              Mascouche,&nbsp;QC&nbsp;&nbsp;J7K&nbsp;3C1,&nbsp;Canada
            </a>
          </td>
        </tr>
      </table>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #444444;">
        <a href="https://technolot.ca/soumission" target="_blank" style="display:inline-block;background-color:#3ec96b;color:#0f2a1a;font-size:11px;font-weight:700;letter-spacing:1.5px;padding:11px 20px;border-radius:4px;text-decoration:none;text-transform:uppercase;">
          Demander une soumission &nbsp;&rarr;
        </a>
      </div>
    </td>
  </tr>
</table>
  `.trim();
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: {
    to?: string;
    nomClient?: string;
    nomLot?: string;
    offre?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const to = String(body.to ?? "").trim();
  const message = String(body.message ?? "").trim();
  const nomLot = String(body.nomLot ?? "").trim() || "votre lot";

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json(
      { error: "Courriel du client invalide." },
      { status: 400 },
    );
  }
  if (!message) {
    return NextResponse.json(
      { error: "Le message est vide." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Service de courriel non configuré (RESEND_API_KEY manquante).",
      },
      { status: 503 },
    );
  }

  const fromAddress = process.env.FROM_EMAIL ?? "info@technolot.ca";
  const messageHtml = escapeHtml(message).replace(/\n/g, "<br/>");

  const html = `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111;font-size:14px;line-height:1.6;max-width:640px;">
  <div style="white-space:pre-wrap;">${messageHtml}</div>
  ${signatureHtml()}
</div>
  `.trim();

  const text = `${message}

—
Eric Després
Président · Techno Lot

TEL   (514) 944-3939
MAIL  info@technolot.ca
WEB   technolot.ca
ADR   3235 Av. de la Gare
      Mascouche, QC  J7K 3C1

Demander une soumission : https://technolot.ca/soumission
`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `Techno Lot <${fromAddress}>`,
      to: [to],
      replyTo: user.email ? [user.email] : undefined,
      subject: `Offre TechnoLot — ${nomLot}`,
      html,
      text,
    });
    if (error) {
      console.error("[devis] Erreur Resend :", error);
      return NextResponse.json(
        { error: "L'envoi a échoué : " + (error.message ?? "erreur inconnue") },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("[devis] Erreur d'envoi :", err);
    return NextResponse.json(
      { error: "Erreur inattendue à l'envoi." },
      { status: 502 },
    );
  }
}
