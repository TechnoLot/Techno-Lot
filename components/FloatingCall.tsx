import { Phone } from "lucide-react";
import { site } from "@/lib/site";

/** Bouton d'appel flottant, visible uniquement sur mobile. */
export default function FloatingCall() {
  return (
    <a
      href={site.phoneHref}
      aria-label={`Appelez-nous au ${site.phone}`}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent-gradient px-5 py-3 font-display text-sm font-semibold text-night-950 shadow-glow-lg transition-transform hover:scale-105 md:hidden"
    >
      <Phone className="h-4 w-4" aria-hidden />
      Appelez-nous
    </a>
  );
}
