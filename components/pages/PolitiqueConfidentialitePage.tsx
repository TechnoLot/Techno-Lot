import type { ReactNode } from "react";
import { PageHero } from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/** Chemins de la page (registre lib/seo/routes.ts : slug anglais différent). */
export const PRIVACY_PATHS: Record<Locale, string> = {
  fr: "/politique-de-confidentialite",
  en: "/en/privacy-policy",
};

type Block = { id: string; title: string; body: ReactNode };

const mail = (
  <a href={`mailto:${site.email}`} className="font-semibold text-[#3f9a1c] underline-offset-4 hover:underline">
    {site.email}
  </a>
);

const cai = (label: string) => (
  <a
    href="https://www.cai.gouv.qc.ca"
    target="_blank"
    rel="noopener noreferrer"
    className="font-semibold text-[#3f9a1c] underline-offset-4 hover:underline"
  >
    {label}
  </a>
);

const Ul = ({ children }: { children: ReactNode }) => (
  <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-[#5ECB33]">{children}</ul>
);

const content: Record<
  Locale,
  { title: string; crumb: string; intro: string; updated: string; tocLabel: string; officerTitle: string; blocks: Block[] }
> = {
  fr: {
    title: "Politique de confidentialité",
    crumb: "Politique de confidentialité",
    intro:
      "Comment Techno Lot recueille, utilise, conserve et protège vos renseignements personnels, conformément à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25).",
    updated: "Dernière mise à jour : 28 octobre 2026",
    tocLabel: "Sommaire",
    officerTitle: "Responsable de la protection des renseignements personnels",
    blocks: [
      {
        id: "responsable",
        title: "1. Responsable de la protection des renseignements personnels",
        body: (
          <>
            <p>
              Techno Lot a désigné Eric Després comme responsable de la protection des renseignements personnels. Pour
              toute question sur cette politique ou pour exercer vos droits, écrivez-lui à {mail} ou téléphonez au{" "}
              <a href={site.phoneHref} className="font-semibold text-[#3f9a1c] underline-offset-4 hover:underline">
                {site.phone}
              </a>
              .
            </p>
            <p className="mt-3">
              Adresse postale (correspondance seulement) : {site.address.full}.
            </p>
          </>
        ),
      },
      {
        id: "renseignements",
        title: "2. Renseignements que nous recueillons",
        body: (
          <>
            <p>
              <strong>Formulaire de soumission et de contact.</strong> Lorsque vous nous demandez une offre, nous
              recueillons :
            </p>
            <Ul>
              <li>votre nom, votre adresse courriel et votre numéro de téléphone ;</li>
              <li>la description de votre lot (votre message) ;</li>
              <li>
                les fichiers que vous joignez (inventaire, photos). Ils nous sont transmis par courriel ; seuls leurs
                noms sont conservés dans notre base de données.
              </li>
            </Ul>
            <p className="mt-5">
              <strong>Suivi publicitaire et statistiques de visite.</strong> Pour savoir quelles publicités et quelles
              pages nous amènent des demandes, le site enregistre dans votre navigateur (stockage local, clé{" "}
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-[0.9em]">tl_attr</code>), pendant 30 jours :
            </p>
            <Ul>
              <li>un identifiant de visite généré au hasard ;</li>
              <li>
                les paramètres de campagne présents dans le lien (UTM, identifiants de campagne, d&apos;ensemble de
                publicités et d&apos;annonce) et les identifiants de clic publicitaire fbclid (Meta) et gclid (Google) ;
              </li>
              <li>la page d&apos;arrivée, le site d&apos;où vous venez, le type d&apos;appareil et la langue.</li>
            </Ul>
            <p className="mt-3">
              Les pages consultées et les clics sur nos boutons sont aussi transmis à nos serveurs avec cet identifiant.
              Ces données ne contiennent ni votre nom ni vos coordonnées ; elles sont associées à votre demande seulement
              si vous remplissez le formulaire.
            </p>
            <p className="mt-5">
              <strong>Pixels Meta et Google.</strong> Lorsqu&apos;ils sont activés, le pixel Meta (Facebook, Instagram)
              et les balises Google (Google Ads, Google Analytics) déposent leurs propres témoins et indiquent à ces
              plateformes qu&apos;une visite ou une demande a eu lieu. Meta et Google traitent ces données selon leurs
              propres politiques de confidentialité.
            </p>
            <p className="mt-5">
              <strong>Échanges avec notre équipe.</strong> Les courriels et appels liés à votre demande (ramassage,
              offre, paiement) sont conservés pour le suivi de notre relation d&apos;affaires.
            </p>
          </>
        ),
      },
      {
        id: "finalites",
        title: "3. Pourquoi nous les utilisons",
        body: (
          <Ul>
            <li>évaluer votre lot et vous préparer une offre ;</li>
            <li>communiquer avec vous pour l&apos;offre, le ramassage et le paiement ;</li>
            <li>mesurer l&apos;efficacité de nos publicités et améliorer le site ;</li>
            <li>protéger le formulaire contre les envois automatisés (pourriels) ;</li>
            <li>respecter nos obligations légales, notamment comptables et fiscales.</li>
          </Ul>
        ),
      },
      {
        id: "consentement",
        title: "4. Consentement et refus du suivi",
        body: (
          <>
            <p>
              En nous transmettant le formulaire, vous consentez à l&apos;utilisation de vos renseignements aux fins
              décrites ci-dessus. Nous ne recueillons que ce qui est nécessaire à ces fins.
            </p>
            <p className="mt-3">
              Vous pouvez refuser le suivi en bloquant les témoins et le stockage local dans les réglages de votre
              navigateur, en effaçant les données du site ou en utilisant un bloqueur de publicités. Le site et le
              formulaire continuent de fonctionner normalement.
            </p>
          </>
        ),
      },
      {
        id: "tiers",
        title: "5. Communication à des tiers",
        body: (
          <>
            <p>
              Nous ne vendons ni ne louons vos renseignements personnels. Nous les confions uniquement aux fournisseurs
              nécessaires au fonctionnement du site, qui ne peuvent les utiliser à d&apos;autres fins :
            </p>
            <Ul>
              <li>Supabase : hébergement de notre base de données ;</li>
              <li>Resend : envoi des courriels (votre demande et nos réponses) ;</li>
              <li>Hostinger : hébergement du site Web ;</li>
              <li>Meta et Google : mesure publicitaire, lorsque leurs pixels sont activés.</li>
            </Ul>
            <p className="mt-3">
              Certains de ces fournisseurs conservent les données à l&apos;extérieur du Québec, notamment aux
              États-Unis. Nous les choisissons pour les mesures de sécurité qu&apos;ils offrent, mais vos renseignements
              peuvent alors être soumis aux lois de ces endroits.
            </p>
          </>
        ),
      },
      {
        id: "conservation",
        title: "6. Conservation",
        body: (
          <Ul>
            <li>
              Les demandes de soumission sont conservées le temps de traiter votre demande et de suivre notre relation
              d&apos;affaires, puis détruites ou anonymisées lorsqu&apos;elles ne sont plus utiles.
            </li>
            <li>
              Les renseignements liés à un achat conclu sont conservés aussi longtemps que l&apos;exigent les lois
              fiscales (généralement six ans).
            </li>
            <li>Les données de suivi enregistrées dans votre navigateur expirent après 30 jours.</li>
          </Ul>
        ),
      },
      {
        id: "securite",
        title: "7. Sécurité",
        body: (
          <p>
            Le site est servi en connexion chiffrée (HTTPS). L&apos;accès à nos outils internes est protégé par
            authentification et réservé aux membres de l&apos;équipe qui en ont besoin. En cas d&apos;incident de
            confidentialité présentant un risque de préjudice sérieux, nous aviserons les personnes concernées et la
            Commission d&apos;accès à l&apos;information.
          </p>
        ),
      },
      {
        id: "droits",
        title: "8. Vos droits",
        body: (
          <>
            <p>Vous pouvez en tout temps :</p>
            <Ul>
              <li>demander l&apos;accès aux renseignements que nous détenons sur vous ;</li>
              <li>les faire rectifier s&apos;ils sont inexacts ou incomplets ;</li>
              <li>retirer votre consentement ou demander leur suppression ;</li>
              <li>en obtenir une copie dans un format technologique structuré et couramment utilisé.</li>
            </Ul>
            <p className="mt-3">
              Écrivez à {mail}. Nous répondons dans un délai de 30 jours. Si vous n&apos;êtes pas satisfait de notre
              réponse, vous pouvez porter plainte auprès de la {cai("Commission d'accès à l'information du Québec")}.
            </p>
          </>
        ),
      },
      {
        id: "modifications",
        title: "9. Modifications",
        body: (
          <p>
            Nous pouvons mettre cette politique à jour. La date de la dernière mise à jour figure en haut de la page ;
            la version publiée ici est toujours celle qui s&apos;applique.
          </p>
        ),
      },
    ],
  },
  en: {
    title: "Privacy policy",
    crumb: "Privacy policy",
    intro:
      "How Techno Lot collects, uses, retains and protects your personal information, in accordance with Québec's Act respecting the protection of personal information in the private sector (Law 25).",
    updated: "Last updated: October 28, 2026",
    tocLabel: "Contents",
    officerTitle: "Person in charge of the protection of personal information",
    blocks: [
      {
        id: "officer",
        title: "1. Person in charge of the protection of personal information",
        body: (
          <>
            <p>
              Techno Lot has designated Eric Després as the person in charge of the protection of personal information.
              For any question about this policy or to exercise your rights, email {mail} or call{" "}
              <a href={site.phoneHref} className="font-semibold text-[#3f9a1c] underline-offset-4 hover:underline">
                {site.phone}
              </a>
              .
            </p>
            <p className="mt-3">Mailing address (correspondence only): {site.address.full}.</p>
          </>
        ),
      },
      {
        id: "information",
        title: "2. Information we collect",
        body: (
          <>
            <p>
              <strong>Quote and contact form.</strong> When you ask us for an offer, we collect:
            </p>
            <Ul>
              <li>your name, email address and phone number;</li>
              <li>the description of your lot (your message);</li>
              <li>
                the files you attach (inventory, photos). They are sent to us by email; only their file names are kept
                in our database.
              </li>
            </Ul>
            <p className="mt-5">
              <strong>Ad tracking and visit statistics.</strong> To learn which ads and pages bring us requests, the
              site stores in your browser (local storage, key{" "}
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-[0.9em]">tl_attr</code>) for 30 days:
            </p>
            <Ul>
              <li>a randomly generated visit identifier;</li>
              <li>
                campaign parameters found in the link (UTM, campaign, ad set and ad identifiers) and the fbclid (Meta)
                and gclid (Google) ad click identifiers;
              </li>
              <li>the landing page, the referring site, the device type and the language.</li>
            </Ul>
            <p className="mt-3">
              Pages viewed and clicks on our buttons are also sent to our servers with that identifier. This data
              contains neither your name nor your contact details; it is linked to your request only if you submit the
              form.
            </p>
            <p className="mt-5">
              <strong>Meta and Google pixels.</strong> When enabled, the Meta pixel (Facebook, Instagram) and Google
              tags (Google Ads, Google Analytics) set their own cookies and tell these platforms that a visit or a
              request took place. Meta and Google process this data under their own privacy policies.
            </p>
            <p className="mt-5">
              <strong>Exchanges with our team.</strong> Emails and calls about your request (pickup, offer, payment)
              are kept to follow up on our business relationship.
            </p>
          </>
        ),
      },
      {
        id: "purposes",
        title: "3. Why we use it",
        body: (
          <Ul>
            <li>to assess your lot and prepare an offer;</li>
            <li>to contact you about the offer, pickup and payment;</li>
            <li>to measure the effectiveness of our ads and improve the site;</li>
            <li>to protect the form against automated (spam) submissions;</li>
            <li>to meet our legal obligations, including accounting and tax requirements.</li>
          </Ul>
        ),
      },
      {
        id: "consent",
        title: "4. Consent and opting out of tracking",
        body: (
          <>
            <p>
              By submitting the form, you consent to the use of your information for the purposes described above. We
              only collect what is needed for these purposes.
            </p>
            <p className="mt-3">
              You can opt out of tracking by blocking cookies and local storage in your browser settings, clearing the
              site&apos;s data or using an ad blocker. The site and the form keep working normally.
            </p>
          </>
        ),
      },
      {
        id: "third-parties",
        title: "5. Sharing with third parties",
        body: (
          <>
            <p>
              We do not sell or rent your personal information. We only entrust it to the service providers needed to
              run the site, who may not use it for any other purpose:
            </p>
            <Ul>
              <li>Supabase: database hosting;</li>
              <li>Resend: email delivery (your request and our replies);</li>
              <li>Hostinger: website hosting;</li>
              <li>Meta and Google: ad measurement, when their pixels are enabled.</li>
            </Ul>
            <p className="mt-3">
              Some of these providers store data outside Québec, notably in the United States. We choose them for the
              security measures they offer, but your information may then be subject to the laws of those places.
            </p>
          </>
        ),
      },
      {
        id: "retention",
        title: "6. Retention",
        body: (
          <Ul>
            <li>
              Quote requests are kept for as long as needed to handle your request and follow up on our business
              relationship, then destroyed or anonymized once they are no longer useful.
            </li>
            <li>Information related to a completed purchase is kept as long as tax laws require (generally six years).</li>
            <li>Tracking data stored in your browser expires after 30 days.</li>
          </Ul>
        ),
      },
      {
        id: "security",
        title: "7. Security",
        body: (
          <p>
            The site is served over an encrypted connection (HTTPS). Access to our internal tools is protected by
            authentication and limited to team members who need it. If a confidentiality incident presents a risk of
            serious injury, we will notify the people concerned and the Commission d&apos;accès à l&apos;information.
          </p>
        ),
      },
      {
        id: "rights",
        title: "8. Your rights",
        body: (
          <>
            <p>At any time, you may:</p>
            <Ul>
              <li>request access to the information we hold about you;</li>
              <li>have it corrected if it is inaccurate or incomplete;</li>
              <li>withdraw your consent or ask that it be deleted;</li>
              <li>obtain a copy in a structured, commonly used technological format.</li>
            </Ul>
            <p className="mt-3">
              Email {mail}. We reply within 30 days. If you are not satisfied with our answer, you may file a complaint
              with the {cai("Commission d'accès à l'information du Québec")}.
            </p>
          </>
        ),
      },
      {
        id: "changes",
        title: "9. Changes",
        body: (
          <p>
            We may update this policy. The date of the last update appears at the top of the page; the version
            published here is always the one that applies.
          </p>
        ),
      },
    ],
  },
};

/**
 * Politique de confidentialité (Loi 25) : héros compact, sommaire collant sur
 * grand écran, puis les sections sur fond clair. Contenu bilingue ci-dessus.
 */
export default function PolitiqueConfidentialitePage({ locale }: { locale: Locale }) {
  const t = content[locale];

  return (
    <>
      <PageHero
        title={t.title}
        intro={t.intro}
        size="compact"
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[
              { name: locale === "en" ? "Home" : "Accueil", path: localePath(locale, "/") },
              { name: t.crumb, path: PRIVACY_PATHS[locale] },
            ]}
          />
        }
      />

      <section data-theme="light" aria-label={t.title} className="relative py-14 text-mist sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--site-header-h)+2rem)]">
              <p className="text-sm text-moss">{t.updated}</p>
              <nav aria-label={t.tocLabel} className="mt-6 hidden lg:block">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-moss">{t.tocLabel}</p>
                <ol className="mt-4 space-y-2.5 border-l border-black/10 pl-4 text-[15px]">
                  {t.blocks.map((b) => (
                    <li key={b.id}>
                      <a href={`#${b.id}`} className="text-mist/80 transition-colors hover:text-[#3f9a1c]">
                        {b.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="mt-8 rounded-2xl border border-black/10 bg-black/[0.03] p-5">
                <p className="font-display text-sm font-semibold text-mist">{t.officerTitle}</p>
                <p className="mt-2 text-[15px] text-moss">Eric Després</p>
                <p className="mt-1 text-[15px]">{mail}</p>
              </div>
            </div>
          </aside>

          <div className="space-y-12 text-[16px] leading-relaxed text-moss sm:text-[17px] lg:col-span-8">
            {t.blocks.map((b) => (
              <article key={b.id} id={b.id} className="scroll-mt-[calc(var(--site-header-h)+1.5rem)]">
                <h2 className="text-balance font-display text-2xl font-bold tracking-[-0.02em] text-mist sm:text-[1.75rem]">
                  {b.title}
                </h2>
                <div className="mt-4 [&_strong]:text-mist">{b.body}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
