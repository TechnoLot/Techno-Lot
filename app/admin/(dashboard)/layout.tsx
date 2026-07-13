import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";

export const metadata: Metadata = {
  title: "Admin — Techno Lot",
  robots: { index: false, follow: false },
};

/**
 * Layout partagé pour toutes les pages du tableau de bord.
 * Le middleware a déjà refusé l'accès aux visiteurs non connectés ;
 * on ajoute ici le check du whitelist ADMIN_EMAILS et l'habillage sidebar.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }
  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    const reason = encodeURIComponent(
      "Ce courriel n'est pas autorisé à accéder au tableau de bord.",
    );
    redirect(`/admin/login?error=${reason}`);
  }

  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
