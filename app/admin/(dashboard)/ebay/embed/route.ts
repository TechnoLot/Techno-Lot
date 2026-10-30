import { estRefus, exigerAdminRoute } from "@/lib/securite/garde";
import { reponseOutil } from "@/lib/admin/outils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sert le HTML du créateur de description eBay, mais uniquement pour les admins
 * connectés (garde admin), avec sa propre politique de sécurité du contenu
 * (lib/admin/outils.ts).
 */
export async function GET(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  return reponseOutil("ebay");
}
