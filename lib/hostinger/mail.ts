import type { CourrielSoumission } from "@/lib/admin/courriel-types";
import {
  corpsRechercheApproximative,
  corpsRechercheEntete,
  dossiersAFouiller,
  entetesPiece,
  formaterAdresse,
  formaterAdresses,
  lienWebmail,
  messageErreurHostinger,
  messageLePlusProche,
  piecesVisibles,
  retirerScripts,
  type AdresseApi,
  type CorpsRecherche,
  type DossierApi,
  type PieceApi,
} from "@/lib/hostinger/courriel-regles";

/**
 * Client de la Mail API de Hostinger (spec OpenAPI 1.3.0), serveur seulement :
 * le jeton HOSTINGER_MAIL_API_TOKEN ne sort jamais d'ici (ni réponse, ni journal).
 */

const BASE = "https://api.mail.hostinger.com";
const DELAI_MS = 10_000;
/** Téléchargement d'une pièce : le délai couvre aussi la lecture du corps en flux. */
const DELAI_PIECE_MS = 60_000;

const TROUVE_TTL_MS = 10 * 60_000;
const INTROUVABLE_TTL_MS = 2 * 60_000;

/** Erreur de la Mail API, avec un message en français prêt à afficher. */
export class ErreurHostinger extends Error {
  constructor(
    public readonly status: number | null,
    message?: string,
  ) {
    super(message ?? messageErreurHostinger(status));
    this.name = "ErreurHostinger";
  }
}

type MessageApi = {
  uid: number;
  date?: string | null;
  subject?: string | null;
  from?: AdresseApi | null;
  to?: AdresseApi[] | null;
  attachments?: PieceApi[] | null;
};

type Page<T> = { data?: T[]; pagination?: { totalPages?: number } };

export type EmplacementCourriel = { dossier: string; uid: number };

async function appel(chemin: string, init: RequestInit = {}, delai = DELAI_MS): Promise<Response> {
  const jeton = process.env.HOSTINGER_MAIL_API_TOKEN;
  if (!jeton) throw new ErreurHostinger(401);
  let res: Response;
  try {
    res = await fetch(`${BASE}${chemin}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${jeton}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(delai),
    });
  } catch {
    throw new ErreurHostinger(null);
  }
  if (!res.ok) {
    res.body?.cancel().catch(() => {});
    throw new ErreurHostinger(res.status);
  }
  return res;
}

async function json<T>(chemin: string, init?: RequestInit): Promise<T> {
  const res = await appel(chemin, init);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ErreurHostinger(null);
  }
}

function cheminDossier(boite: string, dossier: string): string {
  return `/api/v1/mailboxes/${encodeURIComponent(boite)}/folders/${encodeURIComponent(dossier)}`;
}

// --- Boîte info@ -------------------------------------------------------------

let boiteEnCache: string | null = null;

/** resourceId de la boîte (HOSTINGER_MAIL_MAILBOX_ID, sinon GET /api/v1/me), gardé en mémoire. */
async function idBoite(): Promise<string> {
  const fixe = process.env.HOSTINGER_MAIL_MAILBOX_ID?.trim();
  if (fixe) return fixe;
  if (boiteEnCache) return boiteEnCache;

  const voulue = (process.env.HOSTINGER_MAIL_ADRESSE ?? process.env.CONTACT_EMAIL ?? "info@technolot.ca")
    .trim()
    .toLowerCase();
  const me = await json<{ data?: { mailboxes?: { resourceId: string; address: string }[] } }>("/api/v1/me");
  const boites = me.data?.mailboxes ?? [];
  const boite = boites.find((b) => b.address?.trim().toLowerCase() === voulue);
  if (!boite) {
    const trouvees = boites.map((b) => b.address).filter(Boolean).join(", ") || "aucune";
    throw new ErreurHostinger(
      404,
      `La clé Mail API ne donne pas accès à ${voulue} (boîtes accessibles : ${trouvees}). ` +
        "Vérifie la clé ou HOSTINGER_MAIL_ADRESSE.",
    );
  }
  boiteEnCache = boite.resourceId;
  return boite.resourceId;
}

// --- Recherche -----------------------------------------------------------------

async function rechercher(boite: string, dossier: string, corps: CorpsRecherche, parPage: number) {
  const page = await json<Page<MessageApi>>(
    `${cheminDossier(boite, dossier)}/messages/search?page=1&perPage=${parPage}&sort=-date`,
    { method: "POST", body: JSON.stringify(corps) },
  );
  return page.data ?? [];
}

async function listerDossiers(boite: string): Promise<DossierApi[]> {
  const page = await json<Page<DossierApi>>(`/api/v1/mailboxes/${encodeURIComponent(boite)}/folders?page=1&perPage=100`);
  return page.data ?? [];
}

type Soumis = { id: string; date: string; courriel: string | null; nom: string | null };

const cacheRecherche = new Map<string, { valeur: EmplacementCourriel | null; expire: number }>();

/**
 * Courriel envoyé à info@ par le formulaire pour cette demande : en-tête
 * X-Technolot-Soumission dans INBOX, sinon recherche par date et courriel du
 * client dans INBOX, puis dans les autres dossiers. Résultat gardé 10 min
 * (introuvable : 2 min).
 */
export async function trouverCourrielSoumission(s: Soumis): Promise<EmplacementCourriel | null> {
  const enCache = cacheRecherche.get(s.id);
  if (enCache && enCache.expire > Date.now()) return enCache.valeur;

  const valeur = await chercher(s);
  if (cacheRecherche.size > 500) cacheRecherche.clear();
  cacheRecherche.set(s.id, {
    valeur,
    expire: Date.now() + (valeur ? TROUVE_TTL_MS : INTROUVABLE_TTL_MS),
  });
  return valeur;
}

async function chercher(s: Soumis): Promise<EmplacementCourriel | null> {
  const boite = await idBoite();

  const exacts = await rechercher(boite, "INBOX", corpsRechercheEntete(s.id), 5);
  if (exacts[0]) return { dossier: "INBOX", uid: exacts[0].uid };

  const corps = corpsRechercheApproximative(s);
  if (!corps) return null;

  const proche = messageLePlusProche(await rechercher(boite, "INBOX", corps, 50), s.date);
  if (proche) return { dossier: "INBOX", uid: proche.uid };

  const dossiers = dossiersAFouiller(await listerDossiers(boite));
  const resultats = await Promise.allSettled(
    dossiers.map(async (dossier) => {
      const m = messageLePlusProche(await rechercher(boite, dossier, corps, 50), s.date);
      return m ? { dossier, uid: m.uid, date: m.date } : null;
    }),
  );
  const trouves = resultats.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  const meilleur = messageLePlusProche(trouves, s.date);
  if (meilleur) return { dossier: meilleur.dossier, uid: meilleur.uid };

  // Rien trouvé alors qu'un dossier a échoué : on signale l'erreur plutôt que « introuvable ».
  const echec = resultats.find((r) => r.status === "rejected");
  if (echec && echec.status === "rejected") throw echec.reason;
  return null;
}

// --- Lecture -------------------------------------------------------------------

async function lireMessage(boite: string, dossier: string, uid: number): Promise<MessageApi> {
  const res = await json<{ data?: MessageApi }>(`${cheminDossier(boite, dossier)}/messages/${uid}`);
  if (!res.data) throw new ErreurHostinger(404);
  return res.data;
}

/** Le courriel (en-têtes, texte, HTML sans scripts, pièces jointes). */
export async function lireCourriel(dossier: string, uid: number): Promise<CourrielSoumission> {
  const boite = await idBoite();
  const [message, contenu] = await Promise.all([
    lireMessage(boite, dossier, uid),
    json<{ data?: { text?: string | null; html?: string | null } }>(
      `${cheminDossier(boite, dossier)}/messages/${uid}/text`,
    ),
  ]);
  const html = contenu.data?.html ? retirerScripts(contenu.data.html) : "";
  const texte = contenu.data?.text ?? "";
  return {
    sujet: message.subject ?? "",
    de: formaterAdresse(message.from),
    a: formaterAdresses(message.to),
    date: message.date ?? "",
    html: html.trim() ? html : null,
    texte: texte.trim() ? texte : null,
    piecesJointes: piecesVisibles(message.attachments),
    lienHostinger: lienWebmail(dossier, uid),
  };
}

/**
 * Le fichier d'une pièce jointe de ce message, en flux, avec ses en-têtes
 * (type MIME d'origine, inline ou attachment) ; null si la pièce
 * n'appartient pas au message.
 */
export async function telechargerPiece(dossier: string, uid: number, pieceId: string): Promise<Response | null> {
  const boite = await idBoite();
  const message = await lireMessage(boite, dossier, uid);
  const piece = piecesVisibles(message.attachments).find((p) => p.id === pieceId);
  if (!piece) return null;

  const res = await appel(
    `${cheminDossier(boite, dossier)}/messages/${uid}/attachments/${encodeURIComponent(piece.id)}`,
    { headers: { Accept: "*/*" } },
    DELAI_PIECE_MS,
  );
  const entetes: Record<string, string> = entetesPiece(piece.nom, piece.type);
  // Content-Length seulement sans compression : fetch décompresse le corps.
  const longueur = res.headers.get("content-length");
  if (longueur && /^\d+$/.test(longueur) && !res.headers.get("content-encoding")) {
    entetes["Content-Length"] = longueur;
  }
  return new Response(res.body, { status: 200, headers: entetes });
}
