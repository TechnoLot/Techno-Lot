import type { SupabaseClient } from "@supabase/supabase-js";

/** Une demande sans lot reste « à traiter » pendant ce nombre de jours (accueil et onglet Soumissions). */
export const A_TRAITER_JOURS = 30;

/** Filtres de l'onglet Soumissions (paramètre ?statut=). */
export const FILTRES_SOUMISSIONS = ["toutes", "a-traiter", "lot-cree"] as const;
export type FiltreSoumissions = (typeof FILTRES_SOUMISSIONS)[number];

/** Demande reçue par le formulaire public (table soumissions, en lecture seule). */
export type Soumission = {
  id: string;
  date: string; // ISO (colonne "DATE")
  nom: string | null;
  courriel: string | null;
  telephone: string | null;
  message: string | null;
  locale: "fr" | "en";
  /** Noms des pièces jointes : les fichiers eux-mêmes ne partent que par courriel. */
  fichiers: string[];
  /** Lignes « Entreprise : » et « Ville : » du message composé par le formulaire. */
  entreprise: string | null;
  ville: string | null;
  /** Lot qui traite la demande, ou null. */
  lotId: string | null;
};

export type SoumissionsResult = {
  rows: Soumission[];
  /** Message de Supabase quand la lecture a échoué */
  error: string | null;
};

type Raw = {
  id: string;
  DATE: string;
  nom: string | null;
  courriel: string | null;
  telephone: string | null;
  message: string | null;
  locale: string | null;
  fichiers: string[] | null;
};

type LotRef = {
  id: string;
  soumission_id: string | null;
  client_email: string | null;
  client_phone: string | null;
  created_at: string;
};

/** Les 10 derniers chiffres d'un téléphone (null si moins de 10 chiffres). */
function phoneKey(v: string | null | undefined): string | null {
  const digits = (v ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Valeur d'une ligne « Libellé : valeur » placée par composerMessage avant la description. */
function ligneDuMessage(message: string | null, libelle: string): string | null {
  const entete = message?.split("\n\nDescription :")[0] ?? "";
  const m = entete.match(new RegExp(`^${libelle} : (.+)$`, "m"));
  return m ? m[1].trim() : null;
}

function toSoumission(r: Raw, lotId: string | null): Soumission {
  return {
    id: r.id,
    date: r.DATE,
    nom: r.nom,
    courriel: r.courriel,
    telephone: r.telephone,
    message: r.message,
    locale: r.locale === "en" ? "en" : "fr",
    fichiers: r.fichiers ?? [],
    entreprise: ligneDuMessage(r.message, "Entreprise"),
    ville: ligneDuMessage(r.message, "Ville"),
    lotId,
  };
}

/**
 * Lot de chaque demande : celui qui y est lié (lots.soumission_id), sinon le
 * premier lot créé après la demande pour le même courriel ou le même
 * téléphone (les lots saisis à la main ne remplissent pas soumission_id).
 */
function lotsDesSoumissions(raw: Raw[], lots: LotRef[]): Map<string, string> {
  const lies = new Map<string, string>();
  for (const l of lots) {
    if (l.soumission_id && !lies.has(l.soumission_id)) lies.set(l.soumission_id, l.id);
  }
  const parDate = [...lots].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  const result = new Map<string, string>();
  for (const r of raw) {
    const lie = lies.get(r.id);
    if (lie) {
      result.set(r.id, lie);
      continue;
    }
    const email = r.courriel?.trim().toLowerCase() || null;
    const phone = phoneKey(r.telephone);
    if (!email && !phone) continue;
    const recue = Date.parse(r.DATE);
    const lot = parDate.find(
      (l) =>
        Date.parse(l.created_at) >= recue &&
        ((email !== null && l.client_email?.trim().toLowerCase() === email) ||
          (phone !== null && phoneKey(l.client_phone) === phone)),
    );
    if (lot) result.set(r.id, lot.id);
  }
  return result;
}

/**
 * Soumissions du formulaire public, plus récentes d'abord, chacune avec son
 * lot. La table n'a pas de politique de lecture : on passe par la fonction
 * admin_soumissions (réservée au compte admin connecté, migration
 * 20261029000000), avec la session de l'admin. `since` (ISO) : seulement les
 * demandes reçues depuis cette date.
 */
export async function fetchSoumissions(
  supabase: SupabaseClient,
  { since, limit = 500 }: { since?: string; limit?: number } = {},
): Promise<SoumissionsResult> {
  const { data, error } = await supabase.rpc("admin_soumissions", {
    p_since: since ?? null,
    p_limit: limit,
  });
  if (error) return { rows: [], error: error.message };

  const raw = (data ?? []) as Raw[];
  if (raw.length === 0) return { rows: [], error: null };

  const oldest = raw[raw.length - 1].DATE;
  const { data: lotsRaw } = await supabase
    .from("lots")
    .select("id, soumission_id, client_email, client_phone, created_at")
    .gte("created_at", oldest);
  const lots = lotsDesSoumissions(raw, (lotsRaw ?? []) as LotRef[]);

  return { rows: raw.map((r) => toSoumission(r, lots.get(r.id) ?? null)), error: null };
}

/** Une demande et le lot qui y est lié (pré-remplissage d'un lot) ; null si illisible ou introuvable. */
export async function fetchSoumission(supabase: SupabaseClient, id: string): Promise<Soumission | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;

  const [{ data }, { data: lot }] = await Promise.all([
    supabase.rpc("admin_soumissions", { p_id: id, p_limit: 1 }),
    supabase.from("lots").select("id").eq("soumission_id", id).limit(1).maybeSingle(),
  ]);
  const raw = ((data ?? []) as Raw[])[0];
  if (!raw) return null;
  return toSoumission(raw, (lot as { id: string } | null)?.id ?? null);
}

/** À traiter : aucun lot et reçue depuis moins de A_TRAITER_JOURS jours. */
export function estATraiter(s: Soumission, now: Date): boolean {
  return s.lotId === null && now.getTime() - Date.parse(s.date) < A_TRAITER_JOURS * 86_400_000;
}
