#!/usr/bin/env node
/**
 * Check 27 — 11/02 : le build de production ne contient aucun secret.
 *
 * Usage (après `npm run build`) :
 *   node tests/securite/http/verifier-build.mjs            (lit .env.local s'il existe)
 *
 * 1. Valeurs : chaque variable de .env.local et de l'environnement du
 *    processus dont le nom N'EST PAS NEXT_PUBLIC_* (et dont la valeur fait au
 *    moins 12 caractères) est cherchée dans .next/static (envoyé au
 *    navigateur) ET dans .next/server (le serveur lit process.env à
 *    l'exécution : une valeur figée à la compilation serait une erreur).
 * 2. Motifs : clés Anthropic, Supabase secrètes, JWT service_role, clés
 *    privées, jetons GitHub/Google/Resend dans .next/static.
 *
 * Seuls le NOM de la variable (ou du motif) et le fichier sont affichés,
 * jamais une valeur. Code de sortie : 0 si rien trouvé, 1 sinon, 2 sans build.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NEXT = join(RACINE, ".next");
if (!existsSync(join(NEXT, "static"))) {
  console.error("Aucun build (.next/static absent) : lancer npm run build d'abord.");
  process.exit(2);
}

// --- Valeurs à ne jamais trouver ------------------------------------------------
const valeurs = new Map(); // nom -> valeur (jamais affichée)
// Variables serveur qui ne sont pas des secrets (adresses, URL, identifiants publics).
const NON_SECRETES = new Set([
  "ADMIN_EMAILS", "ADMIN_USERNAMES", "CONTACT_EMAIL", "FROM_EMAIL", "SITE_URL", "WEBMAIL_URL",
  "EBAY_MARKETPLACE_ID", "EBAY_DELETION_ENDPOINT", "HOSTINGER_MAIL_ADRESSE", "HOSTINGER_MAIL_MAILBOX_ID",
  "META_AD_ACCOUNT_ID", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
]);
function ajouter(nom, valeur) {
  if (!nom || nom.startsWith("NEXT_PUBLIC_") || NON_SECRETES.has(nom)) return;
  const v = (valeur ?? "").trim().replace(/^["']|["']$/g, "");
  if (v.length < 12) return;
  if (/^(https?:\/\/|true|false|production|development)/i.test(v) && !/[?&](key|token|secret)=/i.test(v)) return;
  valeurs.set(nom, v);
}
const fichierEnv = join(RACINE, ".env.local");
if (existsSync(fichierEnv)) {
  for (const ligne of readFileSync(fichierEnv, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(ligne);
    if (m) ajouter(m[1], m[2]);
  }
}
for (const [nom, v] of Object.entries(process.env)) {
  if (/SECRET|TOKEN|KEY|PASSWORD|PRIVATE/.test(nom)) ajouter(nom, v);
}

const MOTIFS = [
  ["cle Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["cle Supabase secrete", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["cle privee", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["jeton GitHub", /gh[pousr]_[A-Za-z0-9]{36}/],
  ["cle Google", /AIza[0-9A-Za-z_-]{35}/],
  ["cle Resend", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/],
];

function estServiceRole(texte) {
  for (const m of texte.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const charge = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"));
      if (charge.role === "service_role") return true;
    } catch {
      // pas un JWT
    }
  }
  return false;
}

function lister(dossier) {
  const sortie = [];
  const parcourir = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const s = statSync(p);
      if (s.isDirectory()) parcourir(p);
      else if (s.size < 20 * 1024 * 1024 && /\.(js|mjs|cjs|json|html|rsc|txt|css|map|body|meta)$/.test(e)) sortie.push(p);
    }
  };
  if (existsSync(dossier)) parcourir(dossier);
  return sortie;
}

const trouves = [];
let nbFichiers = 0;
for (const [zone, motifs] of [
  ["static", true],
  ["server", false],
]) {
  for (const f of lister(join(NEXT, zone))) {
    nbFichiers++;
    const texte = readFileSync(f, "utf8");
    const nomFichier = relative(RACINE, f).split(sep).join("/");
    for (const [nom, v] of valeurs) if (texte.includes(v)) trouves.push(`${nomFichier} : valeur de ${nom}`);
    if (motifs) {
      for (const [nom, re] of MOTIFS) if (re.test(texte)) trouves.push(`${nomFichier} : motif ${nom}`);
      if (estServiceRole(texte)) trouves.push(`${nomFichier} : JWT service_role`);
    }
  }
}

console.log(`${nbFichiers} fichiers du build analysés ; ${valeurs.size} valeur(s) secrète(s) cherchée(s) (noms seulement).`);
if (trouves.length) {
  for (const t of trouves) console.log(`ÉCHEC ${t}`);
  process.exit(1);
}
console.log("OK aucun secret dans .next/static ni .next/server.");
