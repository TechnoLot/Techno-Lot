import { localePath, type Locale } from "@/lib/i18n";
import { getAccueil } from "./contenu";
import { DonneesDestruction } from "./donnees-destruction";

/** Destruction des données (chapitre bleu nuit) : le disque se dissout, le certificat se pose. */
export function Donnees({ locale }: { locale: Locale }) {
  const { donnees } = getAccueil(locale);
  return <DonneesDestruction labels={donnees} href={localePath(locale, "/soumission")} />;
}
