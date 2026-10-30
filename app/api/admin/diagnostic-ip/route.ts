import { NextResponse } from "next/server";
import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { ipClient } from "@/lib/securite/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic de l'adresse IP (admin seulement, sans effet).
 *
 * Sert à confirmer, après la mise en ligne chez Hostinger, quelle entrée des
 * en-têtes de mandataire contient la vraie IP du visiteur (lib/securite/ip.ts) :
 *  1. ouvrir /api/admin/diagnostic-ip connecté à l'admin et comparer `ip_choisie`
 *     avec sa vraie IP (ex. https://ifconfig.me) ;
 *  2. refaire l'appel avec un faux en-tête (`X-Forwarded-For: 203.0.113.9`, par
 *     curl avec le témoin de session) : `ip_choisie` ne doit PAS devenir
 *     203.0.113.9.
 */
const ENTETES = ["x-forwarded-for", "x-real-ip", "forwarded", "x-vercel-forwarded-for"] as const;

export async function GET(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;

  const recus = Object.fromEntries(ENTETES.map((nom) => [nom, request.headers.get(nom)]));
  return NextResponse.json(
    { entetes: recus, ip_choisie: ipClient(request), vercel: Boolean(process.env.VERCEL) },
    { headers: { "Cache-Control": "no-store", "X-Request-Id": garde.requestId } },
  );
}
