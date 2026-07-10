import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import SubmissionForm from "@/components/SubmissionForm";
import MapEmbed from "@/components/MapEmbed";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — Soumission",
  description:
    "Pour une estimation sur mesure du rachat de votre matériel technologique, remplissez notre formulaire de soumission. Réponse garantie en 24 heures.",
  alternates: { canonical: "/contact" },
};

const coordonnees = [
  {
    icon: MapPin,
    label: "Adresse",
    value: site.address.full,
    href: site.address.mapsUrl,
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: site.phone,
    href: site.phoneHref,
  },
  {
    icon: Mail,
    label: "Courriel",
    value: site.email,
    href: `mailto:${site.email}`,
  },
  {
    icon: Clock,
    label: "Délai de réponse",
    value: "24 heures maximum",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Soumission"
        subtitle="Pour une estimation sur mesure du rachat de votre matériel technologique, veuillez remplir ce formulaire !"
        image="/photos/serveurs.jpg"
      />

      <section className="container-site pb-20">
        <div className="grid gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <SubmissionForm />
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-2">
            <div className="space-y-4">
              {coordonnees.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="glass glass-hover flex items-start gap-4 p-5">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/30">
                    <Icon className="h-5 w-5 text-accent" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={
                          href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="font-medium text-white transition-colors hover:text-accent-bright"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="font-medium text-white">{value}</p>
                    )}
                  </div>
                </div>
              ))}
              <MapEmbed className="h-[320px]" />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
