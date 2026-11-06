"use client";

import AnimatedNumber from "@/components/admin/AnimatedNumber";
import { formatMoney } from "@/lib/admin/format";

/** Montant qui monte à l'ouverture et au changement de période (fixe en mouvement réduit). */
export default function MontantAnime({ value }: { value: number }) {
  return <AnimatedNumber value={value} format={(n) => formatMoney(n)} duration={1.2} />;
}
