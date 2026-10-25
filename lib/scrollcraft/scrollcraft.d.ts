/**
 * Types du moteur scrollcraft (scrollcraft.js, copié tel quel depuis le
 * skill). Le fichier JS est un script qui expose window.ScrollCraft ; ce
 * fichier en fait un module pour l'import dynamique côté client.
 */
export {};

declare global {
  interface Window {
    ScrollCraft?: {
      mount: (root: Element) => { acts: { el: HTMLElement }[]; destroy: () => void };
      instances: unknown[];
    };
  }
}
