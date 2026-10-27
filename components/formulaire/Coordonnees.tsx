import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import "../formulaire.css";

const contenu = {
  fr: {
    title: "Nous joindre",
    text: "Un appel ou un courriel suffit pour démarrer. Nous répondons à chaque demande dans un délai de 24 heures.",
    phone: "Téléphone",
    email: "Courriel",
    address: "Adresse",
    directions: "Itinéraire",
    response: "Délai de réponse",
    responseValue: "24 heures maximum",
    personRole: "Président",
    personText:
      "Je m'occupe personnellement de chaque demande. Appelez-moi ou écrivez-moi : je vous réponds en moins de 24 heures.",
    newTab: "(nouvel onglet)",
  },
  en: {
    title: "Reach us",
    text: "A call or an email is all it takes to get started. We answer every request within 24 hours.",
    phone: "Phone",
    email: "Email",
    address: "Address",
    directions: "Directions",
    response: "Response time",
    responseValue: "24 hours maximum",
    personRole: "President",
    personText:
      "I personally handle every request. Call or email me and I'll get back to you within 24 hours.",
    newTab: "(new tab)",
  },
};

/** Coordonnées de la page Contact : grand numéro, liste à filets, mot du président. */
export function Coordonnees({ locale }: { locale: Locale }) {
  const t = contenu[locale];

  return (
    <div className="tlf">
      <h2 className="font-display text-3xl font-bold leading-tight text-mist sm:text-4xl">{t.title}</h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-moss">{t.text}</p>

      <a
        href={site.phoneHref}
        className="group mt-7 inline-flex items-center gap-4 rounded-full py-1 pr-2 transition-colors"
        aria-label={`${t.phone} : ${site.phone}`}
      >
        <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-vivid text-ink transition-transform duration-300 group-hover:scale-105">
          <Phone className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-mist transition-colors group-hover:text-emerald sm:text-[2.5rem]">
          {site.phone}
        </span>
      </a>

      <dl className="mt-8 border-t border-line">
        <div className="flex gap-4 border-b border-line py-4">
          <dt className="sr-only">{t.email}</dt>
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
          <dd>
            <a href={`mailto:${site.email}`} className="font-semibold text-mist underline-offset-4 hover:text-emerald hover:underline">
              {site.email}
            </a>
          </dd>
        </div>
        <div className="flex gap-4 border-b border-line py-4">
          <dt className="sr-only">{t.address}</dt>
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
          <dd>
            <span className="block font-semibold text-mist">{site.address.street}</span>
            <span className="block text-moss">
              {site.address.city}, {site.address.province} {site.address.postalCode}
            </span>
            <a
              href={site.address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tlf-link mt-1"
            >
              {t.directions}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{t.newTab}</span>
            </a>
          </dd>
        </div>
        <div className="flex gap-4 border-b border-line py-4">
          <dt className="sr-only">{t.response}</dt>
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
          <dd>
            <span className="block text-sm text-moss" aria-hidden="true">
              {t.response}
            </span>
            <span className="block font-semibold text-mist">{t.responseValue}</span>
          </dd>
        </div>
      </dl>

      <figure className="mt-8 flex gap-4">
        <span
          className="inline-grid h-12 w-12 shrink-0 place-items-center rounded-full bg-deep font-display text-base font-bold text-vivid"
          aria-hidden="true"
        >
          AD
        </span>
        <div>
          <blockquote className="text-[0.95rem] leading-relaxed text-moss">{t.personText}</blockquote>
          <figcaption className="mt-2 text-sm">
            <span className="font-semibold text-mist">Anthony Després</span>
            <span className="text-moss">
              {" "}
              · {t.personRole}, {site.name}
            </span>
          </figcaption>
        </div>
      </figure>
    </div>
  );
}
