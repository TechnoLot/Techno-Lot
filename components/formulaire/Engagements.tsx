import { Clock, FileCheck2, HandCoins, Phone, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { getDict, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import "../formulaire.css";

const contenu = {
  fr: {
    title: "Nos engagements",
    items: [
      { title: "Réponse garantie en 24 h", text: "Chaque demande reçoit une réponse dans un délai de 24 heures." },
      {
        title: "Ramassage gratuit partout au Québec",
        text: "Notre équipe se rend sur place pour emballer, charger et transporter votre matériel.",
      },
      { title: "Paiement rapide et garanti", text: "La moitié au ramassage, le solde sans délai après l'inspection." },
      { title: "Certificat de destruction des données", text: "Remis sans frais." },
    ],
    call: "Vous préférez en parler ?",
  },
  en: {
    title: "Our commitments",
    items: [
      { title: "Guaranteed response within 24 h", text: "Every request gets an answer within 24 hours." },
      {
        title: "Free pickup anywhere in Québec",
        text: "Our team comes on site to pack, load and transport your equipment.",
      },
      { title: "Fast, guaranteed payment", text: "Half at pickup, the balance without delay after inspection." },
      { title: "Data destruction certificate", text: "Provided at no charge." },
    ],
    call: "Prefer to talk it over?",
  },
};

const icones: LucideIcon[] = [Clock, Truck, HandCoins, FileCheck2];

/** Passages **gras** des textes de lib/i18n.ts. */
export function avecGras(line: string): ReactNode {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={j} className="font-semibold text-mist">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={j}>{part}</Fragment>
    ),
  );
}

/** Colonne d'engagements de la page Soumission : carte vert profond, sans ombre. */
export function Engagements({ locale }: { locale: Locale }) {
  const t = contenu[locale];
  const form = getDict(locale).form;

  return (
    <div data-theme="deep" className="tlf relative overflow-hidden rounded-[28px] p-6 sm:p-8">
      <div aria-hidden="true" className="tlf-glow opacity-70" />
      <div className="relative">
        <h2 className="font-display text-2xl font-bold leading-tight text-mist">{t.title}</h2>
        <ul className="mt-6 space-y-5">
          {t.items.map((item, i) => {
            const Icon = icones[i];
            return (
              <li key={item.title} className="tlf-promise">
                <span className="tlf-promise-icon" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-display text-[1.02rem] font-semibold leading-snug text-mist">{item.title}</span>
                <span className="text-sm leading-relaxed text-moss">{item.text}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 border-t border-line pt-6">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-mist">
            <ShieldCheck className="h-4 w-4 text-emerald" aria-hidden="true" />
            {form.paymentClauseTitle}
          </h3>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-moss">
            {form.paymentClauseText.map((line, i) => (
              <p key={i}>{avecGras(line)}</p>
            ))}
          </div>
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <p className="text-sm text-moss">{t.call}</p>
          <a
            href={site.phoneHref}
            className="mt-1 inline-flex items-center gap-2 font-display text-2xl font-bold text-mist transition-colors hover:text-emerald"
          >
            <Phone className="h-5 w-5 text-emerald" aria-hidden="true" />
            {site.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
