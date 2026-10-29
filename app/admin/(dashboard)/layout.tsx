import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import NotificationsProvider from "@/components/admin/notifications/NotificationsProvider";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { isEbayConfigured } from "@/lib/ebay/client";

export const metadata: Metadata = {
  title: "Admin — Techno Lot",
  robots: { index: false, follow: false },
};

/**
 * Layout partagé pour toutes les pages du tableau de bord.
 * Le middleware a déjà refusé l'accès aux visiteurs non connectés ;
 * on ajoute ici le check du whitelist ADMIN_EMAILS et l'habillage sidebar.
 * Le thème (clair ou sombre) vient du témoin tl_admin_theme. La pastille des
 * notifications (menu et barre mobile) se met à jour toute seule ; la synchro
 * eBay tourne en fond quand eBay est connecté (alerte des nouvelles ventes).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = cookies().get("tl_admin_theme")?.value === "dark" ? "dark" : "light";
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

  return (
    <NotificationsProvider ebayConfigured={isEbayConfigured()}>
      <AdminShell email={user.email ?? ""} theme={theme}>
        {children}
      </AdminShell>
    </NotificationsProvider>
  );
}
