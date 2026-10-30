import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import MfaForm from "@/components/admin/MfaForm";
import { exigerSessionMfaPage } from "@/lib/securite/garde";
import { cheminApresMfa, facteursTotp } from "@/lib/securite/mfa";

export const metadata: Metadata = {
  title: "Double authentification — Admin",
  robots: { index: false, follow: false },
};

// Lit la session (témoins) à chaque requête : jamais de pré-rendu.
export const dynamic = "force-dynamic";

/**
 * Double authentification de l'admin (décision du 30 oct. 2026).
 * Garde : session de moins de 24 h d'un courriel de ADMIN_EMAILS (aal1 suffit),
 * sinon retour à la connexion. Le middleware y envoie toute page /admin tant
 * que la session n'est pas aal2.
 *  - aucun facteur TOTP vérifié → activation (code QR + clé + premier code) ;
 *  - facteur vérifié, session aal1 → code de vérification ;
 *  - facteur vérifié, session aal2 → directement vers `next`.
 * Même gabarit que /admin/login.
 */
export default async function MfaPage(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  const next = cheminApresMfa(searchParams.next);
  const { user, aal } = await exigerSessionMfaPage(next);

  const { verifies } = facteursTotp(user.factors);
  if (verifies.length > 0 && aal === "aal2") redirect(next);
  const mode = verifies.length > 0 ? "verification" : "activation";

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
              {mode === "activation" ? "Activer la double authentification" : "Code de vérification"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-admin-muted">
              {mode === "activation"
                ? "Pour protéger tes données, l'admin demande un code de ton application d'authentification à chaque connexion."
                : "Entre le code à 6 chiffres affiché dans ton application d'authentification."}
            </p>
          </div>
          <div className="mt-7">
            <MfaForm mode={mode} next={next} />
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] text-admin-muted">
          Accès réservé à l&apos;équipe Techno Lot.
        </p>
      </div>
    </div>
  );
}
