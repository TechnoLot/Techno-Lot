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
 * Bloc signature HTML d'Eric Després — pensé pour rendre correctement
 * sur iOS Mail : largeurs fixes, attributs bgcolor/width, styles inline,
 * couleurs marquées !important sur les liens (iOS Mail les repeint sinon).
 */
function signatureHtml(): string {
  const link = "color:#ffffff !important;text-decoration:none;font-size:14px;font-weight:500;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;";
  const label = "padding:2px 12px 2px 0;font-size:10px;font-weight:700;color:#3ec96b;letter-spacing:1.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;";
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;background-color:#2b2b2b;border-radius:10px;margin-top:24px;width:480px;max-width:100%;">
  <tr>
    <td bgcolor="#2b2b2b" width="170" valign="middle" align="center" style="background-color:#2b2b2b;padding:28px 20px;border-radius:10px 0 0 10px;width:170px;">
      <a href="https://technolot.ca" target="_blank" style="text-decoration:none;display:inline-block;line-height:0;">
        <img src="https://www.technolot.ca/logo.png" alt="Techno Lot" width="130" height="78" border="0" style="display:block;border:0;outline:none;text-decoration:none;width:130px;height:auto;max-width:130px;">
      </a>
    </td>
    <td bgcolor="#3ec96b" width="3" style="background-color:#3ec96b;width:3px;line-height:0;font-size:0;">&nbsp;</td>
    <td bgcolor="#2b2b2b" valign="middle" style="background-color:#2b2b2b;padding:26px 28px;border-radius:0 10px 10px 0;">
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.4px;line-height:1.15;-webkit-text-size-adjust:100%;">Eric Després</div>
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#3ec96b;letter-spacing:3px;text-transform:uppercase;margin-top:4px;margin-bottom:16px;-webkit-text-size-adjust:100%;">Président &nbsp;&middot;&nbsp; Techno&nbsp;Lot</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
        <tr>
          <td style="${label}">TEL</td>
          <td style="padding:2px 0;"><a href="tel:+15149443939" style="${link}">(514)&nbsp;944&#8209;3939</a></td>
        </tr>
        <tr>
          <td style="${label}">MAIL</td>
          <td style="padding:2px 0;"><a href="mailto:info@technolot.ca" style="${link}">info@technolot.ca</a></td>
        </tr>
        <tr>
          <td style="${label}">WEB</td>
          <td style="padding:2px 0;"><a href="https://technolot.ca" target="_blank" style="${link}">technolot.ca</a></td>
        </tr>
        <tr>
          <td valign="top" style="${label}padding-top:4px;">ADR</td>
          <td valign="top" style="padding:2px 0;">
            <a href="https://maps.app.goo.gl/stDBgbHi1GQzjWdV6" target="_blank" style="color:#cccccc !important;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.4;text-decoration:none;-webkit-text-size-adjust:100%;">
              3235&nbsp;Av.&nbsp;de&nbsp;la&nbsp;Gare<br>
              Mascouche,&nbsp;QC&nbsp;&nbsp;J7K&nbsp;3C1,&nbsp;Canada
            </a>
          </td>
        </tr>
      </table>
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid #444444;">
        <a href="https://technolot.ca/soumission" target="_blank" style="display:inline-block;background-color:#3ec96b;color:#0f2a1a !important;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;padding:11px 20px;border-radius:4px;text-decoration:none;text-transform:uppercase;mso-padding-alt:0;-webkit-text-size-adjust:100%;">
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

  // Document HTML complet — nécessaire pour qu'iOS Mail respecte les
  // largeurs, ne redimensionne pas le texte et n'auto-linkifie pas.
  const html = `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="color-scheme" content="only light">
  <meta name="supported-color-schemes" content="only light">
  <title>Offre TechnoLot</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0;mso-table-rspace:0;border-collapse:collapse;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    body{margin:0;padding:0;width:100%!important;background-color:#f4f5f7;}
    a{color:#3ec96b;text-decoration:none;}
    @media only screen and (max-width:520px){
      .devis-container{width:100%!important;padding:16px!important;}
      .devis-signature{width:100%!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f4f5f7" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="devis-container" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:12px;padding:32px;">
          <tr>
            <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111111;font-size:15px;line-height:1.6;-webkit-text-size-adjust:100%;">
              <div style="white-space:pre-wrap;">${messageHtml}</div>
              ${signatureHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
    const bccAddress = process.env.CONTACT_EMAIL ?? "info@technolot.ca";
    const { data, error } = await resend.emails.send({
      from: `Techno Lot <${fromAddress}>`,
      to: [to],
      bcc: bccAddress !== to ? [bccAddress] : undefined,
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
