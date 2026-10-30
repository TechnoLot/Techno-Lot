"use client";

import { useState } from "react";
import { Loader2, Smartphone, TriangleAlert } from "lucide-react";
import { changerAppareilMfa } from "@/app/admin/(dashboard)/compte/actions";
import {
  declencheAction,
  etapeSuivante,
  PHRASE_CONFIRMATION,
  type EtapeChangerAppareil,
  type EvenementChangerAppareil,
} from "@/lib/admin/changer-appareil";
import { urlMfa } from "@/lib/securite/mfa";

/** Mêmes dimensions que .btn-secondary, couleurs de confirmation destructrice de l'admin (DeleteLotButton). */
const BOUTON_CONFIRMER =
  "inline-flex items-center justify-center gap-2 rounded-full border border-admin-tint-red-line bg-admin-tint-red-strong px-5 py-2.5 text-sm font-semibold text-admin-danger transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card disabled:cursor-not-allowed disabled:opacity-70";

/**
 * Bouton « Changer d'appareil » de Mon compte, confirmation en deux temps
 * (lib/admin/changer-appareil.ts) : le premier clic affiche la phrase de
 * confirmation ; seul « Oui, changer d'appareil » appelle l'action serveur
 * (session aal2 exigée), qui retire le facteur actuel, puis recharge
 * /admin/auth/mfa, qui propose l'activation d'un nouvel appareil.
 */
export default function ChangerAppareilMfa() {
  const [etape, setEtape] = useState<EtapeChangerAppareil>("repos");
  const [error, setError] = useState("");

  async function envoyer(evenement: EvenementChangerAppareil) {
    const lancer = declencheAction(etape, evenement);
    setEtape(etapeSuivante(etape, evenement));
    if (evenement === "demander") setError("");
    if (!lancer) return;

    let resultat: Awaited<ReturnType<typeof changerAppareilMfa>>;
    try {
      resultat = await changerAppareilMfa();
    } catch {
      resultat = { ok: false, error: "Une erreur est survenue. Réessaie." };
    }
    if (!resultat.ok) {
      setEtape((e) => etapeSuivante(e, "echec"));
      setError(resultat.error);
      return;
    }
    // Rechargement complet : nouveaux témoins (aal1), activation proposée.
    window.location.assign(urlMfa("/admin/compte"));
  }

  const envoi = etape === "envoi";

  return (
    <div className="space-y-4">
      {etape === "erreur" && error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {etape === "confirmation" || envoi ? (
        <div className="space-y-4">
          <p className="text-sm text-admin-ink">{PHRASE_CONFIRMATION}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => envoyer("confirmer")}
              disabled={envoi}
              className={`${BOUTON_CONFIRMER} w-full sm:w-auto`}
            >
              {envoi ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Smartphone className="h-4 w-4" aria-hidden />
              )}
              Oui, changer d&apos;appareil
            </button>
            <button
              type="button"
              onClick={() => envoyer("annuler")}
              disabled={envoi}
              className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => envoyer("demander")}
          className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          <Smartphone className="h-4 w-4" aria-hidden />
          Changer d&apos;appareil
        </button>
      )}
    </div>
  );
}
