import type { Metadata } from "next";
import PageHeader from "@/components/admin/PageHeader";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { createClient } from "@/lib/supabase/server";
import { getAdminUsernames } from "@/lib/admin/config";

export const metadata: Metadata = {
  title: "Mon compte — Admin Techno Lot",
  robots: { index: false, follow: false },
};

export default async function ComptePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? "";
  const usernames = Object.entries(getAdminUsernames())
    .filter(([, e]) => e === email)
    .map(([u]) => u);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="Sécurité"
        title="Mon compte"
        description="Ton nom d'utilisateur et ton mot de passe pour te connecter au tableau de bord."
      />

      <div className="admin-card space-y-6 p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">Nom d&apos;utilisateur</dt>
            <dd className="mt-1 font-medium text-white">
              {usernames.length ? usernames.join(", ") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Courriel du compte</dt>
            <dd className="mt-1 truncate font-medium text-white">{email || "—"}</dd>
          </div>
        </dl>

        <div className="border-t border-white/[0.06] pt-6">
          <h2 className="font-display text-base font-semibold text-white">
            Définir le mot de passe
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Au moins 10 caractères. Il est stocké chiffré par Supabase, jamais
            dans le code du site.
          </p>
          <div className="mt-5">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
