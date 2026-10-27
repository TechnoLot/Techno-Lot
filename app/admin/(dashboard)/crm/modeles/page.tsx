import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "@/components/admin/crm/TemplateEditor";
import type { EmailTemplate } from "@/lib/crm/types";

export const dynamic = "force-dynamic";

const TYPE_ORDER = [
  "cold_outreach",
  "post_call_intro",
  "followup_1",
  "followup_2",
  "followup_3",
];

/** Modèles de courriels de prospection — modifiables sans redéployer. */
export default async function ModelesPage() {
  const supabase = createClient();

  const { data: templatesRaw } = await supabase
    .from("email_templates")
    .select("*");
  const templates = ((templatesRaw ?? []) as EmailTemplate[]).sort(
    (a, b) =>
      TYPE_ORDER.indexOf(a.template_type) - TYPE_ORDER.indexOf(b.template_type),
  );

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
        <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">
          Modèles de courriels
        </h1>
        <p className="mt-2 max-w-lg text-sm text-admin-muted">
          Le contenu des envois « info Techno Lot » et des relances. Les
          changements prennent effet immédiatement, sans redéploiement.
        </p>
      </header>

      <div className="flex max-w-3xl flex-col gap-6">
        {templates.length === 0 && (
          <div className="glass p-12 text-center">
            <p className="text-sm text-admin-muted">
              Aucun modèle en base. Insère des lignes dans{" "}
              <code className="text-admin-ink">email_templates</code>.
            </p>
          </div>
        )}
        {templates.map((t) => (
          <TemplateEditor key={t.id} template={t} />
        ))}
      </div>
    </div>
  );
}
