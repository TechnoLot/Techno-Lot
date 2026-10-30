import { NextResponse } from "next/server";
import { Resend } from "resend";
import { estRefus, exigerAdminRoute, type ContexteAdmin } from "@/lib/securite/garde";
import { limiter, reponse429 } from "@/lib/securite/limite";
import { lireJson } from "@/lib/securite/requete";
import { avecRef, champsEnErreur, journaliserAction, journaliserErreur } from "@/lib/admin/erreurs-admin";
import { PRIVE } from "@/lib/admin/requete-admin";
import { devisSchema } from "@/lib/admin/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Corps JSON au plus (message de 10 000 caractères, échappements compris). */
const MAX_OCTETS = 100_000;

/** Envois de devis : 20 par heure et par admin. */
const LIMITE_DEVIS = { route: "devis:admin:heure", fenetreSecondes: 3_600, max: 20 } as const;

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
  // Garde admin : origine (CSRF), session, rôle — avant toute lecture du corps.
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  const { user, requestId } = garde;

  const lu = await lireJson<unknown>(request, MAX_OCTETS);
  if (!lu.ok) return lu.reponse;
  const parse = devisSchema.safeParse(lu.donnees);
  if (!parse.success) {
    const champs = champsEnErreur(parse.error);
    return NextResponse.json(
      { error: messageDevisInvalide(parse.error.issues), champs },
      { status: 400, headers: PRIVE },
    );
  }
  const { to, message } = parse.data;
  const nomLot = parse.data.nomLot || "votre lot";

  // Au plus 20 devis par heure et par admin (courriel au nom de Techno Lot).
  const limite = await limiter(LIMITE_DEVIS.route, user.id, LIMITE_DEVIS.fenetreSecondes, LIMITE_DEVIS.max);
  if (!limite.permis) {
    return reponse429(limite.attente, "Trop de devis envoyés dans la dernière heure. Réessayez plus tard.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Service de courriel non configuré (RESEND_API_KEY manquante).",
      },
      { status: 503, headers: PRIVE },
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
    if (error) return await echecEnvoi(request, error, garde, "L'envoi a échoué.");
    // Identifiant de l'envoi seulement : jamais le destinataire ni le message.
    void journaliserAction("devis.envoye", garde, { envoi: data?.id ?? null }, request);
    return NextResponse.json({ ok: true, id: data?.id }, { headers: PRIVE });
  } catch (err) {
    return echecEnvoi(request, err, garde, "Erreur inattendue à l'envoi.");
  }
}

/** Échec de Resend : détail au journal, message générique + référence (affiché par la calculatrice). */
async function echecEnvoi(request: Request, err: unknown, ctx: ContexteAdmin, message: string) {
  const ref = await journaliserErreur(err, "devis.envoi", ctx, { request });
  return NextResponse.json(
    { error: avecRef(message, ref), ref },
    { status: 502, headers: { ...PRIVE, "X-Request-Id": ref } },
  );
}

/** Message affiché par la calculatrice pour un devis refusé à la validation. */
function messageDevisInvalide(issues: readonly { path: PropertyKey[]; code: string }[]): string {
  const champ = String(issues[0]?.path[0] ?? "");
  const tropLong = issues[0]?.code === "too_big";
  if (champ === "to") return "Courriel du client invalide.";
  if (champ === "message") return tropLong ? "Message trop long (10 000 caractères au plus)." : "Le message est vide.";
  if (champ === "nomLot") return "Nom du lot trop long (120 caractères au plus).";
  if (champ === "nomClient") return "Nom du client trop long (160 caractères au plus).";
  return "Requête invalide.";
}
