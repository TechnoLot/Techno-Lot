import type { Metadata } from "next";
import { exigerAdminPage, type ContexteAdmin } from "@/lib/securite/garde";
import { journaliserErreur } from "@/lib/admin/erreurs-admin";
import { ErreurAffichable, texteDetail } from "@/lib/admin/erreur-affichable";
import { torontoDay } from "@/lib/ebay/totaux";
import { agendaConfigure, listerRamassages } from "@/lib/ramassages/google-agenda";
import {
  bornesLecture,
  horizonAVenir,
  parseAncre,
  parseVue,
  prochainRamassage,
  type Ramassage,
} from "@/lib/ramassages/ramassages";
import PageHeader from "@/components/admin/PageHeader";
import Ramassages from "@/components/admin/ramassages/Ramassages";
import AgendaNonRelie from "@/components/admin/ramassages/AgendaNonRelie";

export const metadata: Metadata = {
  title: "Calendrier — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Calendrier des ramassages, relié à Google Agenda (lib/ramassages) : lu à
 * chaque affichage, modifié directement. Vues Semaine (grille horaire, par
 * défaut), Mois et Liste ; paramètres `vue` et `date` (jour affiché). Deux
 * lectures en parallèle : les jours affichés (vue + mini-calendrier) et les
 * 12 mois à venir (prochain ramassage, nombre par mois, vue Liste).
 */
export default async function RamassagesPage(props: {
  searchParams: Promise<{ vue?: string | string[]; date?: string | string[] }>;
}) {
  const ctx = await exigerAdminPage("/admin/ramassages");
  const searchParams = await props.searchParams;
  const aujourdhui = torontoDay();
  const vue = parseVue(premier(searchParams.vue));
  const ancre = parseAncre(premier(searchParams.date), aujourdhui);

  if (!agendaConfigure()) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Calendrier" />
        <AgendaNonRelie />
      </div>
    );
  }

  const lecture = bornesLecture(vue, ancre, aujourdhui);
  const horizon = horizonAVenir(aujourdhui);
  let ramassages: Ramassage[] = [];
  let aVenir: Ramassage[] = [];
  let erreur: string | null = null;
  try {
    [ramassages, aVenir] = await Promise.all([
      listerRamassages(lecture.debut, lecture.fin),
      listerRamassages(horizon.debut, horizon.fin),
    ]);
  } catch (err) {
    erreur = await messageLecture(err, ctx);
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <Ramassages
        ramassages={ramassages}
        aVenir={aVenir}
        prochain={prochainRamassage(aVenir, new Date())}
        vue={vue}
        ancre={ancre}
        aujourdhui={aujourdhui}
        erreur={erreur}
      />
    </div>
  );
}

/** Lecture impossible : nos messages tels quels ; le détail brut de Google au journal, avec la référence. */
async function messageLecture(err: unknown, ctx: ContexteAdmin): Promise<string> {
  if (err instanceof ErreurAffichable && err.detail === undefined) return err.message;
  const message = err instanceof ErreurAffichable ? err.message : "Impossible de lire Google Agenda.";
  const detail = err instanceof ErreurAffichable ? texteDetail(err.detail) : texteDetail(err);
  const ref = await journaliserErreur({ name: "GoogleAgenda", message: `${message} | ${detail}` }, "ramassages.lire", ctx);
  return `${message} Réf. : ${ref}`;
}
