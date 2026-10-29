// Aperçus des photos jointes : vignette réduite par un fil de travail (apercu.worker.ts).
// Le fichier d'origine n'est jamais modifié : c'est lui qui part avec le formulaire.

/**
 * Plus grand côté affiché d'une vignette, en px CSS : la grille `.tlf-thumbs`
 * (minmax(4.5rem, 1fr)) ne dépasse jamais deux colonnes minimales et un écart.
 */
const VIGNETTE_MAX_CSS = 152;

let fil: Worker | null | undefined; // undefined : pas encore créé ; null : indisponible
let seq = 0;
const enAttente = new Map<number, (blob: Blob | null) => void>();

function obtenirFil(): Worker | null {
  if (fil !== undefined) return fil;
  fil = null;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return fil;
  try {
    const w = new Worker(new URL("./apercu.worker.ts", import.meta.url));
    w.onmessage = (e: MessageEvent<{ id: number; blob: Blob | null }>) => {
      enAttente.get(e.data.id)?.(e.data.blob);
      enAttente.delete(e.data.id);
    };
    // Fil en panne : les aperçus en attente prennent l'original, les suivants aussi.
    w.onerror = () => {
      enAttente.forEach((resoudre) => resoudre(null));
      enAttente.clear();
      w.terminate();
      fil = null;
    };
    fil = w;
  } catch {
    /* pas de fil de travail : aperçu d'origine */
  }
  return fil;
}

/**
 * URL (blob:) de l'aperçu d'une photo : vignette réduite si possible, sinon le
 * fichier d'origine (comportement d'avant). L'appelant libère l'URL.
 */
export async function creerApercu(file: File): Promise<string> {
  const w = obtenirFil();
  let blob: Blob | null = null;
  if (w) {
    const cote = Math.ceil(VIGNETTE_MAX_CSS * Math.min(window.devicePixelRatio || 1, 3));
    blob = await new Promise<Blob | null>((resoudre) => {
      const id = ++seq;
      enAttente.set(id, resoudre);
      w.postMessage({ id, file, cote });
    });
  }
  return URL.createObjectURL(blob ?? file);
}
