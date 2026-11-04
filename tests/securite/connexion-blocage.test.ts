import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Blocage de la connexion admin à travers les IP, double authentification,
 * formulaire public et envoi depuis les fiches.
 *
 * `limite_debit` et `limite_effacer` sont SIMULÉES en mémoire avec la même
 * règle que les migrations (fenêtre fixe ; refus quand compte > p_max). Les
 * vraies routes sont appelées. Aucun appel réseau.
 */

const SECRET = "secret-de-test-vitest-0123456789-abcdefghij";
const ADMIN_ID = "11111111-2222-4333-8444-555555555555";

const s = vi.hoisted(() => ({
  compteurs: new Map<string, { debut: number; compte: number }>(),
  effacees: [] as string[],
  rpcEffacerEnErreur: false,
  horloge: 1_000_000,
  temoins: new Map<string, string>(),
  poses: [] as { nom: string; valeur: string; options: Record<string, unknown> }[],
  verifier: { error: null as null | { code: string; status: number } },
  envoyes: 0,
  appels: [] as string[],
}));

function limiteDebit(args: { p_secret: string; p_cle: string; p_fenetre_s: number; p_max: number }) {
  if (args.p_secret !== SECRET) return { data: null, error: { code: "42501" } };
  const fen = args.p_fenetre_s * 1000;
  const c = s.compteurs.get(args.p_cle);
  const v =
    !c || c.debut + fen <= s.horloge
      ? { debut: s.horloge, compte: 1 }
      : { debut: c.debut, compte: c.compte + 1 };
  s.compteurs.set(args.p_cle, v);
  if (v.compte > args.p_max) {
    return { data: Math.max(1, Math.ceil((v.debut + fen - s.horloge) / 1000)), error: null };
  }
  return { data: 0, error: null };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: async (nom: string, args: Record<string, unknown>) => {
      s.appels.push(nom);
      if (nom === "limite_debit") return limiteDebit(args as never);
      if (nom === "limite_effacer") {
        if (s.rpcEffacerEnErreur) return { data: null, error: { code: "PGRST202" } };
        s.effacees.push(args.p_cle as string);
        s.compteurs.delete(args.p_cle as string);
        return { data: null, error: null };
      }
      if (nom === "journal_securite_ajouter") return { data: { total_5min: 2, meme_ip_5min: 2 }, error: null };
      return { data: null, error: null };
    },
  }),
}));

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword: auth.signInWithPassword } }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (nom: string) => {
      const value = s.temoins.get(nom);
      return value === undefined ? undefined : { name: nom, value };
    },
    set: (nom: string, valeur: string, options: Record<string, unknown>) => {
      s.poses.push({ nom, valeur, options });
    },
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async () => {
        s.appels.push("resend");
        return { data: { id: "x" }, error: null };
      },
    };
  },
}));

vi.mock("@/lib/crm/email", () => ({
  renderTemplate: (t: string) => t,
  sendProspectEmail: async () => {
    s.envoyes += 1;
    return { statut: "envoye" };
  },
}));

vi.mock("@/lib/securite/garde", async (original) => {
  const vrai = await original<typeof import("@/lib/securite/garde")>();
  const ctx = () => ({
    requestId: "req-test",
    user: {
      id: "11111111-2222-4333-8444-555555555555",
      email: "info@technolot.ca",
      factors: [{ id: "22222222-3333-4444-8555-666666666666", factor_type: "totp", status: "verified" }],
    },
    supabase: {
      auth: { mfa: { challengeAndVerify: async () => ({ data: null, error: s.verifier.error }) } },
    },
  });
  return { ...vrai, exigerSessionMfaRoute: async () => ctx(), adminPourAction: async () => ctx() };
});

import { POST as motDePasse } from "@/app/admin/auth/password/route";
import { POST as verifierCode } from "@/app/admin/auth/mfa/verification/route";
import { POST as soumission } from "@/app/api/soumission/route";
import { messageBlocageConnexion, messageErreurConnexion } from "@/lib/admin/messages-connexion";
import { sendTemplateEmail } from "@/lib/crm/actions";
import {
  lireAppareil,
  poserAppareil,
  TEMOIN_APPAREIL,
  valeurTemoinAppareil,
  verifierTemoinAppareil,
} from "@/lib/securite/appareil";
import { empreinteNavigateur } from "@/lib/securite/empreinte";
import { EVENEMENTS } from "@/lib/securite/journal";
import { effacerLimite, limiter, TABLE_LIMITES } from "@/lib/securite/limite";
import { requeteMultipart, requeteTexte } from "./f2-outils";

const SITE = "https://www.technolot.ca";
const APPAREIL = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NAVIGATEUR = "Mozilla/5.0 (Windows NT 10.0) Chrome/130";

const ip = (n: number) => `203.0.113.${n}`;
const entetes = (n: number, ua = NAVIGATEUR) => ({ "x-forwarded-for": ip(n), "user-agent": ua });

/** Clé telle qu'écrite en base par `limiter`. */
const cleBase = (route: string, cle: string) =>
  createHmac("sha256", SECRET).update(`${route}:${cle}`).digest("hex");
const compte = (route: string, cle: string) => s.compteurs.get(cleBase(route, cle))?.compte ?? 0;
const empreinteDe = (e: Record<string, string>) => empreinteNavigateur(new Headers(e));

const FAUX = { username: "info", password: "mauvais-mot-de-passe" };
const VRAI = { username: "info", password: "le-bon-mot-de-passe" };

function essai(e: Record<string, string>, corps: unknown = FAUX) {
  return motDePasse(
    requeteTexte(`${SITE}/admin/auth/password`, JSON.stringify(corps), "application/json", e),
  );
}

function essaiFormulaire(e: Record<string, string>) {
  return motDePasse(
    requeteTexte(
      `${SITE}/admin/auth/password`,
      new URLSearchParams(VRAI).toString(),
      "application/x-www-form-urlencoded",
      e,
    ),
  );
}

function motDePasseAccepte() {
  auth.signInWithPassword.mockImplementation(async ({ password }: { password: string }) =>
    password === VRAI.password
      ? { data: { user: { id: ADMIN_ID } }, error: null }
      : { data: { user: null }, error: { status: 400, code: "invalid_credentials" } },
  );
}

let sortie: string[] = [];
const attendre = () => new Promise((r) => setTimeout(r, 0));
function lignes(evenement: string): Record<string, unknown>[] {
  return sortie
    .map((l) => {
      try {
        return JSON.parse(l) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((l): l is Record<string, unknown> => l?.evenement === evenement);
}

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("ADMIN_USERNAMES", "info:info@technolot.ca");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("RESEND_API_KEY", "cle-resend-de-test");
  vi.stubEnv("FROM_EMAIL", "soumission@exemple.ca");
  vi.stubEnv("CONTACT_EMAIL", "info@exemple.ca");
  sortie = [];
  vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void sortie.push(a.map(String).join(" ")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Le délai minimal d'un échec (600 ms) est sauté : l'horloge avance d'elle-même.
  let t = 0;
  vi.spyOn(Date, "now").mockImplementation(() => (t += 1_000));
  s.compteurs.clear();
  s.effacees = [];
  s.rpcEffacerEnErreur = false;
  s.horloge = 1_000_000;
  s.temoins.clear();
  s.poses = [];
  s.verifier = { error: null };
  s.envoyes = 0;
  s.appels = [];
  auth.signInWithPassword.mockReset();
  motDePasseAccepte();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("navigateur inconnu : blocage à travers les IP", () => {
  it("4e essai d'une même IP et d'un même navigateur → 429, temps restant affiché", async () => {
    for (let i = 1; i <= 3; i++) expect((await essai(entetes(1))).status, `essai ${i}`).toBe(401);
    auth.signInWithPassword.mockClear();
    const r = await essai(entetes(1));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("3600");
    expect(await r.json()).toEqual({ error: "Trop d'essais. Connexion bloquée pendant 60 min." });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("4e essai d'une même IP avec un navigateur différent chaque fois → 429 par IP", async () => {
    for (let i = 1; i <= 3; i++) expect((await essai(entetes(1, `Robot/${i}`))).status).toBe(401);
    expect((await essai(entetes(1, "Robot/4"))).status).toBe(429);
  });

  it("même empreinte sur des IP différentes (VPN) → 429 au 4e", async () => {
    for (let i = 1; i <= 3; i++) expect((await essai(entetes(i))).status, `essai ${i}`).toBe(401);
    auth.signInWithPassword.mockClear();
    const r = await essai(entetes(77));
    expect(r.status).toBe(429);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("IP et empreinte différentes à chaque essai → le global bloque au 6e", async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await essai(entetes(i, `Robot/${i}`))).status, `essai ${i}`).toBe(401);
    }
    auth.signInWithPassword.mockClear();
    const r = await essai(entetes(6, "Robot/6"));
    expect(r.status).toBe(429);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    // Même le bon mot de passe ne passe pas depuis un navigateur inconnu.
    expect((await essai(entetes(7, "Admin/nouveau"), VRAI)).status).toBe(429);
  });

  it("limite de 24 h : 6e essai d'une même IP après la fin de la fenêtre d'une heure → 429, attente en heures", async () => {
    for (let i = 1; i <= 3; i++) await essai(entetes(1, `Robot/${i}`));
    s.horloge += 3_601_000;
    for (let i = 4; i <= 5; i++) expect((await essai(entetes(1, `Robot/${i}`))).status).toBe(401);
    const r = await essai(entetes(1, "Robot/6"));
    expect(r.status).toBe(429);
    expect((await r.json()).error).toBe("Trop d'essais. Connexion bloquée pendant 23 h.");
  });

  it("un attaquant bloqué par IP n'alimente plus le compteur global", async () => {
    for (let i = 1; i <= 12; i++) await essai(entetes(1));
    expect(compte("auth-mdp:global:1h", "global")).toBe(3);
    // Le reste du monde peut encore essayer.
    expect((await essai(entetes(2, "Autre/1"), VRAI)).status).toBe(200);
  });

  it("mauvais nom d'utilisateur et corps invalide comptent comme un mauvais mot de passe", async () => {
    expect((await essai(entetes(1), { username: "pirate", password: "x" })).status).toBe(401);
    expect((await essai(entetes(1), { username: "autre", password: "x" })).status).toBe(401);
    expect((await essai(entetes(1), { username: "" })).status).toBe(401);
    auth.signInWithPassword.mockClear();
    expect((await essai(entetes(1), VRAI)).status).toBe(429);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("100 essais simultanés : 3 vérifications au plus", async () => {
    auth.signInWithPassword.mockClear();
    const reponses = await Promise.all(Array.from({ length: 100 }, () => essai(entetes(1))));
    expect(auth.signInWithPassword.mock.calls.length).toBeLessThanOrEqual(3);
    expect(reponses.filter((r) => r.status === 429).length).toBeGreaterThanOrEqual(97);
  });

  it("formulaire natif refusé → 303 ?error=trop_de_tentatives avec Retry-After", async () => {
    for (let i = 1; i <= 3; i++) await essai(entetes(1));
    const r = await essaiFormulaire(entetes(1));
    expect(r.status).toBe(303);
    expect(new URL(r.headers.get("location")!).searchParams.get("error")).toBe("trop_de_tentatives");
    expect(r.headers.get("retry-after")).toBe("3600");
    expect(messageErreurConnexion("trop_de_tentatives")).toBe(
      "Trop d'essais. Connexion bloquée pour le moment : réessaie plus tard.",
    );
  });

  it("refus journalisé auth.blocage : règle lisible, aucune valeur sensible", async () => {
    for (let i = 1; i <= 3; i++) await essai(entetes(1));
    expect(lignes("auth.blocage")).toHaveLength(0);
    await essai(entetes(1));
    await attendre();
    const blocages = lignes("auth.blocage");
    expect(blocages).toHaveLength(1);
    expect(blocages[0]).toMatchObject({
      resultat: "refus",
      statut: 429,
      details: { regle: "auth-mdp:ip:1h", attente: 3600 },
    });
    expect(JSON.stringify(blocages[0])).not.toContain(FAUX.password);
    expect(JSON.stringify(blocages[0].details)).not.toContain(empreinteDe(entetes(1)));
  });
});

describe("navigateur connu : le vrai admin n'est pas bloqué par un attaquant", () => {
  const avecTemoin = (id = APPAREIL) => s.temoins.set(TEMOIN_APPAREIL, valeurTemoinAppareil(id)!);

  it("ni le blocage global ni le blocage par IP ne le touchent", async () => {
    for (let i = 1; i <= 6; i++) await essai(entetes(i, `Robot/${i}`));
    for (let i = 1; i <= 4; i++) await essai(entetes(1, `Robot/1${i}`));
    expect((await essai(entetes(7, "Admin/nouveau"), VRAI)).status).toBe(429);
    expect((await essai(entetes(1, "Admin/nouveau"), VRAI)).status).toBe(429);

    avecTemoin();
    expect((await essai(entetes(1), VRAI)).status).toBe(200);
    expect(compte("auth-mdp:ip:1h", ip(1))).toBeGreaterThan(3);
    expect(compte("auth-mdp:global:1h", "global")).toBeGreaterThan(5);
  });

  it("n'utilise que ses propres compteurs", async () => {
    avecTemoin();
    await essai(entetes(1));
    expect(compte("auth-mdp:appareil:15min", APPAREIL)).toBe(1);
    expect(compte("auth-mdp:appareil:24h", APPAREIL)).toBe(1);
    expect(compte("auth-mdp:ip:1h", ip(1))).toBe(0);
    expect(compte("auth-mdp:empreinte:1h", empreinteDe(entetes(1)))).toBe(0);
    expect(compte("auth-mdp:global:1h", "global")).toBe(0);
  });

  it("bloqué à son 4e essai raté, sans auth.blocage (pas d'alerte pour une erreur de frappe)", async () => {
    avecTemoin();
    for (let i = 1; i <= 3; i++) expect((await essai(entetes(i))).status, `essai ${i}`).toBe(401);
    auth.signInWithPassword.mockClear();
    const r = await essai(entetes(9));
    expect(r.status).toBe(429);
    expect((await r.json()).error).toBe("Trop d'essais. Connexion bloquée pendant 15 min.");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    await attendre();
    expect(lignes("auth.blocage")).toHaveLength(0);
  });

  it("témoin falsifié ou mal formé → traité comme inconnu", async () => {
    const autreSecret = createHmac("sha256", "x".repeat(40)).update(`appareil-admin:${APPAREIL}`).digest("hex");
    const bon = valeurTemoinAppareil(APPAREIL)!;
    const faux = [
      `${APPAREIL}.${autreSecret}`,
      `${APPAREIL}.${"0".repeat(64)}`,
      `bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee.${bon.split(".")[1]}`,
      bon.slice(0, -1),
      APPAREIL,
      "",
      "pas-un-temoin",
      `${bon}.extra`,
    ];
    for (const valeur of faux) expect(verifierTemoinAppareil(valeur), valeur).toBeNull();
    expect(verifierTemoinAppareil(bon)).toBe(APPAREIL);

    s.temoins.set(TEMOIN_APPAREIL, faux[0]);
    expect(await lireAppareil()).toBeNull();
    for (let i = 1; i <= 5; i++) await essai(entetes(i, `Robot/${i}`));
    expect((await essai(entetes(6, "Robot/6"), VRAI)).status).toBe(429);
    expect(compte("auth-mdp:appareil:15min", APPAREIL)).toBe(0);
  });

  it("sans secret serveur : pas de témoin, navigateur inconnu", async () => {
    const bon = valeurTemoinAppareil(APPAREIL)!;
    vi.stubEnv("SECURITE_RPC_SECRET", "");
    expect(valeurTemoinAppareil(APPAREIL)).toBeNull();
    expect(verifierTemoinAppareil(bon)).toBeNull();
    await poserAppareil(null);
    expect(s.poses).toEqual([]);
  });
});

describe("mot de passe juste", () => {
  it("navigateur inconnu : efface IP et empreinte, PAS le global, puis pose le témoin", async () => {
    const e = entetes(1);
    const emp = empreinteDe(e);
    await essai(e);
    await essai(e);
    expect((await essai(e, VRAI)).status).toBe(200);

    expect(new Set(s.effacees)).toEqual(
      new Set([
        cleBase("auth-mdp:ip:1h", ip(1)),
        cleBase("auth-mdp:ip:24h", ip(1)),
        cleBase("auth-mdp:empreinte:1h", emp),
        cleBase("auth-mdp:empreinte:24h", emp),
      ]),
    );
    expect(compte("auth-mdp:ip:1h", ip(1))).toBe(0);
    expect(compte("auth-mdp:empreinte:24h", emp)).toBe(0);
    expect(compte("auth-mdp:global:1h", "global")).toBe(3);
    expect(compte("auth-mdp:global:24h", "global")).toBe(3);
  });

  it("navigateur connu : efface les compteurs d'appareil seulement", async () => {
    s.temoins.set(TEMOIN_APPAREIL, valeurTemoinAppareil(APPAREIL)!);
    await essai(entetes(1));
    await essai(entetes(1));
    expect((await essai(entetes(1), VRAI)).status).toBe(200);
    expect(new Set(s.effacees)).toEqual(
      new Set([cleBase("auth-mdp:appareil:15min", APPAREIL), cleBase("auth-mdp:appareil:24h", APPAREIL)]),
    );
  });

  it("mauvais mot de passe : rien n'est effacé, aucun témoin", async () => {
    await essai(entetes(1));
    expect(s.effacees).toEqual([]);
    expect(s.poses).toEqual([]);
  });

  it("témoin posé sur la réponse JSON", async () => {
    expect((await essai(entetes(1), VRAI)).status).toBe(200);
    expect(s.poses).toHaveLength(1);
    expect(s.poses[0].nom).toBe("tl_admin_appareil");
    expect(s.poses[0].options).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/admin/auth",
      maxAge: 31_536_000,
    });
    expect(verifierTemoinAppareil(s.poses[0].valeur)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("témoin posé sur la redirection 303 du formulaire natif", async () => {
    const r = await essaiFormulaire(entetes(1));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`${SITE}/admin`);
    expect(s.poses).toHaveLength(1);
    expect(verifierTemoinAppareil(s.poses[0].valeur)).not.toBeNull();
  });

  it("Secure en production seulement", async () => {
    await poserAppareil(APPAREIL);
    expect(s.poses[0].options.secure).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    await poserAppareil(APPAREIL);
    expect(s.poses[1].options.secure).toBe(true);
  });

  it("navigateur connu : témoin renouvelé avec le même identifiant", async () => {
    const valeur = valeurTemoinAppareil(APPAREIL)!;
    s.temoins.set(TEMOIN_APPAREIL, valeur);
    expect((await essai(entetes(1), VRAI)).status).toBe(200);
    expect(s.poses[0].valeur).toBe(valeur);
  });

  it("effacement impossible (fonction SQL absente) : la connexion réussit quand même, erreur journalisée", async () => {
    s.rpcEffacerEnErreur = true;
    expect((await essai(entetes(1), VRAI)).status).toBe(200);
    expect(s.poses).toHaveLength(1);
    await attendre();
    expect(lignes("limite.erreur").length).toBeGreaterThan(0);
    expect(lignes("limite.erreur")[0]).toMatchObject({ details: { operation: "effacer", motif: "rpc" } });
  });
});

describe("effacerLimite", () => {
  it("même HMAC que limiter : le compteur repart à zéro", async () => {
    for (let i = 0; i < 3; i++) await limiter("essai:r", "cle", 60, 3);
    expect((await limiter("essai:r", "cle", 60, 3)).permis).toBe(false);
    await effacerLimite("essai:r", "cle");
    expect(s.effacees).toEqual([cleBase("essai:r", "cle")]);
    expect((await limiter("essai:r", "cle", 60, 3)).permis).toBe(true);
  });

  it("clé en clair jamais envoyée ; sans secret : aucun appel, aucune exception", async () => {
    await effacerLimite("essai:r", "203.0.113.5");
    expect(s.effacees[0]).not.toContain("203.0.113.5");
    s.appels = [];
    vi.stubEnv("SECURITE_RPC_SECRET", "");
    await expect(effacerLimite("essai:r", "cle")).resolves.toBeUndefined();
    expect(s.appels).toEqual([]);
  });
});

describe("empreinteNavigateur et messages", () => {
  it("en-têtes en minuscules, joints par |, tronqués à 256 caractères, sans hachage", () => {
    const e = empreinteNavigateur(
      new Headers({
        "user-agent": "A".repeat(300),
        "accept-language": "FR-ca",
        "sec-ch-ua": '"Chromium";v="130"',
        "sec-ch-ua-platform": '"Windows"',
        "sec-ch-ua-mobile": "?0",
      }),
    );
    expect(e).toBe(`${"a".repeat(256)}|fr-ca|"chromium";v="130"|"windows"|?0`);
  });

  it("accepte une Request ; sans en-tête : clé non vide, partagée par les robots sans navigateur", () => {
    expect(empreinteNavigateur(new Request(SITE, { headers: { "user-agent": "X" } }))).toBe("x||||");
    expect(empreinteNavigateur(new Headers())).toBe("||||");
  });

  it("messageBlocageConnexion : minutes jusqu'à 120, heures au-delà, jamais 0", () => {
    expect(messageBlocageConnexion(42 * 60 - 10)).toBe("Trop d'essais. Connexion bloquée pendant 42 min.");
    expect(messageBlocageConnexion(5)).toBe("Trop d'essais. Connexion bloquée pendant 1 min.");
    expect(messageBlocageConnexion(120 * 60)).toBe("Trop d'essais. Connexion bloquée pendant 120 min.");
    expect(messageBlocageConnexion(150 * 60)).toBe("Trop d'essais. Connexion bloquée pendant 3 h.");
  });

  it("les liens expirés ne proposent plus d'en demander un nouveau", () => {
    expect(messageErreurConnexion("lien_expire")).not.toMatch(/nouveau/);
    expect(messageErreurConnexion("lien_invalide")).not.toMatch(/nouveau/);
  });
});

describe("double authentification : 3 essais / 15 min", () => {
  const code = (c: string) =>
    verifierCode(
      requeteTexte(`${SITE}/admin/auth/mfa/verification`, JSON.stringify({ code: c }), "application/json", {
        origin: SITE,
        ...entetes(5),
      }),
    );

  it("4e code refusé, sans vérification", async () => {
    s.verifier = { error: { code: "mfa_verification_failed", status: 422 } };
    for (let i = 1; i <= 3; i++) expect((await code("111111")).status, `code ${i}`).toBe(401);
    s.verifier = { error: null };
    const r = await code("222222");
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("900");
    expect(compte("auth-mfa:compte:15min", ADMIN_ID)).toBe(4);
  });

  it("code juste : compteurs du compte et de l'IP effacés", async () => {
    s.verifier = { error: { code: "mfa_verification_failed", status: 422 } };
    await code("111111");
    await code("111111");
    s.verifier = { error: null };
    expect((await code("222222")).status).toBe(200);
    expect(new Set(s.effacees)).toEqual(
      new Set([cleBase("auth-mfa:compte:15min", ADMIN_ID), cleBase("auth-mfa:ip:15min", ip(5))]),
    );
    expect(compte("auth-mfa:compte:15min", ADMIN_ID)).toBe(0);
  });

  it("code faux : rien n'est effacé", async () => {
    s.verifier = { error: { code: "mfa_verification_failed", status: 422 } };
    await code("111111");
    expect(s.effacees).toEqual([]);
  });
});

describe("formulaire public : répétitions à travers les IP", () => {
  function envoi(
    n: number,
    champs: { courriel?: string; telephone?: string } = {},
    e: Record<string, string> = entetes(n, `Client/${n}`),
  ) {
    const fd = new FormData();
    fd.set("nom", "Marie Tremblay");
    fd.set("courriel", champs.courriel ?? `client${n}@exemple.ca`);
    fd.set("telephone", champs.telephone ?? `514 555-${String(n).padStart(4, "0")}`);
    return requeteMultipart(`${SITE}/api/soumission`, fd, e).then(soumission);
  }

  it("même courriel depuis des IP et navigateurs différents → 429 au 4e, majuscules ignorées, rien d'envoyé", async () => {
    for (let i = 1; i <= 3; i++) {
      expect((await envoi(i, { courriel: "Marie@Exemple.ca" })).status, `envoi ${i}`).toBe(200);
    }
    s.appels = [];
    const r = await envoi(4, { courriel: "marie@exemple.ca" });
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBeTruthy();
    expect(s.appels).not.toContain("resend");
    expect(s.appels).not.toContain("soumission_enregistrer");
  });

  it("même téléphone écrit autrement depuis des IP différentes → 429 au 4e", async () => {
    const formes = ["514 555-1234", "(514) 555-1234", "+1 514 555 1234", "514.555.1234"];
    for (let i = 0; i < 3; i++) {
      expect((await envoi(i + 1, { telephone: formes[i] })).status, `envoi ${i + 1}`).toBe(200);
    }
    expect((await envoi(4, { telephone: formes[3] })).status).toBe(429);
  });

  it("téléphone sans aucun chiffre : accepté par le schéma, aucune erreur de limite", async () => {
    expect((await envoi(1, { telephone: "-------" })).status).toBe(200);
    await attendre();
    expect(lignes("limite.erreur")).toHaveLength(0);
  });

  it("même empreinte sur des IP différentes → 429 au 4e, rien d'envoyé", async () => {
    const e = (n: number) => entetes(n, "Mozilla/commun");
    for (let i = 1; i <= 3; i++) expect((await envoi(i, {}, e(i))).status, `envoi ${i}`).toBe(200);
    s.appels = [];
    const r = await envoi(4, {}, e(4));
    expect(r.status).toBe(429);
    expect(s.appels).not.toContain("resend");
  });

  it("envoi invalide ou pot de miel rempli : compteurs d'empreinte non touchés", async () => {
    const e = entetes(1, "Mozilla/commun");
    const emp = empreinteDe(e);

    const invalide = await soumission(await requeteMultipart(`${SITE}/api/soumission`, new FormData(), e));
    expect(invalide.status).toBe(400);

    const fd = new FormData();
    fd.set("nom", "Robot");
    fd.set("courriel", "robot@exemple.ca");
    fd.set("telephone", "514 555-0001");
    fd.set("tl_verif", "http://spam");
    const piege = await soumission(await requeteMultipart(`${SITE}/api/soumission`, fd, e));
    expect(piege.status).toBe(200);
    expect(s.appels).not.toContain("resend");

    expect(compte("soumission:ip:10min", ip(1))).toBe(2);
    expect(compte("soumission:empreinte:10min", emp)).toBe(0);
    expect(compte("soumission:empreinte:jour", emp)).toBe(0);
  });

  it("un robot qui copie un navigateur courant ne grille pas l'empreinte des vrais clients", async () => {
    const e = (n: number) => entetes(n, "Mozilla/commun");
    for (let i = 1; i <= 20; i++) {
      const r = await soumission(await requeteMultipart(`${SITE}/api/soumission`, new FormData(), e(i)));
      expect(r.status, `requête bidon ${i}`).toBe(400);
    }
    expect((await envoi(30, {}, e(30))).status).toBe(200);
  });

  it("empreinte : 10 / 24 h, plus haut que par IP (11e → 429)", async () => {
    const e = (n: number) => entetes(n, "Mozilla/commun");
    for (let i = 1; i <= 10; i++) {
      s.horloge += 601_000; // au-delà de la fenêtre de 10 minutes
      expect((await envoi(i, {}, e(i))).status, `envoi ${i}`).toBe(200);
    }
    s.horloge += 601_000;
    expect((await envoi(11, {}, e(11))).status).toBe(429);
  });

  it("6e envoi d'une même IP dans la journée → 429 (5 / 24 h)", async () => {
    for (let i = 1; i <= 5; i++) {
      s.horloge += 601_000;
      expect((await envoi(i, {}, entetes(9, `Client/${i}`))).status, `envoi ${i}`).toBe(200);
    }
    s.horloge += 601_000;
    expect((await envoi(6, {}, entetes(9, "Client/6"))).status).toBe(429);
  });

  it("un doublon refusé n'entame pas le plafond global", async () => {
    for (let i = 1; i <= 3; i++) await envoi(i, { courriel: "double@exemple.ca" });
    expect(compte("soumission:global:jour", "global")).toBe(3);
    for (let i = 4; i <= 8; i++) {
      expect((await envoi(i, { courriel: "double@exemple.ca" })).status).toBe(429);
    }
    expect(compte("soumission:global:jour", "global")).toBe(3);

    for (let i = 21; i <= 23; i++) await envoi(i, { telephone: "450 555-0000" });
    expect(compte("soumission:global:jour", "global")).toBe(6);
    expect((await envoi(24, { telephone: "450 555-0000" })).status).toBe(429);
    expect(compte("soumission:global:jour", "global")).toBe(6);
  });

  it("clés en base hachées : ni courriel ni téléphone en clair", async () => {
    await envoi(1, { courriel: "prive@exemple.ca", telephone: "514 555-9876" });
    const cles = [...s.compteurs.keys()].join(" ");
    expect(cles).not.toContain("prive@exemple.ca");
    expect(cles).not.toContain("5145559876");
  });
});

describe("envoi depuis les fiches du CRM", () => {
  it("au-delà de 60 / h par admin → refus simple, aucun courriel, avant toute lecture", async () => {
    s.compteurs.set(cleBase("crm:envoi-fiche:heure", ADMIN_ID), { debut: s.horloge, compte: 60 });
    const r = await sendTemplateEmail(APPAREIL, "intro_email" as never);
    expect(r).toEqual({ ok: false, error: "Trop de courriels envoyés depuis les fiches. Réessaie dans une heure." });
    expect(s.envoyes).toBe(0);
  });
});

describe("lien magique retiré", () => {
  it("route, événement, règles et bouton disparus ; retour Supabase conservé", () => {
    expect(existsSync("app/admin/auth/request/route.ts")).toBe(false);
    expect(existsSync("app/admin/auth/callback/route.ts")).toBe(true);
    expect(Object.keys(EVENEMENTS)).not.toContain("authLienMagique");
    expect(Object.keys(TABLE_LIMITES).filter((k) => /lienMagique|motDePasse|(Compte|Ip)5min/.test(k))).toEqual([]);
    const formulaire = readFileSync("components/admin/LoginForm.tsx", "utf8");
    expect(formulaire).not.toMatch(/Mot de passe oublié|auth\/request|sendLink/);
  });

  it("migration limite_effacer : mêmes protections que limite_debit", () => {
    const sql = readFileSync("supabase/migrations/20261104120100_limite_effacer.sql", "utf8");
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/set search_path = ''/);
    expect(sql).toMatch(/securite\.secret_valide\(p_secret\)/);
    expect(sql).toMatch(/not between 1 and 128/);
    expect(sql).toMatch(/delete from securite\.limites where cle = p_cle/);
    expect(sql).toMatch(/revoke all on function public\.limite_effacer\(text, text\) from public/);
  });
});
