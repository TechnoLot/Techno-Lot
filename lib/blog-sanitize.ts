import { localePath, type Locale } from "@/lib/i18n";

/**
 * Désinfectant du HTML des articles du blogue (articles Soro, contenu tiers
 * généré par IA, et réécritures locales), rendu avec dangerouslySetInnerHTML
 * dans components/pages/BlogPostPage.tsx. Isolé ici pour être testé
 * (tests/securite/f4-*.test.ts).
 *
 * Principe : liste blanche de balises, attributs RECONSTRUITS (jamais
 * recopiés), et tout « < » qui n'ouvre pas une balise reconnue devient
 * « &lt; » au même passage. Ainsi aucun « < » de la sortie ne vient du texte
 * d'origine : un retrait de balise ne peut pas recoller un « < » orphelin à la
 * suite (contournement `<<x>img src=x onerror=…>`, audit T7 07-2).
 */

export type ArticleHeading = { id: string; text: string };

export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const ALLOWED_TAGS = new Set([
  "p", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "em", "b", "i",
  "blockquote", "br", "hr", "table", "thead", "tbody", "tr", "th", "td",
  "img", "figure", "figcaption", "code", "pre", "sup", "sub",
]);

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function getAttr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

/**
 * Assainit le HTML venu de Soro (liste blanche de balises, attributs
 * reconstruits), rend relatifs les liens vers technolot.ca, ouvre les liens
 * externes dans un nouvel onglet et donne un id aux intertitres h2 (sommaire).
 */
export function sanitizeArticleHtml(
  input: string,
  locale: Locale,
): { html: string; headings: ArticleHeading[]; words: number } {
  let s = input.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(
    /<(script|style|iframe|object|embed|form|noscript|template|svg|math|textarea|select)\b[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  // Le h1 de la page est le titre : un éventuel h1 du corps devient h2
  s = s.replace(/<(\/?)h1\b/gi, "<$1h2");

  const headings: ArticleHeading[] = [];
  const used = new Set<string>();
  s = s.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2\s*>/gi, (_m, inner: string) => {
    const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    const base = slugifyHeading(text) || "section";
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    headings.push({ id, text });
    return `<h2 data-anchor="${id}">${inner}</h2>`;
  });

  // Balise non fermée en fin de texte : supprimée (rien ne la suit).
  s = s.replace(/<[^>]*$/, "");

  // Un seul passage de gauche à droite : chaque « < » est soit le début d'une
  // balise (reconstruite ou retirée), soit un caractère isolé neutralisé.
  s = s.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|</g,
    (_m, close: string | undefined, rawTag: string | undefined, attrs: string | undefined) => {
      if (rawTag === undefined) return "&lt;";
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (close) return tag === "br" || tag === "hr" || tag === "img" ? "" : `</${tag}>`;
      const attributs = attrs ?? "";
      if (tag === "h2") {
        // Identifiant produit par slugifyHeading (lettres, chiffres, tirets) seulement.
        const id = getAttr(attributs, "data-anchor");
        return id && /^[a-z0-9-]{1,80}$/.test(id) ? `<h2 id="${id}">` : "<h2>";
      }
      if (tag === "a") {
        let href = (getAttr(attributs, "href") ?? "").trim();
        const own = href.match(/^https?:\/\/(?:www\.)?technolot\.ca(\/[^\s"'<>]*)?$/i);
        if (own) {
          const path = own[1] && own[1] !== "/" ? own[1] : "/";
          href = /^\/en(\/|$)/.test(path) ? path : localePath(locale, path);
          return `<a href="${escapeAttr(href)}">`;
        }
        if (/^https?:\/\//i.test(href)) {
          return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`;
        }
        // Lien du site : « / » suivi d'autre chose que « / » ou « \ » (que les
        // navigateurs lisent comme « // », donc un autre site).
        if (/^(\/(?![/\\])|#|mailto:|tel:)/i.test(href)) return `<a href="${escapeAttr(href)}">`;
        return "<a>";
      }
      if (tag === "img") {
        const src = (getAttr(attributs, "src") ?? "").trim();
        if (!/^https:\/\//i.test(src)) return "";
        const alt = getAttr(attributs, "alt") ?? "";
        return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async">`;
      }
      if (tag === "th" || tag === "td") {
        const span = getAttr(attributs, "colspan");
        return span && /^\d{1,2}$/.test(span) ? `<${tag} colspan="${span}">` : `<${tag}>`;
      }
      return `<${tag}>`;
    },
  );
  // Filet (sans effet attendu après le passage ci-dessus) : tout « < » qui
  // n'ouvre pas une balise permise est neutralisé.
  s = s.replace(/<(?!\/?(?:p|h2|h3|h4|ul|ol|li|a|strong|em|b|i|blockquote|br|hr|table|thead|tbody|tr|th|td|img|figure|figcaption|code|pre|sup|sub)\b)/g, "&lt;");

  const words = decodeEntities(s.replace(/<[^>]+>/g, " "))
    .split(/\s+/)
    .filter(Boolean).length;
  return { html: s, headings, words };
}
