import { type NextRequest, NextResponse } from "next/server";
import { legacyPostTarget } from "@/lib/posts";

/**
 * Anciens liens du widget Soro : middleware.ts réécrit /blog?post=<slug> ici.
 * Redirection permanente (308) vers l'article dans sa langue, ou vers /blog
 * si le slug est inconnu. Pendant anglais : app/(en)/en/blog/ancien-lien.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = await legacyPostTarget("fr", url.searchParams.get("post"));
  url.search = "";
  return NextResponse.redirect(url, 308);
}
