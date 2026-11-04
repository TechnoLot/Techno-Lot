"use client";

import { useEffect } from "react";
import "@/assets/outils/garde-activite.js";

type Garde = { demarrer: () => () => void };

/**
 * Déconnexion après 1 h sans activité réelle : monte sur toutes les pages du
 * tableau de bord la garde partagée avec les outils en iframe
 * (assets/outils/garde-activite.js). N'affiche rien.
 */
export default function GardeInactivite() {
  useEffect(() => (globalThis as unknown as { GardeActivite: Garde }).GardeActivite.demarrer(), []);
  return null;
}
