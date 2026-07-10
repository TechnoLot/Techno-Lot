import Link from "next/link";
import Image from "next/image";
import { Facebook, Mail, MapPin, Phone } from "lucide-react";
import { navLinks, secondaryLinks, site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-night-950">
      <div className="container-site grid gap-12 py-16 md:grid-cols-3">
        <div>
          <Link href="/" aria-label="Techno Lot — Accueil">
            <Image
              src="/logo.png"
              alt="Techno Lot"
              width={170}
              height={102}
              className="h-20 w-auto"
            />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            {site.slogan} Nous donnons une seconde vie à votre matériel
            high-tech usagé — et on vous paie pour ça.
          </p>
          <a
            href={site.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-accent/40 hover:text-accent-bright"
          >
            <Facebook className="h-4 w-4 text-accent" aria-hidden />
            Suivez-nous sur Facebook
          </a>
        </div>

        <nav aria-label="Liens rapides">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">
            Liens rapides
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[...navLinks, ...secondaryLinks].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-slate-400 transition-colors hover:text-accent-bright"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">
            Nous joindre
          </h2>
          <ul className="mt-5 space-y-4 text-sm text-slate-400">
            <li>
              <a
                href={site.address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 transition-colors hover:text-accent-bright"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>
                  Siège social :<br />
                  {site.address.full}
                </span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-3 transition-colors hover:text-accent-bright"
              >
                <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={site.phoneHref}
                className="flex items-center gap-3 transition-colors hover:text-accent-bright"
              >
                <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                {site.phone}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 py-6">
        <p className="container-site text-center text-xs text-slate-500">
          © 2024 - 2026 Techno Lot
        </p>
      </div>
    </footer>
  );
}
