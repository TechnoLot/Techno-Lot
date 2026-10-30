import type { Metadata } from "next";
import PageHeader from "@/components/admin/PageHeader";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import PrenomForm from "@/components/admin/PrenomForm";
import { exigerAdminPage } from "@/lib/securite/garde";
import { site } from "@/lib/site";
import { getAdminUsernames, resolvePrenom } from "@/lib/admin/config";

export const metadata: Metadata = {
  title: "Mon compte — Admin Techno Lot",
  robots: { index: false, follow: false },
};

export default async function ComptePage() {
  const { user } = await exigerAdminPage("/admin/compte");
  const email = user?.email?.toLowerCase() ?? "";
  const usernames = Object.entries(getAdminUsernames())
    .filter(([, e]) => e === email)
    .map(([u]) => u);
  // Sans session (contournement local), on retombe sur le courriel de l'entreprise.
  const prenom = resolvePrenom(email || site.email, user?.user_metadata) ?? "";

  return (
    <div className="mx-auto max-w-xl px-4 py-7 sm:px-8 sm:py-9">
      <PageHeader
        eyebrow="Sécurité"
        title="Mon compte"
        description="Ton prénom, ton nom d'utilisateur et ton mot de passe pour te connecter au tableau de bord."
      />

      <div className="rounded-2xl border border-admin-line bg-admin-card space-y-6 p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-admin-muted">Nom d&apos;utilisateur</dt>
            <dd className="mt-1 font-medium text-admin-ink">
              {usernames.length ? usernames.join(", ") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-admin-muted">Courriel du compte</dt>
            <dd className="mt-1 truncate font-medium text-admin-ink">{email || "—"}</dd>
          </div>
        </dl>

        <div className="border-t border-admin-line pt-6">
          <h2 className="font-display text-base font-semibold text-admin-ink">Ton prénom</h2>
          <div className="mt-4">
            <PrenomForm initial={prenom} />
          </div>
        </div>

        <div className="border-t border-admin-line pt-6">
          <h2 className="font-display text-base font-semibold text-admin-ink">
            Définir le mot de passe
          </h2>
          <p className="mt-1 text-sm text-admin-muted">
            Au moins 12 caractères. Ton mot de passe actuel est demandé.
            Supabase n&apos;en garde qu&apos;une empreinte irréversible, jamais
            le mot de passe lui-même.
          </p>
          <div className="mt-5">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
