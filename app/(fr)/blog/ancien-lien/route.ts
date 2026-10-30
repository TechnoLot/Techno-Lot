import { type NextRequest } from "next/server";
import { legacyPostTarget } from "@/lib/posts";

/**
 * Anciens liens du widget Soro : middleware.ts réécrit /blog?post=<slug> ici.
 * Redirection permanente (308) vers l'article dans sa langue, ou vers /blog
 * si le slug est inconnu. Pendant anglais : app/(en)/en/blog/ancien-lien.
 *
 * `Location` RELATIVE (chemin seulement) : jamais construite à partir de
 * l'en-tête Host, que le client choisit. Slug borné à 200 caractères.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const post = request.nextUrl.searchParams.get("post");
  const chemin = await legacyPostTarget("fr", post && post.length <= 200 ? post : null);
  return new Response(null, { status: 308, headers: { Location: chemin } });
}
