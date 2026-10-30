import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "@/components/admin/LoginForm";
import { getAdminEmails } from "@/lib/admin/config";
import { messageErreurConnexion } from "@/lib/admin/messages-connexion";
import { cheminInterne } from "@/lib/securite/chemin-interne";

export const metadata: Metadata = {
  title: "Connexion — Admin",
  robots: { index: false, follow: false },
};

export default async function LoginPage(
  props: {
    searchParams: Promise<{ next?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const adminEmails = getAdminEmails();
  const target = adminEmails[0] ?? "info@technolot.ca";

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-page px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-admin-line bg-admin-card p-7 shadow-[0_1px_2px_rgba(16,24,16,0.04)] sm:p-8">
          <Image
            src="/logo-clair.png"
            alt="Techno Lot"
            width={200}
            height={116}
            priority
            className="mx-auto h-12 w-auto"
          />
          <div className="mt-6 text-center">
            <h1 className="font-display text-2xl font-bold text-admin-ink">
              Connexion
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-admin-muted">
              Tableau de bord Techno Lot
            </p>
          </div>
          <div className="mt-7">
            <LoginForm
              email={target}
              next={cheminInterne(searchParams.next)}
              initialError={messageErreurConnexion(searchParams.error)}
            />
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] text-admin-muted">
          Accès réservé à l&apos;équipe Techno Lot.
        </p>
      </div>
    </div>
  );
}
