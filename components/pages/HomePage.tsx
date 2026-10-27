import type { Locale } from "@/lib/i18n";
import { Hero } from "@/components/accueil/hero/Hero";
import { Stats } from "@/components/accueil/Stats";
import { Etapes } from "@/components/accueil/Etapes";
import { Palette } from "@/components/accueil/Palette";
import { Donnees } from "@/components/accueil/Donnees";
import { Zones } from "@/components/accueil/Zones";
import { SecondeVie } from "@/components/accueil/SecondeVie";
import { Rachetons } from "@/components/accueil/Rachetons";
import { AppelFinal } from "@/components/accueil/AppelFinal";

/**
 * Accueil « chapitres de couleur » : chaque section est un aplat plein écran
 * d'une couleur de la marque, dans cet ordre (deux voisins diffèrent en clarté) :
 * vert profond → blanc → noir → lime → noir → menthe → vert profond → menthe → blanc.
 * Les sections vivent dans components/accueil/.
 */
export default function HomePage({ locale }: { locale: Locale }) {
  return (
    <>
      <Hero locale={locale} />
      <Stats locale={locale} />
      <Etapes locale={locale} />
      <Palette locale={locale} />
      <Donnees locale={locale} />
      <Zones locale={locale} />
      <SecondeVie locale={locale} />
      <Rachetons locale={locale} />
      <AppelFinal locale={locale} />
    </>
  );
}
