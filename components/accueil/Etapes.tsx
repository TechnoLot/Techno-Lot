import { localePath, type Locale } from "@/lib/i18n";
import { getAccueil } from "./contenu";
import { EtapesAccordeon } from "./etapes-accordeon";

/**
 * « Comment ça marche ? » (chapitre bleu nuit) : accordéon des 4 étapes, épinglé au défilement.
 * Ancre visée par le bouton du héros.
 */
export function Etapes({ locale }: { locale: Locale }) {
  const { steps } = getAccueil(locale);
  return (
    <section id="comment-ca-marche" data-theme="night" className="relative text-mist">
      <EtapesAccordeon steps={steps} href={localePath(locale, "/soumission")} />
    </section>
  );
}
