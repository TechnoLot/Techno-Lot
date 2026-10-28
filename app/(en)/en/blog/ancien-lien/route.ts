import { type NextRequest, NextResponse } from "next/server";
import { legacyPostTarget } from "@/lib/posts";

/**
 * Anciens liens du widget Soro : middleware.ts réécrit /en/blog?post=<slug>
 * ici. Redirection permanente (308) vers l'article dans sa langue, ou vers
 * /en/blog si le slug est inconnu.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = await legacyPostTarget("en", url.searchParams.get("post"));
  url.search = "";
  return NextResponse.redirect(url, 308);
}
