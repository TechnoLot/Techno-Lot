/**
 * Erreur dont le message est rédigé par nous, en français, sans contenu brut
 * d'un service externe (check 20) : il peut être montré à l'admin. Le détail
 * brut du service (réponse JSON, message d'origine), s'il y en a un, voyage
 * dans `detail` et ne va qu'au journal.
 */
export class ErreurAffichable extends Error {
  constructor(
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ErreurAffichable";
  }
}

/** Texte court d'un détail brut, pour le journal (rédigé et tronqué ensuite par celui-ci). */
export function texteDetail(detail: unknown): string {
  if (detail === undefined || detail === null) return "";
  if (typeof detail === "string") return detail.slice(0, 1_000);
  if (detail instanceof Error) return detail.message.slice(0, 1_000);
  try {
    return JSON.stringify(detail).slice(0, 1_000);
  } catch {
    return String(detail).slice(0, 1_000);
  }
}
