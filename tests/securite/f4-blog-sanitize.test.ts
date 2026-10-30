import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/lib/blog-sanitize";

/**
 * Désinfectant du blogue (check 07, audit T7 07-2) : les charges XSS doivent
 * ressortir en texte inoffensif, et la sortie ne doit contenir que des
 * balises reconstruites par le désinfectant.
 */

const nettoie = (html: string) => sanitizeArticleHtml(html, "fr").html;

/** Gestionnaire d'événement ou URL javascript: dans une VRAIE balise de la sortie. */
const DANGER = /<(?:img|svg|a|p|iframe|script|body|details|video|audio|input)\b[^>]*?(?:\son\w+\s*=|javascript:)/i;

/**
 * Grammaire exacte des balises que le désinfectant peut produire. Une fois
 * ces balises retirées, il ne doit plus rester un seul « < » : tout autre
 * « < » serait une balise venue de l'entrée.
 */
const TAG_SIMPLE =
  "p|h2|h3|h4|ul|ol|li|strong|em|b|i|blockquote|br|hr|table|thead|tbody|tr|th|td|figure|figcaption|code|pre|sup|sub";
const VALEUR = '[^"<]*';
const BALISES_PERMISES = new RegExp(
  [
    `<(?:${TAG_SIMPLE})>`,
    `</(?:${TAG_SIMPLE}|a)>`,
    `<h2 id="[a-z0-9-]{1,80}">`,
    `<t[hd] colspan="\\d{1,2}">`,
    `<a>`,
    `<a href="${VALEUR}">`,
    `<a href="https?://${VALEUR}" target="_blank" rel="noopener noreferrer">`,
    `<img src="https://${VALEUR}" alt="${VALEUR}" loading="lazy" decoding="async">`,
  ].join("|"),
  "g",
);

function resteAucuneBaliseEtrangere(sortie: string): boolean {
  return !sortie.replace(BALISES_PERMISES, "").includes("<");
}

function hrefs(sortie: string): string[] {
  return [...sortie.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
}

describe("sanitizeArticleHtml — charges XSS (guide check 07 et audit T7)", () => {
  const charges = [
    "<img src=x onerror=alert(1)>",
    '"><svg onload=alert(1)>',
    "<<x>img src=x onerror=alert(1)>",
    '<a href="javascript:alert(1)">x</a>',
    "<</p>img src=x onerror=alert(4)>",
    "<<<x>>img src=x onerror=alert(5)>",
    "<<script>script>alert(6)<</script>/script>",
    "<scr<script></script>ipt>alert(7)</script>",
    '<img src="https://ok.example/a.png" onerror="alert(8)">',
    "<img/src=x/onerror=alert(9)>",
    "<IMG SRC=x ONERROR=alert(10)>",
    '<a href="JaVaScRiPt:alert(11)">x</a>',
    '<a href="java&#115;cript:alert(12)">x</a>',
    '<a href="  javascript:alert(13)">x</a>',
    '<a href="data:text/html,<script>alert(14)</script>">x</a>',
    "<p title=\"<img src=x onerror=alert(15)>\">t</p>",
    "<details open ontoggle=alert(16)>",
    "<svg><script>alert(17)</script></svg>",
    "<math><mi xlink:href=\"javascript:alert(18)\">x</mi></math>",
    "<iframe srcdoc=\"<script>alert(19)</script>\"></iframe>",
    "<!--><img src=x onerror=alert(20)>-->",
    "<h2 data-anchor='\" onmouseover=alert(21) x=\"'>Titre</h2>",
    "<<h2>img src=x onerror=alert(22)>",
    "<p\n onclick=alert(23)>x</p>",
    "<a href=\"/\\evil.example\">x</a>",
  ];

  for (const charge of charges) {
    it(`neutralise ${JSON.stringify(charge)}`, () => {
      const sortie = nettoie(charge);
      expect(sortie).not.toMatch(DANGER);
      expect(resteAucuneBaliseEtrangere(sortie)).toBe(true);
      for (const href of hrefs(sortie)) {
        expect(href).toMatch(/^(https?:\/\/|\/(?![/\\])|#|mailto:|tel:)/i);
      }
    });
  }

  it("le contournement `<<x>img …>` ressort en texte", () => {
    expect(nettoie("<<x>img src=x onerror=alert(1)>")).toBe("&lt;img src=x onerror=alert(1)>");
  });

  it("le `<` isolé devient &lt; (texte)", () => {
    expect(nettoie("<</p>img src=x onerror=alert(4)>")).toBe("&lt;</p>img src=x onerror=alert(4)>");
  });

  it("un lien javascript: perd son href", () => {
    expect(nettoie('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("un lien « /\\hôte » (lu comme //hôte par les navigateurs) perd son href", () => {
    expect(nettoie('<a href="/\\evil.example">x</a>')).toBe("<a>x</a>");
  });
});

describe("sanitizeArticleHtml — contenu légitime conservé", () => {
  it("garde la mise en forme, les liens et les images https", () => {
    const sortie = nettoie(
      '<h2>Un titre</h2><p>Texte <strong>gras</strong> et <a href="https://exemple.com/x">lien</a>.</p>' +
        '<img src="https://cdn.exemple.com/a.png" alt="Photo"><ul><li>Un</li></ul>',
    );
    expect(sortie).toBe(
      '<h2 id="un-titre">Un titre</h2><p>Texte <strong>gras</strong> et ' +
        '<a href="https://exemple.com/x" target="_blank" rel="noopener noreferrer">lien</a>.</p>' +
        '<img src="https://cdn.exemple.com/a.png" alt="Photo" loading="lazy" decoding="async"><ul><li>Un</li></ul>',
    );
  });

  it("rend relatifs les liens vers technolot.ca", () => {
    expect(nettoie('<a href="https://www.technolot.ca/soumission">x</a>')).toBe('<a href="/soumission">x</a>');
  });

  it("retire les images http et les attributs inconnus", () => {
    expect(nettoie('<p class="x" style="color:red">t</p><img src="http://a/b.png">')).toBe("<p>t</p>");
  });

  it("donne des ancres uniques aux intertitres", () => {
    const { headings } = sanitizeArticleHtml("<h2>Prix</h2><h2>Prix</h2>", "fr");
    expect(headings.map((h) => h.id)).toEqual(["prix", "prix-2"]);
  });
});

describe("sanitizeArticleHtml — essai aléatoire", () => {
  // Générateur pseudo-aléatoire déterministe (reproductible).
  function aleatoire(graine: number) {
    let x = graine >>> 0;
    return () => {
      x ^= x << 13;
      x >>>= 0;
      x ^= x >>> 17;
      x ^= x << 5;
      x >>>= 0;
      return x / 0x100000000;
    };
  }
  const morceaux = [
    "<", ">", "</", "/", "<<", "img", "svg", "a", "p", "h2", "script", "x", " ", "\n", "\t", "=", '"', "'",
    "src=x", " onerror=alert(1)", " onload=alert(1)", ' href="javascript:alert(1)"', "javascript:",
    "<!--", "-->", "&lt;", "&quot;", "data-anchor=", "https://a.example/i.png", "/\\", "</p>", "<p>", "<br>",
  ];

  it("10 000 entrées hostiles : aucune balise étrangère, aucun gestionnaire", () => {
    const hasard = aleatoire(20261030);
    for (let n = 0; n < 10_000; n++) {
      let entree = "";
      const longueur = 1 + Math.floor(hasard() * 14);
      for (let k = 0; k < longueur; k++) entree += morceaux[Math.floor(hasard() * morceaux.length)];
      const sortie = nettoie(entree);
      if (!resteAucuneBaliseEtrangere(sortie) || DANGER.test(sortie)) {
        throw new Error(`Entrée non neutralisée : ${JSON.stringify(entree)} → ${JSON.stringify(sortie)}`);
      }
    }
  });
});
