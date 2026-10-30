import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerAdminPage } from "@/lib/securite/garde";
import { journaliserErreur } from "@/lib/admin/erreurs-admin";
import EnvoiEnGros, { type ModeleDepart } from "@/components/admin/crm/EnvoiEnGros";
import { TEMPLATE_TYPE_LABELS, type TemplateType } from "@/lib/crm/types";

export const dynamic = "force-dynamic";
/** Un lot (100 courriels, fiches et traces) peut prendre plusieurs secondes. */
export const maxDuration = 60;

/** Modèles proposés au départ d'un envoi en gros (pas les relances). */
const TYPES_PROPOSES: TemplateType[] = ["cold_outreach", "post_call_intro"];

/**
 * Envoi en gros : une liste collée ou importée (CSV d'Excel), un objet et un
 * message, vérifiés côté serveur, puis envoyés par lots de 100, un courriel
 * personnalisé par destinataire (aucun ne voit les autres).
 */
export default async function EnvoiEnGrosPage() {
  const ctx = await exigerAdminPage("/admin/crm/envoi-en-gros");

  const { data, error } = await ctx.supabase
    .from("email_templates")
    .select("id, name, template_type, subject, body")
    .eq("is_active", true)
    .in("template_type", TYPES_PROPOSES)
    .order("updated_at", { ascending: false });

  const modeles: ModeleDepart[] = (
    (data ?? []) as { id: string; name: string | null; template_type: TemplateType; subject: string; body: string }[]
  ).map((m) => ({
    id: m.id,
    libelle: m.name?.trim() || TEMPLATE_TYPE_LABELS[m.template_type] || m.template_type,
    objet: m.subject,
    corps: m.body,
  }));

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <Link
        href="/admin/crm"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">Envoi en gros</h1>
        <p className="mt-2 max-w-2xl text-sm text-admin-muted">
          Colle une liste d&apos;adresses ou importe un CSV, écris le message, vérifie, puis confirme.
          Chaque destinataire reçoit son propre courriel personnalisé (il ne voit jamais la liste),
          envoyé par lots de 100 avec la signature et la mention de désabonnement.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Modèles de courriel indisponibles pour l&apos;instant : écris le message à la main. Réf. :{" "}
          {await journaliserErreur(error, "crm.envoi_gros.modeles_lire", ctx)}
        </div>
      )}

      <EnvoiEnGros modeles={modeles} />
    </div>
  );
}
