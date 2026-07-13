import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "@/components/admin/LoginForm";
import { getAdminEmails } from "@/lib/admin/config";

export const metadata: Metadata = {
  title: "Connexion — Admin",
  robots: { index: false, follow: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const adminEmails = getAdminEmails();
  const target = adminEmails[0] ?? "info@technolot.ca";

  return (
    <div className="relative min-h-screen bg-night-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass space-y-7 p-8">
            <Image
              src="/logo.png"
              alt="Techno Lot"
              width={200}
              height={120}
              priority
              className="mx-auto h-14 w-auto"
            />
            <div className="text-center">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Tableau de bord
              </p>
              <h1 className="mt-3 font-display text-2xl font-bold text-white">
                Connexion admin
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Le lien de connexion sera envoyé au courriel officiel. Ouvre-le
                dans le mail pour te connecter.
              </p>
            </div>
            <LoginForm
              email={target}
              next={searchParams.next ?? "/admin"}
              initialError={searchParams.error}
            />
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Accès réservé à l&apos;équipe Techno Lot.
          </p>
        </div>
      </div>
    </div>
  );
}
