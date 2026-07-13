import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin/config";

export const runtime = "nodejs";

/**
 * POST /admin/auth/request
 * Envoie un lien magique au courriel admin configuré (ADMIN_EMAILS[0]).
 * Le client ne fournit PAS l'adresse — c'est le serveur qui décide.
 * On empêche ainsi qu'un visiteur déclenche l'envoi vers un courriel
 * qu'il choisit.
 */
export async function POST(request: Request) {
  const admins = getAdminEmails();
  const target = admins[0];

  if (!target) {
    return NextResponse.json(
      {
        error:
          "Aucun courriel admin n'est configuré (ADMIN_EMAILS vide).",
      },
      { status: 503 },
    );
  }

  // Lecture optionnelle de la destination souhaitée après connexion
  const form = await request.formData().catch(() => new FormData());
  const next = String(form.get("next") ?? "/admin");

  const supabase = createClient();
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/admin/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: target,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("[admin/auth/request] Supabase :", error);
    // Endpoint privé (whitelist ADMIN_EMAILS) : on peut exposer le message
    // Supabase directement, ça aide à diagnostiquer les problèmes de config.
    return NextResponse.json(
      {
        error: `Supabase : ${error.message}`,
        code: error.code ?? null,
        status: error.status ?? null,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sent: true });
}
