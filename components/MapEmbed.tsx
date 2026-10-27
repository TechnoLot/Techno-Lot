import { site } from "@/lib/site";
import { getDict, type Locale } from "@/lib/i18n";
import "./formulaire.css";

/**
 * Carte Google Maps intégrée (sans clé API) : coins arrondis, filet du thème,
 * désaturée au repos et colorée au survol ou au focus. Chargement différé.
 */
export default function MapEmbed({
  className = "",
  locale = "fr",
}: {
  className?: string;
  locale?: Locale;
}) {
  const t = getDict(locale);
  const query = encodeURIComponent(site.address.full);
  return (
    <div className={`tlf-map ${className}`}>
      <iframe
        title={`${t.map.titlePrefix} ${site.address.full}`}
        src={`https://maps.google.com/maps?q=${query}&z=15&hl=${locale}&output=embed`}
        width="100%"
        height="100%"
        style={{ minHeight: 320 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
