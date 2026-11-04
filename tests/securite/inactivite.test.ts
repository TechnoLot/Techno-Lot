import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

/*
 * Garde d'inactivité (assets/outils/garde-activite.js) : script classique de la
 * page, exécuté ici dans un contexte isolé avec une horloge, un stockage, des
 * minuteries et un réseau simulés. Plusieurs pages peuvent partager le même
 * « monde » (onglets, iframes).
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CODE = readFileSync(join(RACINE, "assets", "outils", "garde-activite.js"), "utf8");

const MIN = 60 * 1000;
const TICK = 15 * 1000;
const DEPART = 1_800_000_000_000;
const CLE = "tl_admin_activite";
const CLE_SIGNAL = "tl_admin_activite_signal";
const URL_SIGNAL = "/api/admin/activite";
const URL_SORTIE = "/admin/auth/signout?raison=inactivite";

type Reponse = () => Promise<unknown>;
type Monde = {
  t: number;
  stockage: Map<string, string>;
  /** false : tout accès au stockage lève une erreur (navigation privée stricte). */
  stockageOk: boolean;
  appels: { url: string; options: Record<string, unknown> }[];
  reponse: Reponse;
};

let monde: Monde;

beforeEach(() => {
  monde = { t: DEPART, stockage: new Map(), stockageOk: true, appels: [], reponse: async () => ({ status: 204 }) };
});

type Ecouteur = (e?: unknown) => void;

function ouvrirPage({ iframe = false, chemin = "/admin/lots", recherche = "?page=2" } = {}) {
  const ecouteurs = new Map<string, Set<Ecouteur>>();
  const ecouteursDoc = new Map<string, Set<Ecouteur>>();
  const ajouter = (m: Map<string, Set<Ecouteur>>, nom: string, f: Ecouteur) => {
    if (!m.has(nom)) m.set(nom, new Set());
    m.get(nom)!.add(f);
  };
  const intervalles = new Set<Ecouteur>();
  const delais: { quand: number; f: Ecouteur }[] = [];
  const redirections: string[] = [];

  const stockage = {
    getItem: (cle: string) => monde.stockage.get(cle) ?? null,
    setItem: (cle: string, v: string) => void monde.stockage.set(cle, v),
  };
  const fenetre: Record<string, unknown> = {
    addEventListener: (nom: string, f: Ecouteur) => ajouter(ecouteurs, nom, f),
    removeEventListener: (nom: string, f: Ecouteur) => ecouteurs.get(nom)?.delete(f),
    location: {
      pathname: chemin,
      search: recherche,
      replace: (url: string) => void redirections.push(url),
    },
    get localStorage() {
      if (!monde.stockageOk) throw new Error("stockage bloqué");
      return stockage;
    },
  };
  fenetre.self = fenetre;
  fenetre.top = iframe ? {} : fenetre;

  const ctx: Record<string, unknown> = {
    window: fenetre,
    document: {
      addEventListener: (nom: string, f: Ecouteur) => ajouter(ecouteursDoc, nom, f),
      removeEventListener: (nom: string, f: Ecouteur) => ecouteursDoc.get(nom)?.delete(f),
    },
    Date: { now: () => monde.t },
    fetch: (url: string, options: Record<string, unknown>) => {
      monde.appels.push({ url, options });
      return monde.reponse();
    },
    setInterval: (f: Ecouteur) => {
      intervalles.add(f);
      return f;
    },
    clearInterval: (f: Ecouteur) => void intervalles.delete(f),
    setTimeout: (f: Ecouteur, ms: number) => void delais.push({ quand: monde.t + ms, f }),
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  const garde = ctx.GardeActivite as { demarrer(): () => void };
  const arreter = garde.demarrer();

  return {
    arreter,
    redirections,
    ecouteurs,
    ecouteursDoc,
    intervalles,
    /** Fait tourner les minuteries de la page, comme le navigateur. */
    tick() {
      for (const f of intervalles) f();
      for (const d of delais.splice(0)) {
        if (d.quand <= monde.t) d.f();
        else delais.push(d);
      }
    },
    /** Événement sur window (fiable par défaut). */
    evenement(type: string, details: Record<string, unknown> = {}) {
      for (const f of ecouteurs.get(type) ?? []) f({ type, isTrusted: true, ...details });
    },
    evenementDocument(type: string) {
      for (const f of ecouteursDoc.get(type) ?? []) f({ type });
    },
  };
}

type Page = ReturnType<typeof ouvrirPage>;

/** Avance l'horloge de `ms` par pas de 15 s ; les minuteries de `pages` tournent à chaque pas. */
function avancer(ms: number, ...pages: Page[]) {
  for (let fait = 0; fait < ms; fait += TICK) {
    monde.t += Math.min(TICK, ms - fait);
    for (const p of pages) p.tick();
  }
}

/** Laisse se terminer les promesses de fetch. */
const reseau = () => new Promise((r) => setImmediate(r));

const sorties = () => monde.appels.filter((a) => a.url === URL_SORTIE);
const signaux = () => monde.appels.filter((a) => a.url === URL_SIGNAL);
const stocke = () => Number(monde.stockage.get(CLE) ?? 0);

describe("expiration", () => {
  it("à 60 minutes pile, pas avant", async () => {
    const p = ouvrirPage();
    avancer(60 * MIN - TICK, p);
    expect(sorties()).toHaveLength(0);
    avancer(TICK, p);
    expect(sorties()).toHaveLength(1);
    expect(sorties()[0].options).toMatchObject({ method: "POST", credentials: "same-origin", redirect: "manual" });
    await reseau();
    expect(p.redirections).toEqual([
      "/admin/login?error=inactivite&next=" + encodeURIComponent("/admin/lots?page=2"),
    ]);
  });

  it("une seule déconnexion, même avec des ticks et des événements en plus", async () => {
    const p = ouvrirPage();
    avancer(60 * MIN, p);
    avancer(10 * MIN, p);
    p.evenement("pointerdown");
    p.evenement("keydown");
    p.evenementDocument("visibilitychange");
    p.evenement("focus");
    await reseau();
    expect(sorties()).toHaveLength(1);
    expect(p.redirections).toHaveLength(1);
  });

  it("déconnexion refusée ou réseau coupé : la page part quand même", async () => {
    monde.reponse = () => Promise.reject(new Error("réseau"));
    const p = ouvrirPage();
    avancer(60 * MIN, p);
    await reseau();
    expect(p.redirections).toHaveLength(1);
  });

  it("serveur muet : la page part après 5 s, une seule fois", async () => {
    monde.reponse = () => new Promise(() => {});
    const p = ouvrirPage();
    avancer(60 * MIN, p);
    expect(p.redirections).toHaveLength(0);
    avancer(5000, p);
    avancer(60 * 1000, p);
    expect(p.redirections).toHaveLength(1);
  });

  it("revenue du cache après expiration : nouvelle redirection, pas de nouvelle déconnexion", async () => {
    const p = ouvrirPage();
    avancer(60 * MIN, p);
    await reseau();
    p.evenement("pageshow");
    expect(p.redirections).toHaveLength(2);
    expect(sorties()).toHaveLength(1);
  });

  it("vérifie aussi au retour sur l'onglet (visibilitychange, focus, pageshow)", () => {
    for (const declencheur of [
      (p: Page) => p.evenementDocument("visibilitychange"),
      (p: Page) => p.evenement("focus"),
      (p: Page) => p.evenement("pageshow"),
    ]) {
      monde.appels = [];
      const p = ouvrirPage();
      monde.t += 2 * 60 * MIN; // minuteries gelées pendant la veille
      declencheur(p);
      expect(sorties()).toHaveLength(1);
    }
  });
});

describe("activité", () => {
  it("chaque type d'activité repousse le délai", () => {
    for (const type of ["pointerdown", "keydown", "wheel", "touchstart", "touchmove", "input"]) {
      monde.appels = [];
      const p = ouvrirPage();
      avancer(45 * MIN, p);
      p.evenement(type);
      avancer(60 * MIN - TICK, p);
      expect(sorties()).toHaveLength(0);
      avancer(TICK, p);
      expect(sorties()).toHaveLength(1);
    }
  });

  it("le défilement ne compte pas : il peut venir du code de la page", () => {
    const p = ouvrirPage();
    expect(p.ecouteurs.has("scroll")).toBe(false);
  });

  it("une activité APRÈS le délai déconnecte au lieu de pardonner (retour de veille)", () => {
    const p = ouvrirPage();
    const avant = stocke();
    monde.t += 3 * 60 * MIN; // minuteries gelées pendant la veille
    p.evenement("pointerdown");
    expect(sorties()).toHaveLength(1);
    expect(stocke()).toBe(avant);
    expect(signaux()).toHaveLength(1); // seulement celui du chargement
  });

  it("une activité dans un autre onglet compte (stockage partagé)", () => {
    const a = ouvrirPage();
    const b = ouvrirPage();
    avancer(45 * MIN, a, b);
    b.evenement("keydown");
    avancer(60 * MIN - TICK, a, b);
    expect(sorties()).toHaveLength(0);
    avancer(TICK, a, b);
    expect(sorties().length).toBeGreaterThan(0);
  });

  it("le chargement compte comme une activité : pas de boucle avec une heure périmée", () => {
    monde.stockage.set(CLE, String(DEPART - 5 * 60 * MIN));
    monde.stockage.set(CLE_SIGNAL, String(DEPART - 5 * 60 * MIN));
    const p = ouvrirPage();
    p.tick();
    p.evenement("pageshow");
    expect(sorties()).toHaveLength(0);
    expect(stocke()).toBe(DEPART);
    expect(signaux()).toHaveLength(1);
  });

  it("une heure stockée dans le futur (horloge reculée) n'empêche pas l'expiration", () => {
    const p = ouvrirPage();
    monde.stockage.set(CLE, String(DEPART + 24 * 60 * MIN));
    avancer(60 * MIN, p);
    expect(sorties()).toHaveLength(1);
  });

  it("n'écrit dans le stockage qu'une fois par 5 s, la mémoire suit chaque événement", () => {
    const p = ouvrirPage();
    avancer(60 * 1000, p);
    p.evenement("keydown");
    const ecrit = stocke();
    expect(ecrit).toBe(DEPART + 60 * 1000);
    monde.t += 1000;
    p.evenement("keydown");
    expect(stocke()).toBe(ecrit);
    monde.t += 4000;
    p.evenement("keydown");
    expect(stocke()).toBe(ecrit + 5000);
  });
});

describe("événements qui ne comptent pas", () => {
  it("un faux déplacement sans changement de position est ignoré", () => {
    const p = ouvrirPage();
    p.evenement("pointermove", { screenX: 100, screenY: 200 });
    avancer(30 * MIN, p);
    // Les notifications changent la page : Chrome rejoue la même position.
    p.evenement("pointermove", { screenX: 100, screenY: 200 });
    avancer(30 * MIN, p);
    expect(sorties()).toHaveLength(1);
  });

  it("le premier déplacement sert de point de départ, le suivant compte", () => {
    const p = ouvrirPage();
    avancer(30 * MIN, p);
    p.evenement("pointermove", { screenX: 100, screenY: 200 });
    expect(stocke()).toBe(DEPART);
    p.evenement("pointermove", { screenX: 101, screenY: 200 });
    expect(stocke()).toBe(monde.t);
    avancer(30 * MIN, p);
    expect(sorties()).toHaveLength(0);
  });

  it("un événement non fiable (produit par un script) est ignoré", () => {
    const p = ouvrirPage();
    avancer(30 * MIN, p);
    p.evenement("pointerdown", { isTrusted: false });
    p.evenement("keydown", { isTrusted: false });
    expect(stocke()).toBe(DEPART);
    avancer(30 * MIN, p);
    expect(sorties()).toHaveLength(1);
  });
});

describe("iframe", () => {
  it("ne déconnecte jamais : la page parente s'en charge", async () => {
    const f = ouvrirPage({ iframe: true });
    avancer(3 * 60 * MIN, f);
    f.evenement("pointerdown");
    f.evenement("pageshow");
    await reseau();
    expect(sorties()).toHaveLength(0);
    expect(f.redirections).toHaveLength(0);
  });

  it("son activité repousse le délai de la page parente", () => {
    const parent = ouvrirPage();
    const f = ouvrirPage({ iframe: true });
    avancer(45 * MIN, parent, f);
    f.evenement("keydown");
    avancer(60 * MIN - TICK, parent, f);
    expect(sorties()).toHaveLength(0);
    avancer(TICK, parent, f);
    expect(sorties()).toHaveLength(1);
  });

  it("une activité après le délai ne pardonne pas : le parent déconnecte", () => {
    const parent = ouvrirPage();
    const f = ouvrirPage({ iframe: true });
    monde.t += 3 * 60 * MIN; // veille : minuteries gelées
    f.evenement("pointerdown");
    expect(stocke()).toBe(DEPART);
    expect(sorties()).toHaveLength(0);
    parent.tick();
    expect(sorties()).toHaveLength(1);
  });
});

describe("signal au serveur", () => {
  it("POST sans corps, au plus une fois par 5 minutes", () => {
    const p = ouvrirPage();
    expect(signaux()).toHaveLength(1);
    expect(signaux()[0].options).toEqual({ method: "POST", credentials: "same-origin", keepalive: true });
    for (let i = 0; i < 19; i++) {
      avancer(15 * 1000, p);
      p.evenement("keydown");
    }
    expect(signaux()).toHaveLength(1); // 4 min 45 s
    avancer(15 * 1000, p);
    p.evenement("keydown");
    expect(signaux()).toHaveLength(2);
  });

  it("une fois par 5 minutes tous onglets confondus, heure écrite avant l'envoi", () => {
    const a = ouvrirPage();
    const b = ouvrirPage();
    expect(signaux()).toHaveLength(1);
    avancer(5 * MIN, a, b);
    a.evenement("keydown");
    b.evenement("keydown");
    expect(signaux()).toHaveLength(2);
    expect(Number(monde.stockage.get(CLE_SIGNAL))).toBe(monde.t);
  });

  it("aucun signal sans activité", () => {
    const p = ouvrirPage();
    avancer(55 * MIN, p);
    expect(signaux()).toHaveLength(1);
  });

  it("une panne du signal ne déconnecte pas et ne plante pas", async () => {
    monde.reponse = () => Promise.reject(new Error("réseau"));
    const p = ouvrirPage();
    await reseau();
    avancer(6 * MIN, p);
    p.evenement("keydown");
    await reseau();
    expect(sorties()).toHaveLength(0);
    expect(p.redirections).toHaveLength(0);
  });

  it("fetch qui lève au lieu de rejeter : rien ne plante", () => {
    monde.reponse = () => {
      throw new Error("bloqué");
    };
    const p = ouvrirPage();
    avancer(6 * MIN, p);
    expect(() => p.evenement("keydown")).not.toThrow();
  });
});

describe("stockage indisponible", () => {
  it("ne plante pas, expire selon la mémoire et limite quand même le signal", async () => {
    monde.stockageOk = false;
    const p = ouvrirPage();
    avancer(MIN, p);
    p.evenement("keydown");
    expect(signaux()).toHaveLength(1);
    avancer(5 * MIN, p);
    p.evenement("keydown");
    expect(signaux()).toHaveLength(2);
    avancer(60 * MIN - TICK, p);
    expect(sorties()).toHaveLength(0);
    avancer(TICK, p);
    expect(sorties()).toHaveLength(1);
    await reseau();
    expect(p.redirections).toHaveLength(1);
  });

  it("une valeur illisible dans le stockage est ignorée", () => {
    monde.stockage.set(CLE, "pas-un-nombre");
    const p = ouvrirPage();
    expect(stocke()).toBe(DEPART);
    p.tick();
    expect(sorties()).toHaveLength(0);
  });
});

describe("arrêt et insertion", () => {
  it("la fonction d'arrêt retire tout", () => {
    const p = ouvrirPage();
    p.arreter();
    expect(p.intervalles.size).toBe(0);
    for (const ens of [...p.ecouteurs.values(), ...p.ecouteursDoc.values()]) expect(ens.size).toBe(0);
    monde.t += 2 * 60 * MIN;
    p.evenement("keydown");
    expect(sorties()).toHaveLength(0);
  });

  it("le chargement du script ne touche ni au DOM ni au réseau (rendu serveur)", () => {
    const ctx: Record<string, unknown> = {};
    vm.createContext(ctx);
    expect(() => vm.runInContext(CODE, ctx)).not.toThrow();
    const g = ctx.GardeActivite as Record<string, unknown>;
    expect(g.DELAI_INACTIVITE_MS).toBe(60 * MIN);
    expect(g.INTERVALLE_SIGNAL_MS).toBe(5 * MIN);
    expect(g.TICK_MS).toBe(TICK);
    expect(g.CLE_ACTIVITE).toBe(CLE);
    expect(g.CLE_SIGNAL).toBe(CLE_SIGNAL);
  });

  it("le script reste insérable dans une page (pas de fermeture de balise script)", () => {
    expect(CODE).not.toMatch(/<\/script/i);
  });
});
