"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Anciens liens du widget Soro (`/blog?post=<slug>`) : redirige vers la page
 * native de l'article `/blog/<slug>`. Côté client pour garder l'index statique.
 */
export default function LegacyPostRedirect({ basePath }: { basePath: string }) {
  const router = useRouter();
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("post");
    if (slug && /^[a-z0-9-]+$/.test(slug)) router.replace(`${basePath}/${slug}`);
  }, [basePath, router]);
  return null;
}
