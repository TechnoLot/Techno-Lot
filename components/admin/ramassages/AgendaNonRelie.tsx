import { CalendarClock } from "lucide-react";

/**
 * Ramassages sans Google Agenda : la clé du compte de service ou l'ID de
 * l'agenda manque sur ce serveur (guide : docs/RAMASSAGES-GOOGLE-AGENDA.md).
 */
export default function AgendaNonRelie() {
  return (
    <section className="glass max-w-2xl p-6 sm:p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-admin-tint-green text-admin-tint-green-ink">
        <CalendarClock className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold text-admin-ink">Google Agenda n’est pas encore relié</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-admin-muted">
        Le calendrier lit et écrit directement dans l’agenda Google « Ramassages Techno Lot ». Il manque sur ce
        serveur la clé du compte de service ou l’ID de l’agenda :
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-admin-ink">
        <li>
          <code className="rounded bg-admin-subtle px-1.5 py-0.5 text-[13px]">GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON</code>
        </li>
        <li>
          <code className="rounded bg-admin-subtle px-1.5 py-0.5 text-[13px]">GOOGLE_CALENDAR_ID</code>
        </li>
      </ul>
      <p className="mt-4 text-sm text-admin-muted">
        Ajoute-les chez l’hébergeur (Hostinger : « Settings and redeploy »), puis redéploie le site.
      </p>
    </section>
  );
}
