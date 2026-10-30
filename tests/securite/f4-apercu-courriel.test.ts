import { describe, expect, it } from "vitest";
import {
  CSP_APERCU_BLOQUE,
  CSP_APERCU_IMAGES,
  contientImagesDistantes,
  srcDocApercu,
} from "@/lib/admin/apercu-courriel";
import { CSP_PIECE_AFFICHEE, entetesPiece } from "@/lib/hostinger/courriel-regles";
import { urlHttpExterne } from "@/lib/securite/url-externe";

describe("Voir le courriel — détection des images distantes", () => {
  const distantes = [
    '<img src="https://pixel.example/o.gif">',
    "<img src='http://pixel.example/o.gif'>",
    "<img src=https://pixel.example/o.gif>",
    '<img src="//pixel.example/o.gif">',
    '<IMG SRC="HTTPS://PIXEL.EXAMPLE/O.GIF">',
    '<img src = " https://pixel.example/o.gif">',
    '<img srcset="a.png 1x, https://cdn.example/b.png 2x">',
    '<table background="https://cdn.example/fond.jpg"><tr><td>x</td></tr></table>',
    '<td style="background:url(https://cdn.example/f.png)">x</td>',
    "<td style=\"background-image: url('http://cdn.example/f.png')\">x</td>",
    '<style>.x{background:url("//cdn.example/f.png")}</style>',
    '<div style="background-image:image-set(\'https://cdn.example/a.png\' 1x)">x</div>',
    '<video poster="https://cdn.example/p.jpg"></video>',
    '<img src="&#104;ttps://pixel.example/o.gif">',
    '<img src="https&colon;//pixel.example/o.gif">',
    '<img alt="x"src="https://pixel.example/o.gif">',
  ];
  for (const html of distantes) {
    it(`détecte ${JSON.stringify(html)}`, () => {
      expect(contientImagesDistantes(html)).toBe(true);
    });
  }

  const locales = [
    null,
    "",
    "<p>Bonjour</p>",
    '<img src="cid:logo@exemple">',
    '<img src="data:image/png;base64,iVBORw0KGgo=">',
    '<img data-src="https://cdn.example/a.png" src="cid:a">',
    '<a href="https://technolot.ca">lien (pas une image)</a>',
    "<p>Visitez https://technolot.ca</p>",
    '<td style="background:url(cid:fond)">x</td>',
  ];
  for (const html of locales) {
    it(`ne signale rien pour ${JSON.stringify(html)}`, () => {
      expect(contientImagesDistantes(html)).toBe(false);
    });
  }
});

describe("Voir le courriel — politique de l'aperçu", () => {
  it("bloque par défaut toute ressource distante (images data:/cid: seulement, aucun script)", () => {
    const doc = srcDocApercu("<p>x</p>", false);
    expect(doc.startsWith(`<meta http-equiv="Content-Security-Policy" content="${CSP_APERCU_BLOQUE}">`)).toBe(true);
    expect(doc.endsWith("<p>x</p>")).toBe(true);
    expect(CSP_APERCU_BLOQUE).toContain("default-src 'none'");
    expect(CSP_APERCU_BLOQUE).toMatch(/img-src data: cid:;/);
    expect(CSP_APERCU_BLOQUE).not.toMatch(/https?:/);
  });

  it("« Afficher les images » permet https seulement (jamais http:, jamais de script)", () => {
    const doc = srcDocApercu("<p>x</p>", true);
    expect(doc).toContain(`content="${CSP_APERCU_IMAGES}"`);
    expect(CSP_APERCU_IMAGES).toMatch(/img-src data: cid: https:;/);
    expect(CSP_APERCU_IMAGES).not.toMatch(/http:/);
    expect(CSP_APERCU_IMAGES).not.toMatch(/script-src/);
    expect(CSP_APERCU_IMAGES).toContain("default-src 'none'");
  });
});

describe("Pièces jointes servies par l'admin", () => {
  it("image et PDF affichés : bac à sable CSP + nosniff", () => {
    for (const type of ["image/png", "image/jpeg", "application/pdf"]) {
      const e = entetesPiece("photo.png", type);
      expect(e["Content-Disposition"]).toMatch(/^inline;/);
      expect(e["Content-Security-Policy"]).toBe(CSP_PIECE_AFFICHEE);
      expect(e["X-Content-Type-Options"]).toBe("nosniff");
    }
    expect(CSP_PIECE_AFFICHEE).toBe(
      "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'self'",
    );
  });

  it("SVG et autres types : téléchargés (attachment), nosniff", () => {
    for (const type of ["image/svg+xml", "text/html", "application/zip"]) {
      const e = entetesPiece("f", type);
      expect(e["Content-Disposition"]).toMatch(/^attachment;/);
      expect(e["X-Content-Type-Options"]).toBe("nosniff");
    }
  });
});

describe("Lien LinkedIn du CRM (urlHttpExterne)", () => {
  it.each([
    ["https://www.linkedin.com/in/jean", "https://www.linkedin.com/in/jean"],
    ["http://linkedin.com/in/jean", "http://linkedin.com/in/jean"],
    ["linkedin.com/in/jean", "https://linkedin.com/in/jean"],
    ["  www.linkedin.com/in/jean  ", "https://www.linkedin.com/in/jean"],
    ["//linkedin.com/in/jean", "https://linkedin.com/in/jean"],
  ])("%s → %s", (entree, attendu) => {
    expect(urlHttpExterne(entree)).toBe(attendu);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "mailto:a@b.c",
    "",
    null,
    "pas une url",
  ])("%j → pas de lien", (entree) => {
    expect(urlHttpExterne(entree as string | null)).toBeNull();
  });
});
