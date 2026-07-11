import { site } from "@/lib/site";
import { getDict, type Locale } from "@/lib/i18n";

/** Carte Google Maps intégrée (sans clé API). */
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
    <div className={`glass overflow-hidden !p-0 ${className}`}>
      <iframe
        title={`${t.map.titlePrefix} ${site.address.full}`}
        src={`https://maps.google.com/maps?q=${query}&z=15&output=embed`}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: 320, filter: "grayscale(30%) contrast(1.05)" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
