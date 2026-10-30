#!/usr/bin/env node
/**
 * Check 27 — 03, 12, 17, 25 contre Supabase (clé publishable seulement),
 * SANS RIEN ÉCRIRE :
 *
 *  03 : la clé publique seule ne lit rien : GET /rest/v1/<table> pour chaque
 *       table sensible → 0 ligne ou refus ; schéma `securite` non exposé ;
 *       fonctions admin refusées.
 *  17 : inscription fermée (`/auth/v1/settings` : disable_signup, pas
 *       d'autoconfirmation) — lecture seule, aucune inscription tentée.
 *  12/25 : le secret SECURITE_RPC_SECRET configuré est celui dont l'empreinte
 *       est en base, un autre est refusé. `limite_debit` vérifie le secret
 *       AVANT les paramètres ; on l'appelle avec p_max = 0 (hors bornes) :
 *       bon secret → 22023 (aucune ligne écrite) ; mauvais → 42501.
 *
 * Variables lues dans l'environnement du processus SEULEMENT (jamais affichées) :
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *   SECURITE_RPC_SECRET (facultative : sans elle, l'essai du secret est sauté).
 *
 * Usage : charger ces variables dans le processus (jamais sur la ligne de
 * commande), puis `node tests/securite/http/verifier-supabase.mjs`.
 * Code de sortie : 0 si tout passe, 1 sinon, 2 si une variable manque.
 */
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SECURITE_RPC_SECRET;
if (!url || !cle) {
  console.error("Variables manquantes (noms) : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  process.exit(2);
}

let echecs = 0;
const noter = (check, nom, ok, detail) => {
  if (!ok) echecs++;
  console.log(`${ok ? "OK   " : "ÉCHEC"} [${check}] ${nom} — ${detail}`);
};
const entetes = { apikey: cle, "content-type": "application/json" };

// 03 — lectures anonymes
const TABLES = [
  "soumissions", "contacts", "companies", "lots", "sales", "email_logs", "email_templates", "ad_leads",
  "ad_sessions", "ad_events", "saved_lots", "ebay_orders", "outreach_activities", "certificats_destruction",
  "admins", "admin_notification_state",
];
for (const t of TABLES) {
  const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: entetes });
  const corps = await r.json().catch(() => null);
  const vide = Array.isArray(corps) && corps.length === 0;
  const refuse = r.status === 401 || r.status === 403 || r.status === 404;
  noter("03", `GET ${t} avec la clé publique`, vide || refuse, `HTTP ${r.status}, ${Array.isArray(corps) ? corps.length + " ligne(s)" : corps?.code ?? "refus"}`);
}
{
  const r = await fetch(`${url}/rest/v1/journal?select=*&limit=1`, { headers: { ...entetes, "accept-profile": "securite" } });
  noter("03", "schéma securite non exposé", r.status >= 400, `HTTP ${r.status}`);
}
for (const f of ["admin_soumissions", "est_admin", "soumissions_count"]) {
  const r = await fetch(`${url}/rest/v1/rpc/${f}`, { method: "POST", headers: entetes, body: "{}" });
  const corps = await r.json().catch(() => ({}));
  noter("03", `rpc ${f} sans session`, r.status >= 400, `HTTP ${r.status} ${corps?.code ?? ""}`);
}

// 17 — inscriptions fermées (lecture des réglages publics)
{
  const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: cle } });
  const s = await r.json().catch(() => ({}));
  noter("17", "inscriptions fermées, sans autoconfirmation", s.disable_signup === true && s.mailer_autoconfirm === false, `disable_signup=${s.disable_signup} mailer_autoconfirm=${s.mailer_autoconfirm}`);
}

// 12/25 — secret des fonctions SQL
if (secret) {
  const essai = async (s) => {
    const r = await fetch(`${url}/rest/v1/rpc/limite_debit`, {
      method: "POST",
      headers: entetes,
      body: JSON.stringify({ p_secret: s, p_cle: "f8-verif-secret", p_fenetre_s: 60, p_max: 0 }),
    });
    const corps = await r.json().catch(() => ({}));
    return { http: r.status, code: corps?.code ?? null };
  };
  const bon = await essai(secret);
  const mauvais = await essai(`mauvais-${"x".repeat(48)}`);
  noter("12", "secret configuré accepté par la base (22023, sans écriture)", bon.code === "22023", `HTTP ${bon.http} code ${bon.code}`);
  noter("25", "autre secret refusé (42501)", mauvais.code === "42501", `HTTP ${mauvais.http} code ${mauvais.code}`);
} else {
  console.log("—     [12/25] SECURITE_RPC_SECRET absente : essai du secret sauté");
}

process.exit(echecs === 0 ? 0 : 1);
