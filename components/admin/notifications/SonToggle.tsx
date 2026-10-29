"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useNotifications } from "./NotificationsProvider";
import { debloquerAudio, jouerSon } from "./sons";

/** Active ou coupe le son des alertes ; le réactiver fait entendre le cha-ching. */
export default function SonToggle() {
  const { sonActif, setSonActif } = useNotifications();

  function basculer() {
    debloquerAudio();
    const actif = !sonActif;
    setSonActif(actif);
    if (actif) jouerSon("vente");
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={sonActif}
      className="admin-focus inline-flex items-center gap-2 rounded-full border border-admin-line bg-admin-card px-3 py-1.5 text-[13px] text-admin-muted transition-colors hover:text-admin-ink"
    >
      {sonActif ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
      {sonActif ? "Son activé" : "Son coupé"}
    </button>
  );
}
