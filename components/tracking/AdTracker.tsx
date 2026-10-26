"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendEvent } from "@/lib/tracking/attribution";

/** Envoie un page_view à chaque changement de route, hors chemin critique (LCP). */
export default function AdTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const send = () => sendEvent("page_view", pathname);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(send, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(send, 1500);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
