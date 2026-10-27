import { Check, ExternalLink, X } from "lucide-react";

export type EbayEnvStatus = {
  appId: boolean;
  certId: boolean;
  refreshToken: boolean;
  marketplace: boolean;
};

const VARS: Array<{ key: keyof EbayEnvStatus; name: string; hint: string; optional?: boolean }> = [
  { key: "appId", name: "EBAY_APP_ID", hint: "App ID (Client ID) du jeu de clés Production" },
  { key: "certId", name: "EBAY_CERT_ID", hint: "Cert ID (Client Secret) du même jeu de clés" },
  { key: "refreshToken", name: "EBAY_REFRESH_TOKEN", hint: "Refresh token du compte vendeur Techno Lot" },
  { key: "marketplace", name: "EBAY_MARKETPLACE_ID", hint: "Facultatif : EBAY_CA par défaut", optional: true },
];

const SCOPES = [
  { name: "sell.fulfillment", why: "lire les commandes (obligatoire)" },
  { name: "sell.finances", why: "lire les frais eBay pour le profit" },
  { name: "sell.inventory, sell.analytics, commerce.identity", why: "panneau « Boutique en direct » (annonces, retours, évaluations)" },
];

/**
 * Encadré « Connecter eBay » : quelles variables ajouter, où les trouver et
 * quels droits accorder. N'affiche jamais de valeur, seulement présente/manquante.
 */
export default function ConnectEbay({ env, compact = false }: { env: EbayEnvStatus; compact?: boolean }) {
  const body = (
    <div className="grid gap-6 lg:grid-cols-2">
      <ol className="flex flex-col gap-4 text-sm leading-relaxed text-admin-muted">
        <Step n={1}>
          Dans le{" "}
          <ExtLink href="https://developer.ebay.com/my/keys">portail développeur eBay</ExtLink>, ouvre{" "}
          <strong className="font-semibold text-admin-ink">Application Keysets</strong> et copie l’
          <strong className="font-semibold text-admin-ink">App ID</strong> et le{" "}
          <strong className="font-semibold text-admin-ink">Cert ID</strong> du jeu de clés{" "}
          <strong className="font-semibold text-admin-ink">Production</strong>.
        </Step>
        <Step n={2}>
          Ouvre{" "}
          <ExtLink href="https://developer.ebay.com/my/auth/?env=production&index=0">User Tokens</ExtLink>, choisis
          « OAuth », connecte-toi avec le compte vendeur Techno Lot et accepte les droits. Copie le{" "}
          <strong className="font-semibold text-admin-ink">refresh token</strong> (valide 18 mois).
        </Step>
        <Step n={3}>
          Ajoute les variables dans <Code>.env.local</Code> (ordinateur) et chez l’hébergeur (variables
          d’environnement de Hostinger), puis redémarre le site.
        </Step>
        <Step n={4}>
          Reviens ici et clique sur <strong className="font-semibold text-admin-ink">Synchroniser avec eBay</strong>.
          Le premier passage importe les 12 derniers mois.
        </Step>
      </ol>

      <div className="flex flex-col gap-5">
        <div>
          <h3 className="font-display text-sm font-semibold text-admin-ink">Variables côté serveur</h3>
          <ul className="mt-2 divide-y divide-admin-line-soft rounded-xl border border-admin-line">
            {VARS.map((v) => {
              const ok = env[v.key];
              return (
                <li key={v.name} className="flex items-start gap-3 px-3 py-2.5">
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      ok ? "bg-admin-tint-green text-admin-green" : v.optional ? "bg-admin-tint-gray text-admin-muted" : "bg-admin-tint-red-strong text-admin-danger"
                    }`}
                    aria-hidden
                  >
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <code className="break-all font-mono text-[13px] font-medium text-admin-ink">{v.name}</code>
                    <span className="block text-xs text-admin-muted">{v.hint}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-medium ${ok ? "text-admin-green" : v.optional ? "text-admin-muted" : "text-admin-danger"}`}>
                    {ok ? "présente" : v.optional ? "par défaut" : "manquante"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-admin-ink">Droits à accorder au jeton</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-admin-muted">
            {SCOPES.map((s) => (
              <li key={s.name}>
                <Code>{s.name}</Code> : {s.why}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <details className="group rounded-2xl border border-admin-line bg-admin-card p-5 lg:p-6">
        <summary className="cursor-pointer list-none font-display text-sm font-semibold text-admin-ink [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            Connexion eBay
            <span className="text-xs font-normal text-admin-muted group-open:hidden">· afficher les réglages</span>
          </span>
        </summary>
        <div className="mt-5">{body}</div>
      </details>
    );
  }

  return (
    <section className="rounded-2xl border border-admin-line bg-admin-card p-5 lg:p-6" aria-labelledby="connect-ebay">
      <h2 id="connect-ebay" className="font-display text-lg font-semibold text-admin-ink">
        Connecter eBay
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-admin-muted">
        Une fois le compte relié, les ventes eBay s’ajoutent aux ventes et au profit du tableau de bord. Aucune clé
        n’est affichée ici : seulement si elle est présente ou non.
      </p>
      <div className="mt-6">{body}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-admin-tint-gray font-display text-xs font-semibold text-admin-ink">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-admin-page px-1.5 py-0.5 font-mono text-[12.5px] text-admin-ink">{children}</code>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-admin-green underline decoration-admin-line-strong underline-offset-2 hover:decoration-admin-green"
    >
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}
