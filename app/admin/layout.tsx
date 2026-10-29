import "./admin.css";

/**
 * Layout de tout /admin (tableau de bord et connexion) : ne fait que charger la
 * feuille de l'admin (app/admin/admin.css). Le CSS public, inliné dans chaque
 * page du site, ne contient plus les classes ni les composants de l'admin.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
