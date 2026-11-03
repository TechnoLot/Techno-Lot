import "server-only";
import { ErreurAffichable } from "@/lib/admin/erreur-affichable";
import { jetonCompteService, lireCompteService, oublierJetons } from "@/lib/google/compte-service";
import { addDays, torontoStartUtc } from "@/lib/ebay/totaux";
import {
  TZ,
  comparerRamassages,
  depuisEvenement,
  evenementPourCreation,
  evenementPourModification,
  type EvenementGoogle,
  type Ramassage,
  type ValeursRamassage,
} from "@/lib/ramassages/ramassages";

/**
 * Google Agenda (API REST v3) pour le calendrier des ramassages. L'agenda
 * « Ramassages Techno Lot » est partagé avec un compte de service dédié (droit
 * « Apporter des modifications ») : c'est la seule source de vérité, lue à
 * chaque affichage et modifiée directement. Une modification faite dans Google
 * se voit donc au prochain affichage. Serveur seulement : la clé ne quitte
 * jamais le serveur.
 */

const API = "https://www.googleapis.com/calendar/v3";
const PORTEE = "https://www.googleapis.com/auth/calendar.events";
const VARIABLE_CLE = "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON";
const DELAI_MS = 8_000;
const PAGES_MAX = 5;
const CHAMPS = "id,etag,status,summary,description,location,htmlLink,recurringEventId,start,end,extendedProperties";

function compteService() {
  return lireCompteService(process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON);
}

function idAgenda(): string | null {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || null;
}

/** Vrai si la clé du compte de service et l'ID de l'agenda sont fournis. */
export function agendaConfigure(): boolean {
  return Boolean(compteService() && idAgenda());
}

/** Refus de l'API Google Agenda : message français (affichable) et statut HTTP. */
export class ErreurAgenda extends ErreurAffichable {
  constructor(
    message: string,
    public readonly statut: number,
    detail?: unknown,
  ) {
    super(message, detail);
    this.name = "ErreurAgenda";
  }
}

type ErreurGoogle = { error?: { errors?: { reason?: string }[] } };

/**
 * Message d'un refus de l'API. `contexte` : « agenda » (liste, création) ou
 * « evenement » (un ramassage précis). Les cas prévus (supprimé, modifié
 * entre-temps, trop de demandes) n'ont pas de détail : rien au journal.
 */
export function erreurAgenda(statut: number, corps: unknown, contexte: "agenda" | "evenement"): ErreurAgenda {
  const raison = (corps as ErreurGoogle | null)?.error?.errors?.[0]?.reason ?? "";
  if (statut === 404 || statut === 410) {
    return contexte === "evenement"
      ? new ErreurAgenda("Ce ramassage n’existe plus dans Google Agenda : actualise la page.", statut)
      : new ErreurAgenda(
          "Agenda introuvable (404) : vérifie GOOGLE_CALENDAR_ID et le partage avec le compte de service.",
          statut,
          corps,
        );
  }
  if (statut === 412) {
    return new ErreurAgenda(
      "Ce ramassage a été modifié dans Google Agenda pendant que tu l’avais ouvert : actualise la page, puis recommence.",
      statut,
    );
  }
  if (statut === 429 || (statut === 403 && /rateLimit|quotaExceeded/i.test(raison))) {
    return new ErreurAgenda("Trop de demandes à Google Agenda : réessaie dans une minute.", statut);
  }
  if (statut === 401) return new ErreurAgenda(`Clé Google Agenda refusée (401) : vérifie ${VARIABLE_CLE}.`, statut, corps);
  if (statut === 403) {
    return new ErreurAgenda(
      "Accès à l’agenda refusé (403) : il doit être partagé avec le compte de service, droit « Apporter des modifications ».",
      statut,
      corps,
    );
  }
  if (statut === 400) return new ErreurAgenda("Google Agenda a refusé ces valeurs (400).", statut, corps);
  if (statut >= 500) {
    return new ErreurAgenda(`Google Agenda ne répond pas pour l’instant (${statut}) : réessaie dans un moment.`, statut, corps);
  }
  return new ErreurAgenda(`Erreur Google Agenda (${statut}).`, statut, corps);
}

type Appel = {
  methode?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Après …/events (ex. « /<id> ») */
  chemin?: string;
  params?: Record<string, string>;
  corps?: unknown;
  /** If-Match : Google refuse (412) si l'événement a changé depuis cette version */
  etag?: string | null;
  delaiMs?: number;
};

/** Appel à l'API des événements de l'agenda ; corps JSON de la réponse (null pour 204). */
async function appeler(appel: Appel, contexte: "agenda" | "evenement"): Promise<unknown> {
  const sa = compteService();
  const agenda = idAgenda();
  if (!sa || !agenda) throw new ErreurAffichable("Google Agenda n’est pas encore relié.");
  const jeton = await jetonCompteService(sa, PORTEE, VARIABLE_CLE);

  const url = new URL(`${API}/calendars/${encodeURIComponent(agenda)}/events${appel.chemin ?? ""}`);
  for (const [cle, valeur] of Object.entries(appel.params ?? {})) url.searchParams.set(cle, valeur);
  const headers: Record<string, string> = { Authorization: `Bearer ${jeton}` };
  if (appel.corps !== undefined) headers["Content-Type"] = "application/json";
  if (appel.etag) headers["If-Match"] = appel.etag;

  let res: Response;
  try {
    res = await fetch(url, {
      method: appel.methode ?? "GET",
      headers,
      body: appel.corps === undefined ? undefined : JSON.stringify(appel.corps),
      cache: "no-store",
      signal: AbortSignal.timeout(appel.delaiMs ?? DELAI_MS),
    });
  } catch (err) {
    const delai = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ErreurAffichable(
      delai
        ? "Google Agenda ne répond pas (délai dépassé) : réessaie dans un moment."
        : "Impossible de joindre Google Agenda (erreur réseau).",
    );
  }
  if (res.status === 204) return null;
  const corps: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    // Jeton révoqué ou clé changée : le prochain appel en redemande un.
    if (res.status === 401) oublierJetons();
    throw erreurAgenda(res.status, corps, contexte);
  }
  return corps;
}

/**
 * Après un refus 412 : l'événement a-t-il été supprimé dans Google ? Un
 * événement supprimé change de version, donc If-Match échoue (412) au lieu
 * de 410. Statut « cancelled », 404 ou 410 = supprimé.
 */
async function estSupprime(id: string): Promise<boolean> {
  try {
    const corps = (await appeler({ chemin: `/${encodeURIComponent(id)}`, params: { fields: "status" } }, "evenement")) as {
      status?: string;
    } | null;
    return corps?.status === "cancelled";
  } catch (err) {
    if (err instanceof ErreurAgenda && (err.statut === 404 || err.statut === 410)) return true;
    throw err;
  }
}

/** Refus 412 dû à une suppression dans Google (vérification impossible = non). */
async function refusParSuppression(err: unknown, id: string): Promise<boolean> {
  return err instanceof ErreurAgenda && err.statut === 412 && (await estSupprime(id).catch(() => false));
}

/** Ramassage d'une réponse de Google (création, modification). */
function ramassageDe(corps: unknown): Ramassage {
  const r = depuisEvenement((corps ?? {}) as EvenementGoogle);
  if (!r) throw new ErreurAffichable("Réponse inattendue de Google Agenda.", corps);
  return r;
}

/**
 * Ramassages des jours `debut` à `fin` inclus (heure de Toronto), occurrences
 * des événements répétés comprises, triés par jour puis par heure.
 */
export async function listerRamassages(
  debut: string,
  fin: string,
  options: { delaiMs?: number } = {},
): Promise<Ramassage[]> {
  const evenements: EvenementGoogle[] = [];
  let page: string | undefined;
  for (let i = 0; i < PAGES_MAX; i++) {
    const params: Record<string, string> = {
      timeMin: torontoStartUtc(debut),
      timeMax: torontoStartUtc(addDays(fin, 1)),
      singleEvents: "true",
      orderBy: "startTime",
      timeZone: TZ,
      maxResults: "250",
      fields: `items(${CHAMPS}),nextPageToken`,
    };
    if (page) params.pageToken = page;
    const corps = (await appeler({ params, delaiMs: options.delaiMs }, "agenda")) as {
      items?: EvenementGoogle[];
      nextPageToken?: string;
    } | null;
    evenements.push(...(corps?.items ?? []));
    page = corps?.nextPageToken;
    if (!page) break;
  }
  return evenements
    .map(depuisEvenement)
    .filter((r): r is Ramassage => r !== null)
    .sort((a, b) => a.jour.localeCompare(b.jour) || comparerRamassages(a, b));
}

/** Crée le ramassage dans Google Agenda ; renvoie l'événement tel que Google l'a enregistré. */
export async function creerEvenement(v: ValeursRamassage, lien: string | null): Promise<Ramassage> {
  const corps = await appeler(
    { methode: "POST", params: { fields: CHAMPS }, corps: evenementPourCreation(v, lien) },
    "agenda",
  );
  return ramassageDe(corps);
}

/**
 * Modifie le ramassage (PATCH : les champs que Google garde ailleurs, comme les
 * rappels ou la couleur, ne bougent pas). Refusé (412) s'il a changé dans
 * Google depuis la version `etag` ; « n'existe plus » s'il y a été supprimé.
 * `avecDates` faux : dates inchangées.
 */
export async function modifierEvenement(
  id: string,
  etag: string,
  v: ValeursRamassage,
  lien: string | null,
  avecDates: boolean,
): Promise<Ramassage> {
  let corps: unknown;
  try {
    corps = await appeler(
      {
        methode: "PATCH",
        chemin: `/${encodeURIComponent(id)}`,
        params: { fields: CHAMPS },
        corps: evenementPourModification(v, lien, avecDates),
        etag,
      },
      "evenement",
    );
  } catch (err) {
    if (await refusParSuppression(err, id)) throw erreurAgenda(410, null, "evenement");
    throw err;
  }
  return ramassageDe(corps);
}

/**
 * Retire le ramassage de Google Agenda ; déjà supprimé (404, 410, ou 412 d'un
 * événement supprimé) = rien à faire. Refusé (412) s'il a changé entre-temps.
 */
export async function supprimerEvenement(id: string, etag: string): Promise<void> {
  try {
    await appeler({ methode: "DELETE", chemin: `/${encodeURIComponent(id)}`, etag }, "evenement");
  } catch (err) {
    if (err instanceof ErreurAgenda && (err.statut === 404 || err.statut === 410)) return;
    if (await refusParSuppression(err, id)) return;
    throw err;
  }
}
