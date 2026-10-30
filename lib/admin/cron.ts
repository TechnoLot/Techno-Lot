import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";

/**
 * Tâches planifiées (pg_cron → `Authorization: Bearer $CRON_SECRET`, vérifié
 * par `bearerCronValide` de lib/securite/garde.ts).
 */

/** Journalise `cron.refus` (Bearer absent ou invalide). */
export function signalerCronRefuse(request: Request, requestId: string = randomUUID()): void {
  void journaliser(EVENEMENTS.cronRefus, {
    resultat: "refus",
    request,
    requestId,
    statut: 401,
    details: { entete_present: request.headers.has("authorization") },
  });
}

/** Refus d'un appel planifié : `cron.refus` journalisé, 401 sans détail. */
export function refusCron(request: Request): NextResponse {
  const requestId = randomUUID();
  signalerCronRefuse(request, requestId);
  return NextResponse.json(
    { error: "Non autorisé." },
    { status: 401, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
  );
}

/** Client `service_role` des tâches planifiées, ou null si la clé manque. */
export function clientServiceCron(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return null;
  return createClient(url, cle, { auth: { persistSession: false } });
}

/** 503 quand la clé `service_role` manque (nom de variable seulement). */
export function reponseServiceManquant(): NextResponse {
  return NextResponse.json(
    { error: "SUPABASE_SERVICE_ROLE_KEY est requis côté serveur pour les tâches planifiées." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
