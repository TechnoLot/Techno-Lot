/**
 * Outils des tests F2 (routes publiques) : fabrication de fichiers et de
 * requêtes. Aucun appel réseau.
 */

const enc = new TextEncoder();

export function octets(...parties: (string | number[] | Uint8Array)[]): Uint8Array<ArrayBuffer> {
  const morceaux = parties.map((p) =>
    typeof p === "string" ? enc.encode(p) : p instanceof Uint8Array ? p : Uint8Array.from(p),
  );
  const total = morceaux.reduce((s, m) => s + m.length, 0);
  const o = new Uint8Array(total);
  let i = 0;
  for (const m of morceaux) {
    o.set(m, i);
    i += m.length;
  }
  return o;
}

function u16(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}
function u32(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}

/** Archive ZIP minimale (entrées « stockées », sans compression ni CRC réel). */
export function zip(entrees: Record<string, string>): Uint8Array<ArrayBuffer> {
  const locaux: Uint8Array[] = [];
  const centraux: Uint8Array[] = [];
  let decalage = 0;
  for (const [nom, contenu] of Object.entries(entrees)) {
    const n = enc.encode(nom);
    const c = enc.encode(contenu);
    const local = octets(
      [0x50, 0x4b, 0x03, 0x04],
      u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(c.length), u32(c.length),
      u16(n.length), u16(0),
      n, c,
    );
    const central = octets(
      [0x50, 0x4b, 0x01, 0x02],
      u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(c.length), u32(c.length),
      u16(n.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(decalage),
      n,
    );
    locaux.push(local);
    centraux.push(central);
    decalage += local.length;
  }
  const repertoire = octets(...centraux);
  const fin = octets(
    [0x50, 0x4b, 0x05, 0x06],
    u16(0), u16(0),
    u16(centraux.length), u16(centraux.length),
    u32(repertoire.length), u32(decalage),
    u16(0),
  );
  return octets(...locaux, repertoire, fin);
}

export const XLSX_VALIDE = () =>
  zip({
    "[Content_Types].xml": "<Types/>",
    "_rels/.rels": "<Relationships/>",
    "xl/workbook.xml": "<workbook/>",
    "xl/worksheets/sheet1.xml": "<worksheet/>",
  });

/** Fichier OLE (Excel 97-2003) minimal : signature + nom de flux « Workbook » en UTF-16LE. */
export function ole(nomFlux: string): Uint8Array<ArrayBuffer> {
  const nom = new Uint8Array(nomFlux.length * 2);
  for (let i = 0; i < nomFlux.length; i++) nom[i * 2] = nomFlux.charCodeAt(i);
  return octets([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], new Uint8Array(504), nom, new Uint8Array(64));
}

export const PDF_VALIDE = () => octets("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
export const JPEG_VALIDE = () => octets([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "JFIF", new Uint8Array(32), [0xff, 0xd9]);
export const PNG_VALIDE = () => octets([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], new Uint8Array(32));
export const HEIC_VALIDE = () => octets(u32(0x18).reverse(), "ftypheic", new Uint8Array(16));

/**
 * Requête POST multipart avec un vrai Content-Length (comme un navigateur) :
 * le FormData est sérialisé d'abord.
 */
export async function requeteMultipart(
  url: string,
  fd: FormData,
  entetes: Record<string, string> = {},
): Promise<Request> {
  const brouillon = new Request(url, { method: "POST", body: fd });
  const corps = await brouillon.arrayBuffer();
  return new Request(url, {
    method: "POST",
    body: corps,
    headers: {
      "content-type": brouillon.headers.get("content-type") ?? "",
      "content-length": String(corps.byteLength),
      ...entetes,
    },
  });
}

export function requeteTexte(
  url: string,
  corps: string,
  type: string,
  entetes: Record<string, string> = {},
): Request {
  const o = new TextEncoder().encode(corps);
  return new Request(url, {
    method: "POST",
    body: o,
    headers: { "content-type": type, "content-length": String(o.byteLength), ...entetes },
  });
}

/** Charges de redirection du test T5 (scratchpad/securite/t5/test-redirections.mjs), telles qu'écrites dans une URL. */
export const CHARGES_REDIRECTION = [
  "//evil.com",
  "/\\evil.com",
  "/%2F%2Fevil.com",
  "/%5Cevil.com",
  "%2F%2Fevil.com",
  "https://evil.com",
  "javascript:alert(1)",
  "/%09/evil.com",
  "/%0A/evil.com",
  "/%0D/evil.com",
  "/%09%5Cevil.com",
  "/%252F%252Fevil.com",
  "https://evil.com/faux-login",
  "javascript:alert(document.cookie)",
] as const;

/** Champs déjà décodés (formulaire de /admin/auth/request). */
export const CHARGES_DECODEES = ["/\t/evil.com", "/\n/evil.com", "//evil.com", "/\\evil.com"] as const;
