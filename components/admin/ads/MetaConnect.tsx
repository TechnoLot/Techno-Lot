"use client";

import { useState } from "react";
import { Check, CheckCircle2, CircleDashed, Copy, FileText, Link2 } from "lucide-react";
import { PlatformIcon } from "./PlatformBadge";
import { card, cardSub, cardTitle, focusRing } from "./ui";

/** Paramètres d'URL à coller dans chaque pub Meta (relient le lead à sa pub). */
export const META_URL_PARAMS =
  "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}";

const ENV_EXAMPLE = "META_ACCESS_TOKEN=votre_jeton\nMETA_AD_ACCOUNT_ID=1234567890";

const code = "rounded-md bg-admin-page px-1.5 py-0.5 font-mono text-[12px] text-admin-ink";

function CopyBlock({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-admin-line bg-admin-subtle">
      <div className="flex items-center justify-between gap-2 border-b border-admin-line-soft px-3 py-1.5">
        <span className="text-[12px] font-medium text-admin-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors ${focusRing} ${
            copied
              ? "border-admin-tint-green-line bg-admin-tint-green text-admin-tint-green-ink"
              : "border-admin-line-strong bg-admin-card text-admin-ink hover:border-admin-green hover:text-admin-green"
          }`}
          aria-label={`Copier : ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all px-3 py-2.5 font-mono text-[12px] leading-relaxed text-admin-ink">
        {value}
      </pre>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copié dans le presse-papiers" : ""}
      </span>
    </div>
  );
}

function EnvStatus({ ok, name }: { ok: boolean; name: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-admin-line bg-admin-card px-3 py-2">
      <code className="truncate font-mono text-[12px] text-admin-ink">{name}</code>
      {ok ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-admin-green">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Présente
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-admin-warning">
          <CircleDashed className="h-3.5 w-3.5" aria-hidden /> Manquante
        </span>
      )}
    </li>
  );
}

/**
 * Encadré « Connecter Meta Ads » : étapes de docs/PUBLICITES-SETUP.md.
 * N'affiche jamais de secret, seulement si chaque variable est présente.
 */
export default function MetaConnect({ env }: { env: { token: boolean; account: boolean } }) {
  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "Créer le jeton d'accès",
      body: (
        <>
          Sur <strong className="font-semibold text-admin-ink">business.facebook.com</strong> : Paramètres de
          l&apos;entreprise → Utilisateurs → <strong className="font-semibold text-admin-ink">Utilisateurs système</strong>{" "}
          → Ajouter (rôle Admin). Avec « Attribuer des éléments », donnez-lui accès au compte publicitaire. Puis{" "}
          <strong className="font-semibold text-admin-ink">Générer un jeton</strong> : cochez la permission{" "}
          <code className={code}>ads_read</code>, expiration « Jamais ». Copiez-le tout de suite, il ne s&apos;affiche
          qu&apos;une fois.
        </>
      ),
    },
    {
      title: "Trouver l'identifiant du compte pub",
      body: (
        <>
          Dans le Gestionnaire de publicités, c&apos;est le numéro sous le nom du compte, en haut à gauche (avec ou sans{" "}
          <code className={code}>act_</code> devant).
        </>
      ),
    },
    {
      title: "Ajouter les deux clés au serveur",
      body: (
        <>
          Pour tester sur l&apos;ordinateur : dans le fichier <code className={code}>.env.local</code> à la racine du
          projet, puis redémarrez <code className={code}>npm run dev</code>.
          <CopyBlock label=".env.local" value={ENV_EXAMPLE} />
          <span className="mt-2.5 block">
            Pour le site en ligne : chez l&apos;hébergeur (Hostinger), dans les variables d&apos;environnement du site,
            ajoutez les mêmes noms et valeurs, puis redéployez. Jamais dans <code className={code}>.env.production</code>,
            ce fichier est public dans GitHub.
          </span>
        </>
      ),
    },
    {
      title: "Coller les paramètres d'URL dans chaque pub",
      body: (
        <>
          Gestionnaire de publicités → la pub → Destination → <strong className="font-semibold text-admin-ink">Paramètres
          d&apos;URL</strong>. C&apos;est ce qui relie chaque lead à sa pub, même avant la connexion.
          <CopyBlock label="Paramètres d'URL Meta" value={META_URL_PARAMS} />
        </>
      ),
    },
    {
      title: "Cliquer « Mettre à jour depuis Meta »",
      body: <>Le bouton apparaît ici dès que les deux clés sont présentes. Les dépenses par pub arrivent en quelques secondes.</>,
    },
  ];

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="meta-connect-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#6bd63b] text-admin-ink">
              <PlatformIcon platform="meta" className="h-[18px] w-[18px]" />
            </span>
            <h2 id="meta-connect-title" className="font-display text-xl font-semibold text-admin-ink">
              Connecter Meta Ads
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-admin-muted [text-wrap:pretty]">
            Les leads venus du site s&apos;affichent déjà. Une fois Meta connecté, on voit aussi ce que chaque pub coûte,
            donc son coût par lead et son verdict. Environ 10 minutes.
          </p>
        </div>
        <ul
          className="grid w-full gap-2 sm:grid-cols-2 lg:w-[22rem] lg:shrink-0 lg:grid-cols-1"
          aria-label="Clés détectées sur le serveur"
        >
          <EnvStatus ok={env.token} name="META_ACCESS_TOKEN" />
          <EnvStatus ok={env.account} name="META_AD_ACCOUNT_ID" />
        </ul>
      </div>

      <ol className="mt-5 grid gap-x-8 gap-y-5 border-t border-admin-line-soft pt-5 lg:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex min-w-0 gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-admin-line-strong font-display text-[13px] font-semibold text-admin-ink">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-sm font-semibold text-admin-ink">{s.title}</h3>
              <div className="mt-1 text-[13px] leading-relaxed text-admin-muted [text-wrap:pretty]">{s.body}</div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-admin-muted">
        <FileText className="h-4 w-4 text-admin-green" aria-hidden />
        Guide complet : <code className={code}>docs/PUBLICITES-SETUP.md</code>
      </p>
    </section>
  );
}

/** Rappel compact des paramètres d'URL (quand Meta est déjà connecté). */
export function UrlParamsCard() {
  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="url-params-title">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-admin-green" aria-hidden />
        <h2 id="url-params-title" className={cardTitle}>
          Paramètres d&apos;URL des pubs
        </h2>
      </div>
      <p className={cardSub}>
        À coller dans chaque nouvelle pub (Destination → Paramètres d&apos;URL) : sans eux, ses leads arrivent dans « Pub
        non identifiée ».
      </p>
      <CopyBlock label="Paramètres d'URL Meta" value={META_URL_PARAMS} />
    </section>
  );
}
