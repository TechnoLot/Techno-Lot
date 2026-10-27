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
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f2] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-[#e3eadf] bg-white p-7 shadow-[0_1px_2px_rgba(16,24,16,0.04)] sm:p-8">
          <Image
            src="/logo-clair.png"
            alt="Techno Lot"
            width={200}
            height={116}
            priority
            className="mx-auto h-12 w-auto"
          />
          <div className="mt-6 text-center">
            <h1 className="font-display text-2xl font-bold text-[#0a0a0a]">
              Connexion
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#4f5a52]">
              Tableau de bord Techno Lot
            </p>
          </div>
          <div className="mt-7">
            <LoginForm
              email={target}
              next={searchParams.next ?? "/admin"}
              initialError={searchParams.error}
            />
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] text-[#4f5a52]">
          Accès réservé à l&apos;équipe Techno Lot.
        </p>
      </div>
    </div>
  );
}
