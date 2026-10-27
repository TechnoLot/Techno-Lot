import { localePath, type Locale } from "@/lib/i18n";
import { getAccueil } from "./contenu";
import { PaletteScene } from "./palette-scene";

/** Chapitre lime : la palette se charge au défilement (aucun minimum, chaque lot compte). */
export function Palette({ locale }: { locale: Locale }) {
  const { palette } = getAccueil(locale);
  return <PaletteScene labels={palette} href={localePath(locale, "/soumission")} />;
}
