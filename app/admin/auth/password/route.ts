import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailForUsername, isAdminEmail } from "@/lib/admin/config";

export const runtime = "nodejs";

const INVALID = "Nom d'utilisateur ou mot de passe invalide.";

/**
 * POST /admin/auth/password
 * Connexion par nom d'utilisateur + mot de passe. Le nom est traduit en
 * courriel côté serveur (ADMIN_USERNAMES), puis Supabase vérifie le mot
 * de passe et pose les cookies de session.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => new FormData());
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  const email = emailForUsername(username);
  if (!email || !isAdminEmail(email) || !password) {
    // Petit délai : même temps de réponse qu'un mot de passe refusé.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans quelques minutes." },
        { status: 429 },
      );
    }
    if (error.code !== "invalid_credentials") {
      console.error("[admin/auth/password] Supabase :", error);
    }
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
