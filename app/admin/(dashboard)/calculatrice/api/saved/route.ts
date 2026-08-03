import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false as const };
  }
  return { ok: true as const, supabase, user };
}

/** GET : liste tous les lots enregistrés (partagés entre tous les admins). */
export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await ctx.supabase
    .from("saved_lots")
    .select("id, name, data, created_at, updated_at, created_by_email")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ lots: data ?? [] });
}

/**
 * POST : enregistre un lot. Si un lot du même nom (insensible à la casse)
 * existe déjà, il est écrasé — même comportement que l'ancienne archive
 * localStorage.
 */
export async function POST(req: Request) {
  const ctx = await requireAdmin();
  if (!ctx.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { name?: unknown; data?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const data = payload.data;
  if (!name || !data || typeof data !== "object") {
    return NextResponse.json(
      { error: "Nom et données requis" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { data: existing } = await ctx.supabase
    .from("saved_lots")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    const { error } = await ctx.supabase
      .from("saved_lots")
      .update({ name, data, updated_at: now })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: existing.id, updated: true });
  }

  const { data: inserted, error } = await ctx.supabase
    .from("saved_lots")
    .insert({
      name,
      data,
      created_by: ctx.user.id,
      created_by_email: ctx.user.email ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: inserted.id, updated: false });
}
