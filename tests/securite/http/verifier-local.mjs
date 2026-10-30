#!/usr/bin/env node
/**
 * Check 27 — essais HTTP « casse-le » contre un serveur Next démarré.
 *
 * Usage :
 *   npx next start -p 3265            (dans un autre terminal, après npm run build)
 *   node tests/securite/http/verifier-local.mjs http://localhost:3265
 *   node tests/securite/http/verifier-local.mjs https://www.technolot.ca   (lecture seule, automatique)
 *
 * N'envoie QUE des requêtes en lecture (GET/HEAD/OPTIONS) ou REFUSÉES avant
 * tout effet : sans session, mauvaise origine, faux Bearer, mauvais type de
 * contenu, corps invalide ou trop gros. Jamais de formulaire valide, de
 * connexion réelle, ni de route qui écrit ou envoie un courriel. Hors de
 * localhost / 127.0.0.1, seules les requêtes GET/HEAD/OPTIONS partent
 * (mode lecture seule).
 *
 * Pour les essais POST en local, le serveur doit avoir SITE_URL = l'URL de
 * base passée ici (sinon les POST admin répondent 503 « configuration » ou
 * 403 « origine », ce qui est aussi un refus, mais pas celui qu'on veut voir).
 * Conseil : lancer le serveur SANS SECURITE_RPC_SECRET, pour que les refus ne
 * remplissent pas le journal durable (base de production) ni n'envoient
 * d'alerte ; les limites de débit sont alors ouvertes : elles sont prouvées
 * par tests/securite/f8-limites.test.ts et le test SQL f8-limite-debit.sql.
 *
 * Aucune valeur de secret n'est lue ni affichée. Code de sortie : 0 si tout
 * passe, 1 sinon, 2 en cas d'erreur d'usage.
 */
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const brut = process.argv[2];
if (!brut) {
  console.error("Usage : node tests/securite/http/verifier-local.mjs <url de base>");
  process.exit(2);
}
const BASE = new URL(brut).origin;
const HOTE = new URL(BASE).hostname;
const LOCAL = HOTE === "localhost" || HOTE === "127.0.0.1" || HOTE === "[::1]";
const LECTURE_SEULE = !LOCAL || process.argv.includes("--lecture-seule");
// Référence du projet Supabase (nom du témoin sb-<ref>-auth-token) : SUPABASE_REF,
// sinon tirée de NEXT_PUBLIC_SUPABASE_URL ; sans elle, l'essai du témoin forgé est sauté.
const REF_SUPABASE =
  process.env.SUPABASE_REF ||
  (/^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(process.env.NEXT_PUBLIC_SUPABASE_URL || "") || [])[1] ||
  "";
const UUID = "11111111-2222-4333-8444-555555555555";
const EVIL = "https://evil.example";
const UA = "verifier-local/1.0 (check 27, proprietaire)";

const resultats = [];
let echecs = 0;

function noter(check, nom, ok, detail = "") {
  resultats.push({ check, nom, ok, detail });
  if (!ok) echecs++;
  const etiquette = ok ? "OK   " : "ÉCHEC";
  console.log(`${etiquette} [${check}] ${nom}${detail ? ` — ${detail}` : ""}`);
}

async function req(chemin, init = {}) {
  const methode = (init.method || "GET").toUpperCase();
  if (LECTURE_SEULE && !["GET", "HEAD", "OPTIONS"].includes(methode)) return null;
  const headers = { "user-agent": UA, ...(init.headers || {}) };
  const r = await fetch(BASE + chemin, { ...init, headers, redirect: "manual" });
  const texte = methode === "HEAD" ? "" : await r.text();
  return { status: r.status, h: r.headers, texte };
}

/** Essai POST : ignoré (et signalé) en lecture seule. */
async function post(check, nom, chemin, init, verif) {
  if (LECTURE_SEULE) {
    console.log(`—     [${check}] ${nom} — ignoré (lecture seule)`);
    return;
  }
  const r = await req(chemin, { method: "POST", ...init });
  const [ok, detail] = verif(r);
  noter(check, nom, ok, detail ?? `HTTP ${r.status}`);
}

const FUITE = /\bat [\w.<>]+ \(|node_modules|\.next[\\/]server|[A-Z]:\\\\|\/home\/|webpack-internal|PGRST|"stack"|syntax error at|relation "/;

function fichiers(dossier, filtre) {
  const sortie = [];
  const parcourir = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (filtre(e)) sortie.push(relative(RACINE, p).split(sep).join("/"));
    }
  };
  parcourir(join(RACINE, dossier));
  return sortie.sort();
}

function urlDe(fichier, suffixe) {
  return (
    "/" +
    fichier
      .replace(/^app\//, "")
      .replace(suffixe, "")
      .split("/")
      .filter((s) => s && !/^\(.*\)$/.test(s))
      .map((s) => (/^\[.+\]$/.test(s) ? (s === "[id]" ? UUID : "p1") : s))
      .join("/")
  ).replace(/\/$/, "") || "/";
}

const PAGES_ADMIN = fichiers("app/admin/(dashboard)", (f) => f === "page.tsx").map((f) => urlDe(f, /\/?page\.tsx$/));
const ROUTES_ADMIN = [
  ...fichiers("app/api/admin", (f) => f === "route.ts"),
  ...fichiers("app/admin/(dashboard)", (f) => f === "route.ts"),
].map((f) => urlDe(f, /\/route\.ts$/));
const ROUTES_CRON = ["/api/cron/sync", "/api/admin/auto-relances", "/api/admin/ads-sync", "/api/admin/ebay-sync"];

const estConnexion = (r) =>
  r && (r.status === 307 || r.status === 302 || r.status === 303) && /\/admin\/login/.test(r.h.get("location") || "");

async function main() {
  console.log(`Cible : ${BASE}${LECTURE_SEULE ? " (lecture seule)" : ""}`);
  console.log(`Pages admin : ${PAGES_ADMIN.length} · routes admin : ${ROUTES_ADMIN.length}\n`);

  // 04 — HTTPS (seulement pour un domaine réel)
  if (!LOCAL) {
    try {
      const http = await fetch(`http://${HOTE}/`, { redirect: "manual", headers: { "user-agent": UA } });
      const loc = http.headers.get("location") || "";
      noter("04", "HTTP → HTTPS", [301, 302, 307, 308].includes(http.status) && loc.startsWith("https://"), `HTTP ${http.status} → ${loc}`);
    } catch (e) {
      noter("04", "HTTP → HTTPS", false, String(e));
    }
  }

  // 14 — en-têtes de sécurité sur les pages publiques
  for (const chemin of ["/", "/en", "/soumission", "/blog", "/politique-de-confidentialite"]) {
    const r = await req(chemin);
    const h = r.h;
    const csp = h.get("content-security-policy") || "";
    const manque = [];
    if (r.status !== 200) manque.push(`statut ${r.status}`);
    if (!/default-src/.test(csp)) manque.push("CSP imposée");
    if (!/frame-ancestors/.test(csp)) manque.push("frame-ancestors");
    if (h.get("content-security-policy-report-only")) manque.push("CSP en Report-Only");
    if (!/max-age=\d{7,}/.test(h.get("strict-transport-security") || "")) manque.push("HSTS");
    if (h.get("x-content-type-options") !== "nosniff") manque.push("nosniff");
    if (!h.get("x-frame-options")) manque.push("X-Frame-Options");
    if (!h.get("referrer-policy")) manque.push("Referrer-Policy");
    if (!h.get("permissions-policy")) manque.push("Permissions-Policy");
    if (h.get("cross-origin-opener-policy") !== "same-origin") manque.push("COOP");
    if (h.get("x-powered-by")) manque.push("X-Powered-By présent");
    noter("14", `en-têtes ${chemin}`, manque.length === 0, manque.join(", "));
  }

  // 14/07 — CSP à nonce sur /admin/login, différente à chaque requête, no-store
  {
    const a = await req("/admin/login");
    const b = await req("/admin/login");
    const n = (r) => /'nonce-([^']+)'/.exec(r.h.get("content-security-policy") || "")?.[1];
    const scripts = [...a.texte.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    const sansNonce = scripts.filter((s) => !/\bnonce=/.test(s));
    const ok =
      a.status === 200 &&
      !!n(a) &&
      n(a) !== n(b) &&
      /strict-dynamic/.test(a.h.get("content-security-policy") || "") &&
      /no-store/.test(a.h.get("cache-control") || "") &&
      sansNonce.length === 0;
    noter("14", "CSP à nonce sur /admin/login", ok, `scripts=${scripts.length}, sans nonce=${sansNonce.length}, nonces différents=${n(a) !== n(b)}`);
  }

  // 01/09 — chaque page admin sans session → connexion
  {
    const fautes = [];
    for (const p of PAGES_ADMIN) {
      const r = await req(p);
      if (!estConnexion(r)) fautes.push(`${p}=${r.status}`);
    }
    noter("01", `${PAGES_ADMIN.length} pages admin sans session → /admin/login`, fautes.length === 0, fautes.join(" "));
  }

  // 01 — contournements connus du middleware (CVE-2025-29927, RSC)
  {
    const fautes = [];
    for (const h of [
      { "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" },
      { "x-middleware-subrequest": "src/middleware:src/middleware:src/middleware:src/middleware:src/middleware" },
      { RSC: "1" },
      { "next-router-prefetch": "1", RSC: "1" },
      { "x-forwarded-host": "evil.example" },
    ]) {
      const r = await req("/admin", { headers: h });
      if (!estConnexion(r)) fautes.push(`${Object.keys(h).join("+")}=${r.status}`);
    }
    noter("01", "en-têtes de contournement du middleware → toujours /admin/login", fautes.length === 0, fautes.join(" "));
  }

  // 15 — témoin de session forgé → refusé (getUser revalide auprès de Supabase)
  if (!REF_SUPABASE) {
    console.log("—     [15] témoin de session forgé — sauté (SUPABASE_REF ou NEXT_PUBLIC_SUPABASE_URL absente)");
  } else {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const faux = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: UUID, role: "authenticated", aal: "aal2", email: "info@technolot.ca", exp })}.ZmF1eA`;
    const session = { access_token: faux, refresh_token: "faux", token_type: "bearer", expires_at: exp, user: { id: UUID, email: "info@technolot.ca" } };
    const valeur = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
    const r = await req("/admin", { headers: { cookie: `sb-${REF_SUPABASE}-auth-token=${valeur}` } });
    noter("15", "témoin de session forgé (aal2, courriel admin) → /admin/login", estConnexion(r), `HTTP ${r.status} → ${r.h.get("location")}`);
    const posees = (r.h.get("set-cookie") || "").split(/,(?=\s*\w+=)/).filter((c) => /sb-.*auth-token=[^;]+/.test(c));
    const malFormes = posees.filter((c) => !/HttpOnly/i.test(c) || !/SameSite=Lax/i.test(c) || (!LOCAL && !/Secure/i.test(c)));
    noter("15", "témoins de session renvoyés : HttpOnly + SameSite=Lax (+ Secure en ligne)", malFormes.length === 0, `${posees.length} témoin(s) posé(s)`);
  }

  // 01 — chaque route admin sans session → 401 (ou connexion pour /admin/*)
  {
    const fautes = [];
    for (const p of ROUTES_ADMIN) {
      const r = await req(p);
      const ok = r.status === 401 || r.status === 405 || (p.startsWith("/admin/") && estConnexion(r));
      if (!ok || FUITE.test(r.texte)) fautes.push(`GET ${p}=${r.status}`);
    }
    noter("01", `${ROUTES_ADMIN.length} routes admin en GET sans session → 401/405`, fautes.length === 0, fautes.join(" "));
  }

  // 01/16 — POST admin : origine du site sans session → 401 ; origine étrangère ou absente → 403
  if (!LECTURE_SEULE) {
    const fautes = [];
    for (const p of ROUTES_ADMIN.filter((x) => x.startsWith("/api/admin/") && !ROUTES_CRON.includes(x))) {
      const corps = "{}";
      const site = await req(p, { method: "POST", body: corps, headers: { origin: BASE, "content-type": "application/json" } });
      const evil = await req(p, { method: "POST", body: corps, headers: { origin: EVIL, "content-type": "application/json" } });
      const aucune = await req(p, { method: "POST", body: corps, headers: { "content-type": "application/json" } });
      if (![401, 405].includes(site.status)) fautes.push(`${p} site=${site.status}`);
      if (![403, 405].includes(evil.status)) fautes.push(`${p} evil=${evil.status}`);
      if (![403, 405].includes(aucune.status)) fautes.push(`${p} sans-origine=${aucune.status}`);
    }
    noter("16", "POST admin : site sans session → 401, origine étrangère/absente → 403", fautes.length === 0, fautes.join(" "));
  }

  // 16 — déconnexion : GET → 405 ; POST d'une autre origine → 403
  {
    const g = await req("/admin/auth/signout");
    noter("16", "GET /admin/auth/signout → 405 (pas de déconnexion par lien)", g.status === 405, `HTTP ${g.status}`);
  }
  await post("16", "POST /admin/auth/signout d'une origine étrangère → 403", "/admin/auth/signout", { headers: { origin: EVIL } }, (r) => [r.status === 403]);

  // 25 — tâches planifiées : ancien / faux secret → 401
  for (const p of ROUTES_CRON) {
    await post("25", `POST ${p} avec un ancien Bearer → 401`, p, {
      headers: { authorization: `Bearer ${"ancien-secret-".repeat(4)}`, origin: BASE, "content-type": "application/json" },
      body: "{}",
    }, (r) => [r.status === 401 && !FUITE.test(r.texte)]);
  }
  {
    const r = await req("/api/cron/sync");
    noter("25", "GET /api/cron/sync → 405", r.status === 405, `HTTP ${r.status}`);
  }

  // 13 — CORS : aucune origine étrangère autorisée
  {
    const fautes = [];
    for (const p of ["/", "/api/soumission", "/api/track", "/api/admin/notifications", "/admin/auth/password"]) {
      for (const methode of ["OPTIONS", "GET"]) {
        const r = await req(p, { method: methode, headers: { origin: EVIL, "access-control-request-method": "POST" } });
        const acao = r.h.get("access-control-allow-origin");
        if (acao) fautes.push(`${methode} ${p}: ${acao}`);
      }
    }
    noter("13", "aucun Access-Control-Allow-Origin pour une origine étrangère", fautes.length === 0, fautes.join(" "));
  }

  // 06 — entrées refusées avant tout effet
  {
    const r = await req("/api/soumission");
    noter("06", "GET /api/soumission → 405", r.status === 405, `HTTP ${r.status}`);
  }
  await post("06", "formulaire en text/plain → 415", "/api/soumission", { headers: { "content-type": "text/plain" }, body: "nom=x" }, (r) => [r.status === 415]);
  await post("06/18", "formulaire de 17 Mo → 413 avant lecture", "/api/soumission", {
    headers: { "content-type": "multipart/form-data; boundary=x" },
    body: Buffer.alloc(17 * 1024 * 1024, 120),
  }, (r) => [r.status === 413]);
  {
    // Champ inconnu « role=admin » SEUL (aucun champ valide) : 400, rien n'est écrit ni envoyé.
    const fd = new FormData();
    fd.append("role", "admin");
    await post("06", "formulaire avec role=admin (champ inconnu) → 400", "/api/soumission", { body: fd }, (r) => [r.status === 400 && !FUITE.test(r.texte)]);
  }
  await post("06", "suivi en text/plain → 415", "/api/track", { headers: { "content-type": "text/plain" }, body: "{}" }, (r) => [r.status === 415]);
  await post("06", "connexion en text/plain → 415", "/admin/auth/password", { headers: { "content-type": "text/plain" }, body: "x" }, (r) => [r.status === 415]);
  await post("06", "connexion de 10 Ko → 413", "/admin/auth/password", { headers: { "content-type": "application/json" }, body: "x".repeat(10_000) }, (r) => [r.status === 413]);
  await post("06/20", "connexion JSON invalide → 400 générique", "/admin/auth/password", { headers: { "content-type": "application/json" }, body: "{pas du json" }, (r) => [r.status === 400 && !FUITE.test(r.texte)]);
  {
    const r = await req("/admin/auth/request");
    noter("17", "GET /admin/auth/request → 405 (aucun lien envoyé par GET)", r.status === 405, `HTTP ${r.status}`);
  }

  // 17 — liens de connexion faux ou usés → code d'erreur fixe, aucune session
  for (const q of [
    "token_hash=faux-jeton-de-test&type=magiclink",
    "code=faux-code-de-test",
    "error=access_denied&error_code=otp_expired&error_description=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    "token_hash=x&type=admin",
  ]) {
    const r = await req(`/admin/auth/callback?${q}&next=//evil.example`);
    const loc = new URL(r.h.get("location") || "/", BASE);
    const ok =
      [302, 303, 307].includes(r.status) &&
      loc.pathname === "/admin/login" &&
      /^(lien_invalide|lien_expire)$/.test(loc.searchParams.get("error") || "") &&
      !/sb-.*auth-token=[^;]+/.test(r.h.get("set-cookie") || "") &&
      !/evil|script/.test(loc.href);
    noter("17", `callback ${q.slice(0, 40)}… → erreur fixe, sans session`, ok, `${r.status} → ${loc.pathname}${loc.search}`);
  }

  // 07 — XSS : charges renvoyées en texte, jamais en balise
  for (const p of [
    "/admin/login?error=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    "/admin/login?next=javascript:alert(1)",
    "/blog/%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    "/soumission?nom=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
  ]) {
    const r = await req(p);
    const ok = !/<script>alert\(1\)|<img src=x onerror|href="javascript:alert/i.test(r.texte) && r.status < 500;
    noter("07", `aucune charge reflétée : ${p.slice(0, 50)}`, ok, `HTTP ${r.status}`);
  }

  // 10 — injection : réponses normales (404/400/401/3xx), jamais 500 ni message SQL
  for (const p of [
    "/blog?post=%27%20OR%201%3D1--",
    "/blog/%27%20OR%20%271%27%3D%271",
    `/api/admin/soumissions/${encodeURIComponent("' OR 1=1--")}/courriel`,
    "/admin/lots/1%20OR%201=1",
    "/blog/..%2f..%2f..%2fetc%2fpasswd",
    "/en/blog/%22%3E%3Csvg%20onload%3Dalert(1)%3E",
  ]) {
    const r = await req(p);
    noter("10", `injection ${p.slice(0, 50)}`, r.status < 500 && !FUITE.test(r.texte), `HTTP ${r.status}`);
  }

  // 20 — erreurs sans pile ni chemin
  {
    const r = await req("/page-qui-n-existe-pas-" + Date.now());
    noter("20", "page inconnue → 404 sans pile ni chemin", r.status === 404 && !FUITE.test(r.texte), `HTTP ${r.status}`);
    const i = await req("/_next/image?url=https://evil.example/x.png&w=64&q=75");
    noter("20", "/_next/image refuse une URL externe (400), sans détail", i.status === 400 && !FUITE.test(i.texte), `HTTP ${i.status}`);
  }

  // 23 — fichiers sensibles : jamais servis
  {
    const fautes = [];
    for (const p of [
      "/.env", "/.env.local", "/.env.production", "/.git/config", "/.git/HEAD", "/package.json", "/package-lock.json",
      "/next.config.mjs", "/middleware.ts", "/tsconfig.json", "/supabase/config.toml", "/CLAUDE.md", "/.next/BUILD_ID",
      "/securite/SECURITY_REVIEW.md", "/securite/SECRETS.md", "/assets/outils/calculatrice.html", "/scripts/sauvegarde-base.ps1",
      "/supabase/migrations/20261030020000_securite_rpc.sql", "/.github/workflows/securite.yml", "/server.js",
    ]) {
      const r = await req(p);
      const pageDuSite = /\/_next\/static\//.test(r.texte);
      const expose = r.status === 200 && !pageDuSite;
      if (expose || /SUPABASE|BEGIN|ADMIN_EMAILS|\[core\]|"dependencies"/.test(pageDuSite ? "" : r.texte)) fautes.push(`${p}=${r.status}`);
    }
    noter("23", "20 chemins sensibles → jamais servis", fautes.length === 0, fautes.join(" "));
  }
  {
    // Cartes de source du navigateur : absentes.
    const accueil = await req("/");
    const js = [...accueil.texte.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]).slice(0, 8);
    const cartes = [];
    for (const f of js) {
      const r = await req(f + ".map");
      if (r.status === 200 && /"mappings"/.test(r.texte)) cartes.push(f);
      const s = await req(f);
      if (/sourceMappingURL=/.test(s.texte)) cartes.push(`${f} (commentaire)`);
    }
    noter("23", `cartes de source absentes (${js.length} fichiers JS testés)`, cartes.length === 0, cartes.join(" "));
  }

  console.log(`\n${resultats.length} essai(s), ${resultats.length - echecs} réussi(s), ${echecs} échec(s).`);
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erreur :", e?.message || e);
  process.exit(2);
});
