/**
 * Inline le CSS dans les pages HTML pré-rendues (.next/server/app).
 *
 * Pourquoi : avec le routeur « app » de Next 14, la feuille de style est
 * toujours chargée via un <link> bloquant — le premier rendu attend un
 * aller-retour réseau complet. Comme le CSS du site est petit (~45 Ko brut,
 * ~7 Ko compressé), l'injecter directement dans le HTML supprime cette
 * requête bloquante et améliore FCP et LCP.
 *
 * La balise <link> d'origine reste après le CSS inliné, mais désactivée
 * (attribut disabled) : le navigateur ne la télécharge pas et ne l'applique
 * pas. React (feuilles avec « precedence ») la retrouve à l'hydratation par
 * link[rel="stylesheet"][href=…] : il ne retélécharge plus la feuille et ne
 * la réinsère plus (avant : les 4 feuilles étaient redemandées après le JS).
 * Rendue par le serveur, elle est tenue pour chargée : aucune navigation
 * n'attend son chargement. Les feuilles d'une autre page, chargées à la
 * navigation, s'insèrent après la dernière balise data-precedence, donc
 * après tout le CSS inliné (même ordre de cascade qu'avec les <link>).
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
// Certains hébergeurs (mode standalone) servent une COPIE de
// .next/server/app faite pendant `next build` : on patche donc les deux
// emplacements s'ils existent.
const htmlDirs = [
  join(root, ".next", "server", "app"),
  join(root, ".next", "standalone", ".next", "server", "app"),
].filter((d) => existsSync(d));

// Exécuté aussi en "prestart" : si le build n'a pas encore eu lieu (ou a
// déjà été patché), on sort proprement sans faire échouer le démarrage.
if (!existsSync(cssDir) || htmlDirs.length === 0) {
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
for (const file of htmlDirs.flatMap((d) => [...walk(d)])) {
  const html = readFileSync(file, "utf8");
  let changed = false;
  const out = html.replace(linkRe, (match, href) => {
    const css = cssByHref[href];
    // Déjà traitée (2e passage, ex. "prestart") : on n'inline pas deux fois.
    if (!css || /\sdisabled[\s=/>]/.test(match)) return match;
    changed = true;
    const lienDesactive = match.replace(/\s*\/?>$/, ' disabled=""/>');
    return `<style data-href="${href}">${css}</style>${lienDesactive}`;
  });
  if (changed) {
    writeFileSync(file, out);
    patched++;
  }
}

console.log(`[inline-critical-css] ${patched} page(s) HTML avec CSS inliné.`);
