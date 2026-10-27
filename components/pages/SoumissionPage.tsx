import { PageHero } from "@/components/site/PageHero";
import SubmissionForm from "@/components/SubmissionForm";
import { Engagements } from "@/components/formulaire/Engagements";
import type { Locale } from "@/lib/i18n";

const content = {
  fr: {
    title: "Obtenez une offre pour votre lot",
    intro:
      "Décrivez votre matériel en trois étapes. Nous vous répondons dans un délai de 24 heures, et le ramassage est gratuit partout au Québec.",
    formLabel: "Formulaire de soumission",
  },
  en: {
    title: "Get an offer for your lot",
    intro:
      "Describe your equipment in three steps. We get back to you within 24 hours, and pickup is free anywhere in Québec.",
    formLabel: "Quote request form",
  },
};

export default function SoumissionPage({ locale }: { locale: Locale }) {
  const t = content[locale];

  return (
    <>
      <PageHero title={t.title} intro={t.intro} size="compact" />

      <section data-theme="mint" aria-label={t.formLabel} className="tlf relative py-12 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:gap-10">
          {/* Pas de Reveal ici : le formulaire est visible dès le chargement (rien de caché sans JS). */}
          <div className="tlf-rise lg:col-span-8" style={{ ["--d" as string]: "0.1s" }}>
            <SubmissionForm locale={locale} />
          </div>
          <aside className="tlf-rise lg:col-span-4" style={{ ["--d" as string]: "0.2s" }}>
            <div className="tlf-sticky">
              <Engagements locale={locale} />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
