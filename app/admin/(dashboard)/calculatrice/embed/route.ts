import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";

export const dynamic = "force-dynamic";

/**
 * Sert le HTML de la calculatrice, mais uniquement pour les admins connectés.
 * Le fichier vit hors de /public pour qu'il ne soit pas accessible sans auth.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const filePath = path.join(
    process.cwd(),
    "assets",
    "outils",
    "calculatrice.html",
  );
  const html = await readFile(filePath, "utf8");

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
