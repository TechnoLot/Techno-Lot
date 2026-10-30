import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return { supabase, user };
}

/** GET /api/saved/[id] — récupère un lot enregistré (pour le rouvrir dans la calculatrice). */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from("saved_lots")
    .select("id, name, data, created_at, updated_at, created_by_email")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Introuvable" },
      { status: 404 },
    );
  }
  return NextResponse.json({ lot: data });
}

/** DELETE : supprime un lot enregistré. */
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await ctx.supabase
    .from("saved_lots")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
