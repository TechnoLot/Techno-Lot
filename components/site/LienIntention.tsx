"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import type { ComponentProps } from "react";

/** Pages déjà demandées : un seul préchargement par lien, même si le ruban le duplique. */
const prechargees = new Set<string>();

/**
 * Lien `next/link` qui ne se précharge pas quand il apparaît à l'écran, seulement
 * à l'intention : survol (pointerenter), toucher (touchstart, passif côté React)
 * ou focus au clavier. Pour les longues listes du pied de page et du ruban de
 * liens, dont le préchargement à l'apparition saccadait le défilement.
 * Le clic, la navigation côté client, les classes et le balisage sont inchangés.
 * Même type de préchargement (« auto ») qu'un lien ordinaire de Next.
 */
export function LienIntention({ href, onPointerEnter, onTouchStart, onFocus, ...props }: Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & { href: string }) {
  const router = useRouter();
  const precharger = () => {
    if (prechargees.has(href)) return;
    prechargees.add(href);
    router.prefetch(href, { kind: PrefetchKind.AUTO });
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onPointerEnter={(e) => {
        precharger();
        onPointerEnter?.(e);
      }}
      onTouchStart={(e) => {
        precharger();
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        precharger();
        onFocus?.(e);
      }}
    />
  );
}
