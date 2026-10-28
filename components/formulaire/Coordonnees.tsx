import { Clock, Mail, Mailbox, Phone } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import "../formulaire.css";

const contenu = {
  fr: {
    title: "Nous joindre",
    text: "Un appel ou un courriel suffit pour démarrer. Nous répondons à chaque demande dans un délai de 24 heures.",
    phone: "Téléphone",
    email: "Courriel",
    address: "Adresse postale",
    response: "Délai de réponse",
    responseValue: "24 heures maximum",
    personRole: "Président",
    personCall: (nom: string, tel: string) => `Appeler ${nom}, président, au ${tel}`,
  },
  en: {
    title: "Reach us",
    text: "A call or an email is all it takes to get started. We answer every request within 24 hours.",
    phone: "Phone",
    email: "Email",
    address: "Mailing address",
    response: "Response time",
    responseValue: "24 hours maximum",
    personRole: "President",
    personCall: (nom: string, tel: string) => `Call ${nom}, President, at ${tel}`,
  },
};

/** Coordonnées de la page Contact : grand numéro, liste à filets, carte verte du président. */
export function Coordonnees({ locale }: { locale: Locale }) {
  const t = contenu[locale];
  const p = site.president;

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
          <Mailbox className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
          <dd>
            <span className="block text-sm text-moss" aria-hidden="true">
              {t.address}
            </span>
            <span className="block text-mist">
              {site.address.street}, {site.address.city}, {site.address.province} {site.address.postalCode}
            </span>
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

      {/* Carte verte du président : nom, titre et ligne directe */}
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[20px] bg-vivid px-4 py-3.5 text-ink sm:inline-flex sm:pr-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-full bg-deep font-display text-sm font-bold text-vivid"
            aria-hidden="true"
          >
            {p.initials}
          </span>
          <p className="leading-tight">
            <span className="block font-display text-base font-bold">{p.name}</span>
            <span className="block text-sm text-ink/75">{t.personRole}</span>
          </p>
        </div>
        <a
          href={p.phoneHref}
          aria-label={t.personCall(p.name, p.phone)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-display text-[15px] font-semibold tabular-nums text-white transition-colors hover:bg-deep"
        >
          <Phone className="h-4 w-4 text-vivid" aria-hidden="true" />
          {p.phone}
        </a>
      </div>
    </div>
  );
}
