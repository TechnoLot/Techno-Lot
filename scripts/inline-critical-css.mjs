/**
 * Inline le CSS dans les pages HTML pré-rendues (.next/server/app).
 *
 * Pourquoi : avec le routeur « app » de Next 14, la feuille de style est
 * toujours chargée via un <link> bloquant — le premier rendu attend un
 * aller-retour réseau complet. Comme le CSS du site est petit (~45 Ko brut,
 * ~7 Ko compressé), l'injecter directement dans le HTML supprime cette
 * requête bloquante et améliore FCP et LCP.
 *
 * À l'hydratation, React ré-insère le <link> (ressource « float ») de façon
 * non bloquante ; les règles étant identiques, aucun changement visuel.
 *
 * Exécuté automatiquement après chaque build via le script npm "postbuild".
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cssDir = join(root, ".next", "static", "css");
const htmlDir = join(root, ".next", "server", "app");

// Exécuté aussi en "prestart" : si le build n'a pas encore eu lieu (ou a
// déjà été patché), on sort proprement sans faire échouer le démarrage.
if (!existsSync(cssDir) || !existsSync(htmlDir)) {
  console.log("[inline-critical-css] build absent — rien à faire.");
  process.exit(0);
}

// Charge chaque fichier CSS généré, indexé par son nom public.
const cssByHref = {};
for (const f of readdirSync(cssDir)) {
  if (f.endsWith(".css")) {
    cssByHref[`/_next/static/css/${f}`] = readFileSync(join(cssDir, f), "utf8");
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".html")) yield p;
  }
}

const linkRe =
  /<link rel="stylesheet" href="(\/_next\/static\/css\/[^"]+\.css)"[^>]*\/?>/g;

let patched = 0;
for (const file of walk(htmlDir)) {
  const html = readFileSync(file, "utf8");
  let changed = false;
  const out = html.replace(linkRe, (match, href) => {
    const css = cssByHref[href];
    if (!css) return match;
    changed = true;
    return `<style data-href="${href}">${css}</style>`;
  });
  if (changed) {
    writeFileSync(file, out);
    patched++;
  }
}

console.log(`[inline-critical-css] ${patched} page(s) HTML avec CSS inliné.`);
