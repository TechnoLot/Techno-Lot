# SEO local : pages, blogue et mesure

Guide de maintenance des pages locales, des pages catégories et du blogue. Aucun réglage ici ne garantit un classement : Google décide. Le but est d'avoir des pages exactes, utiles et bien mesurées.

## 1. Vue d'ensemble

### Pages créées

| URL | Langue | Gabarit |
| --- | --- | --- |
| `/rachat-materiel-informatique-montreal` | FR | `LocalPage` |
| `/en/it-equipment-buyback-montreal` | EN | `LocalPage` |
| `/rachat-materiel-informatique-laval` | FR seulement | `LocalPage` |
| `/rachat-materiel-informatique-terrebonne-mascouche` | FR seulement | `LocalPage` |
| `/rachat-materiel-informatique-rive-nord` | FR seulement | `LocalPage` |
| `/rachat-ordinateurs-portables-en-lot` | FR seulement | `CategoryPage` |
| `/rachat-serveurs-et-stockage` | FR seulement | `CategoryPage` |
| `/rachat-equipements-reseau-telecom` | FR seulement | `CategoryPage` |

### Où vit quoi

| Rôle | Fichier |
| --- | --- |
| Registre des pages indexables (`allSeoRoutes`, `sitemapEntries`, `alternatesFor`, `findRoute`, `counterpartPath`) | `lib/seo/routes.ts` |
| Métadonnées : titre, description, canonical/hreflang, Open Graph (`pageMetadata`) | `lib/seo/metadata.ts` |
| Données structurées JSON-LD (`organizationJsonLd`, `breadcrumbJsonLd`, `serviceJsonLd`, `faqJsonLd`) | `lib/seo/schema.ts` |
| Contenu des pages locales (`localPages`, `getLocalPage`, `CATEGORY_PAGES`) | `lib/seo/local-pages.ts` |
| Contenu des pages catégories (`categoryPages`, `CATEGORY_ADVANTAGES`, `CATEGORY_BREADCRUMB`) | `lib/seo/category-pages.ts` |
| Gabarits | `components/pages/local/LocalPage.tsx`, `components/pages/category/CategoryPage.tsx` |
| Fil d'Ariane visible (`Breadcrumbs`, `HeroCrumbs`, `pageCrumbs`) | `components/seo/Breadcrumbs.tsx` |
| Plan du site | `app/sitemap.ts` (registre + articles indexables du blogue) |
| Liens du pied de page | `components/site/SiteFooter.tsx` (lit le registre) |

## 2. Ajouter une page locale ou catégorie

1. **Contenu typé**
   - Locale : ajouter l'identifiant au type `LocalPageId` et une entrée `{ fr: … }` (et `en` si traduite) dans `localPages` de `lib/seo/local-pages.ts`.
   - Catégorie : ajouter l'identifiant à `CategoryPageId`, une entrée dans `categoryPages` et dans `CATEGORY_PAGE_IDS` (`lib/seo/category-pages.ts`).
2. **Route** : créer `app/(fr)/<slug>/page.tsx` qui exporte `metadata` via `pageMetadata({ locale: "fr", frPath: "/<slug>", title, description })` et rend le gabarit. Copier une page existante (ex. `app/(fr)/rachat-materiel-informatique-laval/page.tsx`). Version anglaise : route sous `app/(en)/en/…`.
3. **Registre** : ajouter l'entrée dans `allSeoRoutes` (`lib/seo/routes.ts`).
   - Français seulement : `{ fr: "/<slug>", changeFrequency: "monthly", priority: 0.8 }`, **sans** `en` (pas de hreflang en-CA, le sélecteur de langue mène à `/en`).
   - Bilingue : ajouter `en: "/en/<slug-anglais>"`.
   - L'entrée alimente automatiquement le plan du site, le maillage entre pages locales et catégories, et les liens du pied de page.
4. Vérifier : `npx tsc --noEmit`, puis ouvrir la page, `/sitemap.xml` et le code source (canonical, JSON-LD).

### Règles de contenu

Faits permis (et seulement ceux-ci) :
- offre dans les 24 heures ;
- ramassage sans frais et sans minimum, partout au Québec ;
- la moitié du paiement au ramassage, le solde après l'inspection (15 jours ouvrables au maximum) ;
- effacement sécurisé et certificat de destruction des données, sans frais ;
- tout matériel est accepté, même partiellement fonctionnel ; le prix dépend de l'évaluation.

Interdits :
- tout prix ou fourchette de prix ;
- toute certification ;
- tout témoignage ou avis client inventé ;
- un bureau ou une adresse dans une autre ville ;
- un délai de ramassage ;
- « destruction sur place » ;
- « paiement avant notre départ » (dire « paiement rapide et garanti »).

Qualité :
- la section sur la ville et la FAQ doivent être réellement propres à chaque page (secteurs, types d'entreprises, questions locales), pas un copier-coller avec le nom changé ;
- pas de page pour chaque petite ville : on regroupe (ex. Rive-Nord couvre Blainville, Boisbriand, Sainte-Thérèse, Mirabel).

## 3. Blogue

- **Source** : articles Soro lus côté serveur (`lib/posts.ts`). La langue est détectée sur le texte de l'article (`detectLang`) : FR → `/blog/<slug>`, EN → `/en/blog/<slug>`. Un article ouvert dans la mauvaise langue redirige (308) vers la bonne URL. Si la détection se trompe, forcer la langue dans `LANG_OVERRIDES` (`lib/blog-seo.ts`).
- **Anciens liens** `?post=` : `middleware.ts` intercepte `/blog?post=<slug>` et `/en/blog?post=<slug>` et redirige (308) vers l'URL de l'article, ou vers l'index du blogue si le slug est inconnu (`legacyPostTarget`).
- **Réécritures locales** : `LOCAL_REWRITES` dans `lib/blog-articles/rewrites.ts` remplace un article Soro à la même URL (liste, page, plan du site, langue). Garder `isoDate` d'origine, mettre à jour `updatedIsoDate` (alimente `dateModified` et le plan du site). HTML simple seulement (p, h2, h3, ul, ol, li, a, strong).
- **Consolidation des doublons** : `BLOG_CONSOLIDATION` dans `lib/blog-seo.ts` classe chaque article (`pillar`, `secondary`, `standalone`). Tant que `APPLY_CONSOLIDATION = false`, tout reste indexé. **Ne pas activer avant que le client ait approuvé la liste.** Une fois à `true`, les `secondary` passent en noindex (follow), sortent du plan du site et de la liste, et renvoient vers leur article de référence ou leur `relatedPath`. Un nouvel article absent de la liste est `standalone`.
- **Blocs de fin d'article** : « À retenir » et « Services liés » (liens vers les pages du registre), affichés par `components/pages/BlogPostPage.tsx` ; libellés et choix des liens par mots-clés dans `lib/blog-seo.ts`.

### Réglages Soro recommandés

| Réglage | Valeur |
| --- | --- |
| Langue | Français seulement |
| Cadence | 1 à 2 articles par semaine |
| Sujets | Sans doublons avec les articles existants (vérifier `BLOG_CONSOLIDATION`) |
| Profil de l'entreprise | Faits à jour (section 2) : sinon Soro invente prix, délais ou conditions |

## 4. Mesure

### Search Console

1. Propriété : de préférence **propriété de domaine** (enregistrement TXT dans la zone DNS chez Hostinger). Sinon propriété préfixe d'URL avec balise : mettre le code dans `NEXT_PUBLIC_GSC_VERIFICATION` (lu par `app/layout.tsx`), redéployer.
2. Sitemaps : soumettre `https://www.technolot.ca/sitemap.xml`.
3. Inspection de l'URL : inspecter chaque nouvelle page et demander l'indexation.
4. Performances : filtre Requête → **Expression régulière personnalisée** :

```
montr[eé]al|laval|terrebonne|mascouche|rive-nord|blainville|boisbriand|th[eé]r[eè]se|mirabel
```

5. Rapport **Pages** (Indexation) : vérifier que les pages locales et catégories sont « Indexées » et lire les motifs d'exclusion.

### Suivi interne (Supabase)

- `components/tracking/AdTracker.tsx` envoie un événement `cta_click` pour chaque lien vers `/soumission` (ou `/en/soumission`), chaque `tel:` et chaque `mailto:` avec destinataire (`ctaLabelFor`, `lib/tracking/attribution.ts`). Les liens de partage `mailto:` sans destinataire ne comptent pas.
- L'attribution (`tl_attr`) garde la page d'entrée (`landing_path`) et le domaine référent (`referrer`, plateforme `organic` pour les moteurs de recherche).
- Chaque soumission crée une ligne `ad_leads` liée à sa session (`session_id` → `ad_sessions`) : on peut donc compter les soumissions par page d'entrée.

### GA4 (optionnel)

- Renseigner `NEXT_PUBLIC_GA4_ID` (G-XXXXXXX) : `AdPixels.tsx` charge alors gtag et envoie `generate_lead` à chaque soumission.
- **Loi 25** : GA4 et les pixels publicitaires collectent des renseignements personnels. Avant de l'activer, mettre à jour la politique de confidentialité et prévoir le consentement requis.

### Valider les volumes (Planificateur de mots clés)

1. Google Ads, Outils, **Planificateur de mots clés**, « Obtenir le volume de recherche et les prévisions ».
2. Coller les requêtes visées (ex. « rachat ordinateur Laval », « vente lot informatique Montréal »).
3. Ciblage : Québec ou les villes visées, langue français.
4. Noter les volumes mensuels moyens ; ils servent à décider de la vague 2, pas à promettre un trafic.

### Indicateurs

Chaque semaine pendant 8 semaines, puis chaque mois :

| Indicateur | Source |
| --- | --- |
| Pages indexées (locales, catégories, blogue) | Search Console, rapport Pages |
| Impressions et clics par page | Search Console, Performances, onglet Pages |
| Impressions et clics par ville | Search Console, filtre regex ci-dessus |
| Soumissions par page d'entrée | `ad_leads` + `ad_sessions.landing_path` |
| Taux de conversion par page locale | soumissions ÷ sessions ayant cette page d'entrée |

## 5. Hors site (à faire par le client)

- **Google Business Profile** : créer ou réclamer la fiche. Si l'adresse est un espace de coworking qui n'accueille pas les clients, choisir une **entreprise de zone de service** (adresse masquée) et lister les régions desservies.
- **Fiches cohérentes** (même nom, téléphone, site, description) : Pages Jaunes, LinkedIn, Bing Places, Apple Business Connect, Facebook.
- **Avis** : demander des avis Google à de vrais clients après chaque rachat. Jamais d'avis inventés ni payés.
- **Domaine** : redirection 301 de `technolot.ca` vers `www.technolot.ca` (réglage Hostinger), pour une seule version indexée.

## 6. Vague 2 (selon les données de la Search Console)

- Page Rive-Sud / Longueuil.
- Page Saint-Laurent, seulement si la demande le justifie.
- Versions anglaises des pages en français seulement (ajouter `en` au registre et la route sous `app/(en)/en`).
- Page « électronique professionnelle » : tablettes, téléphones, audio/vidéo, bureautique.
- Attribut `lang` rendu côté serveur sur `/en`.
