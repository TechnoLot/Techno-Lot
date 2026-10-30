/**
 * Aperçu « Voir le courriel » (components/admin/soumissions/VoirCourriel.tsx) :
 * règles pures, sans "use client", testées dans tests/securite/f4-*.test.ts.
 *
 * Le HTML d'un courriel reçu s'affiche dans une iframe `sandbox=""` (ni
 * script, ni formulaire, origine opaque). En plus, son `srcDoc` commence par
 * une balise <meta> Content-Security-Policy qui bloque par défaut toute
 * ressource distante : un pixel de suivi ne peut pas apprendre que le courriel
 * a été lu ni l'adresse IP de l'admin (décision du 30 oct. 2026). Le bouton
 * « Afficher les images » permet les images https (jamais http, jamais de
 * script), pour cette ouverture seulement.
 */

/** Politique par défaut : images intégrées (data:, cid:) et styles en ligne seulement. */
export const CSP_APERCU_BLOQUE =
  "default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:";

/** Après « Afficher les images » : images https en plus (ni http ni script). */
export const CSP_APERCU_IMAGES =
  "default-src 'none'; img-src data: cid: https:; style-src 'unsafe-inline'; font-src data:";

/** Balise <meta> placée tout au début du document (le parseur la range dans <head>). */
export function metaCsp(politique: string): string {
  return `<meta http-equiv="Content-Security-Policy" content="${politique}">`;
}

/** `srcDoc` de l'iframe : politique en tête, puis le HTML du courriel tel quel. */
export function srcDocApercu(html: string, imagesPermises: boolean): string {
  return metaCsp(imagesPermises ? CSP_APERCU_IMAGES : CSP_APERCU_BLOQUE) + html;
}

/** Entités qu'un parseur HTML décode dans un attribut (« &#104;ttps:// »). */
function decoderEntites(valeur: string): string {
  return valeur
    .replace(/&#x([0-9a-f]{1,6});?/gi, (_m, h: string) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#(\d{1,7});?/g, (_m, d: string) => String.fromCodePoint(Math.min(parseInt(d, 10), 0x10ffff)))
    .replace(/&colon;/gi, ":")
    .replace(/&sol;/gi, "/")
    .replace(/&amp;/gi, "&");
}

/** URL absolue d'un autre site : http(s)://… ou //… (relative au protocole). */
const URL_DISTANTE = /^(?:https?:)?\/\//i;

function estDistante(url: string): boolean {
  return URL_DISTANTE.test(decoderEntites(url).trim());
}

/**
 * Attributs qui chargent une image : src, srcset, background (ancien
 * attribut des tableaux de courriel), poster. Précédés d'un espace, d'une
 * barre ou d'un guillemet (pour ne pas confondre avec `data-src`).
 */
const ATTRIBUT_IMAGE =
  /(?:^|[\s"'/])(src|srcset|background|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;

/** url(…) ou image-set("…") en CSS (attributs style et balises <style>). */
const URL_CSS = /(?:url\(\s*|image-set\(\s*)(["']?)\s*((?:https?:)?\/\/)/i;

/**
 * Vrai si le HTML demande au moins une image distante (http, https ou
 * `//hôte`). Ne sert qu'à afficher la barre « Images distantes bloquées » :
 * le blocage lui-même vient de la CSP, donc un oubli ici laisse l'image
 * bloquée (sans la barre), jamais chargée.
 */
export function contientImagesDistantes(html: string | null | undefined): boolean {
  if (!html) return false;

  for (const m of html.matchAll(ATTRIBUT_IMAGE)) {
    const nom = m[1].toLowerCase();
    const valeur = m[2] ?? m[3] ?? m[4] ?? "";
    if (nom === "srcset") {
      // « a.png 1x, https://x/b.png 2x » : chaque candidat est une URL suivie d'un descripteur.
      const candidats = decoderEntites(valeur).split(",");
      if (candidats.some((c) => estDistante(c.trim().split(/\s+/)[0] ?? ""))) return true;
    } else if (estDistante(valeur)) {
      return true;
    }
  }

  return URL_CSS.test(html) || URL_CSS.test(decoderEntites(html));
}
