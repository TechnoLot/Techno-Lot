import "server-only";
import { NextResponse } from "next/server";
import { reponseErreur } from "./erreurs";

/**
 * Vérification des variables d'environnement au démarrage (check 11).
 *
 * Appelée par `instrumentation.ts` (runtime Node) au lancement du serveur.
 * Ne JAMAIS afficher une valeur : seulement le NOM de la variable.
 *
 * - INDISPENSABLES : sans elles, le site ou l'admin ne fonctionnent pas. En
 *   production, le serveur refuse de démarrer (erreur claire) ; en
 *   développement, simple avertissement.
 * - De FONCTION : leur absence désactive une fonction précise ; avertissement
 *   au démarrage, et la fonction concernée répond 503 (`exigerConfig`).
 *
 * Aucun repli dangereux (`|| "secret"`) : une variable absente reste absente.
 */

export const VARIABLES_INDISPENSABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "ADMIN_EMAILS",
] as const;

export type RegleVariable = {
  nom: string;
  /** Longueur minimale (secrets). */
  longueurMin?: number;
  /** Doit être une URL http(s). */
  url?: boolean;
  /** Fonction désactivée sans elle (message d'avertissement). */
  fonction: string;
};

export const VARIABLES_FONCTION: readonly RegleVariable[] = [
  {
    nom: "SECURITE_RPC_SECRET",
    longueurMin: 32,
    fonction: "limites de débit, journal de sécurité durable, formulaire et suivi des pubs par le serveur",
  },
  { nom: "SITE_URL", url: true, fonction: "contrôle d'origine des requêtes admin (CSRF)" },
  { nom: "RESEND_API_KEY", fonction: "envoi des courriels (formulaire, devis, alertes de sécurité)" },
  {
    nom: "HOSTINGER_MAIL_API_TOKEN",
    fonction: "courriels du CRM envoyés depuis info@ (copie dans Envoyés) et « Voir le courriel » des soumissions",
  },
  { nom: "CONTACT_EMAIL", fonction: "destinataire des soumissions et des alertes de sécurité" },
  { nom: "FROM_EMAIL", fonction: "expéditeur des courriels" },
  { nom: "CRON_SECRET", longueurMin: 32, fonction: "tâches planifiées (Bearer)" },
];

function regleDe(nom: string): RegleVariable | undefined {
  return VARIABLES_FONCTION.find((r) => r.nom === nom);
}

/** Vrai si la variable est présente (non vide) et respecte sa règle. */
export function variableValide(nom: string): boolean {
  const valeur = process.env[nom];
  if (!valeur || valeur.trim() === "") return false;
  const regle = regleDe(nom);
  if (regle?.longueurMin && valeur.length < regle.longueurMin) return false;
  if (regle?.url) {
    try {
      const u = new URL(valeur);
      if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Variables dont l'absence désactive des protections SANS que les visiteurs
 * le voient : sans SECURITE_RPC_SECRET, les limites de débit s'ouvrent et le
 * journal durable s'arrête ; sans SITE_URL, les actions admin répondent 503
 * (contrôle d'origine). Signalées par un bandeau dans l'admin.
 */
export const VARIABLES_SECURITE_ADMIN = ["SITE_URL", "SECURITE_RPC_SECRET"] as const;

/**
 * NOMS des variables de sécurité absentes ou invalides (SITE_URL : URL
 * http(s) ; SECURITE_RPC_SECRET : 32 caractères ou plus). Jamais de valeur.
 * Liste vide = configuration complète.
 */
export function configurationSecuriteIncomplete(): string[] {
  return VARIABLES_SECURITE_ADMIN.filter((nom) => !variableValide(nom));
}

export type BilanEnvironnement = {
  indispensablesManquantes: string[];
  fonctionManquantes: string[];
};

/**
 * Vérifie l'environnement. En production, lève une erreur si une variable
 * indispensable manque (le serveur ne démarre pas avec une configuration
 * incomplète). Renvoie le bilan (noms seulement).
 */
export function verifierEnvironnement(): BilanEnvironnement {
  const indispensablesManquantes = VARIABLES_INDISPENSABLES.filter((n) => !variableValide(n));
  const fonctionManquantes = VARIABLES_FONCTION.filter((r) => !variableValide(r.nom)).map((r) => r.nom);

  for (const nom of fonctionManquantes) {
    const regle = regleDe(nom);
    const precision = regle?.longueurMin
      ? ` (au moins ${regle.longueurMin} caractères)`
      : regle?.url
        ? " (URL http(s))"
        : "";
    console.warn(
      `[securite/env] ${nom} absente ou invalide${precision} : ${regle?.fonction ?? "fonction"} désactivé(e), réponse 503.`,
    );
  }

  if (indispensablesManquantes.length > 0) {
    const message = `[securite/env] Variables d'environnement indispensables manquantes : ${indispensablesManquantes.join(", ")}.`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${message} Le serveur ne démarre pas : ajoutez-les chez l'hébergeur puis redéployez.`);
    }
    console.warn(message);
  }

  return { indispensablesManquantes: [...indispensablesManquantes], fonctionManquantes };
}

/**
 * Pour une fonction qui dépend de variables : null si tout est configuré, sinon
 * une réponse 503 propre (le nom des variables va au journal, pas au client).
 *
 * Exemple :
 *   const indispo = exigerConfig(["RESEND_API_KEY", "CONTACT_EMAIL"], { request });
 *   if (indispo) return indispo;
 */
export function exigerConfig(
  noms: readonly string[],
  options: { request?: Request; requestId?: string } = {},
): NextResponse | null {
  const manquantes = noms.filter((n) => !variableValide(n));
  if (manquantes.length === 0) return null;
  return reponseErreur(503, "Service temporairement indisponible.", {
    ...options,
    err: { name: "ConfigurationManquante", message: `Variables manquantes : ${manquantes.join(", ")}` },
  });
}
