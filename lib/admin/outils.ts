import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Outils HTML encadrés de l'admin (assets/outils/*.html : calculatrice et
 * créateur de description eBay), servis par les routes `embed` APRÈS la garde
 * admin. Les fichiers vivent hors de /public pour ne pas être servis sans auth.
 *
 * Politique de sécurité du contenu propre à ces pages (check T7) : elles ne
 * chargent que leur script et leurs styles en ligne, les polices Google
 * (calculatrice), des images data:/blob:/https: (aperçu eBay), et n'appellent
 * que nos routes (`fetch('/admin/calculatrice/api/…')`, `/api/admin/ebay-import`).
 * L'aperçu eBay est un iframe `srcdoc` (même politique, hérité).
 */
export const CSP_OUTILS = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export const OUTILS = {
  calculatrice: "calculatrice.html",
  ebay: "ebay-description.html",
} as const;

/** Réponse HTML d'un outil, avec CSP imposée, encadrement limité au site et sans cache. */
export async function reponseOutil(outil: keyof typeof OUTILS): Promise<NextResponse> {
  const html = await readFile(path.join(process.cwd(), "assets", "outils", OUTILS[outil]), "utf8");
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP_OUTILS,
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
