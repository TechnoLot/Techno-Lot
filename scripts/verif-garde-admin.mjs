#!/usr/bin/env node
/**
 * Refus par défaut des points d'entrée admin (check 09).
 *
 * Échoue (code 1, liste des fichiers) si un point d'entrée privilégié n'appelle
 * pas la garde commune de lib/securite/garde.ts :
 *  - chaque `page.tsx`, `layout.tsx` et `route.ts` sous `app/admin/(dashboard)`,
 *    `app/api/admin`, `app/api/cron` et `app/admin/auth/mfa` ;
 *  - chaque fichier `"use server"` (actions serveur) de app/, lib/, components/.
 * Marqueurs acceptés : `exigerAdminPage(`, `exigerAdminRoute(`, `adminPourAction(`,
 * `bearerCronValide(` — un APPEL hors commentaire, pas un simple import ; sous
 * `app/admin/auth/mfa/` seulement, aussi `exigerSessionMfaPage(` et
 * `exigerSessionMfaRoute(` (garde de session aal1, voir MARQUEURS_MFA).
 * Routes et actions : CHAQUE fonction exportée (GET, POST… ou action) doit
 * appeler la garde ; pages et layouts : le fichier.
 *
 * À lancer avant chaque commit, avec `npx tsc --noEmit` :
 *   node scripts/verif-garde-admin.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = fileURLToPath(new URL("..", import.meta.url));

/**
 * Liste blanche EXPLICITE (chemins relatifs, séparateur « / ») : fichiers qui
 * n'ont volontairement aucune garde, chacun avec sa raison en commentaire.
 * Aucun aujourd'hui.
 */
const LISTE_BLANCHE = new Set([
  // (vide)
]);

const DOSSIERS_ROUTES = ["app/admin/(dashboard)", "app/api/admin", "app/api/cron", "app/admin/auth/mfa"];
const DOSSIERS_ACTIONS = ["app", "lib", "components"];
const MARQUEURS = ["exigerAdminPage", "exigerAdminRoute", "adminPourAction", "bearerCronValide"];

/**
 * Garde de la double authentification (lib/securite/garde.ts) : session aal1
 * d'un courriel de ADMIN_EMAILS, de moins de 24 h — SANS exiger aal2 ni
 * est_admin(), puisque c'est là que l'admin entre son code. Acceptée
 * SEULEMENT sous ce dossier (page et routes POST de /admin/auth/mfa) : partout
 * ailleurs elle ne compte pas comme une garde admin.
 */
const DOSSIER_MFA = "app/admin/auth/mfa/";
const MARQUEURS_MFA = ["exigerSessionMfaPage", "exigerSessionMfaRoute"];

/** Marqueurs acceptés pour un fichier donné (chemin relatif, séparateur « / »). */
export function marqueursPour(chemin) {
  return chemin.startsWith(DOSSIER_MFA) ? [...MARQUEURS, ...MARQUEURS_MFA] : MARQUEURS;
}
const IGNORES = new Set(["node_modules", ".next", ".git"]);

function fichiers(dossier) {
  const absolu = join(RACINE, dossier);
  let entrees;
  try {
    entrees = readdirSync(absolu);
  } catch {
    return [];
  }
  const out = [];
  for (const nom of entrees) {
    if (IGNORES.has(nom)) continue;
    const chemin = join(absolu, nom);
    if (statSync(chemin).isDirectory()) out.push(...fichiers(relative(RACINE, chemin)));
    else out.push(relative(RACINE, chemin).split(sep).join("/"));
  }
  return out;
}

/** Retire les commentaires (bloc et ligne) ; les chaînes restent (approximation suffisante). */
export function sansCommentaires(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Vrai si le texte contient un APPEL à l'un des marqueurs. */
export function appelleGarde(texte, marqueurs = MARQUEURS) {
  return marqueurs.some((m) => new RegExp(`\\b${m}\\s*\\(`).test(texte));
}

/** Directive « use server » (fichier ou fonction). */
export function estFichierActions(source) {
  return /^\s*["']use server["'];?\s*$/m.test(sansCommentaires(source));
}

/**
 * Découpe en fonctions exportées : `export async function X` / `export function X`
 * / `export const X = ` ; chaque segment va jusqu'au prochain export.
 * Renvoie [{ nom, corps }].
 */
export function fonctionsExportees(source) {
  const texte = sansCommentaires(source);
  const re = /export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*([A-Za-z0-9_$]*)|const\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=)/g;
  const debuts = [];
  let m;
  while ((m = re.exec(texte))) debuts.push({ index: m.index, nom: m[1] || m[2] || "default" });
  return debuts.map((d, i) => ({
    nom: d.nom,
    corps: texte.slice(d.index, i + 1 < debuts.length ? debuts[i + 1].index : texte.length),
  }));
}

const METHODES = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
/** Exports de configuration d'une route (pas des points d'entrée). */
const CONFIG_ROUTE = new Set(["runtime", "dynamic", "maxDuration", "revalidate", "fetchCache", "preferredRegion"]);

/** Problèmes d'un fichier (liste vide = conforme). */
export function verifierFichier(chemin, source) {
  const nom = chemin.split("/").pop();
  const problemes = [];
  const marqueurs = marqueursPour(chemin);
  if (nom === "page.tsx" || nom === "layout.tsx") {
    if (!appelleGarde(sansCommentaires(source), marqueurs)) problemes.push("aucun appel à la garde");
    return problemes;
  }
  if (nom === "route.ts") {
    const exportes = fonctionsExportees(source).filter((f) => !CONFIG_ROUTE.has(f.nom));
    for (const f of exportes) {
      if (!METHODES.has(f.nom)) continue;
      // `export const GET = handler` : la garde doit être dans le fichier.
      const corps = /^export\s+const/.test(f.corps) ? sansCommentaires(source) : f.corps;
      if (!appelleGarde(corps, marqueurs)) problemes.push(`${f.nom} sans garde`);
    }
    if (!exportes.some((f) => METHODES.has(f.nom))) problemes.push("aucune méthode HTTP exportée trouvée");
    return problemes;
  }
  if (estFichierActions(source)) {
    for (const f of fonctionsExportees(source)) {
      if (!appelleGarde(f.corps, marqueurs)) problemes.push(`action ${f.nom} sans adminPourAction()`);
    }
  }
  return problemes;
}

/** Liste des fichiers à vérifier : routes/pages des dossiers admin + fichiers « use server ». */
export function fichiersAVerifier() {
  const cibles = new Set();
  for (const d of DOSSIERS_ROUTES) {
    for (const f of fichiers(d)) {
      if (/\/(page\.tsx|layout\.tsx|route\.ts)$/.test(f)) cibles.add(f);
    }
  }
  for (const d of DOSSIERS_ACTIONS) {
    for (const f of fichiers(d)) {
      if (!/\.(ts|tsx|js|mjs)$/.test(f)) continue;
      const source = readFileSync(join(RACINE, f), "utf8");
      if (/["']use server["']/.test(source)) cibles.add(f);
    }
  }
  return [...cibles].sort();
}

function principal() {
  const cibles = fichiersAVerifier();
  const echecs = [];
  for (const f of cibles) {
    if (LISTE_BLANCHE.has(f)) continue;
    const problemes = verifierFichier(f, readFileSync(join(RACINE, f), "utf8"));
    if (problemes.length) echecs.push(`  ${f} : ${problemes.join(", ")}`);
  }
  if (echecs.length) {
    console.error(`Garde admin manquante (${echecs.length} fichier(s)) :\n${echecs.join("\n")}`);
    console.error("Ajoute exigerAdminPage / exigerAdminRoute / adminPourAction / bearerCronValide (lib/securite/garde.ts).");
    process.exit(1);
  }
  console.log(`Garde admin : ${cibles.length} fichier(s) vérifié(s), tous gardés.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
