/**
 * Position de défilement partagée du site public : un seul relevé par image,
 * sans mise en page forcée.
 *
 * Lire `window.scrollY` (ou `innerHeight` sur mobile) oblige le navigateur à
 * recalculer styles et mise en page dès qu'une animation vient d'écrire un
 * style : chaque lecture tardive dans l'image se paie au prix fort. Ici, la
 * position est relevée une seule fois dans l'événement `scroll` (traité avant
 * les rappels requestAnimationFrame de l'image), puis servie en cache. Sur
 * ordinateur, Lenis tient déjà la position (`window.__lenis`) : aucune lecture
 * du DOM. Sans Lenis (téléphones, mouvement réduit), `window.scrollY` suffit.
 *
 * Les abonnés sont appelés une fois par image, dans un seul requestAnimationFrame
 * (phase d'écriture) : ils ne doivent rien mesurer.
 * Module sans dépendance (ni Lenis ni framer-motion), à n'appeler que côté client
 * (effets, rappels d'événements ou d'image).
 */

type Abonne = (y: number) => void;

const abonnes = new Set<Abonne>();
/** Dernière position native relevée ; null = à relire (Lenis actif ou pas encore lue). */
let natif: number | null = null;
/** Hauteur de la fenêtre, relue seulement au redimensionnement. */
let hauteur: number | null = null;
let installe = false;
let raf = 0;

function flush() {
  raf = 0;
  const y = positionDefilement();
  abonnes.forEach((fn) => fn(y));
}

function onScroll() {
  // Lenis actif : sa position fait foi, rien à lire ici
  natif = window.__lenis ? null : window.scrollY;
  if (abonnes.size && !raf) raf = requestAnimationFrame(flush);
}

function onResize() {
  hauteur = window.innerHeight;
}

function installer() {
  if (installe) return;
  installe = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
}

/**
 * Position de défilement courante (px), sans lecture du DOM : position tenue par
 * Lenis, sinon dernier relevé de l'événement `scroll`. À utiliser dans les
 * rappels d'image et de défilement.
 */
export function positionDefilement(): number {
  installer();
  const lenis = window.__lenis;
  if (lenis) return lenis.scroll;
  if (natif === null) natif = window.scrollY;
  return natif;
}

/**
 * Relit la position dans le DOM (`window.scrollY`) et met le cache à jour.
 * Réservé aux montages et aux mesures ponctuelles : juste après une navigation,
 * la position a pu changer sans qu'un événement `scroll` soit encore passé.
 */
export function lirePositionDefilement(): number {
  installer();
  natif = window.scrollY;
  return natif;
}

/** Hauteur de la fenêtre (`innerHeight`), relue seulement au redimensionnement. */
export function hauteurFenetre(): number {
  installer();
  if (hauteur === null) hauteur = window.innerHeight;
  return hauteur;
}

/**
 * Appelle `fn(y)` une fois par image après chaque défilement, dans un
 * requestAnimationFrame commun, avec la position en cache. Retourne la
 * fonction de désabonnement.
 */
export function abonnerDefilement(fn: Abonne): () => void {
  installer();
  abonnes.add(fn);
  return () => {
    abonnes.delete(fn);
    if (!abonnes.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
