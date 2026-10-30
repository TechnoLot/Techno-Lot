"use server";

import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { adminPourAction } from "@/lib/securite/garde";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { limiterSelon, type RegleLimite } from "@/lib/securite/limite";

/**
 * Changement du mot de passe admin (« Mon compte »), côté serveur.
 *
 * Remplace l'appel navigateur à Supabase : plus aucun client Supabase dans le
 * navigateur, donc les témoins de session peuvent être HttpOnly.
 *
 *  1. admin vérifié (`adminPourAction`) ;
 *  2. 5 essais / 15 min par compte ;
 *  3. nouveau mot de passe de 12 à 72 caractères et 72 octets au plus (bcrypt
 *     ignore la suite) ; tout caractère permis, aucune règle de symboles ;
 *  4. mot de passe ACTUEL vérifié avec un client Supabase séparé, SANS
 *     persistance de session (aucun témoin touché) ; la session de
 *     vérification est fermée aussitôt ;
 *  5. `updateUser({ password })` sur la session courante, puis fermeture des
 *     AUTRES sessions (`signOut({ scope: "others" })`).
 * Jamais de mot de passe ni de texte d'erreur Supabase dans la réponse ou le journal.
 */

export type ResultatMotDePasse = { ok: true } | { ok: false; error: string };

const LONGUEUR_MIN = 12;
const LONGUEUR_MAX = 72;
const OCTETS_MAX = 72;

const LIMITE_CHANGEMENT: RegleLimite = {
  route: "auth-mdp-change:compte:15min",
  fenetreSecondes: 900,
  max: 5,
};

/** Message d'erreur pour le nouveau mot de passe, ou null s'il est acceptable. */
function verifierNouveauMotDePasse(nouveau: unknown): string | null {
  if (typeof nouveau !== "string") return "Mot de passe invalide.";
  const caracteres = [...nouveau].length;
  if (caracteres < LONGUEUR_MIN) {
    return `Le mot de passe doit contenir au moins ${LONGUEUR_MIN} caractères.`;
  }
  if (caracteres > LONGUEUR_MAX || new TextEncoder().encode(nouveau).length > OCTETS_MAX) {
    return `Le mot de passe doit contenir au plus ${LONGUEUR_MAX} caractères (les lettres accentuées comptent double).`;
  }
  return null;
}

async function entetes() {
  try {
    return await headers();
  } catch {
    return undefined;
  }
}

/** Vérifie le mot de passe actuel sans toucher aux témoins de la session. */
async function motDePasseActuelValide(email: string, actuel: string): Promise<boolean | "limite"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) return false;
  const verif = createSupabaseClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await verif.auth.signInWithPassword({ email, password: actuel });
  if (error) return error.status === 429 ? "limite" : false;
  // Ferme seulement la session créée pour la vérification.
  await verif.auth.signOut({ scope: "local" }).catch(() => {});
  return true;
}

export async function changerMotDePasse(entree: {
  actuel: unknown;
  nouveau: unknown;
}): Promise<ResultatMotDePasse> {
  const ctx = await adminPourAction();
  if (!ctx) return { ok: false, error: "Accès refusé." };
  const { supabase, user, requestId } = ctx;
  const h = await entetes();

  const limite = await limiterSelon(LIMITE_CHANGEMENT, user.id, {
    entetes: h,
    requestId,
    userId: user.id,
    methode: "ACTION",
    chemin: "/admin/compte",
  });
  if (!limite.permis) {
    return { ok: false, error: "Trop d'essais. Réessaie dans quelques minutes." };
  }

  const { actuel, nouveau } = entree ?? {};
  if (typeof actuel !== "string" || actuel.length === 0 || actuel.length > 200) {
    return { ok: false, error: "Entre ton mot de passe actuel." };
  }
  const probleme = verifierNouveauMotDePasse(nouveau);
  if (probleme) return { ok: false, error: probleme };
  const nouveauMdp = nouveau as string;
  if (nouveauMdp === actuel) {
    return { ok: false, error: "Le nouveau mot de passe doit être différent de l'actuel." };
  }
  if (!user.email) return { ok: false, error: "Accès refusé." };

  const echec = (motif: string, errcode?: string) =>
    void journaliser(EVENEMENTS.authEchec, {
      resultat: "echec",
      entetes: h,
      requestId,
      userId: user.id,
      methode: "ACTION",
      chemin: "/admin/compte",
      details: { methode: "changement_mot_de_passe", motif, errcode },
    });

  let valide: boolean | "limite";
  try {
    valide = await motDePasseActuelValide(user.email, actuel);
  } catch {
    valide = false;
  }
  if (valide === "limite") {
    echec("limite_supabase");
    return { ok: false, error: "Trop d'essais. Réessaie dans quelques minutes." };
  }
  if (!valide) {
    echec("mot_de_passe_actuel");
    return { ok: false, error: "Mot de passe actuel incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (error) {
    echec("mise_a_jour", error.code ?? undefined);
    if (error.code === "same_password") {
      return { ok: false, error: "Le nouveau mot de passe doit être différent de l'actuel." };
    }
    if (error.code === "weak_password") {
      return { ok: false, error: "Mot de passe trop faible : allonge-le (12 caractères au moins)." };
    }
    if (error.code === "reauthentication_needed") {
      return { ok: false, error: "Reconnecte-toi, puis recommence le changement." };
    }
    return { ok: false, error: "Impossible d'enregistrer le mot de passe pour l'instant." };
  }

  // Coupe les autres appareils (la session courante reste ouverte).
  const { error: erreurAutres } = await supabase.auth.signOut({ scope: "others" });

  void journaliser(EVENEMENTS.authMotDePasseChange, {
    resultat: "ok",
    entetes: h,
    requestId,
    userId: user.id,
    methode: "ACTION",
    chemin: "/admin/compte",
    details: erreurAutres ? { autres_appareils: "non_deconnectes", errcode: erreurAutres.code } : undefined,
  });
  return { ok: true };
}
