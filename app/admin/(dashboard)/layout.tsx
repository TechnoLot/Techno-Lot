import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import NotificationsProvider from "@/components/admin/notifications/NotificationsProvider";
import { createClient } from "@/lib/supabase/server";
import { exigerAdminPage, verifierAdmin } from "@/lib/securite/garde";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { isEbayConfigured } from "@/lib/ebay/client";
import { configurationSecuriteIncomplete } from "@/lib/securite/env";

export const metadata: Metadata = {
  title: "Admin — Techno Lot",
  robots: { index: false, follow: false },
};

/**
 * Jamais de pré-rendu au build : la garde lit la session (témoins) à chaque
 * requête. Sans cela, Next tente de pré-rendre les pages sans paramètres
 * (compte, calculatrice, eBay) et la garde journalise de faux refus.
 */
export const dynamic = "force-dynamic";

const MESSAGE_NON_AUTORISE = "Ce courriel n'est pas autorisé à accéder au tableau de bord.";

/**
 * Layout partagé pour toutes les pages du tableau de bord.
 * Garde admin commune (lib/securite/garde.ts : session revalidée, ADMIN_EMAILS,
 * rôle `est_admin()`, reconnexion chaque jour) ; chaque page la refait aussi en
 * première ligne (Next peut rendre une page sans son layout).
 * Cas propre au layout : la session valide d'un courriel non autorisé est
 * fermée (signOut) avant la redirection. Les autres refus passent par
 * `exigerAdminPage` (journal `admin.refus` + redirection vers la connexion).
 * Le thème (clair ou sombre) vient du témoin tl_admin_theme. La pastille des
 * notifications (menu et barre mobile) se met à jour toute seule ; la synchro
 * eBay tourne en fond quand eBay est connecté (alerte des nouvelles ventes).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const verdict = await verifierAdmin();
  if (!verdict.ok && verdict.motif === "courriel_non_autorise") {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // La redirection suit quand même.
    }
    void journaliser(EVENEMENTS.adminRefus, {
      resultat: "refus",
      entetes: await headers(),
      methode: "GET",
      chemin: "/admin",
      requestId: verdict.requestId,
      userId: verdict.userId,
      statut: 403,
      details: { motif: verdict.motif, deconnecte: true },
    });
    redirect(`/admin/login?error=${encodeURIComponent(MESSAGE_NON_AUTORISE)}`);
  }
  // Tout autre refus : journal + redirection (connexion, session expirée, rôle refusé).
  const { user } = verdict.ok ? verdict.ctx : await exigerAdminPage("/admin");

  const theme = (await cookies()).get("tl_admin_theme")?.value === "dark" ? "dark" : "light";
  // Noms seulement (jamais de valeur) : bandeau d'avertissement si non vide.
  const configurationIncomplete = configurationSecuriteIncomplete();

  return (
    <NotificationsProvider ebayConfigured={isEbayConfigured()}>
      <AdminShell
        email={user.email ?? ""}
        theme={theme}
        configurationIncomplete={configurationIncomplete}
      >
        {children}
      </AdminShell>
    </NotificationsProvider>
  );
}
