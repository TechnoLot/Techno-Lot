import type { Locale } from "@/lib/i18n";
import { CtaBanner } from "@/components/site/CtaBanner";
import { getChapitres } from "./contenu-chapitres";

/**
 * Appel final de l'accueil : le même bas de page que les autres pages (carte lime
 * simple, puis ruban de liens utiles qui défile).
 */
export function AppelFinal({ locale }: { locale: Locale }) {
  const { appelFinal } = getChapitres(locale);
  return <CtaBanner locale={locale} title={appelFinal.title} text={appelFinal.subtitle} buttonLabel={appelFinal.button} current="/" />;
}
