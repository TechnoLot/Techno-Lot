import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Réseau et base simulés : RPC Supabase (limites, journal, écritures) et Resend.
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  envoyer: vi.fn(),
  attente: 0,
  echecSoumission: false,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: m.rpc }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: m.envoyer };
  },
}));

import * as route from "@/app/api/soumission/route";
import { HEIC_VALIDE, octets, PDF_VALIDE, requeteMultipart, requeteTexte, XLSX_VALIDE } from "./f2-outils";

const URL_API = "https://www.technolot.ca/api/soumission";
const SECRET = "secret-de-test-vitest-0123456789-abcdefghij";

function champsValides(extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("locale", "fr");
  fd.set("tl_verif", "");
  fd.set("nom", "Marie Tremblay");
  fd.set("courriel", "Marie@Exemple.ca");
  fd.set("telephone", "514 555-1234");
  fd.set("message", "Matériel :\n- Portables : 12");
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

function appelsRpc(nom: string) {
  return m.rpc.mock.calls.filter((c) => c[0] === nom);
}

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("RESEND_API_KEY", "cle-resend-de-test");
  vi.stubEnv("FROM_EMAIL", "soumission@exemple.ca");
  vi.stubEnv("CONTACT_EMAIL", "info@exemple.ca");
  vi.stubEnv("VERCEL", "");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.attente = 0;
  m.echecSoumission = false;
  m.rpc.mockReset();
  m.rpc.mockImplementation(async (nom: string) => {
    if (nom === "limite_debit") return { data: m.attente, error: null };
    if (nom === "journal_securite_ajouter") return { data: { total_5min: 1, meme_ip_5min: 1 }, error: null };
    if (nom === "soumission_enregistrer") {
      return m.echecSoumission ? { data: null, error: { code: "42501" } } : { data: "id", error: null };
    }
    return { data: null, error: null };
  });
  m.envoyer.mockReset();
  m.envoyer.mockResolvedValue({ data: { id: "x" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/soumission : méthode, type et taille", () => {
  it("POST seulement (GET → 405 par Next : aucun gestionnaire GET exporté)", () => {
    expect(typeof route.POST).toBe("function");
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });

  it("type de contenu autre que multipart → 415, rien d'envoyé", async () => {
    const r = await route.POST(requeteTexte(URL_API, "nom=x", "application/x-www-form-urlencoded"));
    expect(r.status).toBe(415);
    expect(m.envoyer).not.toHaveBeenCalled();
  });

  it("Content-Length au-delà de 16 Mo → 413 avant toute lecture", async () => {
    const req = new Request(URL_API, {
      method: "POST",
      body: "x",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": "99999999" },
    });
    const r = await route.POST(req);
    expect(r.status).toBe(413);
    expect(m.rpc).not.toHaveBeenCalledWith("limite_debit", expect.anything());
    expect(m.envoyer).not.toHaveBeenCalled();
  });
});

describe("/api/soumission : schéma strict", () => {
  it("champ en trop (role=admin) → 400", async () => {
    const r = await route.POST(await requeteMultipart(URL_API, champsValides({ role: "admin" })));
    expect(r.status).toBe(400);
    expect(m.envoyer).not.toHaveBeenCalled();
  });

  it("quantité négative envoyée comme champ → 400 (champ inconnu)", async () => {
    const r = await route.POST(await requeteMultipart(URL_API, champsValides({ quantite: "-5" })));
    expect(r.status).toBe(400);
  });

  it("chaîne de 100 000 caractères → 400 « trop long »", async () => {
    for (const champ of ["nom", "message"]) {
      const r = await route.POST(await requeteMultipart(URL_API, champsValides({ [champ]: "a".repeat(100_000) })));
      expect(r.status).toBe(400);
      expect((await r.json()).error).toMatch(/trop long/);
    }
    expect(m.envoyer).not.toHaveBeenCalled();
  });

  it("mauvais type (fichier à la place du nom) → 400", async () => {
    const fd = champsValides();
    fd.set("nom", new Blob(["x"]), "nom.txt");
    const r = await route.POST(await requeteMultipart(URL_API, fd));
    expect(r.status).toBe(400);
  });

  it("courriel et téléphone invalides, champs vides → 400 avec message FR/EN", async () => {
    let r = await route.POST(await requeteMultipart(URL_API, champsValides({ courriel: '"x"<a@b.c>' })));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/courriel/);
    r = await route.POST(await requeteMultipart(URL_API, champsValides({ telephone: "appelez-moi" })));
    expect((await r.json()).error).toMatch(/téléphone/);
    r = await route.POST(await requeteMultipart(URL_API, champsValides({ nom: "  ", locale: "en" })));
    expect((await r.json()).error).toBe("Please fill in all required fields.");
  });

  it("champ en double → 400", async () => {
    const fd = champsValides();
    fd.append("nom", "Autre");
    const r = await route.POST(await requeteMultipart(URL_API, fd));
    expect(r.status).toBe(400);
  });

  it("pot de miel rempli → faux succès, rien écrit ni envoyé", async () => {
    const r = await route.POST(await requeteMultipart(URL_API, champsValides({ tl_verif: "http://spam" })));
    expect(r.status).toBe(200);
    expect(appelsRpc("soumission_enregistrer")).toHaveLength(0);
    expect(m.envoyer).not.toHaveBeenCalled();
  });
});

describe("/api/soumission : pièces jointes", () => {
  it("HTML renommé en .jpg → 415, rien écrit ni envoyé", async () => {
    const fd = champsValides();
    fd.append("photos", new Blob([octets("<html><script>alert(1)</script></html>")]), "photo.jpg");
    const r = await route.POST(await requeteMultipart(URL_API, fd));
    expect(r.status).toBe(415);
    expect((await r.json()).error).toMatch(/photo\.jpg/);
    expect(appelsRpc("soumission_enregistrer")).toHaveLength(0);
    expect(m.envoyer).not.toHaveBeenCalled();
  });

  it("SVG avec script dans les photos → 415", async () => {
    const fd = champsValides();
    fd.append("photos", new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>']), "a.svg");
    expect((await route.POST(await requeteMultipart(URL_API, fd))).status).toBe(415);
  });

  it("fichier de plus de 10 Mo → 413", async () => {
    const fd = champsValides();
    const gros = new Uint8Array(10 * 1024 * 1024 + 1);
    gros.set(PDF_VALIDE());
    fd.append("inventaire", new Blob([gros]), "gros.pdf");
    expect((await route.POST(await requeteMultipart(URL_API, fd))).status).toBe(413);
    expect(m.envoyer).not.toHaveBeenCalled();
  });

  it("11 fichiers → 413", async () => {
    const fd = champsValides();
    for (let i = 0; i < 11; i++) fd.append("photos", new Blob([HEIC_VALIDE()]), `p${i}.heic`);
    expect((await route.POST(await requeteMultipart(URL_API, fd))).status).toBe(413);
  });

  it("envoi valide : nom ../../x.pdf assaini, type MIME du serveur, valeurs échappées", async () => {
    const fd = champsValides({ nom: "Marie <b>Tremblay</b>\r\nBcc: x@y.z" });
    fd.append("inventaire", new Blob([PDF_VALIDE()]), "../../x.pdf");
    fd.append("inventaire", new Blob([XLSX_VALIDE()]), "liste.xlsx");
    fd.append("photos", new Blob([]), ""); // champ fichier vide (envoi sans JavaScript)
    const r = await route.POST(await requeteMultipart(URL_API, fd));
    expect(r.status).toBe(200);

    const [courriel] = m.envoyer.mock.calls[0];
    expect(courriel.subject).toBe("Nouvelle soumission de Marie <b>Tremblay</b> Bcc: x@y.z");
    expect(courriel.subject).not.toMatch(/[\r\n]/);
    expect(courriel.html).toContain("Marie &lt;b&gt;Tremblay&lt;/b&gt;");
    expect(courriel.html).not.toContain("<b>Tremblay");
    expect(courriel.replyTo).toBe("marie@exemple.ca");
    expect(courriel.attachments.map((a: { filename: string; contentType: string }) => [a.filename, a.contentType])).toEqual([
      ["x.pdf", "application/pdf"],
      ["liste.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ]);
    expect(courriel.headers).toEqual({ "X-Technolot-Soumission": expect.any(String) });

    const [[, args]] = appelsRpc("soumission_enregistrer");
    expect(args.p_secret).toBe(SECRET);
    expect(args.p_donnees).toMatchObject({
      courriel: "marie@exemple.ca",
      locale: "fr",
      fichiers: ["x.pdf", "liste.xlsx"],
    });
    expect(appelsRpc("lead_pub_enregistrer")[0][1].p_donnees.platform).toBe("direct");
  });
});

describe("/api/soumission : base et attribution", () => {
  it("échec d'écriture en base → le courriel part quand même (sans en-tête de soumission)", async () => {
    m.echecSoumission = true;
    const r = await route.POST(await requeteMultipart(URL_API, champsValides()));
    expect(r.status).toBe(200);
    expect(m.envoyer).toHaveBeenCalledTimes(1);
    expect(m.envoyer.mock.calls[0][0].headers).toBeUndefined();
  });

  it("secret absent → aucune écriture, le courriel part quand même", async () => {
    vi.stubEnv("SECURITE_RPC_SECRET", "");
    const r = await route.POST(await requeteMultipart(URL_API, champsValides()));
    expect(r.status).toBe(200);
    expect(appelsRpc("soumission_enregistrer")).toHaveLength(0);
    expect(m.envoyer).toHaveBeenCalledTimes(1);
  });

  it("tl_attr valide → lead attribué ; clés inconnues → lead « direct »", async () => {
    const attr = {
      id: "0b9d6f7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
      platform: "meta",
      utm_source: "facebook",
      landing_path: "/soumission",
      device: "mobile",
      locale: "fr",
    };
    await route.POST(await requeteMultipart(URL_API, champsValides({ tl_attr: JSON.stringify(attr) })));
    expect(appelsRpc("lead_pub_enregistrer")[0][1].p_donnees).toMatchObject({
      session_id: attr.id,
      platform: "meta",
      utm_source: "facebook",
    });

    m.rpc.mockClear();
    await route.POST(
      await requeteMultipart(URL_API, champsValides({ tl_attr: JSON.stringify({ ...attr, role: "admin" }) })),
    );
    expect(appelsRpc("lead_pub_enregistrer")[0][1].p_donnees).toMatchObject({ session_id: null, platform: "direct" });
  });

  it("erreur Resend → 502 générique avec référence, sans détail interne", async () => {
    m.envoyer.mockResolvedValue({ data: null, error: { name: "validation_error", message: "API key invalid sk_x" } });
    const r = await route.POST(await requeteMultipart(URL_API, champsValides()));
    expect(r.status).toBe(502);
    const corps = await r.json();
    expect(corps.ref).toEqual(expect.any(String));
    expect(JSON.stringify(corps)).not.toMatch(/API key|validation_error/);
  });
});

describe("/api/soumission : limites de débit", () => {
  it("limite atteinte → 429 + Retry-After, message selon la page (Referer /en/)", async () => {
    m.attente = 120;
    const r = await route.POST(
      await requeteMultipart(URL_API, champsValides(), { referer: "https://www.technolot.ca/en/soumission" }),
    );
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("120");
    expect((await r.json()).error).toMatch(/514-944-3939/);
    expect(m.envoyer).not.toHaveBeenCalled();
  });
});
