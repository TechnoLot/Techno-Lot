import { Resend } from "resend";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Remplace les variables {{prenom}}, {{nom}}, {{compagnie}}, {{titre}}
 * d'un modèle par les valeurs du contact. Insensible aux espaces
 * ({{ prenom }}) et aux accents manquants.
 */
export function renderTemplate(
  text: string,
  vars: { prenom: string; nom: string; compagnie: string; titre: string },
): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    switch (key.toLowerCase()) {
      case "prenom":
      case "prénom":
        return vars.prenom;
      case "nom":
        return vars.nom;
      case "compagnie":
      case "entreprise":
        return vars.compagnie;
      case "titre":
        return vars.titre;
      default:
        return match;
    }
  });
}

/**
 * Bloc signature HTML d'Eric Després — même rendu que l'envoi de devis
 * (calculatrice) : largeurs fixes, styles inline, compatible iOS Mail.
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

/** Enveloppe HTML complète (fond clair, iOS Mail friendly) autour du message. */
function wrapHtml(message: string, subject: string): string {
  const messageHtml = escapeHtml(message).replace(/\n/g, "<br/>");
  return `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="color-scheme" content="only light">
  <meta name="supported-color-schemes" content="only light">
  <title>${escapeHtml(subject)}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0;mso-table-rspace:0;border-collapse:collapse;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    body{margin:0;padding:0;width:100%!important;background-color:#f4f5f7;}
    a{color:#3ec96b;text-decoration:none;}
    @media only screen and (max-width:520px){
      .devis-container{width:100%!important;padding:16px!important;}
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
}

/** Version texte brut avec signature. */
function wrapText(message: string): string {
  return `${message}

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
}

/**
 * Envoie un courriel de prospection (modèle rendu) via Resend, avec la
 * signature Techno Lot ajoutée automatiquement. `replyTo` = courriel de
 * l'admin connecté pour que les réponses lui reviennent directement.
 */
export async function sendProspectEmail(opts: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string | null;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Service de courriel non configuré (RESEND_API_KEY manquante).",
    };
  }

  const fromAddress = process.env.FROM_EMAIL ?? "info@technolot.ca";
  const bccAddress = process.env.CONTACT_EMAIL ?? "info@technolot.ca";

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `Techno Lot <${fromAddress}>`,
      to: [opts.to],
      bcc: bccAddress !== opts.to ? [bccAddress] : undefined,
      replyTo: opts.replyTo ? [opts.replyTo] : undefined,
      subject: opts.subject,
      html: wrapHtml(opts.body, opts.subject),
      text: wrapText(opts.body),
    });
    if (error) {
      console.error("[crm] Erreur Resend :", error);
      return { ok: false, error: error.message ?? "erreur inconnue" };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[crm] Erreur d'envoi :", err);
    return { ok: false, error: "Erreur inattendue à l'envoi." };
  }
}
