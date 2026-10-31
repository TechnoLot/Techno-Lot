import { setTimeout as attendre } from "node:timers/promises";
import { avecRef, journaliserErreur } from "@/lib/admin/erreurs-admin";
import { isMailApiConfigured } from "@/lib/hostinger/config";
import { ErreurHostinger, preparerEnvoyeur, type CourrielSortant } from "@/lib/hostinger/mail";

// Moteur des variables : module pur (aussi utilisé par le navigateur pour
// l'envoi en gros), ré-exporté ici pour les appelants existants.
export { renderTemplate } from "@/lib/crm/envoi-en-gros";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Bloc signature HTML d'Anthony Després — même rendu que l'envoi de devis
 * (calculatrice) : largeurs fixes, styles inline, compatible iOS Mail.
 */
function signatureHtml(): string {
  const link = "color:#ffffff !important;text-decoration:none;font-size:12px;font-weight:500;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;";
  const label = "padding:1px 10px 1px 0;font-size:9px;font-weight:700;color:#3ec96b;letter-spacing:1.3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;";
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="380" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;background-color:#2b2b2b;border-radius:8px;margin-top:20px;width:380px;max-width:100%;">
  <tr>
    <td bgcolor="#2b2b2b" width="130" valign="middle" align="center" style="background-color:#2b2b2b;padding:20px 14px;border-radius:8px 0 0 8px;width:130px;">
      <a href="https://technolot.ca" target="_blank" style="text-decoration:none;display:inline-block;line-height:0;">
        <img src="https://www.technolot.ca/logo.png" alt="Techno Lot" width="100" height="60" border="0" style="display:block;border:0;outline:none;text-decoration:none;width:100px;height:auto;max-width:100px;">
      </a>
    </td>
    <td bgcolor="#3ec96b" width="2" style="background-color:#3ec96b;width:2px;line-height:0;font-size:0;">&nbsp;</td>
    <td bgcolor="#2b2b2b" valign="middle" style="background-color:#2b2b2b;padding:20px 22px;border-radius:0 8px 8px 0;">
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;line-height:1.15;-webkit-text-size-adjust:100%;">Anthony Després</div>
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:#3ec96b;letter-spacing:2.5px;text-transform:uppercase;margin-top:3px;margin-bottom:12px;-webkit-text-size-adjust:100%;">Président &nbsp;&middot;&nbsp; Techno&nbsp;Lot</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
        <tr>
          <td style="${label}">TEL</td>
          <td style="padding:1px 0;"><a href="tel:+15144047496" style="${link}">(514)&nbsp;404&#8209;7496</a></td>
        </tr>
        <tr>
          <td style="${label}">MAIL</td>
          <td style="padding:1px 0;"><a href="mailto:info@technolot.ca" style="${link}">info@technolot.ca</a></td>
        </tr>
        <tr>
          <td style="${label}">WEB</td>
          <td style="padding:1px 0;"><a href="https://technolot.ca" target="_blank" style="${link}">technolot.ca</a></td>
        </tr>
        <tr>
          <td valign="top" style="${label}padding-top:3px;">ADR</td>
          <td valign="top" style="padding:1px 0;">
            <a href="https://maps.app.goo.gl/stDBgbHi1GQzjWdV6" target="_blank" style="color:#cccccc !important;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;line-height:1.4;text-decoration:none;-webkit-text-size-adjust:100%;">
              3235&nbsp;Av.&nbsp;de&nbsp;la&nbsp;Gare<br>
              Mascouche,&nbsp;QC&nbsp;&nbsp;J7K&nbsp;3C1,&nbsp;Canada
            </a>
          </td>
        </tr>
      </table>
      <div style="margin-top:14px;padding-top:11px;border-top:1px solid #444444;">
        <a href="https://technolot.ca/soumission" target="_blank" style="display:inline-block;background-color:#3ec96b;color:#0f2a1a !important;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:1.3px;padding:9px 16px;border-radius:4px;text-decoration:none;text-transform:uppercase;mso-padding-alt:0;-webkit-text-size-adjust:100%;">
          Demander une soumission &nbsp;&rarr;
        </a>
      </div>
    </td>
  </tr>
</table>
  `.trim();
}

/** Le modèle contient déjà sa propre mention de désabonnement. */
function mentionneDesabonnement(body: string): boolean {
  return /d[ée]sabonn|unsubscribe/i.test(body);
}

/**
 * Mention de désabonnement exigée par la LCAP dans tout courriel commercial :
 * répondre « désabonner » (ou écrire via le lien) suffit. L'équipe marque
 * alors le contact « Désabonné » dans sa fiche, ce qui bloque tout envoi.
 */
function desabonnementHtml(adresse: string): string {
  const mailto = `mailto:${adresse}?subject=${encodeURIComponent("Désabonner")}`;
  return `<p style="margin:20px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#8a8f98;-webkit-text-size-adjust:100%;">
  Vous préférez ne plus recevoir nos courriels&nbsp;? Répondez simplement «&nbsp;désabonner&nbsp;» ou <a href="${mailto}" style="color:#8a8f98 !important;text-decoration:underline;">écrivez-nous ici</a>, et nous retirerons votre adresse.<br>
  Prefer not to hear from us? Just reply “unsubscribe”.
</p>`;
}

/**
 * Enveloppe HTML complète (fond clair, iOS Mail friendly) autour du message.
 * `desabonnement` = adresse des demandes de désabonnement (null : le modèle
 * a déjà sa propre mention).
 */
function wrapHtml(message: string, subject: string, desabonnement: string | null): string {
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
              ${desabonnement ? desabonnementHtml(desabonnement) : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Version texte brut avec signature (et mention de désabonnement, comme en HTML). */
function wrapText(message: string, desabonnement: string | null): string {
  const mention = desabonnement
    ? `\nPour ne plus recevoir nos courriels, répondez « désabonner » (ou écrivez à ${desabonnement}).\nTo stop receiving our emails, reply "unsubscribe".\n`
    : "";
  return `${message}

—
Anthony Després
Président · Techno Lot

TEL   (514) 404-7496
MAIL  info@technolot.ca
WEB   technolot.ca
ADR   3235 Av. de la Gare
      Mascouche, QC  J7K 3C1

Demander une soumission : https://technolot.ca/soumission
${mention}`;
}

/** Boîte des demandes de désabonnement (LCAP) : la boîte générale, qui reçoit aussi les réponses. */
function boiteDesabonnement(): string {
  return process.env.CONTACT_EMAIL ?? "info@technolot.ca";
}

/**
 * Version texte d'un message, telle qu'envoyée (signature et mention de
 * désabonnement comprises) : aperçu de l'envoi en gros.
 */
export function apercuTexteProspect(body: string): string {
  return wrapText(body, mentionneDesabonnement(body) ? null : boiteDesabonnement());
}

// --- Envoi depuis la boîte info@ (Mail API de Hostinger) --------------------------------

/*
 * Tous les courriels du CRM (fiche d'un contact, relances automatiques, envoi
 * en gros et son test) partent de la boîte info@ par la Mail API de
 * Hostinger, qui en range une copie dans « Envoyés » : aucune copie cachée,
 * rien dans la boîte de réception. L'API n'accepte ni reply-to ni en-tête
 * personnalisé : les réponses, « désabonner » compris, reviennent à info@, et
 * la mention dans le texte suffit à la LCAP (pas de List-Unsubscribe).
 * Vérifier les désabonnements avant d'envoyer (lib/crm/desabonnement.ts).
 */

export type CourrielGroupe = { to: string; subject: string; body: string };

/** Pourquoi un envoi s'est arrêté. */
export type MotifArret = "debit" | "configuration" | "incertain" | "erreur";

export type BilanEnvoiGroupe = {
  /**
   * Courriels partis, dans l'ordre ; `index` = position dans `courriels`. Un
   * arrêt « incertain » y compte aussi son dernier courriel (peut-être parti).
   */
  envoyes: { index: number; to: string }[];
  /** Arrêt avant la fin : les courriels suivants ne sont jamais tentés. */
  arret: { motif: MotifArret; message: string; ref?: string } | null;
};

/** Pause entre deux envois : rythme modéré pour la boîte info@ et la limite de débit de l'API. */
export const PAUSE_ENTRE_ENVOIS_MS = 1_000;

/** Messages de l'envoi en gros (une liste). */
const MESSAGES_ARRET: Record<MotifArret, string> = {
  debit:
    "Hostinger limite le nombre d'envois : l'envoi s'est arrêté. Réessaie dans quelques minutes ; les adresses déjà servies seront exclues.",
  configuration:
    "Envoi par la boîte info@ impossible : clé de la Mail API de Hostinger absente ou refusée (HOSTINGER_MAIL_API_TOKEN). Aucun courriel n'est parti.",
  incertain:
    "Hostinger n'a pas confirmé un envoi (délai dépassé ou panne de son côté) : l'envoi s'est arrêté par prudence. Ce courriel est peut-être parti (regarde dans Envoyés) ; il est compté comme envoyé pour ne jamais partir deux fois.",
  erreur:
    "L'envoi par Hostinger a échoué : l'envoi s'est arrêté. Réessaie dans quelques minutes ; les adresses déjà servies seront exclues.",
};

/** Messages d'un envoi unitaire (fiche d'un contact, test de l'envoi en gros). */
const MESSAGES_ENVOI: Record<MotifArret, string> = {
  debit: "Hostinger limite le nombre d'envois pour l'instant : réessaie dans quelques minutes.",
  configuration:
    "Envoi par la boîte info@ impossible : clé de la Mail API de Hostinger absente ou refusée (HOSTINGER_MAIL_API_TOKEN).",
  incertain:
    "Hostinger n'a pas confirmé l'envoi (délai dépassé ou panne de son côté). Regarde dans Envoyés avant de réessayer : le courriel est peut-être parti.",
  erreur: "L'envoi par Hostinger a échoué. Réessaie dans quelques minutes.",
};

/**
 * Motif d'une erreur de la Mail API. Sans réponse ou avec une erreur 5xx, le
 * courriel est PEUT-ÊTRE parti (« incertain »), sauf `avantEnvoi` : l'erreur
 * est survenue avant toute requête d'envoi (boîte introuvable…), rien n'est
 * parti. Une erreur qui ne vient pas de Hostinger n'a rien envoyé.
 */
export function motifErreurHostinger(erreur: unknown, avantEnvoi = false): MotifArret {
  if (!(erreur instanceof ErreurHostinger)) return "erreur";
  const statut = erreur.status;
  if (statut === 429) return "debit";
  if (statut === 401 || statut === 403 || statut === 404) return "configuration";
  if (!avantEnvoi && (statut === null || statut >= 500)) return "incertain";
  return "erreur";
}

/** Courriel de prospection parti de la boîte info@ : nom « Techno Lot », signature, mention de désabonnement. */
function courrielHostinger(c: CourrielGroupe): CourrielSortant {
  const desabonnement = mentionneDesabonnement(c.body) ? null : boiteDesabonnement();
  return {
    to: [c.to],
    displayName: "Techno Lot",
    subject: c.subject,
    html: wrapHtml(c.body, c.subject, desabonnement),
    text: wrapText(c.body, desabonnement),
  };
}

type Envois = {
  envoyes: { index: number; to: string }[];
  echec: { motif: MotifArret; ref?: string } | null;
};

/**
 * Envoie les courriels UN à la fois depuis la boîte info@, avec une pause
 * entre deux : chacun a son propre destinataire (aucun ne voit les autres).
 * Le premier échec arrête tout, les suivants ne sont jamais tentés : limite
 * de débit (aucun nouvel essai : des dépassements répétés peuvent faire
 * bloquer l'adresse IP du site), clé refusée, courriel refusé, ou pas de
 * réponse (« incertain » : compté comme envoyé). Détail de Hostinger au
 * journal seulement (`operation`).
 */
async function envoyerDepuisInfo(
  courriels: readonly CourrielGroupe[],
  operation: string,
  requestId?: string,
): Promise<Envois> {
  const resultat: Envois = { envoyes: [], echec: null };
  if (courriels.length === 0) return resultat;
  if (!isMailApiConfigured()) {
    resultat.echec = { motif: "configuration" };
    return resultat;
  }

  const echouer = async (erreur: unknown, motif: MotifArret): Promise<Envois> => {
    // Détail de Hostinger au journal seulement (check 20).
    resultat.echec = { motif, ref: await journaliserErreur(erreur, operation, { requestId }) };
    return resultat;
  };

  let envoyer: (courriel: CourrielSortant) => Promise<void>;
  try {
    envoyer = await preparerEnvoyeur();
  } catch (err) {
    return echouer(err, motifErreurHostinger(err, true));
  }

  for (const [index, courriel] of courriels.entries()) {
    if (index > 0) await attendre(PAUSE_ENTRE_ENVOIS_MS);
    try {
      await envoyer(courrielHostinger(courriel));
    } catch (err) {
      const motif = motifErreurHostinger(err);
      if (motif === "incertain") resultat.envoyes.push({ index, to: courriel.to });
      return echouer(err, motif);
    }
    resultat.envoyes.push({ index, to: courriel.to });
  }
  return resultat;
}

/**
 * Envoie UN courriel de prospection (modèle rendu) depuis la boîte info@,
 * avec la signature Techno Lot et la mention de désabonnement (LCAP) :
 * fiche d'un contact, relances automatiques, test de l'envoi en gros.
 * « incertain » : Hostinger n'a pas confirmé, le courriel est peut-être parti
 * (à l'appelant de décider s'il le note comme envoyé).
 */
export async function sendProspectEmail(opts: {
  to: string;
  subject: string;
  body: string;
  /** Référence de la requête (journal) ; une nouvelle sinon. */
  requestId?: string;
}): Promise<{ ok: true } | { ok: false; motif: MotifArret; error: string }> {
  const { echec } = await envoyerDepuisInfo(
    [{ to: opts.to, subject: opts.subject, body: opts.body }],
    "crm.envoi.hostinger",
    opts.requestId,
  );
  if (!echec) return { ok: true };
  const message = MESSAGES_ENVOI[echec.motif];
  return { ok: false, motif: echec.motif, error: echec.ref ? avecRef(message, echec.ref) : message };
}

/**
 * Envoi en gros : envoie les courriels de la liste un à la fois depuis la
 * boîte info@ et s'arrête au premier échec (voir envoyerDepuisInfo).
 */
export async function sendProspectBatch(opts: {
  courriels: readonly CourrielGroupe[];
  /** Référence de la requête (journal) ; une nouvelle sinon. */
  requestId?: string;
}): Promise<BilanEnvoiGroupe> {
  const { envoyes, echec } = await envoyerDepuisInfo(opts.courriels, "crm.envoi_gros.hostinger", opts.requestId);
  if (!echec) return { envoyes, arret: null };
  const message = MESSAGES_ARRET[echec.motif];
  return {
    envoyes,
    arret: echec.ref
      ? { motif: echec.motif, message: avecRef(message, echec.ref), ref: echec.ref }
      : { motif: echec.motif, message },
  };
}
